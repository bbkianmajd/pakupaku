import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGrammar, parseNote, suggestNext } from '../src/grammar.js';
import { encodeNote, decodeNote, inspectPayload, openPayload } from '../src/codec.js';
import { loadCurrentVocabulary } from '../src/vocabulary.js';

const load = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const candidate = await load('../data/candidates/draft-5000.json');
const seed = await load('../data/candidates/seed-165.json');
const starter = await load('./fixtures/starter-vocabulary.json');
const current = await load('../data/semantics.json');
const archive = await load('../data/semantics/1.0.0.json');
const commonNames = (await readFile(new URL('../tools/vocabulary/ssa-top-1000.txt', import.meta.url), 'utf8')).trim().split('\n');

test('large candidate includes 1,000 sourced names and present-tense roles', () => {
  assert.equal(candidate.version, '1.0.0');
  assert.equal(candidate.entries.length, 6092);
  assert.equal(new Set(candidate.entries.map(entry => entry.text)).size, 6005);
  assert.deepEqual(candidate.entries.slice(0, seed.entries.length), seed.entries);
  assert.deepEqual(candidate.entries.slice(0, starter.entries.length), starter.entries);
  const grammar = createGrammar(candidate);
  assert.equal(commonNames.length, 1000);
  assert.ok(commonNames.includes('tom') && commonNames.includes('bobby'));
  for (const name of commonNames) assert.ok(grammar.lexicons.get('name').has(name), name);
  for (const note of ['alice bought 17 red books', 'the blue cat slept',
    '17 lovely cats laughed', 'hello world', 'hello, sally.',
    'hi good morning', 'good morning, sally', 'sally slept. hello',
    'i love you', 'tom loves bobby', 'the cats love you']) assert.doesNotThrow(() => parseNote(grammar, note));
  for (const word of ['have', 'can', 'very', 'said', 'woman']) {
    assert.equal(candidate.entries.slice(seed.entries.length).some(entry => entry.text === word), false);
  }
});

test('extended pre-release vocabulary retains the sourced base and matches the 1.0.0 archive', async () => {
  const base = current.entries.filter(entry => entry.source !== 'project-stage2').map(entry => {
    const copy=structuredClone(entry); delete copy.features.onset; return copy;
  });
  assert.deepEqual(base, candidate.entries);
  assert.ok(current.entries.length > candidate.entries.length);
  assert.deepEqual(archive, current);
  const paths = [];
  const fetcher = async path => {
    paths.push(path);
    const data = path === './data/semantics.json' ? current
      : path === './data/semantics/1.0.0.json' ? archive : undefined;
    return data ? { ok: true, json: async () => data } : { ok: false, status: 404 };
  };
  assert.equal((await loadCurrentVocabulary({ fetcher })).version, '1.0.0');
  assert.deepEqual(paths, ['./data/semantics.json', './data/semantics/1.0.0.json']);
  const grammar = createGrammar(current);
  const note = 'alice bought 17 red books';
  const payload = await encodeNote(grammar, note, 'sarah', { salt: new Uint8Array(16) });
  const reader = await openPayload(payload, { fetcher });
  assert.equal(await reader.decode('sarah'), note);
  assert.equal(paths.at(-1), './data/semantics/1.0.0.json');
});

test('large candidate round trips and every sampled alternate key gives a composer reading', async () => {
  const grammar = createGrammar(candidate);
  const salt = new Uint8Array(16);
  const note = 'alice bought 17 red books';
  const payload = await encodeNote(grammar, note, 'sarah', { salt });
  assert.equal(inspectPayload(payload).version, '1.0.0');
  assert.equal(await decodeNote(grammar, payload, 'sarah'), note);
  for (const key of ['', 'taylor', '🔑']) {
    const reading = await decodeNote(grammar, payload, key);
    assert.doesNotThrow(() => parseNote(grammar, reading));
    const committed = [];
    for (const token of reading.split(' ')) {
      const next = suggestNext(grammar, committed, token);
      assert.ok(next.words.includes(token) || next.numberCandidate === token, `${token} in ${reading}`);
      committed.push(token);
    }
    assert.equal(suggestNext(grammar, committed).complete, true);
  }
});
