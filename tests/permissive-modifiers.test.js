import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{createStructureLanguage,encodeStructure,decodeStructure}from'../src/structure-codec.js';
import{createGrammar,parseNote}from'../src/grammar.js';import{analyzeDraft}from'../src/draft.js';import{replay}from'../tools/coverage/run.js';
const vocabulary=JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url)));
const language=await createStructureLanguage(vocabulary);
const examples=['can you double check if this works?','please double check if this works.','she double checks if this works.','they double checked if this works.','we have double checked whether this works.','she is double checking if this works.','can you purple check if this works?','can you quick double check this?'];
test('adjective-before-verb policy accepts complete messages and every typing prefix',async()=>{
 for(const text of examples){assert.ok(replay(language.grammar,text),text);assert.equal(analyzeDraft(language.grammar,text).complete,true,text);const p=await encodeStructure(language,text,'author');assert.equal((await decodeStructure(language,p.payload,'author')).text,text);assert.ok((await decodeStructure(language,p.payload,'another')).text);}
});
test('permissive modifiers preserve inflection and case and do not admit unknown words',()=>{
 const strict=createGrammar(vocabulary);assert.throws(()=>parseNote(strict,examples[0]));
 assert.ok(language.grammar.pools.get('option3_preverb_adjective').some(e=>e.text==='double'));
 for(const text of ['she double check this.','they double checks this.','can me double check this?','can you qzxvnonword check this?'])assert.throws(()=>parseNote(language.grammar,text),undefined,text);
});
