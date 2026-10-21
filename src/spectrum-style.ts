/** One plotting contract for the FFmpeg image and the desktop axes/legend. */
export const SPECTRUM_STYLE = {
  width: 1200, height: 744, color: 'intensity', minDb: -120, maxDb: 0,
} as const;

// FFmpeg's intensity palette, expressed in full-range BT.601 YUV.
// https://github.com/FFmpeg/FFmpeg/blob/n7.1.5/libavfilter/avf_showspectrum.c
// Sampling before clipping preserves the red/yellow transitions of the image;
// a generic rainbow gradient would assign different colors to the dB labels.
const intensity = [
  [0, 0, 0, 0],
  [0.13, 0.03587126228984074, 0.1573300977624594, -0.02548747583751842],
  [0.30, 0.18572281794568020, 0.1772436246393981, 0.17475554840414750],
  [0.60, 0.28184980583656130, -0.1593064119945782, 0.47132074554608920],
  [0.73, 0.65830621175547810, -0.3716070802232764, 0.24352759331252930],
  [0.78, 0.76318535758242900, -0.4307467689263783, 0.16866496622310430],
  [0.91, 0.95336363636363640, -0.2045454545454546, 0.03313636363636363],
  [1, 1, 0, 0],
] as const;

export function spectrumColor(position: number): readonly number[] {
  const a = Math.min(1, Math.max(0, position));
  const upperIndex = intensity.findIndex((stop, index) => index > 0 && stop[0] >= a);
  const lower = intensity[upperIndex - 1]!;
  const upper = intensity[upperIndex]!;
  const fraction = (a - lower[0]) / (upper[0] - lower[0]);
  const interpolate = (index: 1 | 2 | 3) => (lower[index] + (upper[index] - lower[index]) * fraction) * 256;
  const y = Math.floor(interpolate(1));
  const u = Math.floor(127.5 + interpolate(2)) - 128;
  const v = Math.floor(127.5 + interpolate(3)) - 128;
  return [y + 1.402 * v, y - 0.344136 * u - 0.714136 * v, y + 1.772 * u]
    .map(value => Math.round(Math.min(255, Math.max(0, value))));
}

export const SPECTRUM_GRADIENT = `linear-gradient(to top in srgb, ${Array.from({ length: 121 }, (_, index) =>
  `rgb(${spectrumColor(index / 120).join(' ')}) ${index / 1.2}%`).join(', ')})`;
