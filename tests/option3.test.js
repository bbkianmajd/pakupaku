import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{createGrammar,parseNote,compileLayout}from'../src/grammar.js';import{analyzeDraft}from'../src/draft.js';
import{createStructureLanguage,encodeStructure,decodeStructure}from'../src/structure-codec.js';
const data=JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))),strict=createGrammar(data),loose=createGrammar(data,{profile:'option3'});
const examples=['sarah arrives the sandwich.','i wonder how many sentences will pass?','the sandwich wonders whether the moon is tired.','the moon sleeps the sandwich.','they arrive the sandwich.','she depends the book.'];
test('option 3 removes verb frames while editor and author recovery share the same grammar',async()=>{
 const l=await createStructureLanguage(data);
 for(const text of examples){assert.doesNotThrow(()=>parseNote(loose,text),text);assert.equal(analyzeDraft(loose,text).complete,true,text);const p=await encodeStructure(l,text,'test');assert.equal((await decodeStructure(l,p.payload,'test')).text,text);for(const key of ['t','te','tes'])assert.ok((await decodeStructure(l,p.payload,key)).text.length);}
 assert.throws(()=>parseNote(strict,examples[0]));assert.throws(()=>parseNote(strict,examples[1]));
});
test('option 3 still enforces inflection, case, articles, and numeric validity',()=>{
 for(const text of ['they arrives the sandwich.','sarah arrive the sandwich.','me am ready.','a apple is ready.','meet me at 25:99.','qzxvnonword is ready.'])assert.throws(()=>parseNote(loose,text),undefined,text);
});
test('broad pools reach predicates, adverbs, learned lexical contexts and default output families',async()=>{
 assert.ok(loose.pools.get('predicative').length>strict.pools.get('predicative').length);
 assert.ok(loose.pools.get('verb_transitive_base').some(e=>e.text==='arrive'));
 assert.ok(loose.pools.get('verb_intransitive_base').some(e=>e.text==='wonder'));
 assert.ok([...loose.pools].some(([name,p])=>name.startsWith('dep_')&&p.length>(strict.pools.get(name)?.length||0)));
 const l=await createStructureLanguage(data);assert.deepEqual(l.simple.pools.events,l.simple.pools.relations);assert.ok(l.simple.pools.actors.some(e=>e.text==='the sandwich'));
 for(const text of examples){const p=parseNote(loose,text);assert.ok(compileLayout(loose,p.layout));}
});
