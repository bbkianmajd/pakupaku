import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {deriveMappingSeed,hex} from '../src/mapping.js';
import {createGrammar,parseNote,compileLayout,renderPlan} from '../src/grammar.js';
import {encodeNote,decodeNote} from '../src/codec.js';
import {replay} from '../tools/coverage/run.js';
const g=createGrammar(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
const salt=Uint8Array.from({length:16},(_,i)=>i);
const message='hey. i just want to say that i love you. you mean a lot to me.';
test('the entire exact key enters SHA-256 before mapping, including nearby and Unicode keys',async()=>{
 const layout=parseNote(g,message).layout;
 const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
 const keys=['t','te','tes','test','test ','Test','tést','te\u0301st','\ud800','�'];
 const hashes=[];
 for(const key of keys){const {seed,layoutHash}=await deriveMappingSeed(key,salt,g.vocabulary.version,layout);
  assert.equal(layoutHash,sha(layout));
  assert.equal(hex(seed),sha(JSON.stringify(['pakupaku-layout-seed',g.vocabulary.version,hex(salt),layoutHash,key])));hashes.push(hex(seed));
 }
 assert.equal(new Set(hashes).size,keys.length);
 // Deterministic regression sanity check, not a proof of cryptographic security.
 const bitDiff=(a,b)=>[...Buffer.from(a,'hex')].reduce((n,v,i)=>n+(v^Buffer.from(b,'hex')[i]).toString(2).replaceAll('0','').length,0);
 for(let i=0;i<3;i++){const distance=bitDiff(hashes[i],hashes[3]);assert.ok(distance>64&&distance<192);}
});
test('reported note, sexy adjective and nearby keys preserve author recovery and grammar',async()=>{
 for(const text of [message,'sarah, you are sexy.','sarah, you are attractive.','sarah, you are thoughtful.']){
  assert.ok(replay(g,text),text);const p=await encodeNote(g,text,'test',{salt});
  assert.equal(await decodeNote(g,p,'test'),text);
  for(const key of ['','t','te','tes','other'])assert.ok(replay(g,await decodeNote(g,p,key)));
 }
 assert.deepEqual(new Set(g.pools.get('pronoun_you').map(e=>e.text)),new Set(['you','we','they']));
});
test('whole singular noun phrases vary among people, places, mass nouns and complete common-noun phrases',()=>{
 for(const text of ['sarah is ready.','i love sarah.','the book is ready.','new york is beautiful.']){
  const p=parseNote(g,text),plan=compileLayout(g,p.layout),slot=plan.slots.find(s=>s.role==='singular_nominal');assert.ok(slot,text);
  assert.equal(renderPlan(plan,p.values),text);
  for(const kind of ['person','place','mass','count']){
   const index=slot.entries.findIndex(e=>e.features.kind===kind);assert.ok(index>=0);
   const values=[...p.values];values[slot.index]=BigInt(index);const reading=renderPlan(plan,values);assert.doesNotThrow(()=>parseNote(g,reading),reading);
   if(kind==='count')assert.ok(slot.entries[index].text.startsWith('the '));
  }
 }
 for(const text of ['sarah are ready.','the books is ready.','me am sexy.','they is sexy.','a apple is ready.'])assert.throws(()=>parseNote(g,text),undefined,text);
});
test('significance expressions retain their selected complement across tense, auxiliaries and keys',async()=>{
 for(const text of ['you mean a lot to me.','she means everything to him.','we mattered very little to them.',
  'you have meant the world to me.',"you don't mean a lot to me.",'they will mean nothing to us.','do i mean a lot to you?']){
  const p=parseNote(g,text),plan=compileLayout(g,p.layout),slot=plan.slots.find(s=>s.role?.startsWith('significance_'));assert.ok(slot,text);
  assert.equal(renderPlan(plan,p.values),text);
  for(let i=0n;i<slot.size;i++){const values=[...p.values];values[slot.index]=i;assert.doesNotThrow(()=>parseNote(g,renderPlan(plan,values)));}
  const payload=await encodeNote(g,text,'test',{salt});for(const key of ['t','te','tes','test'])assert.ok(replay(g,await decodeNote(g,payload,key)));
 }
});
