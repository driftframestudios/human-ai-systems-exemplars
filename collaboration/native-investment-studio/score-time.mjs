// Presentation units for the authored elapsed-minute score. Calendar rules and
// working-day conversions remain with an explicitly authored calendar owner.
export function parseScoreTime(text) {
  if (typeof text !== 'string') return null;
  const value = text.trim();
  let minutes;
  if (/^\d+$/.test(value)) minutes = Number(value);
  else {
    const hours = /^(\d+)\s*(?:h|hrs?|hours?)(?:\s*(\d+)\s*(?:m|mins?|minutes?))?$/i.exec(value);
    const onlyMinutes = /^(\d+)\s*(?:m|mins?|minutes?)$/i.exec(value);
    if (hours && (hours[2] === undefined || Number(hours[2]) < 60)) minutes = Number(hours[1]) * 60 + Number(hours[2] ?? 0);
    else if (onlyMinutes) minutes = Number(onlyMinutes[1]);
    else return null;
  }
  return Number.isSafeInteger(minutes) && minutes >= 0 ? minutes : null;
}

export function formatScoreTime(minutes) {
  if (!Number.isSafeInteger(minutes) || minutes < 0) throw new RangeError('Elapsed time must be a non-negative integer number of minutes.');
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return hours ? `${hours}h${remainder ? ` ${remainder}m` : ''}` : `${remainder}m`;
}
