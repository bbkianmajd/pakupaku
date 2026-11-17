import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {createGrammar,parseNote,compileLayout,renderPlan} from '../src/grammar.js';
import {analyzeDraft} from '../src/draft.js';
import {encodeNote,decodeNote} from '../src/codec.js';
import {canonicalize} from '../src/text.js';
import {numericFormats} from '../src/numeric-formats.js';
import {replay} from '../tools/coverage/run.js';
const grammar=createGrammar(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
const examples=[
 'hello. i love you. can you help me? meet me at 1530.  ',
 'meet me at 2 30 pm','meet me at 2:30 pm.','meet me at 14:30.',
 'meet me at 09:05.','meet me at 0030.','meet me at 930.',
 'meet me at half past two.','meet me at a quarter to three.',
 'meet me at ten past 2.','meet me at twenty five to three.',
 'meet me at noon.','come at midnight.','meet me on 08/17/2000 at 10:05 am.',
 '02/29/2024 10:05 am','31/12/2025','she has half a book',
];
examples.push('half an hour is important','half the apples are ready');
test('messages, clock forms and date fields round trip and replay through the real composer',async()=>{
 for(const source of examples){
  const expected=canonicalize(source);
  assert.equal(analyzeDraft(grammar,source).complete,true,source);
  assert.ok(replay(grammar,expected),source);
  const payload=await encodeNote(grammar,source,'author',{salt:new Uint8Array(16)});
  assert.equal(await decodeNote(grammar,payload,'author'),expected);
  for(const key of ['','x','other','🔑']){
   const reading=await decodeNote(grammar,payload,key);
   assert.doesNotThrow(()=>parseNote(grammar,reading),reading);
   assert.ok(replay(grammar,reading),reading);
  }
 }
});
test('every character of both reported examples can be typed, including final punctuation and spaces',()=>{
 for(const source of examples.slice(0,2)) for(let i=1;i<=source.length;i++){
  assert.equal(analyzeDraft(grammar,source.slice(0,i)).issue,null,source.slice(0,i));
 }
});
test('finite numeric spellings have exhaustive inverses, and military clocks stay valid',()=>{
 for(const [mode,format] of Object.entries(numericFormats)) for(let value=0;value<format.size;value++) {
  const text=format.render(value);
  assert.equal(format.parse(text),value,`${mode} ${text}`);
  if(mode.startsWith('military')) {assert.ok(+text.slice(-2)<60);assert.ok(+text.slice(0,-2)<24);}
 }
 const p=parseNote(grammar,'meet me at 1530.'),plan=compileLayout(grammar,p.layout),index=plan.slots.find(s=>s.category?.format==='military4').index;
 for(const value of [0n,59n,60n,719n,720n,1439n]) {
  const values=[...p.values];values[index]=value;
  assert.doesNotThrow(()=>parseNote(grammar,renderPlan(plan,values)));
 }
});
test('invalid clock and calendar values are rejected, not repaired or passed through',()=>{
 for(const text of ['meet me at 2460.','meet me at 2360.','meet me at 24:00.','meet me at 2:60 pm.','meet me at 13 30 pm.',
 'meet me at 2 99 pm.','meet me at half past thirteen.','meet me on 02/30/2024.','meet me on 02/29/2023.',
 'meet me on 04/31/2024.','meet me on 00/17/2024.','meet me on 08/00/2024.']) {
  assert.throws(()=>parseNote(grammar,text),undefined,text);
 }
});
test('calendar layout classes preserve valid dates at the boundaries of all mapped fields',()=>{
 for(const text of ['02/29/2024','04/30/2024','12/31/2025','08/17/2000']) {
  const p=parseNote(grammar,text),plan=compileLayout(grammar,p.layout);
  for(const edge of [0n,1n]) {
   const values=plan.slots.map(s=>edge?s.size-1n:0n),reading=renderPlan(plan,values);
   const [month,day,year]=reading.split('/').map(Number);
   const date=new Date(0);date.setUTCFullYear(year,month-1,day);
   assert.equal(date.getUTCMonth(),month-1,reading);assert.equal(date.getUTCDate(),day,reading);
   assert.doesNotThrow(()=>parseNote(grammar,reading),reading);
  }
 }
});
