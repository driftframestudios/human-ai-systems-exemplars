import '../../tools/node-runtime-admission.mjs';
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import Ajv2020 from "ajv/dist/2020.js";

import { admitFoundation } from "../../tools/repository-handoff-foundation.mjs";
import {
  IssueRouteError,
  admitIssueRouteBindings,
  admitIssueRouteReceipt,
  applyIssueRoutePlan,
  assertIssueRouteRequestBounds,
  createIssueRoutePlan,
  formatIssueRouteError,
  main,
  parseIssueRouteArgs,
  preflightReceiptOutput,
  readIssueRouteInventory,
  verifyIssueRoutePlan,
} from "../../tools/repository-handoff-issue-route.mjs";

const REPOSITORY = "acme/context-canvas";
const ROUTE_KEY = "source-awaiting-owner-operable-route";
const SEED_SHA256 = "6fd76d35d5275f238e8581682d5d0c9626abf1e7e4fd420603255c4639847823";

function clone(value) {
  return structuredClone(value);
}

function issueMarker(key, phase = "live") {
  return `<!-- repository-handoff:issue-route-v0.1 route=${ROUTE_KEY} key=${key} seed=${SEED_SHA256} phase=${phase} -->`;
}

class FakeGitHubAdapter {
  constructor({ dropIssueLabels = false, dropIssueMilestone = false } = {}) {
    this.dropIssueLabels = dropIssueLabels;
    this.dropIssueMilestone = dropIssueMilestone;
    this.repository = {
      id: 991,
      node_id: "R_991",
      full_name: REPOSITORY,
      has_issues: true,
      archived: false,
      disabled: false,
    };
    this.labels = [];
    this.milestones = [];
    this.issues = [];
    this.calls = [];
    this.nextLabelId = 1_001;
    this.nextMilestoneId = 2_001;
    this.nextIssueId = 3_001;
    this.nextMilestoneNumber = 1;
    this.nextIssueNumber = 1;
  }

  get mutations() {
    return this.calls.filter((call) => ["POST", "PATCH"].includes(call.method));
  }

  page(items, query = {}) {
    const page = Number(query.page ?? 1);
    const perPage = Number(query.per_page ?? 100);
    return clone(items.slice((page - 1) * perPage, page * perPage));
  }

  async request({ method = "GET", endpoint, query = {}, body = undefined }) {
    this.calls.push({ method, endpoint, query: clone(query), body: clone(body) });
    const root = `repos/${REPOSITORY}`;
    if (method === "GET" && endpoint === root) return clone(this.repository);
    if (method === "GET" && endpoint === `${root}/labels`) return this.page(this.labels, query);
    if (method === "GET" && endpoint === `${root}/milestones`) return this.page(this.milestones, query);
    if (method === "GET" && endpoint === `${root}/issues`) return this.page(this.issues, query);

    const issueNumber = endpoint.startsWith(`${root}/issues/`)
      ? Number(endpoint.slice(`${root}/issues/`.length))
      : null;
    if (method === "GET" && Number.isSafeInteger(issueNumber)) {
      const issue = this.issues.find((item) => item.number === issueNumber);
      assert.ok(issue, `fake Issue #${issueNumber} exists`);
      return clone(issue);
    }
    if (method === "POST" && endpoint === `${root}/labels`) {
      const label = {
        id: this.nextLabelId++,
        node_id: `LA_${this.nextLabelId}`,
        name: body.name,
        color: body.color,
        description: body.description,
      };
      this.labels.push(label);
      return clone(label);
    }
    if (method === "POST" && endpoint === `${root}/milestones`) {
      const milestone = {
        id: this.nextMilestoneId++,
        node_id: `MI_${this.nextMilestoneId}`,
        number: this.nextMilestoneNumber++,
        title: body.title,
        description: body.description,
        state: "open",
      };
      this.milestones.push(milestone);
      return clone(milestone);
    }
    if (method === "POST" && endpoint === `${root}/issues`) {
      const milestone = this.milestones.find((item) => item.number === body.milestone);
      const issue = {
        id: this.nextIssueId++,
        node_id: `I_${this.nextIssueId}`,
        number: this.nextIssueNumber++,
        title: body.title,
        body: body.body,
        state: "open",
        labels: this.dropIssueLabels ? [] : body.labels.map((name) => ({ name })),
        milestone: this.dropIssueMilestone || !milestone
          ? null
          : { number: milestone.number, title: milestone.title },
      };
      this.issues.push(issue);
      return clone(issue);
    }
    if (method === "PATCH" && Number.isSafeInteger(issueNumber)) {
      const issue = this.issues.find((item) => item.number === issueNumber);
      assert.ok(issue, `fake Issue #${issueNumber} exists`);
      Object.assign(issue, clone(body));
      return clone(issue);
    }
    throw new Error(`Unhandled fake GitHub request: ${method} ${endpoint}`);
  }
}

class CommitThenThrowAdapter extends FakeGitHubAdapter {
  constructor(failAtMutation) {
    super();
    this.failAtMutation = failAtMutation;
    this.committedMutations = 0;
    this.didThrow = false;
  }

  async request(options) {
    const result = await super.request(options);
    if (["POST", "PATCH"].includes(options.method)) {
      this.committedMutations += 1;
      if (!this.didThrow && this.committedMutations === this.failAtMutation) {
        this.didThrow = true;
        throw new Error("simulated response loss after remote commit");
      }
    }
    return result;
  }
}

class PendingEditAdapter extends FakeGitHubAdapter {
  constructor() {
    super();
    this.editedPendingBody = false;
  }

  async request(options) {
    const root = `repos/${REPOSITORY}/issues/`;
    if (!this.editedPendingBody && options.method === "GET" && options.endpoint.startsWith(root)) {
      const number = Number(options.endpoint.slice(root.length));
      const issue = this.issues.find((item) => item.number === number);
      if (issue) {
        issue.body = `${issue.body}\nRepository owner note.\n`;
        this.editedPendingBody = true;
      }
    }
    return super.request(options);
  }
}

async function foundation() {
  return admitFoundation();
}

async function applyFreshRoute(adapter, root) {
  const admitted = await foundation();
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const receiptPath = path.join(root, "issue-route-receipt.json");
  const sleeps = [];
  const result = await applyIssueRoutePlan({
    plan,
    confirmRepository: REPOSITORY,
    confirmPlan: plan.planSha256,
    receiptPath,
    sleep: async (milliseconds) => sleeps.push(milliseconds),
    mutationDelayMs: 1,
  });
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  return { admitted, plan, result, receipt, receiptPath, sleeps };
}

test("an empty repository plans without mutation and binds output authorities into a deterministic digest", async () => {
  const admitted = await foundation();
  const adapter = new FakeGitHubAdapter();
  const first = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const second = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });

  assert.equal(first.planSha256, second.planSha256);
  assert.equal(first.seedSha256, SEED_SHA256);
  assert.equal(first.materializerVersion, "0.1.0");
  assert.equal(first.bootstrapFront.key, "source-intake");
  assert.equal(first.bootstrapFront.number, null);
  assert.equal(first.receiptSchemaAuthority.id, "urn:repository-handoff-foundation:schema:issue-route-materialization-receipt:v0.1");
  assert.match(first.foundationAuthority.manifestSha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(first.summary.states, { create: 8 });
  assert.equal(adapter.mutations.length, 0);
});

test("apply creates the two-pass route, writes one admitted receipt, and reruns without mutation", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "issue-route-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new FakeGitHubAdapter();
  const { admitted, plan, result, receipt, receiptPath, sleeps } = await applyFreshRoute(adapter, root);

  assert.equal(result.mutations, 10);
  assert.equal(adapter.mutations.length, 10);
  assert.equal(sleeps.length, 9);
  assert.equal(result.confirmedPlanSha256, plan.planSha256);
  assert.notEqual(result.confirmedPlanSha256, result.verifiedPlanSha256);
  assert.equal(receipt.confirmedPlanSha256, result.confirmedPlanSha256);
  assert.equal(receipt.verifiedPlanSha256, result.verifiedPlanSha256);
  assert.equal(receipt.bootstrapFrontKey, "source-intake");
  assert.equal(receipt.operationBoundary.mutationPolicy, "create_missing_resources_and_finalize_pending_issues");
  assert.equal(receipt.operationBoundary.gitRepositoryContentMutation, "none");
  assert.equal(receipt.operationBoundary.localReceiptMutation, "create_only");
  assert.equal((await stat(receiptPath)).isFile(), true);
  assert.ok(admitIssueRouteReceipt(receipt, ROUTE_KEY));
  const receiptSchema = JSON.parse(await readFile(
    "repository-handoff-foundation-v0.1/schema/issue-route-materialization-receipt.schema.v0.1.json",
    "utf8",
  ));
  const validateReceipt = new Ajv2020({ strict: true, allErrors: true, validateFormats: false }).compile(receiptSchema);
  assert.equal(validateReceipt(receipt), true, JSON.stringify(validateReceipt.errors));
  const locatedReceipt = { ...receipt, $schema: receiptSchema.$id };
  assert.equal(validateReceipt(locatedReceipt), true, JSON.stringify(validateReceipt.errors));
  assert.ok(admitIssueRouteReceipt(locatedReceipt, ROUTE_KEY));
  assert.throws(
    () => admitIssueRouteReceipt({ ...receipt, $schema: "./relative-receipt-schema.json" }, ROUTE_KEY),
    (error) => error instanceof IssueRouteError && error.code === "schema_reference",
  );
  const whitespaceReceipt = clone(receipt);
  whitespaceReceipt.coverageBoundary = " ";
  assert.equal(validateReceipt(whitespaceReceipt), false);
  assert.throws(
    () => admitIssueRouteReceipt(whitespaceReceipt, ROUTE_KEY),
    (error) => error instanceof IssueRouteError && error.code === "text",
  );
  assert.match(adapter.issues[0].body, /#2/u);
  assert.match(adapter.issues[1].body, /#1/u);

  const mutationsBeforeRerun = adapter.mutations.length;
  const rerun = await createIssueRoutePlan({
    foundation: admitted,
    repo: REPOSITORY,
    adapter,
    receipt,
  });
  const verification = verifyIssueRoutePlan(rerun);
  assert.equal(verification.ok, true);
  assert.equal(rerun.summary.states.compatible, 8);
  assert.equal(adapter.mutations.length, mutationsBeforeRerun);

  const secondReceiptPath = path.join(root, "issue-route-receipt-rerun.json");
  const reapplied = await applyIssueRoutePlan({
    plan: rerun,
    confirmRepository: REPOSITORY,
    confirmPlan: rerun.planSha256,
    receiptPath: secondReceiptPath,
    sleep: async () => {},
    mutationDelayMs: 0,
  });
  assert.equal(reapplied.mutations, 0);
  assert.equal(adapter.mutations.length, mutationsBeforeRerun);
  assert.ok(admitIssueRouteReceipt(JSON.parse(await readFile(secondReceiptPath, "utf8")), ROUTE_KEY));
});

test("an accepted receipt transfers authority to live Issues while reporting owner edits", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "issue-route-owner-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new FakeGitHubAdapter();
  const { admitted, receipt } = await applyFreshRoute(adapter, root);

  adapter.issues[0].title = "Repository owner title";
  adapter.issues[0].body = `${adapter.issues[0].body}\nRepository owner note.\n`;
  adapter.issues[0].labels = adapter.issues[0].labels.slice(0, 1);
  adapter.issues[0].milestone = null;
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter, receipt });
  const edited = plan.actions.find((item) => item.resource === "issue" && item.key === "foundation-reconciliation");
  assert.equal(edited.state, "preserve_live");
  const verification = verifyIssueRoutePlan(plan);
  assert.equal(verification.ok, true);
  assert.deepEqual(verification.differences, [{
    resource: "issue",
    key: "foundation-reconciliation",
    reason: "live Issue retains the repository owner's edits",
  }]);
});

test("GitHub dropping Issue metadata keeps every Issue pending and leaves the receipt absent", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "issue-route-drop-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new FakeGitHubAdapter({ dropIssueLabels: true });
  const admitted = await foundation();
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const receiptPath = path.join(root, "receipt.json");

  await assert.rejects(
    applyIssueRoutePlan({
      plan,
      confirmRepository: REPOSITORY,
      confirmPlan: plan.planSha256,
      receiptPath,
      sleep: async () => {},
      mutationDelayMs: 0,
    }),
    (error) => error instanceof IssueRouteError && error.code === "apply_held",
  );
  assert.equal(adapter.mutations.filter((call) => call.method === "PATCH").length, 0);
  assert.equal(adapter.issues.every((issue) => issue.body.includes("phase=pending")), true);
  await assert.rejects(stat(receiptPath), { code: "ENOENT" });
});

test("a committed create with a lost response resumes from live markers without duplicates", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "issue-route-resume-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new CommitThenThrowAdapter(7);
  const admitted = await foundation();
  const first = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const receiptPath = path.join(root, "receipt.json");

  await assert.rejects(
    applyIssueRoutePlan({
      plan: first,
      confirmRepository: REPOSITORY,
      confirmPlan: first.planSha256,
      receiptPath,
      sleep: async () => {},
      mutationDelayMs: 0,
    }),
    /simulated response loss after remote commit/u,
  );
  assert.equal(adapter.issues.length, 1);
  await assert.rejects(stat(receiptPath), { code: "ENOENT" });

  const resumedPlan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  assert.equal(resumedPlan.blockers.length, 0);
  assert.equal(resumedPlan.actions.find((item) => item.resource === "issue" && item.key === "foundation-reconciliation").state, "recover_pending");
  const resumed = await applyIssueRoutePlan({
    plan: resumedPlan,
    confirmRepository: REPOSITORY,
    confirmPlan: resumedPlan.planSha256,
    receiptPath,
    sleep: async () => {},
    mutationDelayMs: 0,
  });
  assert.equal(resumed.mutations, 3);
  assert.equal(adapter.issues.length, 2);
  assert.equal(adapter.mutations.filter((call) => call.method === "POST" && call.endpoint.endsWith("/issues")).length, 2);
  assert.equal(adapter.mutations.filter((call) => call.method === "PATCH").length, 2);
  assert.ok(admitIssueRouteReceipt(JSON.parse(await readFile(receiptPath, "utf8")), ROUTE_KEY));
});

test("a repository-owner edit to a pending body stops finalization and remains intact", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "issue-route-pending-edit-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new PendingEditAdapter();
  const admitted = await foundation();
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const receiptPath = path.join(root, "receipt.json");

  await assert.rejects(
    applyIssueRoutePlan({
      plan,
      confirmRepository: REPOSITORY,
      confirmPlan: plan.planSha256,
      receiptPath,
      sleep: async () => {},
      mutationDelayMs: 0,
    }),
    (error) => error instanceof IssueRouteError && error.code === "pending_changed",
  );
  assert.equal(adapter.editedPendingBody, true);
  assert.match(adapter.issues[0].body, /Repository owner note\./u);
  assert.equal(adapter.mutations.filter((call) => call.method === "PATCH").length, 0);
  await assert.rejects(stat(receiptPath), { code: "ENOENT" });
});

test("confirmation and receipt-path checks stop before the first remote mutation", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "issue-route-guard-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new FakeGitHubAdapter();
  const admitted = await foundation();
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });

  await assert.rejects(
    applyIssueRoutePlan({
      plan,
      confirmRepository: "acme/another-repository",
      confirmPlan: plan.planSha256,
      receiptPath: path.join(root, "receipt.json"),
    }),
    (error) => error instanceof IssueRouteError && error.code === "apply_repository_confirmation",
  );
  assert.equal(adapter.mutations.length, 0);

  await assert.rejects(
    applyIssueRoutePlan({
      plan,
      confirmRepository: REPOSITORY,
      confirmPlan: plan.planSha256,
      receiptPath: path.join(root, "missing", "receipt.json"),
    }),
    (error) => error instanceof IssueRouteError && error.code === "receipt_parent",
  );
  assert.equal(adapter.mutations.length, 0);
});

test("an occupied receipt path and a stale plan stop before the first remote mutation", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "issue-route-preflight-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const adapter = new FakeGitHubAdapter();
  const admitted = await foundation();
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const occupied = path.join(root, "receipt.json");
  await writeFile(occupied, "owner-held receipt\n", "utf8");

  await assert.rejects(
    applyIssueRoutePlan({
      plan,
      confirmRepository: REPOSITORY,
      confirmPlan: plan.planSha256,
      receiptPath: occupied,
      sleep: async () => {},
      mutationDelayMs: 0,
    }),
    (error) => error instanceof IssueRouteError && error.code === "receipt_exists",
  );
  assert.equal(adapter.mutations.length, 0);
  assert.equal(await readFile(occupied, "utf8"), "owner-held receipt\n");

  adapter.labels.push({
    id: 1_001,
    node_id: "LA_1001",
    name: "area:source-intake",
    color: "1D76DB",
    description: "Received source, technology facts, and reproducible commands",
    archived_at: null,
  });
  await assert.rejects(
    applyIssueRoutePlan({
      plan,
      confirmRepository: REPOSITORY,
      confirmPlan: plan.planSha256,
      receiptPath: path.join(root, "fresh-receipt.json"),
      sleep: async () => {},
      mutationDelayMs: 0,
    }),
    (error) => error instanceof IssueRouteError && error.code === "plan_stale",
  );
  assert.equal(adapter.mutations.length, 0);
});

test("receipt preflight rejects a symbolic-link target", async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), "issue-route-link-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = path.join(root, "target.json");
  const linked = path.join(root, "receipt.json");
  await symlink(target, linked);
  await assert.rejects(
    preflightReceiptOutput(linked),
    (error) => error instanceof IssueRouteError && error.code === "receipt_target",
  );
});

test("rendered request preflight rejects oversized fields and reserved marker input", async () => {
  const admitted = await foundation();
  const adapter = new FakeGitHubAdapter();
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const oversizedBodies = {
    ...plan.internal.bodyByKey,
    "source-intake": "x".repeat(65_537),
  };
  assert.throws(
    () => assertIssueRouteRequestBounds({ issueSeed: plan.internal.issueSeed, bodyByKey: oversizedBodies }),
    (error) => error instanceof IssueRouteError && error.code === "request_field_limit",
  );

  const markerSeed = structuredClone(plan.internal.issueSeed);
  markerSeed.issues[0].acceptance[0].statement = "<!-- repository-handoff:owner-supplied -->";
  assert.throws(
    () => assertIssueRouteRequestBounds({ issueSeed: markerSeed, bodyByKey: plan.internal.bodyByKey }),
    (error) => error instanceof IssueRouteError && error.code === "reserved_marker",
  );
});

test("an archived semantic label holds the route before mutation", async () => {
  const admitted = await foundation();
  const adapter = new FakeGitHubAdapter();
  adapter.labels.push({
    id: 1_001,
    node_id: "LA_1001",
    name: "area:source-intake",
    color: "1D76DB",
    description: "Received source, technology facts, and reproducible commands",
    archived_at: "2026-10-08T12:00:00Z",
  });
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const label = plan.actions.find((item) => item.resource === "label" && item.key === "source-intake");
  assert.equal(label.state, "conflict");
  assert.match(label.reason, /archived/u);
  assert.equal(adapter.mutations.length, 0);
});

test("duplicate semantic markers and title-only matches hold the plan without mutation", async () => {
  const admitted = await foundation();
  const duplicate = new FakeGitHubAdapter();
  duplicate.issues.push(
    {
      id: 3_001,
      node_id: "I_3001",
      number: 1,
      title: "First",
      body: issueMarker("source-intake"),
      state: "open",
      labels: [],
      milestone: null,
    },
    {
      id: 3_002,
      node_id: "I_3002",
      number: 2,
      title: "Second",
      body: issueMarker("source-intake"),
      state: "open",
      labels: [],
      milestone: null,
    },
  );
  const duplicatePlan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter: duplicate });
  assert.ok(duplicatePlan.blockers.some((item) => item.resource === "issue" && item.key === "source-intake"));
  assert.equal(duplicate.mutations.length, 0);

  const titleOnly = new FakeGitHubAdapter();
  titleOnly.issues.push({
    id: 3_010,
    node_id: "I_3010",
    number: 10,
    title: "Receive and characterize the actual site source",
    body: "Owner-authored work.",
    state: "open",
    labels: [],
    milestone: null,
  });
  const titlePlan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter: titleOnly });
  const unresolved = titlePlan.actions.find((item) => item.resource === "issue" && item.key === "source-intake");
  assert.equal(unresolved.state, "unresolved");
  assert.deepEqual(unresolved.suggestions, [10]);
});

test("an operator-supplied binding must use admitted seed keys", async () => {
  const admitted = await foundation();
  const adapter = new FakeGitHubAdapter();
  adapter.issues.push({
    id: 3_001,
    node_id: "I_3001",
    number: 1,
    title: "Bound Issue",
    body: issueMarker("source-intake"),
    state: "open",
    labels: [],
    milestone: null,
  });
  const bindings = {
    $schema: "urn:repository-handoff-foundation:schema:issue-route-bindings:v0.1",
    schemaVersion: "0.1",
    artifactType: "repository_handoff_issue_route_bindings",
    routeKey: ROUTE_KEY,
    seedSha256: SEED_SHA256,
    repository: { immutableId: 991, fullName: REPOSITORY },
    labels: {},
    milestones: {},
    issues: {
      typo: { immutableId: 3_001, number: 1, title: "Bound Issue" },
    },
  };
  const admittedBindings = admitIssueRouteBindings(bindings, ROUTE_KEY);
  await assert.rejects(
    createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter, bindings: admittedBindings }),
    (error) => error instanceof IssueRouteError && error.code === "coordinate_key",
  );
});

test("marker and operator-supplied binding disagreement holds the named Issue", async () => {
  const admitted = await foundation();
  const adapter = new FakeGitHubAdapter();
  adapter.issues.push(
    {
      id: 3_001,
      node_id: "I_3001",
      number: 1,
      title: "Marker coordinate",
      body: issueMarker("source-intake"),
      state: "open",
      labels: [],
      milestone: null,
    },
    {
      id: 3_002,
      node_id: "I_3002",
      number: 2,
      title: "Binding coordinate",
      body: "Operator-selected pre-existing Issue.",
      state: "open",
      labels: [],
      milestone: null,
    },
  );
  const bindings = admitIssueRouteBindings({
    $schema: "urn:repository-handoff-foundation:schema:issue-route-bindings:v0.1",
    schemaVersion: "0.1",
    artifactType: "repository_handoff_issue_route_bindings",
    routeKey: ROUTE_KEY,
    seedSha256: SEED_SHA256,
    repository: { immutableId: 991, fullName: REPOSITORY },
    labels: {},
    milestones: {},
    issues: {
      "source-intake": { immutableId: 3_002, number: 2, title: "Binding coordinate" },
    },
  }, ROUTE_KEY);
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter, bindings });
  const issue = plan.actions.find((item) => item.resource === "issue" && item.key === "source-intake");
  assert.equal(issue.state, "conflict");
  assert.match(issue.reason, /different live objects/u);
  assert.equal(adapter.mutations.length, 0);
});

test("binding schema and runtime reject the same repository and whitespace boundaries", async () => {
  const schema = JSON.parse(await readFile(
    "repository-handoff-foundation-v0.1/schema/issue-route-bindings.schema.v0.1.json",
    "utf8",
  ));
  const validate = new Ajv2020({ strict: true, allErrors: true, validateFormats: false }).compile(schema);
  const base = {
    $schema: "urn:repository-handoff-foundation:schema:issue-route-bindings:v0.1",
    schemaVersion: "0.1",
    artifactType: "repository_handoff_issue_route_bindings",
    routeKey: ROUTE_KEY,
    seedSha256: SEED_SHA256,
    repository: { immutableId: 991, fullName: REPOSITORY },
    labels: {},
    milestones: {},
    issues: {},
  };
  assert.equal(validate(base), true, JSON.stringify(validate.errors));
  assert.ok(admitIssueRouteBindings(base, ROUTE_KEY));

  const dotRepository = clone(base);
  dotRepository.repository.fullName = "acme/.";
  assert.equal(validate(dotRepository), false);
  assert.throws(
    () => admitIssueRouteBindings(dotRepository, ROUTE_KEY),
    (error) => error instanceof IssueRouteError && error.code === "repository",
  );

  const whitespaceTitle = clone(base);
  whitespaceTitle.issues["source-intake"] = { immutableId: 3_001, number: 1, title: " " };
  assert.equal(validate(whitespaceTitle), false);
  assert.throws(
    () => admitIssueRouteBindings(whitespaceTitle, ROUTE_KEY),
    (error) => error instanceof IssueRouteError && error.code === "text",
  );
});

test("case-variant labels reconcile and complete pagination excludes pull requests", async () => {
  const adapter = new FakeGitHubAdapter();
  adapter.labels.push({
    id: 1_001,
    node_id: "LA_1001",
    name: "AREA:SOURCE-INTAKE",
    color: "1D76DB",
    description: "Received source, technology facts, and reproducible commands",
  });
  for (let index = 1; index <= 100; index += 1) {
    adapter.issues.push({
      id: 8_000 + index,
      node_id: `PR_${index}`,
      number: index,
      title: `Pull request ${index}`,
      body: index === 1 ? issueMarker("source-intake") : "",
      state: "closed",
      labels: [],
      milestone: null,
      pull_request: { url: `https://example.invalid/${index}` },
    });
  }
  adapter.issues.push({
    id: 3_101,
    node_id: "I_3101",
    number: 101,
    title: "Real Issue",
    body: issueMarker("source-intake"),
    state: "closed",
    labels: [],
    milestone: null,
  });
  const inventory = await readIssueRouteInventory({ adapter, repo: REPOSITORY });
  assert.equal(inventory.issues.length, 1);
  assert.equal(inventory.issues[0].number, 101);
  assert.equal(inventory.pullRequestNumbers.size, 100);

  const admitted = await foundation();
  const plan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter: new FakeGitHubAdapter() });
  const labelAction = plan.actions.find((item) => item.resource === "label" && item.key === "source-intake");
  assert.equal(labelAction.state, "create");

  const casePlan = await createIssueRoutePlan({ foundation: admitted, repo: REPOSITORY, adapter });
  const caseAction = casePlan.actions.find((item) => item.resource === "label" && item.key === "source-intake");
  assert.equal(caseAction.state, "preserve_live");
});

test("the CLI exposes the full repository confirmation spelling", () => {
  const options = parseIssueRouteArgs([
    "--apply",
    "--repo", REPOSITORY,
    "--confirm-repository", REPOSITORY,
    "--confirm-plan", `sha256:${"a".repeat(64)}`,
    "--receipt-out", "receipt.json",
  ]);
  assert.equal(options.confirmRepository, REPOSITORY);
  assert.throws(
    () => parseIssueRouteArgs([
      "--apply",
      "--repo", REPOSITORY,
      "--confirm-repo", REPOSITORY,
      "--confirm-plan", `sha256:${"a".repeat(64)}`,
      "--receipt-out", "receipt.json",
    ]),
    (error) => error instanceof IssueRouteError && error.code === "arguments",
  );
});

test("CLI verification reports a held route with a failing process result", async () => {
  const admitted = await foundation();
  const adapter = new FakeGitHubAdapter();
  let output = "";
  await assert.rejects(
    main(["--verify", "--repo", REPOSITORY], {
      adapter,
      foundation: admitted,
      write: (value) => { output += value; },
    }),
    (error) => error instanceof IssueRouteError && error.code === "verify",
  );
  assert.match(output, /remains held/u);
  assert.match(output, /label source-intake: the semantic label is absent/u);
  assert.match(output, /Next: resolve the named condition/u);
  assert.equal(adapter.mutations.length, 0);
});

test("CLI error formatting returns bounded conditions and a recovery action", () => {
  const output = formatIssueRouteError(new IssueRouteError(
    "verify",
    "The live Issue route remains held.",
    [{ resource: "label", key: "source-intake", reason: "semantic label is absent" }],
  ));
  assert.match(output, /Issue-route operation held \(verify\)/u);
  assert.match(output, /- label source-intake: semantic label is absent/u);
  assert.match(output, /read live state and create a fresh plan/u);
});
