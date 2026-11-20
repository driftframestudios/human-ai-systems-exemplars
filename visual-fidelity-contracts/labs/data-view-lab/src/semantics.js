import { createDataSemanticTwin } from './model.js';

const STANDING_LABELS = Object.freeze({
  known: 'Known',
  unknown: 'Unknown',
  absent: 'Absent',
  stale: 'Stale',
  estimated: 'Estimated',
  redacted: 'Redacted',
});

export function valueText(record, unit) {
  if (record.value === null) return STANDING_LABELS[record.standing];
  return `${String(record.value)} ${unit}`;
}

export function dataStatusMessage(state) {
  const twin = createDataSemanticTwin(state);
  if (state.request.standing === 'pending') return `Loading a candidate revision. Revision ${twin.revision} remains available.`;
  if (state.request.standing === 'failed') return `${state.request.message} Revision ${twin.revision} remains available as ${twin.dataStanding} data.`;
  return `${twin.totalRecords} records · ${twin.dataStanding} data · ${twin.renderer} view for ${twin.decisionNeed}.`;
}

export function recordDescription(record, twin) {
  return `${record.label}: ${valueText(record, twin.unit)}; ${STANDING_LABELS[record.standing].toLowerCase()} standing; ${record.group} group.`;
}

export { STANDING_LABELS };
