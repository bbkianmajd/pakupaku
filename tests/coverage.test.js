import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGrammar, parseNote, suggestNext } from '../src/grammar.js';
import { encodeNote, decodeNote } from '../src/codec.js';

const load = async path => JSON.parse(await readFile(new URL(path, import.meta.url)));
const grammar = createGrammar(await load('../data/semantics.json'));
const corpus = await load('../data/coverage/everyday.json');
const salt = new Uint8Array(16);

test('representative everyday constructions round trip and replay under alternate keys', async () => {
  for (const note of corpus.supported) {
    assert.doesNotThrow(() => parseNote(grammar, note), note);
    const payload = await encodeNote(grammar, note, 'sarah', { salt });
    assert.equal(await decodeNote(grammar, payload, 'sarah'), note);
    for (const key of ['', 'wrong']) {
      const reading = await decodeNote(grammar, payload, key);
      assert.doesNotThrow(() => parseNote(grammar, reading), reading);
      const tokens = reading.match(/[a-z0-9]+|[.,]/g) || [];
      const committed = [];
      for (const token of tokens) {
        const next = suggestNext(grammar, committed, token);
        assert.ok(next.words.includes(token) || next.numberCandidate === token, reading);
        committed.push(token);
      }
      assert.equal(suggestNext(grammar, committed).complete, true, reading);
    }
  }
});

test('present tense rules combine names, verbs and objects without phrase-specific entries', () => {
  const names = ['tom', 'bobby', 'alice', 'james', 'mary', 'michael', 'sarah', 'william'];
  const thirdVerbs = ['loves', 'likes', 'knows', 'helps', 'trusts', 'follows', 'visits', 'respects'];
  for (const name of names) for (const verb of thirdVerbs) {
    assert.doesNotThrow(() => parseNote(grammar, `${name} ${verb} you`));
  }
  for (const verb of ['love', 'like', 'know', 'help', 'trust', 'follow', 'visit', 'respect']) {
    assert.doesNotThrow(() => parseNote(grammar, `i ${verb} tom`));
    assert.doesNotThrow(() => parseNote(grammar, `they ${verb} bobby`));
  }
});
