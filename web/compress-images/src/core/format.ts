const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

/**
 * Formats a byte count as a human-readable string using binary units
 * (1 KB = 1024 B). Whole bytes are shown without decimals; larger units
 * use one decimal place.
 *
 * @param bytes - Non-negative byte count.
 * @returns Formatted size, e.g. `"512 B"`, `"1.5 KB"`, `"150.0 MB"`.
 * @throws RangeError when `bytes` is negative.
 */
export function formatBytes(bytes: number): string {
  assertNonNegative(bytes, "bytes");

  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${value} B`;
  }
  return `${value.toFixed(1)} ${BYTE_UNITS[unitIndex]}`;
}

/**
 * Computes how much smaller the compressed result is, as a percentage of
 * the original size. A grown file yields a negative percentage.
 *
 * @param before - Original size in bytes.
 * @param after - Compressed size in bytes.
 * @returns Savings in percent, rounded to one decimal (`50`, `66.7`, `-100`).
 * @throws RangeError when either size is negative.
 */
export function savingsPercent(before: number, after: number): number {
  assertNonNegative(before, "before");
  assertNonNegative(after, "after");

  if (before === 0) {
    return 0;
  }
  const percent = ((before - after) / before) * 100;
  return Math.round(percent * 10) / 10;
}

/**
 * Builds the output filename by replacing the input's last extension with
 * the target extension, so `foto.png` + `webp` becomes `foto.webp` instead
 * of `foto.png.webp`.
 *
 * @param name - Original filename (with or without extension).
 * @param ext - Target extension, normalized to lowercase (no leading dot).
 * @returns New filename with the target extension.
 */
export function buildOutputFilename(name: string, ext: string): string {
  const normalizedExt = ext.toLowerCase();
  const dotIndex = name.lastIndexOf(".");
  // A dot only starts an extension when it is not the first character
  // (dotfiles like `.gitignore` have no extension).
  if (dotIndex <= 0) {
    return `${name}.${normalizedExt}`;
  }
  return `${name.slice(0, dotIndex)}.${normalizedExt}`;
}

function assertNonNegative(value: number, label: string): void {
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative, got ${value}`);
  }
}
