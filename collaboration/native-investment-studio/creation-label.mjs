// Display names stay distinct from the adapter-owned record IDs. Scan the
// collection so removals, imports and renamed records can coexist safely.
export function nextCreatedLabel(records, item, property = 'label') {
  const prefix = `New ${item} `;
  const labels = new Set(records.map(record => record[property]));
  let serial = 1;
  while (labels.has(prefix + serial)) serial++;
  return prefix + serial;
}
