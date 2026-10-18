import type { FieldStatus, MetadataField } from './types.js';

export function field(
  key: string,
  label: string,
  value: string | number | boolean | null | undefined,
  source: string,
  unit?: string,
  note?: string,
  absentStatus: FieldStatus = 'missing',
): MetadataField {
  const present = value !== undefined && value !== null && value !== '' &&
    !(typeof value === 'number' && !Number.isFinite(value));
  return { key, label, value: present ? value : null, status: present ? 'present' : absentStatus,
    source, ...(unit ? { unit } : {}), ...(note ? { note } : {}) };
}

export function finiteNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  if (typeof value === 'string' && value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
