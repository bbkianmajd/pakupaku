import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createStructureLanguage,encodeStructure,decodeStructure} from '../src/structure-codec.js';
const language=await createStructureLanguage(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
test('empty, short, whitespace and Unicode author keys recover exactly without normalization',async()=>{
 for(const text of ['this is cool.','hello. i love you. can you help me? meet me at 1530.']){
  for(const key of ['', 'x', 'ab', ' ', '  ', '🎉', 'É', ' A ']){
   const encoded=await encodeStructure(language,text,key);
   assert.equal((await decodeStructure(language,encoded.payload,key)).text,encoded.canonical);
  }
 }
 for(const key of [null,undefined,0,{}])await assert.rejects(()=>encodeStructure(language,'this is cool.',key),/Key must be text/);
});
test('pre-change link fingerprints and readings remain identical for original and alternate keys',async()=>{
 const fixture=JSON.parse(await readFile(new URL('fixtures/pre-short-key-link.json',import.meta.url)));
 assert.equal(language.fingerprint,fixture.fingerprint);
 for(const [key,expected] of Object.entries(fixture.readings))assert.equal((await decodeStructure(language,fixture.payload,key)).text,expected);
});
