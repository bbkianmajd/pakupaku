import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createStructureLanguage,encodeStructure,decodeStructure} from '../src/structure-codec.js';
import {analyzeDraft} from '../src/draft.js';
import {replay} from '../tools/coverage/run.js';
const language=await createStructureLanguage(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
const examples=[
 'hi. just going to test if this works.',
 'just going to test if this works.',
 'hi. i am just going to test if this works.',
 'hi. i will test if this works.',
 'just checking if this works.',
 'going to see if this works.',
 'just trying to see if this works.',
 "i'm going to test whether this works.",
 'we are going to test this.',
 'she tests whether this works.',
 'they tested whether this works.',
 'we have tested whether this works.',
];
test('ordinary testing messages work through every typed prefix, encoding and author recovery',async()=>{
 for(const text of examples){
  assert.ok(replay(language.grammar,text),text);
  assert.equal(analyzeDraft(language.grammar,text).complete,true,text);
  const packet=await encodeStructure(language,text,'author');
  assert.equal((await decodeStructure(language,packet.payload,'author')).text,text);
  assert.ok((await decodeStructure(language,packet.payload,'another')).text.length);
 }
});
test('test keeps its noun use and its explicit verb forms without accepting unknown words',()=>{
 assert.equal(analyzeDraft(language.grammar,'this is a test.').complete,true);
 const verb=language.grammar.vocabulary.entries.find(e=>e.text==='test'&&e.roles.includes('framed-verb'));
 assert.deepEqual(verb.forms,{base:'test',third:'tests',past:'tested',participle:'tested',gerund:'testing'});
 assert.ok(analyzeDraft(language.grammar,'just going to qzxvnonword this.').issue);
});
