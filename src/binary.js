// Canonical, arbitrary-width unsigned base-128 integers and byte framing.
export function putVarint(output, value) {
  let n = BigInt(value);
  if (n < 0n) throw new Error('Unsigned integer required.');
  do { const next = n >> 7n; output.push(Number(n & 127n) | (next ? 128 : 0)); n = next; } while (n);
}
export class ByteReader {
  constructor(bytes) { this.bytes = bytes; this.position = 0; }
  get remaining() { return this.bytes.length - this.position; }
  take(length) {
    const n = BigInt(length);
    if (n < 0n || n > BigInt(this.remaining)) throw new Error('Truncated packet.');
    const result = this.bytes.subarray(this.position, this.position + Number(n));
    this.position += Number(n);
    return result;
  }
  varint() {
    let n = 0n, shift = 0n;
    while (this.remaining) {
      const byte = this.bytes[this.position++];
      n |= BigInt(byte & 127) << shift;
      if (!(byte & 128)) {
        if (shift && byte === 0) throw new Error('Noncanonical integer.');
        return n;
      }
      shift += 7n;
    }
    throw new Error('Truncated integer.');
  }
}
export const byteWidth = size => Math.max(1, Math.ceil((size - 1n).toString(2).length / 8));
export function putFixed(output, value, size) {
  let n = BigInt(value);
  if (n < 0n || n >= size) throw new Error('Semantic value outside its domain.');
  const width = byteWidth(size), bytes = new Array(width);
  for (let i = width - 1; i >= 0; i--) { bytes[i] = Number(n & 255n); n >>= 8n; }
  for (const byte of bytes) output.push(byte);
}
export function readFixed(reader, size) {
  let n = 0n;
  for (const byte of reader.take(byteWidth(size))) n = (n << 8n) | BigInt(byte);
  if (n >= size) throw new Error('Semantic value outside its domain.');
  return n;
}
export function toBase64(bytes) {
  const chunks = [];
  for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(chunks.join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function fromBase64(text) {
  if (typeof text !== 'string' || !text.length || /[^A-Za-z0-9_-]/.test(text) || text.length % 4 === 1) {
    throw new Error('Malformed link payload.');
  }
  let bytes;
  try { bytes = Uint8Array.from(atob(text.replaceAll('-', '+').replaceAll('_', '/')), c => c.charCodeAt(0)); }
  catch { throw new Error('Malformed link payload.'); }
  if (toBase64(bytes) !== text) throw new Error('Noncanonical link payload.');
  return bytes;
}
