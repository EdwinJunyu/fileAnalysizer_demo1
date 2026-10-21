/**
 * A bounded, peak-preserving time pyramid of RGB FFT columns. Each compaction
 * doubles the time per bin; no audio or complete stream of columns is retained.
 */
export class SpectrumOverview {
  private readonly stride: number;
  private readonly bins: Buffer;
  private readonly partial: Buffer;
  private partialLength = 0;
  private span = 1;
  private frames = 0;

  constructor(private readonly width: number, private readonly height: number,
    private readonly samplesPerColumn: number) {
    this.stride = height * 3;
    this.bins = Buffer.alloc(width * 2 * this.stride);
    this.partial = Buffer.alloc(this.stride);
  }

  /** Retain the original color of the stronger signal, rather than mixing hues. */
  private merge(target: Buffer, source: Buffer): void {
    for (let row = 0; row < this.stride; row += 3) {
      const sourceBrightness = source[row]! * 299 + source[row + 1]! * 587 + source[row + 2]! * 114;
      const targetBrightness = target[row]! * 299 + target[row + 1]! * 587 + target[row + 2]! * 114;
      if (sourceBrightness > targetBrightness) {
        target[row] = source[row]!; target[row + 1] = source[row + 1]!; target[row + 2] = source[row + 2]!;
      }
    }
  }

  private column(column: Buffer): void {
    if (this.frames / this.span >= this.width * 2) {
      for (let index = 0; index < this.width; index++) {
        const left = this.bins.subarray(index * 2 * this.stride, (index * 2 + 1) * this.stride);
        this.merge(left, this.bins.subarray((index * 2 + 1) * this.stride, (index * 2 + 2) * this.stride));
        left.copy(this.bins, index * this.stride);
      }
      this.span *= 2;
    }
    const index = Math.floor(this.frames / this.span);
    const target = this.bins.subarray(index * this.stride, (index + 1) * this.stride);
    if (this.frames % this.span === 0) column.copy(target);
    else this.merge(target, column);
    this.frames++;
  }

  push(chunk: Buffer): void {
    let offset = 0;
    if (this.partialLength) {
      const length = Math.min(this.stride - this.partialLength, chunk.length);
      chunk.copy(this.partial, this.partialLength, 0, length);
      this.partialLength += length;
      offset += length;
      if (this.partialLength === this.stride) { this.column(this.partial); this.partialLength = 0; }
    }
    for (; offset + this.stride <= chunk.length; offset += this.stride) {
      this.column(chunk.subarray(offset, offset + this.stride));
    }
    if (offset < chunk.length) {
      this.partialLength = chunk.copy(this.partial, 0, offset);
    }
  }

  /** Row-major RGB image covering every decoded FFT column. */
  image(totalSamples: number): Buffer {
    if (!Number.isSafeInteger(totalSamples) || totalSamples <= 0 || this.partialLength ||
      this.frames !== Math.ceil(totalSamples / this.samplesPerColumn)) throw new Error('Incomplete spectrum columns');
    const output = Buffer.alloc(this.width * this.stride);
    const peak = Buffer.alloc(this.stride);
    const binCount = Math.ceil(this.frames / this.span);
    for (let x = 0; x < this.width; x++) {
      peak.fill(0);
      // The final FFT window is zero-padded. Map only its actual sample span,
      // rather than stretching it to the same duration as a complete window.
      const samplesPerBin = this.span * this.samplesPerColumn;
      const first = Math.floor(x * totalSamples / (this.width * samplesPerBin));
      const last = Math.min(binCount - 1, Math.ceil((x + 1) * totalSamples / (this.width * samplesPerBin)) - 1);
      for (let index = first; index <= last; index++) {
        this.merge(peak, this.bins.subarray(index * this.stride, (index + 1) * this.stride));
      }
      for (let y = 0; y < this.height; y++) peak.copy(output, (y * this.width + x) * 3, y * 3, y * 3 + 3);
    }
    return output;
  }
}
