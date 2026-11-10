const EMPTY = Object.freeze([]);

function group(map, key) {
  if (!map.has(key)) map.set(key, { rows: [], children: new Map() });
  return map.get(key);
}

function freezeGroups(map) {
  for (const entry of map.values()) {
    Object.freeze(entry.rows);
    freezeGroups(entry.children);
  }
}

// Index admitted occurrence readings in their supplied display order. The
// caller owns the records; private maps and frozen buckets protect membership.
// Build once per projection/render, then select cells without rescanning rows.
export function createCadenceOccurrenceIndex(occurrences) {
  const works = new Map(), periods = new Map();
  for (const row of occurrences) {
    const work = group(works, row.workId), period = group(periods, row.periodId);
    work.rows.push(row); period.rows.push(row);
    group(period.children, row.subdivision).rows.push(row);
    group(group(work.children, row.periodId).children, row.subdivision).rows.push(row);
  }
  freezeGroups(works); freezeGroups(periods);
  return Object.freeze({
    forWork: id => works.get(id)?.rows ?? EMPTY,
    forPeriod: (id, subdivision = null) => (subdivision === null
      ? periods.get(id)?.rows : periods.get(id)?.children.get(subdivision)?.rows) ?? EMPTY,
    forCell: (workId, periodId, subdivision) => works.get(workId)?.children.get(periodId)?.children.get(subdivision)?.rows ?? EMPTY,
  });
}
