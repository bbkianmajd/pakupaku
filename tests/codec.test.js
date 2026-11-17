import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGrammar, parseNote, compileLayout, renderPlan, suggestNext } from '../src/grammar.js';
import { analyzeDraft } from '../src/draft.js';
import { createMapping } from '../src/mapping.js';
import { categoryFor, numberCategory } from '../src/numbers.js';
import { ByteReader, putVarint, toBase64, fromBase64 } from '../src/binary.js';
import { validateVocabulary, loadVocabulary, loadCurrentVocabulary } from '../src/vocabulary.js';
import { encodeNote, decodeNote, packPayload, unpackPayload, inspectPayload, openPayload, payloadFromFragment } from '../src/codec.js';

const vocabulary = JSON.parse(await readFile(new URL('../data/semantics.json', import.meta.url)));
const grammar = createGrammar(vocabulary);
const salt = Uint8Array.from({ length: 16 }, (_, i) => i);
const keys = ['', 's', 'sa', 'sarah', 'sarah ', 'Sarah', ' ', '🔑', '你好', 'e\u0301', 'é', '\u0000', '\ud800'];
const samples = ['sally ate soup', 'sally slept and alice ate soup', 'sally and alice slept',
  'sally ate soup and slept', 'sally and alice ate soup and slept and morgan bought 17 red books',
  'the lovely quiet person bought 1 apple and 17 books', 'sally ate soup and alice slept',
  'sally bought 123456789012345678901234567890 books',
  'sally slept, and alice ate soup.', 'sally and alice ate soup, and slept.',
  'sally, and alice slept.', 'the lovely person slept.',
  'i slept.', 'she saw him', 'i and sally slept', 'sally saw me and alice',
  'you saw it', 'sally saw her, and i slept.',
  'hello', 'hello.', 'hello world', 'hello, world.', 'sally, i slept.',
  'good morning', 'hi good morning', 'hi, good morning', 'good morning, sally',
  'sally slept. hello', 'hello world. hi good morning.',
  'i love you', 'tom loves bobby', 'the cats love you', 'the cat loves you'];
function replay(text) {
  const committed = [];
  for (const token of text.match(/[a-z0-9]+|[.,]/g)) {
    const next = suggestNext(grammar, committed, token);
    assert.ok(next.words.includes(token) || next.numberCandidate === token, `${token} in ${text}`);
    committed.push(token);
  }
  assert.equal(suggestNext(grammar, committed).complete, true);
}
function rawPacket(layout, body = []) {
  const data = [80,75,76,5,49,46,48,46,48,...salt];
  putVarint(data, layout.length);
  return toBase64(Uint8Array.from([...data, ...layout, ...body]));
}

test('recursive clauses, noun phrases, verb phrases and adjectives round trip', async () => {
  for (const text of samples) {
    const parsed = parseNote(grammar, text);
    assert.equal(renderPlan(compileLayout(grammar, parsed.layout), parsed.values), text);
    replay(text);
    const payload = await encodeNote(grammar, text, 'sarah', { salt });
    assert.equal(await decodeNote(grammar, payload, 'sarah'), text);
  }
});

// Inspect the rendered plan by semantic fields, whose spellings may now
// contain several words. Fixed token offsets are no longer an invariant.
const spellingCache=new WeakMap();
function renderedFields(plan,text) {
 let rest=text;const fields=[];
 for(const item of plan.items) {
  rest=rest.trimStart();let field;
  if(item.literal){field=item.literal;assert.ok(rest.startsWith(field),rest);}
  else if(item.category){field=rest.match(/^\d+/)?.[0];assert.ok(field,rest);}
  else {
   let forms=spellingCache.get(item.entries);if(!forms){forms=new Map();spellingCache.set(item.entries,forms);}
   if(!forms.has(item.form))forms.set(item.form,[...new Set(item.entries.flatMap(e=>item.form==='text'?[e.text]:item.form==='quantity'?[e.forms.singular,e.forms.plural]:[e.forms[item.form]]))].sort((a,b)=>b.length-a.length));
   const words=forms.get(item.form);
   field=words.find(word=>rest.startsWith(word)&&(!rest[word.length]||/[\s.,!?]/.test(rest[word.length])));assert.ok(field,rest);
  }
  fields.push(field);rest=rest.slice(field.length);
 }
 assert.equal(rest.trim(),'');return fields;
}

test('every reader key keeps grammatical slots, number positions and magnitude categories', async () => {
  for (const original of ['sally ate soup and alice slept', '1 lovely child bought 999999 red books and alice slept']) {
    const payload = await encodeNote(grammar, original, 'sarah', { salt });
    const { plan } = unpackPayload(grammar, payload);
    for (const key of keys) {
      const text = await decodeNote(grammar, payload, key), tokens = renderedFields(plan,text);
      assert.equal(tokens.length, plan.items.length);
      plan.items.forEach((item, i) => {
        if (item.literal) assert.equal(tokens[i], item.literal);
        else if (item.category) assert.equal(categoryFor(BigInt(tokens[i])).id, item.category.id);
        else assert.ok(tokens[i].length>0);
      });
      replay(text);
    }
  }
});

test('subject and object pronouns retain case for every key and coordinated phrase', async () => {
  const note = 'i and sally saw her, and she slept.';
  const payload = await encodeNote(grammar, note, 'sarah', { salt });
  const { plan } = unpackPayload(grammar, payload);
  assert.ok(plan.slots.some(slot => slot.role === 'subject-pronoun'));
  assert.ok(plan.slots.some(slot => slot.role === 'object-pronoun'));
  for (const key of keys) {
    const reading = await decodeNote(grammar, payload, key);
    replay(reading);
    assert.doesNotThrow(() => parseNote(grammar, reading));
    const tokens = renderedFields(plan,reading);
    plan.items.forEach((item, i) => {
      if (item.role === 'subject-pronoun' || item.role === 'object-pronoun') {
        assert.ok(item.entries.some(entry => entry.text === tokens[i]));
      }
    });
  }
});

test('greetings and addressed commas remain composer-supported under every key', async () => {
  for (const note of ['hello', 'hello world', 'hello, world.', 'sally, i slept.']) {
    const payload = await encodeNote(grammar, note, 'sarah', { salt });
    assert.equal(await decodeNote(grammar, payload, 'sarah'), note);
    for (const key of keys) {
      const reading = await decodeNote(grammar, payload, key);
      replay(reading);
      assert.doesNotThrow(() => parseNote(grammar, reading));
      assert.equal(reading.includes(','), note.includes(','));
      assert.equal(reading.endsWith('.'), note.endsWith('.'));
    }
  }
});

test('period-separated utterances and time-of-day greetings work for every key', async () => {
  const notes = ['good morning', 'hi good morning', 'hi, good morning', 'good morning, sally',
    'sally slept. hello', 'hello world. good morning. hi, world.'];
  for (const note of notes) {
    const payload = await encodeNote(grammar, note, 'sarah', { salt });
    assert.equal(await decodeNote(grammar, payload, 'sarah'), note);
    for (const key of keys) {
      const reading = await decodeNote(grammar, payload, key);
      assert.equal((reading.match(/\./g) || []).length, (note.match(/\./g) || []).length);
      assert.equal((reading.match(/,/g) || []).length, (note.match(/,/g) || []).length);
      replay(reading);
      assert.doesNotThrow(() => parseNote(grammar, reading));
    }
  }
});

test('present-tense subject and verb agreement survives every reader key', async () => {
  for (const note of ['i love you', 'tom loves bobby', 'he loves her',
    'they love you', 'the cats love you', 'the cat loves you',
    'tom and bobby love you', 'i love you and she likes me']) {
    const payload = await encodeNote(grammar, note, 'sarah', { salt });
    assert.equal(await decodeNote(grammar, payload, 'sarah'), note);
    for (const key of keys) {
      const reading = await decodeNote(grammar, payload, key);
      replay(reading);
      assert.doesNotThrow(() => parseNote(grammar, reading));
    }
  }
});

test('all small finite-domain permutations have an inverse, including cycle walking', async () => {
  for (const key of ['', 'sarah']) {
    const mapping = await createMapping(key, salt, '1.0.0', Uint8Array.of(0,2,7));
    for (const size of [1n,2n,3n,5n,17n,31n]) {
      const results = new Set();
      for (let n = 0n; n < size; n++) {
        const encoded = await mapping.value(n, size, ['test']);
        assert.ok(encoded >= 0n && encoded < size); results.add(encoded);
        assert.equal(await mapping.value(encoded, size, ['test'], true), n);
        const decoded = await mapping.value(n, size, ['test'], true);
        assert.equal(await mapping.value(decoded, size, ['test']), n);
      }
      assert.equal(results.size, Number(size));
    }
  }
});

test('semantic feedback changes subsequent mappings even with the same stored code', async () => {
  const a = await createMapping('sarah', salt, '1.0.0', Uint8Array.of(0,2,7));
  const b = await createMapping('sarah', salt, '1.0.0', Uint8Array.of(0,2,7));
  await a.advance(1n, 4n, ['name']);
  await b.advance(2n, 4n, ['name']);
  const nextA = [], nextB = [];
  for (let i = 0n; i < 17n; i++) {
    nextA.push(await a.value(i, 17n, ['verb']));
    nextB.push(await b.value(i, 17n, ['verb']));
  }
  assert.notDeepEqual(nextA, nextB);
});

test('changing an earlier result changes later codes without breaking any reader key', async () => {
  const noteA = 'sally ate soup and alice bought 17 red books';
  const noteB = 'sally ate water and alice bought 17 red books';
  const a = unpackPayload(grammar, await encodeNote(grammar, noteA, 'sarah', { salt }));
  const b = unpackPayload(grammar, await encodeNote(grammar, noteB, 'sarah', { salt }));
  assert.deepEqual(a.layout, b.layout);
  assert.deepEqual(a.codes.slice(0, 2), b.codes.slice(0, 2));
  assert.notEqual(a.codes[2], b.codes[2]);
  assert.notDeepEqual(a.codes.slice(3), b.codes.slice(3));
  // A different in-domain early code must still yield complete, grammatical text.
  const codes = [...a.codes]; codes[0] = (codes[0] + 1n) % a.plan.slots[0].size;
  const changed = packPayload(grammar, salt, a.layout, codes);
  const reading = await decodeNote(grammar, changed, 'sarah');
  assert.notEqual(reading, noteA);
  replay(reading);
});

test('number categories cover boundaries and integers beyond 256 bits', async () => {
  const numbers = [0n,1n,99n,100n,9999n,10000n,999999n,1000000n,9999999n,10000000n,10n**170n+17n];
  for (const number of numbers) {
    const noun = number === 1n ? 'apple' : 'apples';
    const text = `sally bought ${number} ${noun}`;
    const payload = await encodeNote(grammar, text, 'sarah', { salt });
    assert.equal(await decodeNote(grammar, payload, 'sarah'), text);
    const decoy = await decodeNote(grammar, payload, 'other');
    assert.equal(categoryFor(BigInt(decoy.match(/\b[0-9]+\b/)[0])).id, categoryFor(number).id);
    assert.doesNotThrow(() => parseNote(grammar, decoy));
  }
  assert.equal(numberCategory(3n).lo, 1000000n);
});

test('no hard-coded sentence or tree-depth limit; long text passes prior byte limits', async () => {
  const text = Array(1000).fill('sally slept').join(' and ');
  const payload = await encodeNote(grammar, text, 'sarah', { salt });
  assert.ok(text.length > 1024 && payload.length > 512);
  assert.equal(await decodeNote(grammar, payload, 'sarah'), text);
  const decoy = await decodeNote(grammar, payload, 'other');
  assert.equal(renderedFields(unpackPayload(grammar,payload).plan,decoy).length,2999);
  assert.doesNotThrow(() => parseNote(grammar, decoy));
  assert.ok(suggestNext(grammar, text.split(' '), 'an').words.includes('and'));
  const deepText = Array(10000).fill('sally slept').join(' and ');
  const parsed = parseNote(grammar, deepText);
  assert.equal(renderPlan(compileLayout(grammar, parsed.layout), parsed.values), deepText);
});

test('right-nested layouts are also accepted without recursive JS traversal', () => {
  const count = 10000, layout = [17], values = [];
  for (let i = 0; i < count; i++) {
    if (i < count - 1) layout.push(1);
    layout.push(0,18,2,7); values.push(0n,0n);
  }
  const plan = compileLayout(grammar, Uint8Array.from(layout));
  assert.equal(renderPlan(plan, values).split(' ').length, 3*count-1);
});

test('grammar rejects incomplete, unknown, malformed and disagreeing text', () => {
  for (const text of ['sally ate # apples','sally bought',
    'sally danced soup','sally ate 1 apples','sally ate 2 apple','sally ate 01 apples',
    'sally ate -1 apples','sally ate 2.5 apples',
    'sally slept and','sally slept and and alice slept',
    'sally slept, alice slept','sally slept..','sally slept,','sally,slept',
    'me slept','him saw her','sally saw i','she saw he','sally and me slept',
    'hello,','hello,, world','hello world,','hello, slept',
    'sally slept hello','hello..hi','good slept','hi good',
    'he love you','i loves you','tom love you','the cats loves you']) {
    assert.throws(() => parseNote(grammar, text), undefined, text);
  }
  assert.ok(suggestNext(grammar, ['sally','ate','1'], 'ch').words.includes('child'));
  assert.ok(!suggestNext(grammar, ['sally','ate','1'], 'ch').words.includes('children'));
  assert.ok(suggestNext(grammar, ['sally','ate','2'], 'ch').words.includes('children'));
  assert.equal(suggestNext(grammar, ['sally','ate'], '10000000000000000000').numberCandidate, '10000000000000000000');
});

test('draft accepts ordinary typing, pinpoints bad tokens, and canonicalizes punctuation', async () => {
  const typed = 'Sally  slept,\n and Alice slept .';
  assert.equal(analyzeDraft(grammar, typed).complete, true);
  const parsed = parseNote(grammar, typed);
  const canonical = 'sally slept, and alice slept.';
  assert.equal(renderPlan(compileLayout(grammar, parsed.layout), parsed.values), canonical);
  const payload = await encodeNote(grammar, typed, 'sarah', { salt });
  assert.equal(await decodeNote(grammar, payload, 'sarah'), canonical);
  assert.equal(analyzeDraft(grammar, 'Sally sl').issue, null);
  assert.equal(analyzeDraft(grammar, 'Sally sl').complete, false);
  assert.deepEqual(analyzeDraft(grammar, 'Sally foobarbaz').issue, { start: 6, end: 15 });
  assert.equal(analyzeDraft(grammar, 'Sally slept!').complete, true);
  assert.deepEqual(analyzeDraft(grammar, 'Sally slept, Alice').issue, { start: 13, end: 18 });
  assert.equal(analyzeDraft(grammar, 'I slept.').complete, true);
  assert.equal(analyzeDraft(grammar, 'hello').complete, true);
  assert.equal(analyzeDraft(grammar, 'Hello, World.').complete, true);
  assert.equal(analyzeDraft(grammar, 'Hi Good Morning.').complete, true);
  assert.equal(analyzeDraft(grammar, 'Sally slept. Hello').complete, true);
  assert.match(analyzeDraft(grammar, 'sally slept hello').message, /Add a period before/);
  assert.match(analyzeDraft(grammar, 'me slept').message, /object pronoun; use a subject pronoun/);
  assert.match(analyzeDraft(grammar, 'sally saw i ').message, /subject pronoun; use an object pronoun/);
  assert.ok(suggestNext(grammar, ['sally','slept']).words.includes('.'));
  assert.ok(suggestNext(grammar, ['sally','slept'], ',').words.includes(','));
});

test('writer minimum does not impose a reader key check; cancellation aborts work', async () => {
  for (const key of ['', 's', '🔑']) await assert.rejects(encodeNote(grammar, 'sally ate soup', key), /three/);
  const payload = await encodeNote(grammar, 'sally ate soup', 'sarah', { salt });
  for (const key of keys) {
    const reading = await decodeNote(grammar, payload, key);
    assert.doesNotThrow(() => parseNote(grammar, reading));
  }
  const controller = new AbortController(); controller.abort();
  await assert.rejects(decodeNote(grammar, payload, 'sarah', { signal: controller.signal }), { name: 'AbortError' });
});

test('canonical packet framing and deterministic salted encoding', async () => {
  const payload = await encodeNote(grammar, samples[1], 'sarah', { salt });
  assert.equal(payload, await encodeNote(grammar, samples[1], 'sarah', { salt }));
  assert.notEqual(payload, await encodeNote(grammar, samples[1], 'sarah', { salt: new Uint8Array(16).fill(9) }));
  const packet = inspectPayload(payload);
  assert.equal(packet.version, '1.0.0'); assert.deepEqual(packet.salt, salt);
  assert.deepEqual(packet.layout,parseNote(grammar,samples[1]).layout);
  assert.equal(payloadFromFragment(`#p=${payload}`), payload);
  assert.deepEqual(fromBase64(payload).slice(0,3), Uint8Array.of(80,75,76));
  for (const number of [0n,127n,128n,16383n,16384n,1n<<80n]) {
    const bytes=[]; putVarint(bytes,number); assert.equal(new ByteReader(Uint8Array.from(bytes)).varint(),number);
  }
});

test('malformed packets rejected before reader-key interpretation', async () => {
  const good = await encodeNote(grammar, 'sally slept', 'sarah', { salt });
  const malformed = ['', '=', 'a', good+'=', rawPacket([0,2]), rawPacket([0,7,2]),
    rawPacket([0,2,7,3]), rawPacket([0,2,7], [255,255,255,255]),
    rawPacket([0,2,7], [0]), rawPacket([0,2,7], [0,0,0]),
    rawPacket([128,0,2,7]), rawPacket([0,2,8,5,12,255,255,255,127,10], [0,0,0,0]),
    toBase64(Uint8Array.of(80,75,49,5,49,46,48,46,48,...salt,0))];
  for (const payload of malformed) {
    for (const key of ['', 'sarah', null]) await assert.rejects(decodeNote(grammar, payload, key), undefined, payload);
  }
  for (const fragment of ['#p=', '#q=abc', '#p=abc&x=y', '#p=abc\n']) assert.throws(() => payloadFromFragment(fragment));
});

test('version loader selects the exact static data and reports missing files', async () => {
  const requests=[];
  const fetcher=async path => {requests.push(path);return {ok:true,json:async()=>vocabulary};};
  const payload=await encodeNote(grammar,'sally ate soup','sarah',{salt});
  const reader=await openPayload(payload,{fetcher});
  assert.equal(await reader.decode('sarah'),'sally ate soup');
  assert.deepEqual(requests,['./data/semantics/1.0.0.json']);
  await assert.rejects(openPayload(payload,{fetcher:async()=>({status:404})}),/version 1.0.0 is missing/);
  await assert.rejects(loadVocabulary('../1.0.0',{fetcher}),/version/);
  await assert.rejects(loadVocabulary('2.0.0',{fetcher}),/mismatch/);
  await loadCurrentVocabulary({fetcher});
});

test('vocabulary role, ID and literal validation; canonical parse ignores input entry order', async () => {
  const reverse=createGrammar({...vocabulary,entries:[...vocabulary.entries].reverse()});
  const payload=await encodeNote(grammar,samples[1],'sarah',{salt});
  assert.equal(await decodeNote(reverse,payload,'sarah'),samples[1]);
  for (const change of [d=>d.entries.push(d.entries[0]),d=>d.entries[0].text='#',
    d=>d.entries[0].roles=['unknown'],d=>d.entries.find(e=>e.roles.includes('conjunction')).text='or']) {
    const bad=structuredClone(vocabulary);change(bad);assert.throws(()=>validateVocabulary(bad));
  }
  for(const suffix of ['\n','\r','\u2028','\u2029']) {
    assert.equal(suggestNext(grammar,['sally','ate'],'17'+suffix).numberCandidate,null);
    await assert.rejects(loadVocabulary('1.0.0'+suffix),/version/);
  }
});

test('fixed stored-layout vector records current packet and semantic code behavior', async () => {
  const vector=JSON.parse(await readFile(new URL('./vector.json',import.meta.url)));
  assert.equal(await encodeNote(grammar,vector.note,vector.passkey,{salt}),vector.payload);
  assert.equal(await decodeNote(grammar,vector.payload,vector.passkey),vector.note);
  assert.deepEqual(Array.from(inspectPayload(vector.payload).layout),vector.layout);
});
