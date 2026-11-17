import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{createStructureLanguage,encodeStructure,decodeStructure}from'../src/structure-codec.js';import{parseNote}from'../src/grammar.js';import{replay}from'../tools/coverage/run.js';
const l=await createStructureLanguage(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
test('merged nouns accept bare count uses, mass nouns, people and places through the actual codec',async()=>{
 for(const text of ['is this ready for production?','production is ready.','much production is ready.','a lot of production is ready.','a sarah is ready.','the water is ready.','the sarah is ready.','i like new york.','the productions are ready.','is this ready for testing?']){assert.ok(replay(l.grammar,text),text);const p=await encodeStructure(l,text,'author');assert.equal((await decodeStructure(l,p.payload,'author')).text,text);assert.ok((await decodeStructure(l,p.payload,'other')).text);}
 const pool=new Set(l.grammar.pools.get('option3_noun_s').map(e=>e.text));for(const word of ['production','water','sarah','new york'])assert.ok(pool.has(word),word);
});
test('noun merging retains agreement, pronoun case and unknown-word rejection',()=>{
 for(const text of ['the productions is ready.','they is ready.','me am ready.','qzxvnonword is ready.'])assert.throws(()=>parseNote(l.grammar,text),undefined,text);
});
