export const integerToken = text => typeof text === 'string' && /^(0|[1-9][0-9]*)$/.test(text) && !/[^0-9]/.test(text);

// The upper category continues by decimal digit count: no fixed integer ceiling.
export function numberCategory(id, availableBytes) {
  id = BigInt(id);
  if (id < 0n) throw new Error('Invalid numeric category.');
  let lo, hi, label;
  if (id === 0n) { lo = 0n; hi = 99n; label = 'small'; }
  else if (id === 1n) { lo = 100n; hi = 9999n; label = 'medium'; }
  else if (id === 2n) { lo = 10000n; hi = 999999n; label = 'large'; }
  else {
    const digits = id + 4n;
    // A fixed-width value field must accompany the category. Check the actual
    // available input before exponentiation; category IDs cannot request a huge
    // allocation from a tiny packet. This bound scales with input, not a constant.
    if (availableBytes !== undefined && digits > BigInt(availableBytes) * 3n + 1n) {
      throw new Error('Numeric category exceeds the supplied semantic bytes.');
    }
    lo = 10n ** (digits - 1n); hi = lo * 10n - 1n; label = `xlarge-${digits}-digits`;
  }
  return Object.freeze({ id, lo, hi, size: hi - lo + 1n, label });
}
export function categoryFor(value) {
  if (typeof value !== 'bigint' || value < 0n) throw new Error('Nonnegative integer required.');
  const id = value < 100n ? 0n : value < 10000n ? 1n : value < 1000000n ? 2n
    : BigInt(value.toString().length) - 4n;
  return numberCategory(id);
}

// Number-conditioned subjects must never map 2 cats to 1 cats under another
// key. Specialized domains expose singular/plural but retain magnitude mapping.
export function quantityCategory(id, mode, availableBytes) {
  const category = numberCategory(id, availableBytes);
  if (mode === 'singular') {
    if (category.id !== 0n) throw new Error('Invalid singular numeric category.');
    return Object.freeze({ ...category, lo:1n, hi:1n, size:1n });
  }
  if (mode === 'plural' && category.id === 0n) return Object.freeze({ ...category, size:99n, excludesOne:true });
  return category;
}
export const numberValue = (category, value) => category.lo + value + (category.excludesOne && value >= 1n ? 1n : 0n);
