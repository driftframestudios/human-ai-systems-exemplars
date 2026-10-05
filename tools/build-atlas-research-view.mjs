/** Public research extract projection. O(works + topic memberships + output bytes).
 * The admitted bibliography owns source selection; this owner supplies the view.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildResearchData, researchDocument, SUMMARY_PATH, EVIDENCE_KINDS } from './atlas-research-data.mjs';
import { escapeGalleryText as escape, renderGalleryTable } from '../context-canvas-project-surface/context-canvas/atlas-gallery-table.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PAGE = 'context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html';
export const RESEARCH_SVG = 'context-canvas-project-surface/img/plot/atlas_public_research.svg';
const START = '<!-- atlas-public-research:start -->';
const END = '<!-- atlas-public-research:end -->';
const ANCHOR = '<!-- atlas-manufacturing-gallery:end -->';
export const TOPIC_NAMES = Object.freeze({
  comparison: 'Comparison', interpretation: 'Interpretation',
  'distribution-and-uncertainty': 'Distribution and uncertainty', accessibility: 'Accessibility',
  'web-delivery-and-state': 'Web delivery and state', 'production-and-validation': 'Production and validation',
});
export const KIND_NAMES = Object.freeze({
  'empirical-study': 'Empirical study', 'technical-guidance': 'Technical guidance', 'practitioner-source': 'Practitioner source',
});

const suppliedProvenance = Object.freeze({
  verified: false,
  heading: 'SUPPLIED WORK RECORDS / EDITORIAL TOPIC MEMBERSHIP',
  sourceLine: 'Source: supplied work records / selection provenance unspecified.',
  selectionText: 'Selection provenance is unspecified for these supplied work records.',
  tableCaption: 'Supplied work records by topic and evidence kind',
});
const counted = (value, singular, plural = singular + 's') => `${value} ${value === 1 ? singular : plural}`;

function overlapNarrative(totals) {
  if (!totals.works) return 'No works or topic memberships are supplied.';
  if (!totals.multiTopicWorks) {
    return 'No work belongs to more than one topic in this set; work and membership totals are equal.';
  }
  return `${counted(totals.multiTopicWorks, 'work')} ${totals.multiTopicWorks === 1 ? 'belongs' : 'belong'} to several topics; adding row totals counts memberships, not unique works.`;
}

function interpretationNarrative(topics) {
  const row = topics.find(topic => topic.id === 'interpretation');
  return `The interpretation row contains ${counted(row.works, 'work')}, including `
    + `${counted(row.byEvidenceKind['empirical-study'], 'empirical study', 'empirical studies')}, `
    + `${counted(row.byEvidenceKind['technical-guidance'], 'technical-guidance source')} and `
    + `${counted(row.byEvidenceKind['practitioner-source'], 'practitioner source')}. `
    + (row.works > 1 ? 'Read these contributions together while keeping each source\'s method and evidence boundary visible.'
      : row.works === 1 ? 'This single contribution retains its own method and evidence boundary.'
        : 'No supplied work is assigned to this topic.');
}

/** Re-derive counts from admitted work records; fixture inputs inherit no file digest. */
function viewData(document) {
  const derived = researchDocument(document.records);
  assert.deepEqual(document.totals, derived.totals, 'Research totals retain their record-derived meaning.');
  assert.deepEqual(document.topics, derived.topics, 'Research topic cells retain their record-derived meaning.');
  return derived;
}

function tableFrom(derived, provenance) {
  return {
    caption: provenance.tableCaption,
    columns: ['Editorial topic', ...EVIDENCE_KINDS.map(kind => KIND_NAMES[kind]), 'Works in topic'],
    rows: derived.topics.map(topic => ({ label: TOPIC_NAMES[topic.id], values: [
      ...EVIDENCE_KINDS.map(kind => topic.byEvidenceKind[kind]), topic.works,
    ] })),
  };
}

export function researchTable(document) {
  return tableFrom(viewData(document), suppliedProvenance);
}

function figureFrom({ totals, topics }, provenance) {
  const maximum = Math.max(1, ...topics.flatMap(topic => EVIDENCE_KINDS.map(kind => topic.byEvidenceKind[kind])));
  const marks = topics.map((topic, index) => {
    const y = 260 + index * 55;
    return `<g id="research-topic-${topic.id}" aria-label="${escape(`${TOPIC_NAMES[topic.id]}: ${counted(topic.works, 'work')}`)}">
      <text x="40" y="${y + 28}" class="label">${escape(TOPIC_NAMES[topic.id])}</text>
      ${EVIDENCE_KINDS.map((kind, column) => {
        const count = topic.byEvidenceKind[kind];
        const x = 540 + column * 170;
        return `<g aria-label="${escape(`${KIND_NAMES[kind]}: ${count}`)}"><rect x="${x}" y="${y}" width="150" height="43" fill="${count === 0 ? '#fffcf5' : '#2855f3'}" fill-opacity="${count === 0 ? 1 : (0.2 + 0.8 * count / maximum).toFixed(2)}" stroke="#bbc8d7"/><text x="${x + 75}" y="${y + 29}" class="number"${count >= maximum * 0.6 ? ' fill="#fffcf5"' : ''} text-anchor="middle">${count}</text></g>`;
      }).join('')}
      <text x="1130" y="${y + 29}" class="number" text-anchor="end">${topic.works}</text>
    </g>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" width="1200" height="760" role="img" aria-labelledby="research-title research-description">
<title id="research-title">A selected bibliography supports several kinds of design decision</title>
<desc id="research-description">${counted(totals.works, provenance.verified ? 'unique public work' : 'supplied work record')} ${totals.works === 1 ? 'has' : 'have'} ${counted(totals.topicMemberships, 'editorial topic membership')}. ${escape(overlapNarrative(totals))} Evidence kinds describe source form rather than quality scores. Zero means no membership in this supplied set. Wider coverage and organizational application remain unspecified.</desc>
<style>text{font-family:Verdana,sans-serif;fill:#1d3557}.label{font-size:19px}.small{font-size:16px}.number{font-size:25px;font-variant-numeric:tabular-nums}text[fill="#fffcf5"]{fill:#fffcf5}</style>
<rect width="1200" height="760" fill="#fffcf5"/>
<g id="research-reading-context"><text x="40" y="42" class="small" font-weight="bold">${escape(provenance.heading)}</text>
<text x="40" y="98" font-size="34" font-weight="bold">Different sources answer different questions</text>
<text x="40" y="139" class="label">${counted(totals.works, 'work')} / ${counted(totals.topicMemberships, 'topic membership')} / ${counted(totals.multiTopicWorks, 'work')} in several topics</text>
<text x="40" y="174" class="small">${escape(provenance.selectionText)}</text></g>
<g id="research-evidence-matrix"><text x="40" y="232" class="small" font-weight="bold">TOPIC</text>
${['Empirical|study', 'Technical|guidance', 'Practitioner|source'].map((label, index) => `<text x="${615 + index * 170}" y="218" class="small" text-anchor="middle"><tspan x="${615 + index * 170}">${label.split('|')[0]}</tspan><tspan x="${615 + index * 170}" dy="20">${label.split('|')[1]}</tspan></text>`).join('')}
<text x="1130" y="218" class="small" text-anchor="end"><tspan x="1130">Works</tspan><tspan x="1130" dy="20">in topic</tspan></text>${marks}</g>
<g id="research-source-context"><text x="40" y="625" class="small">Darker cells contain more works. Numerals retain every count, including zero.</text>
<text x="40" y="658" class="small">${escape(overlapNarrative(totals))}</text>
<text x="40" y="697" class="small">${escape(provenance.sourceLine)}</text>
<text x="40" y="735" class="small">Application: unspecified. The companion table and source list retain exact membership and scope.</text></g>
</svg>\n`;
}

export function renderResearchFigure(document) {
  return figureFrom(viewData(document), suppliedProvenance);
}

function sectionFrom(derived, provenance) {
  const { totals, records, topics } = derived;
  const citationText = provenance.verified
    ? `${counted(totals.works, 'work')} ${totals.works === 1 ? 'has' : 'have'} a recorded citation in the skill evidence map. That occurrence establishes a reference relationship.`
    : `${counted(totals.works, 'supplied work record')} ${totals.works === 1 ? 'declares' : 'declare'} a citation in the skill evidence map. These declarations do not verify citation occurrence or selection provenance.`;
  const sources = records.map(record => `<li id="research-${escape(record.id)}">
    <h4 class="txt-h4"><a href="${escape(record.sourceUri)}">${escape(record.title)}</a></h4>
    <p class="table-note">${escape(record.creditedTo)}. ${escape(record.version)}. <strong>${escape(KIND_NAMES[record.evidenceKind])}.</strong> Topics: ${record.topics.map(topic => escape(TOPIC_NAMES[topic])).join('; ')}.</p>
    <p>${escape(record.supportedConsequence)}</p><p class="table-note">${escape(record.evidenceStanding)} ${escape(record.transferBoundary)}</p>
  </li>`).join('\n');
  return `${START}
      <div class="content__container ai-systems-investment-field"><div class="content content--wide">
        <section class="atlas-reference atlas-gallery" aria-labelledby="research-gallery-title">
          <h2 id="research-gallery-title" class="txt-h2 architecture-track-title">Read the evidence behind a design choice</h2>
          <p class="debrief-lead">A team choosing a display may need a perceptual finding, an accessibility rule, an implementation mechanism or practiced design guidance. A bibliography becomes more useful when those contributions remain distinguishable.</p>
          <p>This separate example contains ${counted(totals.works, provenance.verified ? 'selected public work' : 'supplied work record')} and ${counted(totals.topicMemberships, 'editorial topic membership')}. ${escape(provenance.selectionText)} Each work counts once, while a work can contribute to several topics. Source kind describes the contribution's form; relevance and strength still depend on the question.</p>
          ${provenance.verified ? `<figure class="story-visual blueprint-pop-visual table-span-all">
            <div class="table-scroll atlas-gallery-figure" role="region" tabindex="0" aria-label="Public research topic matrix">
              <a class="story-visual__open" href="../img/plot/atlas_public_research.svg" aria-label="View the public research topic matrix at full size"><img src="../img/plot/atlas_public_research.svg" width="1200" height="760" loading="lazy" alt="${counted(totals.works, provenance.verified ? 'selected work' : 'supplied work record')} ${totals.works === 1 ? 'contributes' : 'contribute'} ${counted(totals.topicMemberships, totals.multiTopicWorks ? 'overlapping topic membership' : 'topic membership')}. The matrix distinguishes empirical studies, technical guidance and practitioner sources; exact counts follow."></a>
            </div>
            <figcaption class="table-note">${escape(provenance.sourceLine)} A zero means that these records contain no membership in that cell. Coverage of the wider literature and organizational application remains unspecified.</figcaption>
          </figure>` : ''}
          <div class="table-scroll table-figure--wide" role="region" tabindex="0" aria-label="Public research topic counts">${renderGalleryTable(tableFrom(derived, provenance))}</div>
          <h3 class="txt-h4">Membership carries a different meaning from use</h3>
          <p>${escape(interpretationNarrative(topics))} When a commentary and the study it discusses are both included, they remain separate works with a shared intellectual relationship rather than additional independent confirmation.</p>
          <p>${escape(citationText)} Evidence of application in a working organization would require a separate observation; application remains unspecified. ${escape(overlapNarrative(totals))} ${provenance.verified ? 'The matrix and adjacent table preserve' : 'The table preserves'} the memberships directly.</p>
          ${provenance.verified ? `<p class="table-note"><a href="../data/visualization-fidelity/research/sources.v1.json">Selected source records</a> · <a href="../data/visualization-fidelity/research/summary.v1.json">Derived counts and memberships</a> · <a href="../data/visualization-fidelity/research/README.md">Counting and source-selection contract</a>. Each citation below carries its own version, inspected scope and supported design consequence.</p>` : '<p class="table-note">The table reports supplied topic memberships; selection provenance remains unspecified.</p>'}
          <details class="conditioning-static-equivalent">
            <summary>Sources, memberships and the decisions each can inform</summary>
            <ol>${sources}</ol>
          </details>
        </section>
      </div></div>
${END}`;
}

export function renderResearchSection(document) {
  return sectionFrom(viewData(document), suppliedProvenance);
}

/** Read-only verified-file boundary; returns projections without touching page or SVG. */
export async function readVerifiedResearchView() {
  await buildResearchData({ check: true });
  const document = JSON.parse(await readFile(resolve(ROOT, SUMMARY_PATH), 'utf8'));
  const derived = viewData(document);
  const provenance = {
    verified: true,
    heading: 'PUBLIC BIBLIOGRAPHY / EDITORIAL TOPIC MEMBERSHIP',
    sourceLine: `Source: ${document.source.path} / selected ${document.source.selectedOn}.`,
    selectionText: 'The extract is complete for its enumerated selection. Topic assignments are editorial judgments.',
    tableCaption: 'Selected public works by topic and evidence kind',
  };
  return { document, svg: figureFrom(derived, provenance), section: sectionFrom(derived, provenance) };
}

export async function buildResearchView({ check = false } = {}) {
  const { document, svg, section } = await readVerifiedResearchView();
  const page = await readFile(resolve(ROOT, PAGE), 'utf8');
  const start = page.indexOf(START);
  const end = page.indexOf(END);
  let output;
  if (start >= 0) {
    assert.ok(end > start && page.indexOf(START, start + 1) < 0 && page.indexOf(END, end + 1) < 0, 'One complete research projection is required.');
    output = page.slice(0, start) + section + page.slice(end + END.length);
  } else {
    assert.equal(end, -1);
    assert.equal(page.split(ANCHOR).length, 2, 'The accepted gallery supplies the research insertion point.');
    output = page.replace(ANCHOR, `${ANCHOR}\n${section}`);
  }
  if (!output.includes('href="#research-gallery-title"')) output = output.replace('<li><a href="#prototype-title">',
    '<li><a href="#research-gallery-title">Research example<br>Read source contributions</a></li>\n          <li><a href="#prototype-title">');
  if (check) {
    assert.equal(page, output, 'The research section matches its admitted source.');
    assert.equal(await readFile(resolve(ROOT, RESEARCH_SVG), 'utf8'), svg, 'The research SVG matches its admitted source.');
  } else {
    await writeFile(resolve(ROOT, PAGE), output);
    await writeFile(resolve(ROOT, RESEARCH_SVG), svg);
  }
  return { works: document.totals.works, memberships: document.totals.topicMemberships, svg: RESEARCH_SVG };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await buildResearchView({ check: process.argv.includes('--check') })));
}
