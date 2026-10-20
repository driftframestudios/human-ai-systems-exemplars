import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const SOURCE_PATH = 'context-canvas-project-surface/data/visualization-fidelity/research/sources.v1.json';
export const SUMMARY_PATH = 'context-canvas-project-surface/data/visualization-fidelity/research/summary.v1.json';
export const SOURCE_SHA256 = 'f3f773b0c939d4c239379bbfd6275979df106da93d67de518e90737ea5d7df45';
export const EVIDENCE_KINDS = Object.freeze(['empirical-study', 'technical-guidance', 'practitioner-source']);
export const TOPIC_KEYS = Object.freeze([
  'comparison', 'interpretation', 'distribution-and-uncertainty',
  'accessibility', 'web-delivery-and-state', 'production-and-validation',
]);

// Exact reviewed public routes, not a general URL/publication-permission detector.
// Adding another route requires source inspection and a reviewed source revision.
const APPROVED_SOURCE_URIS = new Set([
  "https://doi.org/10.1109/TVCG.2021.3068337",
  "https://content.ieeevis.org/year/2021/paper_v-tvcg-9385921.html",
  "https://doi.org/10.1371/journal.pbio.1002128",
  "https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002128",
  "https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/",
  "https://www.w3.org/WAI/tutorials/images/complex/",
  "https://www.w3.org/TR/SVG/conform.html",
  "https://d3js.org/d3-scale",
  "https://d3js.org/d3-selection/joining",
  "https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.savefig.html",
  "https://service-manual.ons.gov.uk/data-visualisation/chart-types/line-chart",
  "https://clauswilke.com/dataviz/coordinate-systems-axes.html",
  "https://perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf",
  "https://www.perceptualedge.com/articles/misc/Bullet_Graph_Design_Spec.pdf",
  "https://www.perceptualedge.com/articles/visual_business_intelligence/thoughtful_defaults.pdf",
  "https://www.storytellingwithdata.com/blog/two-tips-for-better-graphs",
  "https://kindlight.systems/research-atlas-observatory/visualization-fidelity-atlas-data-shape-cognitive-move-visual-form"
]);
const INSPECTION_SCOPES = new Set([
  'publisher-abstract', 'author-abstract', 'full-guidance',
  'article-text', 'registry-connector-content',
]);
const MAX_RECORDS = 64;
const MAX_SOURCE_CHARACTERS = 250_000;
const RECORD_FIELDS = [
  'id', 'recordKind', 'title', 'creditedTo', 'version', 'sourceUri', 'inspectedOn',
  'inspectedSources', 'evidenceKind', 'evidenceStanding', 'topics',
  'supportedConsequence', 'transferBoundary', 'citationUse', 'realWorldApplication',
];
const SELECTION_FIELDS = [
  'basis', 'authorization', 'enumeration', 'uniqueWorkRule', 'membershipRule',
  'coverage', 'inspectionBoundary', 'exclusions',
];

function ownFields(value, fields, label) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)
      || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(label + ' requires a plain record with own data fields.');
  }
  const keys = Reflect.ownKeys(value);
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key))) {
    throw new TypeError(label + ' has missing or unsupported own fields.');
  }
  for (const field of fields) {
    const descriptor = Object.getOwnPropertyDescriptor(value, field);
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      throw new TypeError(label + ' requires enumerable own data fields.');
    }
  }
  return value;
}

function arrayValues(value, max, label, min = 0) {
  if (!Array.isArray(value) || value.length < min || value.length > max
      || Reflect.ownKeys(value).length !== value.length + 1) {
    throw new TypeError(label + ' requires a bounded dense array without extra properties.');
  }
  const result = [];
  for (let index = 0; index < value.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) {
      throw new TypeError(label + ' requires owned array entries.');
    }
    result.push(descriptor.value);
  }
  return result;
}

function textValue(value, label, max = 1024) {
  if (typeof value !== 'string' || !value.length || value.length > max
      || value.trim() !== value || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new TypeError(label + ' requires bounded, nonempty text without surrounding whitespace or controls.');
  }
  return value;
}

function dateValue(value) {
  textValue(value, 'Date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) throw new TypeError('Date requires YYYY-MM-DD.');
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new TypeError('Date requires a real calendar date.');
  }
  return value;
}

function sourceUri(value) {
  textValue(value, 'Source URI', 2048);
  if (!APPROVED_SOURCE_URIS.has(value)) {
    throw new TypeError('Source URI is outside the exact reviewed public-route set.');
  }
  return value;
}

/**
 * O(n + memberships) with bounded fields and at most four inspected routes/work.
 * O(n + memberships) output/identity space. Accepts plain data, not live objects
 * or proxies; never mutates input and returns fully detached records.
 * Structural admission does not independently verify authors' source claims.
 */
export function validateResearchRecords(records) {
  const input = arrayValues(records, MAX_RECORDS, 'Research records');
  const identities = new Set();
  const workUris = new Set();
  return input.map(value => {
    const record = ownFields(value, RECORD_FIELDS, 'Research work');
    const id = textValue(record.id, 'Work id', 96);
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id) || identities.has(id)) {
      throw new TypeError('Invalid or duplicate work identity.');
    }
    identities.add(id);
    if (record.recordKind !== 'work' || !EVIDENCE_KINDS.includes(record.evidenceKind)) {
      throw new TypeError('Invalid record kind or evidence kind.');
    }
    if (record.citationUse !== 'observed-in-skill-evidence-map'
        || record.realWorldApplication !== 'unspecified') {
      throw new TypeError('Citation occurrence and unspecified application must remain distinct.');
    }
    const canonicalUri = sourceUri(record.sourceUri);
    const inspectionUris = new Set();
    const inspectedSources = arrayValues(record.inspectedSources, 4, 'Inspected sources', 1).map(item => {
      ownFields(item, ['uri', 'scope'], 'Inspected source');
      const uri = sourceUri(item.uri);
      if (inspectionUris.has(uri) || !INSPECTION_SCOPES.has(item.scope)) {
        throw new TypeError('Duplicate inspection URI or invalid inspection scope.');
      }
      inspectionUris.add(uri);
      return { uri, scope: item.scope };
    });
    for (const uri of new Set([canonicalUri, ...inspectionUris])) {
      if (workUris.has(uri)) throw new TypeError('A source URI is assigned to more than one work.');
      workUris.add(uri);
    }
    const topics = arrayValues(record.topics, TOPIC_KEYS.length, 'Topics', 1);
    const memberships = new Set();
    for (const topic of topics) {
      if (!TOPIC_KEYS.includes(topic) || memberships.has(topic)) {
        throw new TypeError('Invalid or duplicate topic membership.');
      }
      memberships.add(topic);
    }
    return {
      id, recordKind: 'work', title: textValue(record.title, 'Title', 300),
      creditedTo: textValue(record.creditedTo, 'Source credit', 300),
      version: textValue(record.version, 'Source version', 300),
      sourceUri: canonicalUri, inspectedOn: dateValue(record.inspectedOn),
      inspectedSources, evidenceKind: record.evidenceKind,
      evidenceStanding: textValue(record.evidenceStanding, 'Evidence standing'), topics,
      supportedConsequence: textValue(record.supportedConsequence, 'Supported consequence'),
      transferBoundary: textValue(record.transferBoundary, 'Transfer boundary'),
      citationUse: record.citationUse, realWorldApplication: 'unspecified',
    };
  });
}

/** O(text length + n + memberships); admits one bounded JSON envelope, not a census. */
export function parseResearchSource(text) {
  if (typeof text !== 'string' || text.length > MAX_SOURCE_CHARACTERS) {
    throw new TypeError('Research source requires bounded JSON text.');
  }
  let source;
  try { source = JSON.parse(text); } catch { throw new TypeError('Invalid research source JSON.'); }
  ownFields(source, ['id', 'version', 'selectedOn', 'selection', 'records'], 'Research source');
  if (source.id !== 'atlas-public-research-extract.v1' || source.version !== 1) {
    throw new TypeError('Unsupported research source identity or version.');
  }
  const selectedOn = dateValue(source.selectedOn);
  ownFields(source.selection, SELECTION_FIELDS, 'Research selection');
  if (source.selection.basis !== 'bounded-public-bibliography-extract') {
    throw new TypeError('Research selection requires a bounded public bibliography basis.');
  }
  const selection = {};
  for (const key of SELECTION_FIELDS) {
    selection[key] = key === 'exclusions'
      ? arrayValues(source.selection.exclusions, 12, 'Selection exclusions', 1).map(item => textValue(item, 'Exclusion'))
      : textValue(source.selection[key], 'Selection description');
  }
  const records = validateResearchRecords(source.records);
  if (records.some(record => record.inspectedOn > selectedOn)) {
    throw new TypeError('Source inspection cannot follow the selection date.');
  }
  return { id: source.id, version: 1, selectedOn, selection, records };
}

const emptyKinds = () => Object.fromEntries(EVIDENCE_KINDS.map(kind => [kind, 0]));

function summarizeValidated(records) {
  const totals = { works: records.length, topicMemberships: 0, multiTopicWorks: 0, byEvidenceKind: emptyKinds() };
  const topics = TOPIC_KEYS.map(id => ({ id, works: 0, byEvidenceKind: emptyKinds(), workIds: [] }));
  const byTopic = new Map(topics.map(topic => [topic.id, topic]));
  for (const record of records) {
    totals.byEvidenceKind[record.evidenceKind] += 1;
    totals.topicMemberships += record.topics.length;
    totals.multiTopicWorks += Number(record.topics.length > 1);
    for (const id of record.topics) {
      const topic = byTopic.get(id);
      topic.works += 1;
      topic.byEvidenceKind[record.evidenceKind] += 1;
      topic.workIds.push(record.id);
    }
  }
  return { totals, topics };
}

/** O(n + memberships) time/space; fixed topic/kind order, supplied work order. */
export function summarizeResearch(records) {
  return summarizeValidated(validateResearchRecords(records));
}

/** Pure records + aggregates; contains no file digest or verified-file standing. */
export function researchDocument(records) {
  const admitted = validateResearchRecords(records);
  return {
    id: 'atlas-public-research-summary.v1', version: 1,
    population: 'Supplied work records and their editorial topic memberships',
    counting: {
      work: 'One admitted work id; source URLs and inspected sections do not add works',
      membership: 'One work in one editorially assigned topic; topic totals can overlap',
      evidenceKind: 'One descriptive kind per work, not an evidence-strength score',
      citationUse: 'Record declarations refer to citation occurrence, not organizational application',
      zero: 'Zero means no membership in this supplied set; wider coverage remains unspecified',
    },
    citationOwner: '.agents/skills/data-visualization-foundations/references/evidence-and-source-map.md',
    ...summarizeValidated(admitted),
    realWorldApplication: { standing: 'unspecified', count: null },
    records: admitted,
  };
}

/** Only this fixed-file boundary adds digest-backed, selected-extract provenance. */
export async function buildResearchData({ check = false } = {}) {
  const root = new URL('../', import.meta.url);
  const bytes = await readFile(new URL(SOURCE_PATH, root));
  if (createHash('sha256').update(bytes).digest('hex') !== SOURCE_SHA256) {
    throw new Error('Research source differs from the admitted public extract.');
  }
  const source = parseResearchSource(bytes.toString('utf8'));
  const document = {
    ...researchDocument(source.records),
    population: 'Explicitly selected public bibliography works; not a workspace census',
    source: {
      path: SOURCE_PATH, sha256: SOURCE_SHA256,
      standing: 'byte-verified-public-editorial-extract',
      selectedOn: source.selectedOn, selection: source.selection,
    },
  };
  const output = JSON.stringify(document, null, 2) + '\n';
  const destination = new URL(SUMMARY_PATH, root);
  if (check) {
    if (await readFile(destination, 'utf8') !== output) {
      throw new Error('Research summary differs from its source-owned derivation.');
    }
  } else await writeFile(destination, output);
  return { works: document.totals.works, topicMemberships: document.totals.topicMemberships, topics: document.topics.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 3 || !['--write', '--check'].includes(process.argv[2])) {
    throw new Error('Use --write or --check.');
  }
  console.log(JSON.stringify(await buildResearchData({ check: process.argv[2] === '--check' })));
}
