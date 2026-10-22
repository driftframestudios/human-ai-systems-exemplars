import '../../tools/node-runtime-admission.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildResearchData, EVIDENCE_KINDS, parseResearchSource, researchDocument,
  SOURCE_PATH, SOURCE_SHA256, SUMMARY_PATH, summarizeResearch, TOPIC_KEYS,
  validateResearchRecords,
} from '../../tools/atlas-research-data.mjs';

const uriA = 'https://www.w3.org/WAI/tutorials/images/complex/';
const uriB = 'https://d3js.org/d3-scale';
const uriC = 'https://perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf';
// Build the non-issued userinfo fixture through URL fields; literal credentials
// remain subject to the repository's unchanged secret-material boundary.
const userinfoUri = new URL(uriA);
userinfoUri.username = 'fixture';
userinfoUri.password = userinfoUri.username;

// These are independently authored structural fixtures, not source assessments.
function work(id = 'fixture-a', uri = uriA, evidenceKind = 'empirical-study', topics = ['comparison', 'interpretation']) {
  return {
    id, recordKind: 'work', title: 'Fixture work', creditedTo: 'Fixture source',
    version: 'Fixture version 1', sourceUri: uri, inspectedOn: '2026-10-04',
    inspectedSources: [{ uri, scope: 'full-guidance' }],
    evidenceKind, evidenceStanding: 'Supplied fixture declaration only.', topics,
    supportedConsequence: 'Exercise aggregate ownership.',
    transferBoundary: 'This fixture establishes no source or application claim.',
    citationUse: 'observed-in-skill-evidence-map', realWorldApplication: 'unspecified',
  };
}
const fixture = () => [
  work(),
  work('fixture-b', uriB, 'technical-guidance', ['comparison']),
  work('fixture-c', uriC, 'practitioner-source', ['accessibility', 'interpretation']),
];
function envelope(records = fixture()) {
  return {
    id: 'atlas-public-research-extract.v1', version: 1, selectedOn: '2026-10-04',
    selection: {
      basis: 'bounded-public-bibliography-extract',
      authorization: 'Fixture only; no publication authority.',
      enumeration: 'Only the supplied fixture records.',
      uniqueWorkRule: 'One work per id.',
      membershipRule: 'One membership per work and topic.',
      coverage: 'Supplied fixture only.',
      inspectionBoundary: 'Fixture declarations are not inspected-source evidence.',
      exclusions: ['Organizational application.'],
    },
    records,
  };
}
const kinds = (empirical, technical, practitioner) => ({
  'empirical-study': empirical, 'technical-guidance': technical, 'practitioner-source': practitioner,
});

test('independent overlap fixture separates unique works, kinds, and memberships', () => {
  const result = summarizeResearch(fixture());
  assert.deepEqual(result.totals, {
    works: 3, topicMemberships: 5, multiTopicWorks: 2, byEvidenceKind: kinds(1, 1, 1),
  });
  assert.deepEqual(result.topics, [
    { id: 'comparison', works: 2, byEvidenceKind: kinds(1, 1, 0), workIds: ['fixture-a', 'fixture-b'] },
    { id: 'interpretation', works: 2, byEvidenceKind: kinds(1, 0, 1), workIds: ['fixture-a', 'fixture-c'] },
    { id: 'distribution-and-uncertainty', works: 0, byEvidenceKind: kinds(0, 0, 0), workIds: [] },
    { id: 'accessibility', works: 1, byEvidenceKind: kinds(0, 0, 1), workIds: ['fixture-c'] },
    { id: 'web-delivery-and-state', works: 0, byEvidenceKind: kinds(0, 0, 0), workIds: [] },
    { id: 'production-and-validation', works: 0, byEvidenceKind: kinds(0, 0, 0), workIds: [] },
  ]);
});

test('zero selected works and zero topic memberships do not fabricate application absence', () => {
  const empty = researchDocument([]);
  assert.deepEqual(empty.totals, { works: 0, topicMemberships: 0, multiTopicWorks: 0, byEvidenceKind: kinds(0, 0, 0) });
  assert.ok(empty.topics.every(topic => topic.works === 0 && topic.workIds.length === 0));
  assert.deepEqual(empty.realWorldApplication, { standing: 'unspecified', count: null });
  const supplied = researchDocument([work()]);
  assert.equal(supplied.topics.find(topic => topic.id === 'accessibility').works, 0);
  assert.deepEqual(supplied.realWorldApplication, empty.realWorldApplication);
  assert.equal(parseResearchSource(JSON.stringify(envelope([]))).records.length, 0);
});

test('input, record companions, and aggregate results have independent ownership', () => {
  const records = fixture();
  const before = JSON.stringify(records);
  for (const record of records) {
    Object.freeze(record.topics);
    for (const inspected of record.inspectedSources) Object.freeze(inspected);
    Object.freeze(record.inspectedSources);
    Object.freeze(record);
  }
  Object.freeze(records);
  const doc = researchDocument(records);
  assert.equal(JSON.stringify(records), before);
  doc.records[0].topics.push('accessibility');
  doc.records[0].inspectedSources[0].scope = 'changed';
  doc.topics[0].workIds.push('changed');
  doc.totals.byEvidenceKind['empirical-study'] = 500;
  doc.topics[0].byEvidenceKind['empirical-study'] = 600;
  assert.equal(JSON.stringify(records), before);
  assert.equal(summarizeResearch(records).totals.byEvidenceKind['empirical-study'], 1);
  assert.equal(doc.topics[1].byEvidenceKind['empirical-study'], 1);
});

test('determinism retains supplied work order and fixed topic/kind order', () => {
  const records = fixture().reverse();
  const first = researchDocument(records);
  assert.deepEqual(researchDocument(records), first);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  assert.deepEqual(first.records.map(record => record.id), ['fixture-c', 'fixture-b', 'fixture-a']);
  assert.deepEqual(first.topics.map(topic => topic.id), TOPIC_KEYS);
  assert.deepEqual(Object.keys(first.totals.byEvidenceKind), EVIDENCE_KINDS);
  assert.deepEqual(first.topics[0].workIds, ['fixture-b', 'fixture-a']);
});

for (const [name, records] of [
  ['duplicate work id', [work(), work('fixture-a', uriB)]],
  ['duplicate canonical URI', [work(), work('fixture-b', uriA)]],
  ['shared inspected URI under another canonical route', [work(), { ...work('fixture-b', uriB), inspectedSources: [{ uri: uriA, scope: 'full-guidance' }] }]],
  ['missing collection', undefined], ['null collection', null], ['object collection', {}],
  ['null work', [null]], ['missing record fields', [{}]], ['sparse collection', Array(1)],
  ['record limit', Array(65).fill(work())],
]) test('record admission rejects ' + name, () => assert.throws(() => validateResearchRecords(records), TypeError));

for (const field of Object.keys(work())) {
  test('record admission requires an owned field: ' + field, () => {
    const original = work();
    const inherited = Object.assign(Object.create({ [field]: original[field] }), original);
    delete inherited[field];
    assert.throws(() => summarizeResearch([inherited]), TypeError);
  });
}
test('null-prototype data records remain admissible', () => {
  assert.equal(validateResearchRecords([Object.assign(Object.create(null), work())])[0].id, 'fixture-a');
});
test('accessor record fields are rejected without invoking them', () => {
  let reads = 0;
  const candidate = work();
  Object.defineProperty(candidate, 'title', { enumerable: true, get() { reads += 1; return 'surprise'; } });
  assert.throws(() => validateResearchRecords([candidate]), TypeError);
  assert.equal(reads, 0);
});
test('inherited topics and inspected-source fields are not consumed', () => {
  const candidate = work();
  const topics = Array(1);
  const inheritedArray = Object.create(Array.prototype);
  inheritedArray[0] = 'comparison';
  Object.setPrototypeOf(topics, inheritedArray);
  assert.throws(() => validateResearchRecords([{ ...candidate, topics }]), TypeError);
  assert.throws(() => validateResearchRecords([{ ...candidate, inspectedSources: [Object.create(candidate.inspectedSources[0])] }]), TypeError);
});
test('array properties and accessor entries are rejected without executing them', () => {
  const records = [work()];
  records.extra = 'unsupported';
  assert.throws(() => validateResearchRecords(records), TypeError);
  let reads = 0;
  const topics = ['comparison'];
  Object.defineProperty(topics, '0', { enumerable: true, get() { reads += 1; return 'comparison'; } });
  assert.throws(() => validateResearchRecords([{ ...work(), topics }]), TypeError);
  assert.equal(reads, 0);
});

for (const [field, value] of [
  ['id', ''], ['id', 0], ['id', '__proto__'], ['id', 'UPPERCASE'],
  ['recordKind', 'citation'], ['recordKind', null], ['recordKind', ['work']],
  ['evidenceKind', 'unclassified'], ['evidenceKind', '__proto__'], ['evidenceKind', 0],
  ['topics', []], ['topics', ['comparison', 'comparison']], ['topics', ['unknown']],
  ['topics', ['__proto__']], ['topics', [0]], ['topics', null],
  ['title', ''], ['title', ' leading'], ['title', 'line\nbreak'], ['title', 0],
  ['version', ''], ['version', 1], ['evidenceStanding', ''], ['supportedConsequence', ''],
  ['transferBoundary', null], ['creditedTo', 'x'.repeat(301)],
  ['inspectedOn', '2026-02-30'], ['inspectedOn', '2026-2-03'], ['inspectedOn', null],
  ['citationUse', 'observed-application'], ['citationUse', 'none'],
  ['realWorldApplication', 'observed'], ['realWorldApplication', 'none'],
  ['realWorldApplication', 0], ['realWorldApplication', null], ['realWorldApplication', false],
  ['inspectedSources', []], ['inspectedSources', [{ uri: uriA, scope: 'unknown' }]],
  ['inspectedSources', [{ uri: uriA }]],
  ['inspectedSources', [{ uri: uriA, scope: 'full-guidance' }, { uri: uriA, scope: 'article-text' }]],
]) {
  test('field boundary rejects ' + field + '=' + JSON.stringify(value), () => {
    assert.throws(() => validateResearchRecords([{ ...work(), [field]: value }]), TypeError);
  });
}

for (const [index, uri] of [
  'http://www.w3.org/WAI/tutorials/images/complex/',
  'https://www.w3.org.evil.invalid/WAI/tutorials/images/complex/',
  userinfoUri.href,
  'https://www.w3.org/WAI/tutorials/images/complex/?token=example',
  'https://www.w3.org/WAI/tutorials/images/complex/#different',
  'https://www.w3.org/unreviewed', ('https://' + 'notion.so/'), 'https://localhost/',
  'file:///tmp/example', 'data:text/plain,example', 'javascript:alert(1)', '',
  ' ' + uriA, uriA + '\n', null, 0,
].entries()) {
  test(`rejects source URI case ${index + 1}`, () => {
    assert.throws(() => validateResearchRecords([{ ...work(), sourceUri: uri }]), TypeError);
    assert.throws(() => validateResearchRecords([{ ...work(), inspectedSources: [{ uri, scope: 'full-guidance' }] }]), TypeError);
  });
}

for (const [field, value] of [
  ['applicationCount', 0], ['workspaceCount', 80], ['source', { standing: 'verified' }],
  ['sha256', 'pretend-digest'], ['impactScore', 1],
]) test('work rejects unsupported claim field ' + field, () => {
  assert.throws(() => validateResearchRecords([{ ...work(), [field]: value }]), TypeError);
});

for (const [name, text] of [
  ['empty text', ''], ['nontext input', null], ['oversize input', ' '.repeat(250_001)],
  ['malformed JSON', '{'], ['null envelope', 'null'], ['array envelope', '[]'],
  ['missing fields', '{}'],
  ['wrong identity', JSON.stringify({ ...envelope(), id: 'another-source' })],
  ['string version', JSON.stringify({ ...envelope(), version: '1' })],
  ['unknown version', JSON.stringify({ ...envelope(), version: 2 })],
  ['invalid date', JSON.stringify({ ...envelope(), selectedOn: '2026-09-31' })],
  ['inspection after selection', JSON.stringify({ ...envelope(), selectedOn: '2026-10-03' })],
  ['missing selection contract', JSON.stringify({ ...envelope(), selection: {} })],
  ['census basis', JSON.stringify({ ...envelope(), selection: { ...envelope().selection, basis: 'workspace-census' } })],
  ['missing exclusions', JSON.stringify({ ...envelope(), selection: { ...envelope().selection, exclusions: [] } })],
  ['extra envelope provenance', JSON.stringify({ ...envelope(), source: { sha256: 'invented' } })],
]) test('source envelope rejects ' + name, () => assert.throws(() => parseResearchSource(text), TypeError));

test('pure parsing and fixture documents never acquire verified-file provenance', () => {
  const parsed = parseResearchSource(JSON.stringify(envelope()));
  const doc = researchDocument(parsed.records);
  for (const result of [parsed, doc, summarizeResearch(parsed.records)]) {
    assert.equal(Object.hasOwn(result, 'source'), false);
    assert.equal(Object.hasOwn(result, 'sha256'), false);
  }
  assert.equal(doc.population, 'Supplied work records and their editorial topic memberships');
  assert.ok(doc.records.every(record => record.realWorldApplication === 'unspecified'));
  parsed.records[0].topics.push('accessibility');
  assert.equal(doc.records[0].topics.length, 2);
});

test('selected public extract has independently specified counts and file-bound provenance', async () => {
  const sourceBytes = await readFile(new URL('../../' + SOURCE_PATH, import.meta.url));
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'), SOURCE_SHA256);
  const parsed = parseResearchSource(sourceBytes.toString('utf8'));
  const aggregate = summarizeResearch(parsed.records);
  assert.equal(parsed.selectedOn, '2026-10-04');
  assert.equal(parsed.records.find(record => record.id === 'w3c-svg-processing').version,
    'SVG 2, W3C Candidate Recommendation, 2018-10-04; conformance chapter inspected 2026-10-04');
  assert.deepEqual(aggregate.totals, {
    works: 13, topicMemberships: 21, multiTopicWorks: 7, byEvidenceKind: kinds(2, 6, 5),
  });
  assert.deepEqual(aggregate.topics.map(topic => [topic.id, topic.works, topic.byEvidenceKind]), [
    ['comparison', 5, kinds(1, 1, 3)], ['interpretation', 7, kinds(1, 2, 4)],
    ['distribution-and-uncertainty', 2, kinds(1, 1, 0)], ['accessibility', 2, kinds(0, 1, 1)],
    ['web-delivery-and-state', 2, kinds(0, 2, 0)], ['production-and-validation', 3, kinds(0, 2, 1)],
  ]);
  assert.deepEqual(await buildResearchData({ check: true }), { works: 13, topicMemberships: 21, topics: 6 });
  const doc = JSON.parse(await readFile(new URL('../../' + SUMMARY_PATH, import.meta.url), 'utf8'));
  assert.equal(doc.source.sha256, SOURCE_SHA256);
  assert.equal(doc.source.standing, 'byte-verified-public-editorial-extract');
  assert.deepEqual(doc.source.selection, parsed.selection);
  assert.deepEqual(doc.records, parsed.records);
  assert.deepEqual(doc.realWorldApplication, { standing: 'unspecified', count: null });
});
