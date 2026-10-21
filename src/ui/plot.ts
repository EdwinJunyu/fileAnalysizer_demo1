import { numberFormat } from '../i18n/index.js';

/** Readable linear ticks, including exact endpoints without crowding the end. */
export function plotTicks(maximum: number | undefined, intervals: number): number[] {
  if (!maximum || !Number.isFinite(maximum) || maximum <= 0) return [];
  const roughStep = maximum / intervals;
  const power = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 2.5, 5, 10].find(value => value * power >= roughStep)! * power;
  const ticks = [0];
  for (let index = 1; index * step < maximum - step * 0.55; index++) {
    ticks.push(Number((index * step).toPrecision(12)));
  }
  ticks.push(maximum);
  return ticks;
}

/** Relative elapsed time, independent of timezone; retain subsecond audio. */
export function plotTime(seconds: number, duration: number): string {
  const decimals = duration < 10 ? Math.min(6, Math.max(2, -Math.floor(Math.log10(duration / 8)))) : 0;
  const rounded = Math.round(seconds * 10 ** decimals) / 10 ** decimals;
  const minutes = Math.floor(rounded / 60);
  const remainder = Number((rounded - minutes * 60).toFixed(decimals));
  const value = numberFormat({ useGrouping: false, minimumIntegerDigits: 2,
    maximumFractionDigits: decimals }).format(remainder);
  return `${numberFormat({ useGrouping: false }).format(minutes)}:${value}`;
}
