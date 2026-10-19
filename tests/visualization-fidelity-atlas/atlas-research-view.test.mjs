import assert from 'node:assert/strict';
import test from 'node:test';
import { researchDocument, SOURCE_PATH } from '../../tools/atlas-research-data.mjs';
import {
  readVerifiedResearchView, renderResearchFigure, renderResearchSection,
  researchTable, TOPIC_NAMES,
} from '../../tools/build-atlas-research-view.mjs';

function fixture(topics = ['interpretation']) {
  return {
    id: 'fixture-one', recordKind: 'work', title: 'Supplied fixture work',
    creditedTo: 'Fixture author', version: 'Fixture version 1',
    sourceUri: 'https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/',
    inspectedOn: '2026-10-04',
    inspectedSources: [{ uri: 'https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/', scope: 'author-abstract' }],
    evidenceKind: 'technical-guidance', evidenceStanding: 'Fixture declaration only.',
    topics, supportedConsequence: 'Exercise one independently specified topic membership.',
    transferBoundary: 'This fixture verifies no source-selection or application claim.',
    citationUse: 'observed-in-skill-evidence-map', realWorldApplication: 'unspecified',
  };
}

function assertCounts(document, svg, section, expected) {
  const table = researchTable(document);
  assert.deepEqual(table.rows.map(row => row.values), expected);
  const htmlRows = [...section.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gu)].slice(1);
  assert.equal(htmlRows.length, expected.length);
  Object.entries(TOPIC_NAMES).forEach(([id, label], index) => {
    const start = svg.indexOf('id="research-topic-' + id + '"');
    assert.ok(start >= 0, id);
    const next = svg.indexOf('<g id="research-topic-', start + 1);
    const group = svg.slice(start, next < 0 ? undefined : next);
    assert.deepEqual([...group.matchAll(/<text\b[^>]*class="number"[^>]*>(\d+)<\/text>/gu)].map(match => Number(match[1])), expected[index], id);
    const cells = [...htmlRows[index][1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gu)]
      .map(match => match[2].replace(/<[^>]*>/gu, '').trim());
    assert.equal(cells[0], label);
    assert.deepEqual(cells.slice(1).map(Number), expected[index], label);
  });
  assert.equal((section.match(/<li id="research-/gu) ?? []).length, document.totals.works);
}

for (const [name, records, counts, narrative, totals] of [
  ['one interpretation work', [fixture()], [[0, 0, 0, 0], [0, 1, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    'The interpretation row contains 1 work, including 0 empirical studies, 1 technical-guidance source and 0 practitioner sources.', '1 work / 1 topic membership / 0 works in several topics'],
  ['no interpretation membership', [fixture(['comparison'])], [[0, 1, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
    'The interpretation row contains 0 works, including 0 empirical studies, 0 technical-guidance sources and 0 practitioner sources.', '1 work / 1 topic membership / 0 works in several topics'],
  ['empty supplied set', [], Array.from({ length: 6 }, () => [0, 0, 0, 0]),
    'The interpretation row contains 0 works, including 0 empirical studies, 0 technical-guidance sources and 0 practitioner sources.', '0 works / 0 topic memberships / 0 works in several topics'],
]) {
  test(name + ' keeps figure, table, source list, and narrative aligned', () => {
    const document = researchDocument(records);
    const before = JSON.stringify(document);
    const svg = renderResearchFigure(document);
    const section = renderResearchSection(document);
    assertCounts(document, svg, section, counts);
    assert.ok(svg.includes(totals));
    assert.ok(section.includes(narrative));
    assert.ok(svg.includes('Source: supplied work records / selection provenance unspecified.'));
    assert.ok(section.includes('Selection provenance is unspecified for these supplied work records.'));
    for (const output of [svg, section]) {
      assert.match(output, /supplied work records/iu);
      assert.doesNotMatch(output, /selected 4 October 2026|selected 2026-10-04|Atlas public research extract v1|unique public works/u);
      assert.match(output, /[Aa]pplication(?:: | remains )unspecified/u);
    }
    if (records.length === 1) {
      assert.match(svg, /1 supplied work record has 1 editorial topic membership/u);
      assert.match(section, /1 supplied work record and 1 editorial topic membership/u);
      assert.match(section, /1 supplied work record declares a citation/u);
      assert.doesNotMatch(section, /1 works|1 empirical studies|1 technical-guidance sources/u);
    }
    if (records.some(record => record.topics.includes('interpretation'))) {
      assert.match(section, /This single contribution retains its own method and evidence boundary\./u);
    } else {
      assert.match(section, /No supplied work is assigned to this topic\./u);
    }
    assert.doesNotMatch(section, /Read these contributions together|Those contributions can be read together/u);
    const overlap = records.length
      ? 'No work belongs to more than one topic in this set; work and membership totals are equal.'
      : 'No works or topic memberships are supplied.';
    assert.ok(svg.includes(overlap));
    assert.ok(section.includes(overlap));
    assert.equal(JSON.stringify(document), before);
  });
}

test('caller-provided provenance does not upgrade pure fixture renderers', () => {
  const document = researchDocument([fixture()]);
  document.source = {
    path: 'pretend-release.json', selectedOn: '2001-02-03',
    standing: 'byte-verified-public-editorial-extract', sha256: 'a'.repeat(64),
  };
  const svg = renderResearchFigure(document);
  const section = renderResearchSection(document);
  assert.ok(svg.includes('Source: supplied work records / selection provenance unspecified.'));
  assert.ok(section.includes('Selection provenance is unspecified for these supplied work records.'));
  for (const output of [svg, section]) {
    assert.doesNotMatch(output, /pretend-release|2001-02-03|byte-verified/u);
  }
  assert.equal(researchTable(document).caption, 'Supplied work records by topic and evidence kind');
});

test('verified read-only projection retains the released 13 works, 21 memberships, and actual source date', async () => {
  const { document, svg, section } = await readVerifiedResearchView();
  assert.equal(document.totals.works, 13);
  assert.equal(document.totals.topicMemberships, 21);
  assert.equal(document.source.path, SOURCE_PATH);
  assert.equal(document.source.selectedOn, '2026-10-04');
  assertCounts(document, svg, section, [
    [1, 1, 3, 5], [1, 2, 4, 7], [1, 1, 0, 2], [0, 1, 1, 2], [0, 2, 0, 2], [0, 2, 1, 3],
  ]);
  assert.match(svg, /13 works \/ 21 topic memberships \/ 7 works in several topics/u);
  assert.match(svg, /13 unique public works have 21 editorial topic memberships/u);
  assert.match(section, /13 selected public works and 21 editorial topic memberships/u);
  assert.match(section, /The interpretation row contains 7 works, including 1 empirical study, 2 technical-guidance sources and 4 practitioner sources\./u);
  assert.match(section, /13 works have a recorded citation/u);
  assert.match(section, /Read these contributions together/u);
  assert.match(svg, /7 works belong to several topics; adding row totals counts memberships, not unique works\./u);
  assert.match(section, /7 works belong to several topics, so adding row totals counts memberships\./u);
  assert.match(section, /The matrix and adjacent table preserve both membership and the 13-work total directly\./u);
  assert.match(section, /shared source lineage; independent confirmation still requires a separate work\./u);
  assert.match(section, /<figure\b/u);
  assert.ok(section.includes('href="../img/plot/atlas_public_research.svg"'));
  assert.ok(section.includes('src="../img/plot/atlas_public_research.svg"'));
  for (const name of ['sources.v1.json', 'summary.v1.json', 'README.md']) {
    assert.ok(section.includes('href="../data/visualization-fidelity/research/' + name + '"'));
  }
  assert.match(section, /Selected public works by topic and evidence kind/u);
  for (const output of [svg, section]) {
    assert.ok(output.includes('Source: ' + document.source.path + ' / selected ' + document.source.selectedOn + '.'));
    assert.doesNotMatch(output, /selection provenance unspecified|selected 4 October 2026/u);
  }
  // Even a real release document does not bypass the pure renderer's neutral default.
  assert.match(renderResearchFigure(document), /selection provenance unspecified/u);
});

test('inconsistent caller aggregates are rejected rather than repeated in prose or marks', () => {
  for (const mutate of [
    document => { document.totals.works = 13; },
    document => { document.topics[1].byEvidenceKind['technical-guidance'] = 4; },
  ]) {
    const document = researchDocument([fixture()]);
    mutate(document);
    for (const render of [researchTable, renderResearchFigure, renderResearchSection]) {
      assert.throws(() => render(document), assert.AssertionError);
    }
  }
});

test('pure sections retain supplied tables and citations without release asset references', () => {
  for (const records of [[], [fixture()]]) {
    const document = researchDocument(records);
    document.source = {
      path: SOURCE_PATH, selectedOn: '2026-10-04',
      standing: 'byte-verified-public-editorial-extract', sha256: 'a'.repeat(64),
    };
    const section = renderResearchSection(document);
    assert.doesNotMatch(section, /<figure\b|<img\b|story-visual__open/u);
    assert.doesNotMatch(section, /atlas_public_research\.svg|data\/visualization-fidelity\/research\//u);
    assert.match(section, /Supplied work records by topic and evidence kind/u);
    assert.match(section, /The table preserves the memberships directly\./u);
    assert.doesNotMatch(section, /The matrix and adjacent table/u);
    assert.equal((section.match(/<tr\b/gu) ?? []).length, 7);
    assert.equal((section.match(/<li id="research-/gu) ?? []).length, records.length);
    if (records.length) assert.ok(section.includes('href="' + records[0].sourceUri + '"'));
  }
});

test('disjoint assignments describe equal work and membership totals without asserting overlap', () => {
  const second = {
    ...fixture(['accessibility']), id: 'fixture-two',
    sourceUri: 'https://www.w3.org/WAI/tutorials/images/complex/',
    inspectedSources: [{ uri: 'https://www.w3.org/WAI/tutorials/images/complex/', scope: 'full-guidance' }],
  };
  const document = researchDocument([fixture(['comparison']), second]);
  const svg = renderResearchFigure(document);
  const section = renderResearchSection(document);
  assertCounts(document, svg, section, [
    [0, 1, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 1, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0],
  ]);
  assert.match(svg, /2 works \/ 2 topic memberships \/ 0 works in several topics/u);
  for (const output of [svg, section]) {
    assert.match(output, /No work belongs to more than one topic in this set; work and membership totals are equal\./u);
    assert.doesNotMatch(output, /Topic totals overlap|overlapping topic memberships|stacked whole would answer the wrong/u);
  }
  assert.match(section, /No supplied work is assigned to this topic\./u);
});

test('one multi-topic work retains singular contribution and overlap wording', () => {
  const document = researchDocument([fixture(['comparison', 'interpretation'])]);
  const svg = renderResearchFigure(document);
  const section = renderResearchSection(document);
  assertCounts(document, svg, section, [
    [0, 1, 0, 1], [0, 1, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0],
  ]);
  assert.match(svg, /1 work \/ 2 topic memberships \/ 1 work in several topics/u);
  for (const output of [svg, section]) {
    assert.match(output, /1 work belongs to several topics; adding row totals counts memberships, not unique works\./u);
    assert.doesNotMatch(output, /1 works|1 work belong to/u);
  }
  assert.match(section, /This single contribution retains its own method and evidence boundary\./u);
  assert.doesNotMatch(section, /Read these contributions together/u);
});
