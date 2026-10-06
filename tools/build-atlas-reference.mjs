/** Static SECOM reference owner. Parse O(n); aggregate O(n + m log m); render O(m). */
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const DATA_PATH = 'context-canvas-project-surface/data/visualization-fidelity/secom-labels.data';
export const DATA_SHA256 = '126884cf453705c9e61a903fe906f0665a3b45ce3639e621edc5c93c89627e03';
const PAGE_PATH = 'context-canvas-project-surface/context-canvas/visualization-fidelity-atlas.html';
const SVG_PATH = 'context-canvas-project-surface/img/plot/visualization_fidelity_clean_exemplar.svg';
const JSON_PATH = 'context-canvas-project-surface/data/visualization-fidelity/secom-monthly.json';
const START = '<section aria-labelledby="exemplar-title"';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const SOURCE = Object.freeze({
  title: 'SECOM', citation: 'McCann, M. & Johnston, A. (2008). SECOM [Dataset]. UCI Machine Learning Repository.',
  url: 'https://archive.ics.uci.edu/dataset/179/secom', doi: 'https://doi.org/10.24432/C54305',
  license: 'https://creativecommons.org/licenses/by/4.0/',
  labels: 'https://archive.ics.uci.edu/ml/machine-learning-databases/secom/secom_labels.data',
});

/** Source civil dates retain their supplied precision; timezone inference is outside this projection. */
export function parseLabels(text) {
  if (typeof text !== 'string' || text.length > 1_000_000) throw new TypeError('Expected a bounded SECOM label string.');
  const lines = text.trim().split(/\r?\n/u);
  return lines.map((line, index) => {
    const match = /^(-1|1) "(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})"$/u.exec(line);
    if (!match) throw new Error(`Invalid label record at line ${index + 1}.`);
    const [, label, dd, mm, yyyy, hh, minute, ss] = match;
    const [day, month, year, hour, minutes, seconds] = [dd, mm, yyyy, hh, minute, ss].map(Number);
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minutes > 59 || seconds > 59) {
      throw new Error(`Invalid civil timestamp at line ${index + 1}.`);
    }
    return { failed: label === '1', year, month, day, timestamp: `${yyyy}-${mm}-${dd}T${hh}:${minute}:${ss}` };
  });
}

/** Local accumulator ownership leaves the caller's record array and records intact. */
export function aggregateLabels(records) {
  const groups = new Map();
  for (const record of records) {
    const key = record.timestamp.slice(0, 7);
    const group = groups.get(key) ?? { period: key, month: MONTHS[record.month - 1], year: record.year, firstDay: record.day, lastDay: record.day, tested: 0, failed: 0 };
    group.firstDay = Math.min(group.firstDay, record.day);
    group.lastDay = Math.max(group.lastDay, record.day);
    group.tested += 1;
    group.failed += Number(record.failed);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.period.localeCompare(b.period)).map(group => ({
    ...group, ratePer100: 100 * group.failed / group.tested,
    window: `${group.month} ${group.firstDay}-${group.lastDay}, ${group.year}`,
  }));
}

export function escapeMarkup(value) {
  return String(value).replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function renderTable(groups) {
  const caption = 'Recorded SECOM line tests by observation window';
  const headings = ['Observation window', 'Recorded tests', 'Failed tests', 'Failed tests per 100 recorded tests'];
  return `<figure class="table-figure table-figure--wide"><div class="table-scroll" role="region" tabindex="0" aria-label="${caption}"><table class="table--reading table--comfortable" data-label="${caption}">
            <caption>${caption}</caption><thead><tr data-label="${caption}: column headings">${headings.map(heading => `<th scope="col" data-label="${heading}">${heading}</th>`).join('')}</tr></thead>
            <tbody>${groups.map(group => `<tr data-label="${caption}: ${escapeMarkup(group.window)}"><th scope="row" data-label="Observation window">${escapeMarkup(group.window)}</th>${[group.tested, group.failed, group.ratePer100.toFixed(1)].map((value, index) => `<td class="table-number" data-label="${headings[index + 1]}">${value}</td>`).join('')}</tr>`).join('')}</tbody>
          </table></div></figure>`;
}

/** This composition owns four SECOM monthly windows; a different dataset earns its own layout. */
export function renderSvg(groups) {
  if (groups.length !== 4 || groups.some(group => !Number.isFinite(group.ratePer100) || group.ratePer100 < 0 || group.ratePer100 > 25)) {
    throw new Error('The reference composition requires four finite rates within its 0-25 scale.');
  }
  const description = groups.map(group => `${group.window}: ${group.failed} failed of ${group.tested} recorded tests, ${group.ratePer100.toFixed(1)} per 100.`).join(' ');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760" width="1200" height="760" role="img" aria-labelledby="title description">
  <title id="title">July has the highest observed failure rate; August has the most failed tests</title>
  <desc id="description">SECOM semiconductor manufacturing records, 2008. ${escapeMarkup(description)} July and October are partial observation windows. Rates describe the released records; effort and operational causes require separate evidence.</desc>
  <style>text{font-family:Verdana,sans-serif;fill:#17345f}.small{font-size:16px}.label{font-size:19px}.number{font-size:25px;font-variant-numeric:tabular-nums}.rule{stroke:#bbc8d7;stroke-width:1}</style>
  <rect width="1200" height="760" fill="#fffcf5"/>
  <g id="reading-context" aria-label="Question and population">
    <text x="40" y="43" class="small" font-weight="bold" letter-spacing="2">SEMICONDUCTOR MANUFACTURING / RECORDED LINE TESTS</text>
    <text x="40" y="98" font-size="38" font-weight="bold">A rate leader and a volume leader</text>
    <text x="40" y="140" class="label">July has the highest observed failure rate; August has the most failed tests.</text>
    <text x="40" y="173" class="small">19 July-17 October 2008 / 1,567 recorded tests / 104 failed tests</text>
  </g>
  <g id="comparison" aria-label="Monthly rates, failed counts and tested counts">
    <text id="window-heading" x="40" y="225" class="small" font-weight="bold">WINDOW</text>
    <text id="rate-heading" x="260" y="225" class="small" font-weight="bold">FAILED TESTS PER 100</text>
    <text x="805" y="225" class="small" font-weight="bold" text-anchor="end">RATE</text>
    <text x="964" y="225" class="small" font-weight="bold" text-anchor="end">FAILED</text>
    <text x="1150" y="225" class="small" font-weight="bold" text-anchor="end">TESTED</text>
    ${[0, 5, 10, 15, 20, 25].map(tick => `<line class="rule" x1="${260 + tick * 18}" x2="${260 + tick * 18}" y1="248" y2="590"/><text x="${260 + tick * 18}" y="617" class="small" text-anchor="middle">${tick}</text>`).join('\n    ')}
    ${groups.map((group, index) => {
      const y = 290 + index * 84;
      return `<g id="month-${group.period}" data-period="${group.period}" aria-label="${escapeMarkup(group.window)}">
      <text x="40" y="${y}" class="label" font-weight="bold">${group.month}</text><text x="40" y="${y + 25}" class="small">${group.firstDay}-${group.lastDay} ${group.month} 2008</text>
      <rect x="260" y="${y - 23}" width="${(group.ratePer100 * 18).toFixed(3)}" height="32" fill="#2855f3"/>
      <text x="805" y="${y}" class="number" text-anchor="end">${group.ratePer100.toFixed(1)}</text>
      <text x="964" y="${y}" class="number" text-anchor="end" font-weight="${index === 1 ? 'bold' : 'normal'}">${group.failed}</text>
      <text x="1150" y="${y}" class="number" text-anchor="end">${group.tested}</text>
    </g>`;
    }).join('\n    ')}
  </g>
  <g id="source-context" aria-label="Source, transformation and interpretation boundary">
    <line class="rule" x1="40" x2="1160" y1="645" y2="645"/>
    <text x="40" y="675" class="small">Monthly aggregation of released in-house line-test labels. July and October have partial coverage.</text>
    <text x="40" y="705" class="small">Data: McCann &amp; Johnston (2008), SECOM, UCI / doi:10.24432/C54305 / CC BY 4.0</text>
    <text x="40" y="735" class="small">Observed-record comparison. Operational causes, severity and effort need their own evidence.</text>
  </g>
</svg>
`;
}

export function renderSection(groups) {
  return `<section aria-labelledby="exemplar-title" class="atlas-reference">
          <h2 id="exemplar-title" class="txt-h2 architecture-track-title">A useful reference keeps rate and volume together</h2>
          <p class="debrief-lead">A manufacturing review can begin with two reasonable questions: which observation window has the highest failure rate, and which contains the most failed tests? The same records give different answers.</p>
          <figure class="story-visual blueprint-pop-visual table-span-all">
            <a class="story-visual__open" href="../img/plot/visualization_fidelity_clean_exemplar.svg" aria-label="View the SECOM rate and volume comparison at full size"><img src="../img/plot/visualization_fidelity_clean_exemplar.svg" width="1200" height="760" loading="lazy" alt="July has the highest observed failure rate, 22.2 per 100 recorded tests. August has the most failed tests, 51. Counts, denominators and all four windows appear in the following table."></a>
            <figcaption class="table-note">Released semiconductor manufacturing records: 19 July-17 October 2008. Each record carries a production entity's in-house line-test result. July and October cover partial months. The shared axis compares observed rates; aligned counts preserve the size of each recorded group.</figcaption>
          </figure>
          ${renderTable(groups)}
          <h3 class="txt-h4">A denominator changes the reading</h3>
          <p>July's 14 failed tests among 63 recorded tests yield 22.2 per 100; August's 51 among 555 yield 9.2. August contains more failed tests and a lower observed failure rate. Together, the two measures support a more specific question about the records worth investigating. Effort, severity and intervention priority require their own evidence.</p>
          <h3 class="txt-h4">The reference carries its context</h3>
          <p>The SVG includes the finding, units, date windows, counts and source credit as visible text. Its named groups describe the same subject in source form. The table supplies native row and column relationships, while the <a href="../data/visualization-fidelity/secom-monthly.json">derived JSON</a> retains counts and full-precision rates. A receiving interface determines whether an image, SVG source or extracted text reaches a reader or tool.</p>
          <aside class="debrief-quote debrief-quote--operating-principle" aria-label="Atlas doctrine">
            <p>The visual carries the reader’s comparison burden; its companion carries exact values, uncertainty, provenance, and a recoverable interpretation.</p>
            <footer>Visual selection doctrine</footer>
          </aside>
          <p class="table-note"><strong>Source and method:</strong> <a href="https://doi.org/10.24432/C54305">McCann and Johnston (2008), SECOM, UCI Machine Learning Repository</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Monthly aggregation uses all 1,567 released label records, including 104 failures; rates are 100 times failed tests divided by recorded tests, displayed to one decimal. The source timestamps retain their stated civil-time precision. These are descriptive rates for the released records. Inference about broader production would require a sampling and process model. <a href="../data/visualization-fidelity/README.md">Read the derivation and source boundary.</a></p>
          <p><a href="one-figure-several-readings.html">One Figure, Several Readings</a> examines the design choices and the different representations a receiving reader or tool may encounter.</p>
        </section>`;
}

export function replaceSection(page, section) {
  const start = page.indexOf(START);
  const end = page.indexOf('</section>', start);
  if (start < 0 || end < start || page.indexOf(START, start + START.length) >= 0) throw new Error('Expected one Atlas reference section.');
  return page.slice(0, start) + section + page.slice(end + '</section>'.length);
}

export async function buildReference({ check = false } = {}) {
  const raw = await readFile(resolve(ROOT, DATA_PATH));
  if (createHash('sha256').update(raw).digest('hex') !== DATA_SHA256) throw new Error('SECOM source digest differs; review dataset identity before regeneration.');
  const groups = aggregateLabels(parseLabels(raw.toString('utf8')));
  const derived = { source: SOURCE, sourceSha256: DATA_SHA256, sourceRows: 1567, failures: 104, measure: 'failed tests per 100 recorded tests', timestampBasis: 'Source civil time; timezone unspecified', derivation: '100 * failed / tested; calendar-month grouping; all released label rows retained', groups };
  const page = await readFile(resolve(ROOT, PAGE_PATH), 'utf8');
  const outputs = [[SVG_PATH, renderSvg(groups)], [JSON_PATH, `${JSON.stringify(derived, null, 2)}\n`], [PAGE_PATH, replaceSection(page, renderSection(groups))]];
  for (const [path, content] of outputs) {
    if (check) {
      if (await readFile(resolve(ROOT, path), 'utf8') !== content) throw new Error(`Regenerate the reference output: ${path}`);
    } else await writeFile(resolve(ROOT, path), content);
  }
  return { records: derived.sourceRows, failures: derived.failures, windows: groups.length, outputs: outputs.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const flag = process.argv[2];
  if (!['--write', '--check'].includes(flag) || process.argv.length !== 3) throw new Error('Use --write to derive outputs or --check to compare them.');
  console.log(JSON.stringify(await buildReference({ check: flag === '--check' })));
}
