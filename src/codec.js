import { validateVersion, loadVocabulary } from './vocabulary.js';
import { createGrammar, parseNote, compileLayout, renderPlan } from './grammar.js';
import { createMapping } from './mapping.js';
import { ByteReader, putVarint, putFixed, readFixed, toBase64, fromBase64 } from './binary.js';

export const randomSalt = () => crypto.getRandomValues(new Uint8Array(16));
export const randomPasskey = () => toBase64(randomSalt());

export function packPayload(grammar, salt, layout, codes) {
  if (!(salt instanceof Uint8Array) || salt.length !== 16) throw new Error('Salt must contain 16 bytes.');
  const plan = compileLayout(grammar, layout);
  if (codes.length !== plan.slots.length) throw new Error('Incorrect semantic value count.');
  const version = new TextEncoder().encode(validateVersion(grammar.vocabulary.version));
  const output = [80, 75, 76]; // PKL: stored recursive layout, no legacy decoder.
  putVarint(output, version.length);
  for (const byte of version) output.push(byte);
  for (const byte of salt) output.push(byte);
  putVarint(output, layout.length);
  for (const byte of layout) output.push(byte);
  plan.slots.forEach((slot, i) => putFixed(output, codes[i], slot.size));
  return toBase64(Uint8Array.from(output));
}

export function inspectPayload(payload) {
  const reader = new ByteReader(fromBase64(payload));
  if (Array.from(reader.take(3)).join(',') !== '80,75,76') throw new Error('Unsupported link format.');
  const versionBytes = reader.take(reader.varint());
  if (versionBytes.some(byte => byte > 127)) throw new Error('Malformed vocabulary version.');
  const version = validateVersion(new TextDecoder().decode(versionBytes));
  const salt = reader.take(16), layout = reader.take(reader.varint());
  const body = reader.take(reader.remaining);
  return { version, salt, layout, body };
}
export function unpackPayload(grammar, payload) {
  const packet = inspectPayload(payload);
  if (packet.version !== grammar.vocabulary.version) throw new Error('Vocabulary version mismatch.');
  const plan = compileLayout(grammar, packet.layout, packet.body.length), reader = new ByteReader(packet.body);
  const codes = plan.slots.map(slot => readFixed(reader, slot.size));
  return { ...packet, plan, codes };
}

async function transform(grammar, salt, plan, input, passkey, inverse, options) {
  const mapping = await createMapping(passkey, salt, grammar.vocabulary.version, plan.layout, options);
  const output = [];
  for (const slot of plan.slots) {
    const context = [slot.index, slot.role || 'number', slot.category?.id.toString() || slot.form, slot.size.toString()];
    const value = await mapping.value(input[slot.index], slot.size, context, inverse);
    output.push(value);
    await mapping.advance(inverse ? value : input[slot.index], inverse ? input[slot.index] : value, context);
  }
  options?.signal?.throwIfAborted();
  return output;
}
export async function encodeNote(grammar, text, passkey, { salt = randomSalt(), signal } = {}) {
  if (typeof passkey !== 'string' || Array.from(passkey).length < 3) {
    throw new Error('Use at least three characters when creating a note.');
  }
  signal?.throwIfAborted();
  const { layout, values } = parseNote(grammar, text), plan = compileLayout(grammar, layout);
  const codes = await transform(grammar, salt, plan, values, passkey, false, { signal });
  return packPayload(grammar, salt, layout, codes);
}
export async function decodeNote(grammar, payload, passkey, options = {}) {
  // Complete structural and value-domain validation before interpreting a key.
  const packet = unpackPayload(grammar, payload);
  return renderPlan(packet.plan, await transform(grammar, packet.salt, packet.plan, packet.codes, passkey, true, options));
}
export async function openPayload(payload, options) {
  const { version } = inspectPayload(payload);
  const grammar = createGrammar(await loadVocabulary(version, options)), packet = unpackPayload(grammar, payload);
  return { grammar, layout: packet.layout, decode: async (passkey, options = {}) =>
    renderPlan(packet.plan, await transform(grammar, packet.salt, packet.plan, packet.codes, passkey, true, options)) };
}
export function payloadFromFragment(fragment) {
  if (typeof fragment !== 'string' || !fragment.startsWith('#p=')) throw new Error('Malformed note fragment.');
  const payload = fragment.slice(3);
  inspectPayload(payload);
  return payload;
}
