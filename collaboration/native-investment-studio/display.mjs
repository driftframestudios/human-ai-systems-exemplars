import { CONTRACT } from './config.mjs';

export const INTEGER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// Display admitted cents directly; floating-point formatting never rounds money.
export function money(cents) {
  if (cents === null) return 'Rate needed';
  const value = BigInt(cents);
  const magnitude = value < 0n ? -value : value;
  return `${value < 0n ? '−' : ''}$${INTEGER.format(magnitude / 100n)}.${String(magnitude % 100n).padStart(2, '0')}`;
}

// Compact visual readings round for scanning; numeric fields retain admitted cents.
export function wholeMoney(cents) {
  if (cents === null) return 'Rate needed';
  const value = BigInt(cents);
  const magnitude = value < 0n ? -value : value;
  const dollars = (magnitude + 50n) / 100n;
  return `${value < 0n && dollars !== 0n ? '−' : ''}$${INTEGER.format(dollars)}`;
}

export function duration(minutes) {
  const hours = Math.floor(minutes / CONTRACT.minutesPerHour);
  const remainder = minutes % CONTRACT.minutesPerHour;
  return [hours ? `${INTEGER.format(hours)} h` : '', remainder || !hours ? `${remainder} min` : ''].filter(Boolean).join(' ');
}
