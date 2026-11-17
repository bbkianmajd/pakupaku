import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGrammar,parseNote,compileLayout,renderPlan,suggestNext} from '../src/grammar.js';
import {encodeNote,decodeNote} from '../src/codec.js';
import {analyzeDraft} from '../src/draft.js';
import {replay} from '../tools/coverage/run.js';
const catalog=JSON.parse(await readFile(new URL('../tools/vocabulary/geography.json',import.meta.url)));
const vocab=JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url)));
const g=createGrammar(vocab);
const places=vocab.entries.filter(e=>e.roles.includes('place-name'));
test('all states, capitals, five cities per state and 200 country/territory entities have real lexical entries',()=>{
 assert.equal(catalog.states.length,50);assert.equal(new Set(catalog.states.map(s=>s.name)).size,50);
 assert.equal(catalog.countries.length,200);assert.equal(new Set(catalog.countries.map(c=>c.code)).size,200);
 const names=new Set(places.map(e=>e.text));
 for(const state of catalog.states){assert.equal(state.cities.length,5);assert.equal(new Set(state.cities).size,5);assert.ok(state.cities.includes(state.capital));for(const name of[state.name,...state.cities])assert.ok(names.has(name),name);}
 for(const c of catalog.countries)for(const name of c.spellings)assert.ok(names.has(name),name);
});
test('every place spelling parses, renders exactly and can be entered through the composer',()=>{
 for(const place of places){
  const text=place.features.usage==='label'?place.text:`i live in ${place.text}.`;
  const p=parseNote(g,text);assert.equal(renderPlan(compileLayout(g,p.layout),p.values),text);
  assert.ok(replay(g,text),text);
 }
});
test('multiword names map as complete semantic choices at every geographic pool value',()=>{
 const p=parseNote(g,'i live in salt lake city.'),plan=compileLayout(g,p.layout);
 const slot=plan.slots.find(s=>s.role==='geographic_name'||s.role==='singular_nominal');assert.ok(slot);
 for(let value=0n;value<slot.size;value++){
  const values=[...p.values];values[slot.index]=value;
  const text=renderPlan(plan,values);assert.ok(text.includes(slot.entries[Number(value)].text));
  assert.doesNotThrow(()=>parseNote(g,text),text);
 }
 assert.ok(suggestNext(g,['i','live','in','salt'],'l').words.includes('lake'));
 assert.ok(suggestNext(g,['i','live','in','salt','lake'],'c').words.includes('city'));
});
test('place names work through keys, punctuation and real character entry',async()=>{
 for(const text of ['meet me in salt lake city.','i live in st. paul.','new mexico is beautiful.',
  'we live in the united kingdom.','i love bosnia and herzegovina.',
  'i live in côte d’ivoire.','hello. i live in north dakota. meet me in bismarck.']){
  for(let i=1;i<=text.length;i++)assert.equal(analyzeDraft(g,text.slice(0,i)).issue,null,text.slice(0,i));
  const payload=await encodeNote(g,text,'author',{salt:new Uint8Array(16)});
  assert.equal(await decodeNote(g,payload,'author'),text);
  for(const key of['','other']){const reading=await decodeNote(g,payload,key);assert.ok(replay(g,reading),reading);}
 }
 assert.throws(()=>parseNote(g,'i live in imaginary-geography-country.'));
});
