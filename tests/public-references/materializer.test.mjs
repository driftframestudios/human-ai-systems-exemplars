import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, win32 } from "node:path";
import test from "node:test";

import {
  PUBLIC_REFERENCE_NAMESPACE,
  PUBLIC_REFERENCE_SOURCE,
  inspectPublicReferenceSource,
  isPublicReferencePathWithin,
  materializePublicReferences,
} from "../../tools/materialize-public-references.mjs";

const PRIMARY_KEY = "PUBLIC_URL_REGISTRY_EXAMPLE_READING";
const SECONDARY_KEY = "PUBLIC_URL_REGISTRY_SECOND_READING";
const APP_NOTION_HOST = ["app", "notion", "com"].join(".");
const WORKSPACE_NOTION_HOST = ["workspace", "notion", "so"].join(".");
const SITE_NOTION_HOST = ["registry-example", "notion", "site"].join(".");

async function fixture(t, html) {
  const root = await mkdtemp(join(tmpdir(), "public-reference-materializer-"));
  const sourceRoot = join(root, "source");
  const htmlRoot = join(sourceRoot, "context-canvas");
  const outputRoot = join(root, "generated", "context-canvas-project-surface");
  const configPath = join(root, ".env.public");
  await mkdir(htmlRoot, { recursive: true });
  await writeFile(join(htmlRoot, "index.html"), html, "utf8");
  t.after(() => rm(root, { recursive: true, force: true }));
  return {
    root,
    sourceRoot,
    htmlRoot,
    outputRoot,
    outputBoundaryRoot: root,
    configPath,
  };
}

function pageWithTwin(key = PRIMARY_KEY) {
  return `<!doctype html>
<html>
  <body><a href="{{${key}}}">Read the public orientation</a></body>
  <script type="application/ld+json">{"citation":"{{${key}}}"}</script>
</html>\n`;
}

function jsonLdBodies(html) {
  const bodies = [];
  for (const match of html.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/gi)) {
    const script = match[0];
    const openEnd = script.indexOf(">");
    const closeStart = script.toLowerCase().lastIndexOf("</script>");
    if (!/\btype\s*=\s*(["'])application\/ld\+json\1/i.test(script.slice(0, openEnd + 1))) {
      continue;
    }
    bodies.push(script.slice(openEnd + 1, closeStart));
  }
  return bodies;
}

async function assertContractFailure(promise, code, hiddenValue) {
  await assert.rejects(promise, (error) => {
    assert.equal(error.code, code);
    if (hiddenValue !== undefined) {
      assert.equal(error.message.includes(hiddenValue), false);
    }
    return true;
  });
}

async function symlinkOrSkip(t, target, path, type) {
  try {
    await symlink(target, path, type);
    return true;
  } catch (error) {
    if (error?.code === "EPERM" || error?.code === "EACCES") {
      t.skip("symbolic-link creation is unavailable on this platform");
      return false;
    }
    throw error;
  }
}

test("materializes one resolved value into HTML and JSON-LD without changing source", async (t) => {
  const source = pageWithTwin();
  const paths = await fixture(t, source);
  const asset = Buffer.from([0, 1, 2, 3, 255]);
  await writeFile(join(paths.sourceRoot, "asset.bin"), asset);
  await writeFile(
    paths.configPath,
    `${PRIMARY_KEY}=https://registry.example/from-file\n`,
    "utf8",
  );

  const approved = "https://registry.example/read?view=full&mode=calm#orientation";
  const result = await materializePublicReferences({
    ...paths,
    environment: { [PRIMARY_KEY]: approved },
  });

  assert.equal(result.keyCount, 1);
  assert.equal(result.occurrenceCount, 2);
  assert.equal(result.anchorCount, 1);
  assert.equal(result.jsonLdCount, 1);
  assert.deepEqual(result.keys, [PRIMARY_KEY]);
  assert.equal(await readFile(join(paths.htmlRoot, "index.html"), "utf8"), source);

  const generated = await readFile(
    join(paths.outputRoot, "context-canvas", "index.html"),
    "utf8",
  );
  assert.match(
    generated,
    /href="https:\/\/registry\.example\/read\?view=full&amp;mode=calm#orientation"/,
  );
  const [jsonLd] = jsonLdBodies(generated).map((body) => JSON.parse(body));
  assert.equal(jsonLd.citation, approved);
  assert.deepEqual(await readFile(join(paths.outputRoot, "asset.bin")), asset);
});

test("treats a different Windows drive as a separate tree", () => {
  assert.equal(
    isPublicReferencePathWithin("C:\\source", "D:\\output", win32),
    false,
  );
  assert.equal(
    isPublicReferencePathWithin("C:\\source", "C:\\source\\child", win32),
    true,
  );
});

test("resolves repeated keys and JSON-LD arrays through one configuration value", async (t) => {
  const html = `<a href='{{${PRIMARY_KEY}}}'>First</a>
<a href="{{${SECONDARY_KEY}}}">Second</a>
<script type="application/ld+json">{"isBasedOn":"{{${PRIMARY_KEY}}}","citation":["{{${PRIMARY_KEY}}}","{{${SECONDARY_KEY}}}"]}</script>`;
  const paths = await fixture(t, html);
  await writeFile(
    join(paths.htmlRoot, "second.html"),
    `<a href="{{${PRIMARY_KEY}}}">Repeated</a>`,
    "utf8",
  );

  const environment = {
    [PRIMARY_KEY]: "https://registry.example/first",
    [SECONDARY_KEY]: "https://registry.example/second",
  };
  await materializePublicReferences({ ...paths, environment });

  const generated = await readFile(
    join(paths.outputRoot, "context-canvas", "index.html"),
    "utf8",
  );
  const [jsonLd] = jsonLdBodies(generated).map((body) => JSON.parse(body));
  assert.equal(jsonLd.isBasedOn, environment[PRIMARY_KEY]);
  assert.deepEqual(jsonLd.citation, [
    environment[PRIMARY_KEY],
    environment[SECONDARY_KEY],
  ]);
  assert.equal(generated.includes("{{PUBLIC_URL"), false);
  assert.match(
    await readFile(join(paths.outputRoot, "context-canvas", "second.html"), "utf8"),
    /https:\/\/registry\.example\/first/,
  );
});

test("preserves the accepted generation when required configuration is missing", async (t) => {
  const paths = await fixture(t, pageWithTwin());
  await materializePublicReferences({
    ...paths,
    environment: { [PRIMARY_KEY]: "https://registry.example/accepted" },
  });
  const accepted = await readFile(
    join(paths.outputRoot, "context-canvas", "index.html"),
    "utf8",
  );

  await assertContractFailure(
    materializePublicReferences({ ...paths, environment: {} }),
    "PUBLIC_REFERENCE_VALUE_MISSING",
  );
  assert.equal(
    await readFile(join(paths.outputRoot, "context-canvas", "index.html"), "utf8"),
    accepted,
  );
});

test("rejects unsuitable destinations without echoing their values", async (t) => {
  const cases = [
    ["http://registry.example/reading", "PUBLIC_REFERENCE_VALUE_PROTOCOL"],
    [
      "https://reader:private-value@registry.example/reading",
      "PUBLIC_REFERENCE_VALUE_CREDENTIAL",
    ],
    [
      "https://registry.example/reading?access_token=private-value",
      "PUBLIC_REFERENCE_VALUE_CREDENTIAL",
    ],
    [
      "https://registry.example/reading#route?X-Amz-Signature=private-value",
      "PUBLIC_REFERENCE_VALUE_CREDENTIAL",
    ],
    ["not a URL", "PUBLIC_REFERENCE_VALUE_URL"],
    ["https://registry.example/reading\u0007", "PUBLIC_REFERENCE_VALUE_CONTROL_CHARACTER"],
    [" https://registry.example/reading", "PUBLIC_REFERENCE_VALUE_WHITESPACE"],
  ];

  for (const [index, [value, code]] of cases.entries()) {
    await t.test(code, async (t) => {
      const paths = await fixture(t, pageWithTwin());
      await assertContractFailure(
        materializePublicReferences({
          ...paths,
          environment: { [PRIMARY_KEY]: value },
        }),
        code,
        value,
      );
      assert.equal(index >= 0, true);
    });
  }
});

test("accepts only Registry tokens in complete anchor or JSON-LD carriers", async (t) => {
  const cases = [
    [
      '<a href="{{PUBLIC_URL_OTHER_READING}}">Reading</a>',
      "PUBLIC_REFERENCE_TOKEN_NAMESPACE",
    ],
    [
      `<p>{{${PRIMARY_KEY}}}</p>`,
      "PUBLIC_REFERENCE_TOKEN_CARRIER",
    ],
    [
      `<a href="${PRIMARY_KEY}">Reading</a>`,
      "PUBLIC_REFERENCE_TOKEN_LOOKALIKE",
    ],
    [
      `<a href="https://${APP_NOTION_HOST}/p/private-coordinate">Reading</a>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
    [
      `<a href="https://${SITE_NOTION_HOST}/private-coordinate">Reading</a>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
    [
      `<a href="//${WORKSPACE_NOTION_HOST}/private-coordinate">Reading</a>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
    [
      `<a href="https://${WORKSPACE_NOTION_HOST}/private-coordinate">Reading</a>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
    [
      `<a href="https://ignored@${APP_NOTION_HOST}/p/private-coordinate">Reading</a>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
    [
      `<a href="https:&#x2F;&#x2F;${APP_NOTION_HOST}/p/private-coordinate">Reading</a>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
    [
      `<a href="https&colon;&sol;&sol;${APP_NOTION_HOST}/p/private-coordinate">Reading</a>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
    [
      String.raw`<script type="application/ld+json">{"url":"https:\/\/${APP_NOTION_HOST}\/p\/private-coordinate"}</script>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
    [
      String.raw`<script type="application/ld+json">{"url":"https:\u002f\u002fapp\u002enotion\u002ecom\/p\/private-coordinate"}</script>`,
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    ],
  ];

  for (const [html, code] of cases) {
    await t.test(code, async (t) => {
      const paths = await fixture(t, html);
      await assertContractFailure(
        materializePublicReferences({ ...paths, environment: {} }),
        code,
      );
    });
  }
});

test("scans the complete copied subtree for routes, tokens, and embedded configuration", async (t) => {
  await t.test("direct route in a non-HTML file", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await writeFile(
      join(paths.sourceRoot, "route.json"),
      JSON.stringify({ route: `https://${APP_NOTION_HOST}/p/private-coordinate` }),
      "utf8",
    );
    await assertContractFailure(
      materializePublicReferences({
        ...paths,
        environment: { [PRIMARY_KEY]: "https://registry.example/one" },
      }),
      "PUBLIC_REFERENCE_DIRECT_NOTION_URL",
    );
  });

  await t.test("token outside materialized HTML", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await writeFile(
      join(paths.sourceRoot, "route.js"),
      `export const route = "{{${PRIMARY_KEY}}}";`,
      "utf8",
    );
    await assertContractFailure(
      materializePublicReferences({
        ...paths,
        environment: { [PRIMARY_KEY]: "https://registry.example/one" },
      }),
      "PUBLIC_REFERENCE_TOKEN_SCOPE",
    );
  });

  await t.test("configuration inside copied source", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await writeFile(
      join(paths.sourceRoot, ".env.public"),
      `${PRIMARY_KEY}=https://registry.example/one\n`,
      "utf8",
    );
    await assertContractFailure(
      materializePublicReferences({
        ...paths,
        environment: { [PRIMARY_KEY]: "https://registry.example/one" },
      }),
      "PUBLIC_REFERENCE_SOURCE_CONFIG",
    );
  });
});

test("rejects ambiguous file configuration while ignoring unrelated process values", async (t) => {
  await t.test("duplicate required key", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await writeFile(
      paths.configPath,
      `${PRIMARY_KEY}=https://registry.example/one\n${PRIMARY_KEY}=https://registry.example/two\n`,
      "utf8",
    );
    await assertContractFailure(
      materializePublicReferences({ ...paths, environment: {} }),
      "PUBLIC_REFERENCE_CONFIG_DUPLICATE",
    );
  });

  await t.test("public key outside the Registry namespace", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await writeFile(
      paths.configPath,
      `${PRIMARY_KEY}=https://registry.example/one\nPUBLIC_URL_OTHER_UNUSED=https://registry.example/unused\n`,
      "utf8",
    );
    await assertContractFailure(
      materializePublicReferences({ ...paths, environment: {} }),
      "PUBLIC_REFERENCE_CONFIG_NAMESPACE",
    );
  });

  await t.test("unused Registry key remains additive", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await writeFile(
      paths.configPath,
      `${PRIMARY_KEY}=https://registry.example/one\nPUBLIC_URL_REGISTRY_UNUSED=https://registry.example/unused\n`,
      "utf8",
    );
    await materializePublicReferences({ ...paths, environment: {} });
  });

  await t.test("unrelated process key", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await materializePublicReferences({
      ...paths,
      environment: {
        [PRIMARY_KEY]: "https://registry.example/one",
        UNRELATED_RUNTIME_VALUE: "kept outside the materializer",
      },
    });
  });
});

test("bounds source and output trees and replaces only tool-owned generations", async (t) => {
  await t.test("overlapping output", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await assertContractFailure(
      materializePublicReferences({
        ...paths,
        outputRoot: join(paths.sourceRoot, "generated"),
        environment: { [PRIMARY_KEY]: "https://registry.example/one" },
      }),
      "PUBLIC_REFERENCE_PATH_OVERLAP",
    );
  });

  await t.test("source symlink", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await writeFile(join(paths.sourceRoot, "asset.txt"), "asset", "utf8");
    if (
      !(await symlinkOrSkip(
        t,
        "asset.txt",
        join(paths.sourceRoot, "linked-asset.txt"),
        "file",
      ))
    ) {
      return;
    }
    await assertContractFailure(
      materializePublicReferences({
        ...paths,
        environment: { [PRIMARY_KEY]: "https://registry.example/one" },
      }),
      "PUBLIC_REFERENCE_SOURCE_SYMLINK",
    );
  });

  await t.test("unowned existing output", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    await mkdir(paths.outputRoot, { recursive: true });
    await writeFile(join(paths.outputRoot, "keep.txt"), "keep", "utf8");
    await assertContractFailure(
      materializePublicReferences({
        ...paths,
        environment: { [PRIMARY_KEY]: "https://registry.example/one" },
      }),
      "PUBLIC_REFERENCE_OUTPUT_OWNERSHIP",
    );
    assert.equal(await readFile(join(paths.outputRoot, "keep.txt"), "utf8"), "keep");
  });

  await t.test("symbolic output parent", async (t) => {
    const paths = await fixture(t, pageWithTwin());
    const external = await mkdtemp(join(tmpdir(), "public-reference-output-target-"));
    t.after(() => rm(external, { recursive: true, force: true }));
    if (!(await symlinkOrSkip(t, external, join(paths.root, "generated"), "dir"))) {
      return;
    }
    await assertContractFailure(
      materializePublicReferences({
        ...paths,
        environment: { [PRIMARY_KEY]: "https://registry.example/one" },
      }),
      "PUBLIC_REFERENCE_OUTPUT_PARENT",
    );
  });
});

test("a successful rebuild replaces the complete prior generation", async (t) => {
  const paths = await fixture(t, pageWithTwin());
  await materializePublicReferences({
    ...paths,
    environment: { [PRIMARY_KEY]: "https://registry.example/first" },
  });
  await writeFile(join(paths.outputRoot, "stale.txt"), "stale", "utf8");

  await materializePublicReferences({
    ...paths,
    environment: { [PRIMARY_KEY]: "https://registry.example/second" },
  });
  await assert.rejects(readFile(join(paths.outputRoot, "stale.txt")), {
    code: "ENOENT",
  });
  assert.match(
    await readFile(join(paths.outputRoot, "context-canvas", "index.html"), "utf8"),
    /https:\/\/registry\.example\/second/,
  );
});

test("retains the recovery generation when publish and automatic restore both fail", async (t) => {
  const paths = await fixture(t, pageWithTwin());
  await materializePublicReferences({
    ...paths,
    environment: { [PRIMARY_KEY]: "https://registry.example/accepted" },
  });

  let renameCall = 0;
  const publishRename = async (source, destination) => {
    renameCall += 1;
    if (renameCall === 1) return rename(source, destination);
    throw new Error("synthetic rename failure");
  };
  await assertContractFailure(
    materializePublicReferences({
      ...paths,
      environment: { [PRIMARY_KEY]: "https://registry.example/replacement" },
      publishRename,
    }),
    "PUBLIC_REFERENCE_OUTPUT_RESTORE",
  );

  const outputParent = dirname(paths.outputRoot);
  const recoveries = (await readdir(outputParent)).filter((name) =>
    name.startsWith(".public-references-"),
  );
  assert.equal(recoveries.length, 1);
  const recoveryRoot = join(outputParent, recoveries[0]);
  const accepted = await readFile(
    join(recoveryRoot, "previous-generation", "context-canvas", "index.html"),
    "utf8",
  );
  assert.match(accepted, /https:\/\/registry\.example\/accepted/);
  assert.equal(renameCall, 3);
});

test("canonicalizes configured URLs and keeps JSON-LD inside its script element", async (t) => {
  const paths = await fixture(t, pageWithTwin());
  const configured = "https://REGISTRY.example/read?next=</script><p>outside</p>";
  const expected = new URL(configured).href;
  await materializePublicReferences({
    ...paths,
    environment: { [PRIMARY_KEY]: configured },
  });

  const generated = await readFile(
    join(paths.outputRoot, "context-canvas", "index.html"),
    "utf8",
  );
  assert.equal(generated.includes("</script><p>outside</p>"), false);
  const bodies = jsonLdBodies(generated);
  assert.equal(bodies.length, 1);
  assert.equal(JSON.parse(bodies[0]).citation, expected);
  assert.equal((generated.match(/<script\b/gi) ?? []).length, 1);
  assert.equal((generated.match(/<\/script>/gi) ?? []).length, 1);
});

test("the repository source materializes from discovered keys without frozen route counts", async (t) => {
  const inventory = await inspectPublicReferenceSource();
  assert.ok(inventory.keys.size > 0);
  assert.ok(inventory.occurrenceCount > 0);
  for (const key of inventory.keys) {
    assert.equal(key.startsWith(PUBLIC_REFERENCE_NAMESPACE), true);
  }

  const example = await readFile(
    join(dirname(PUBLIC_REFERENCE_SOURCE), ".env.public.example"),
    "utf8",
  );
  const exampleKeys = new Set(
    [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]),
  );
  for (const key of inventory.keys) {
    assert.equal(exampleKeys.has(key), true, `${key} is discoverable in .env.public.example`);
  }

  const before = new Map();
  for (const record of inventory.htmlFiles) {
    if (record.inspection.occurrenceCount === 0) continue;
    before.set(record.path, await readFile(record.path, "utf8"));
  }

  const root = await mkdtemp(join(tmpdir(), "public-reference-repository-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const environment = Object.fromEntries(
    [...inventory.keys].map((key) => [
      key,
      `https://registry.example/readings/${key.slice(PUBLIC_REFERENCE_NAMESPACE.length).toLowerCase()}`,
    ]),
  );
  const outputRoot = join(root, "context-canvas-project-surface");
  await materializePublicReferences({
    outputRoot,
    outputBoundaryRoot: root,
    configPath: join(root, "no-config-file"),
    environment,
  });

  for (const record of inventory.htmlFiles) {
    if (record.inspection.occurrenceCount === 0) continue;
    assert.equal(await readFile(record.path, "utf8"), before.get(record.path));
    const generated = await readFile(join(outputRoot, record.safePath), "utf8");
    assert.equal(generated.includes("{{PUBLIC_URL"), false);
    for (const body of jsonLdBodies(generated)) {
      if (body.includes("https://registry.example/")) JSON.parse(body);
    }
  }
});
