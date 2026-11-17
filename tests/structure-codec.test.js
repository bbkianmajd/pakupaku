import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{createStructureLanguage,encodeStructure,decodeStructure,inspectStructure}from'../src/structure-codec.js';
import{parseNote}from'../src/grammar.js';import{parseNote as simpleParse}from'../src/prototypes/language.js';
import{fromBase64,toBase64}from'../src/binary.js';
const l=await createStructureLanguage(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
const notes=['hello. i love you. can you help me? meet me at 1530.','meet me at 2 30 pm','hey. i just want to say that i love you. you mean a lot to me.','sarah, you are sexy.','this is cool. sarah is sexy.',"i'm ready. are you ready?",'the cat that tom loves sleeps','meet me on 02/29/2024 at 09:05.','i have $55,008.','hello. the attached file contains the updated schedule. can you send the updated file to everyone? meet me at 2 30 pm.'];
test('full grammar notes recover and alternate keys change syntax without exposing the author tree',async()=>{
 for(const text of notes){const p=await encodeStructure(l,text,'test');assert.equal((await decodeStructure(l,p.payload,'test')).text,p.canonical);
 const raw=JSON.parse(new TextDecoder().decode(fromBase64(p.payload)));assert.ok(!('layout'in raw));assert.ok(!('text'in raw));
 for(const key of ['','t','te','tes','tést']){const r=await decodeStructure(l,p.payload,key);try{parseNote(l.grammar,r.text);}catch{simpleParse(l.simple,r.text);}assert.equal((await decodeStructure(l,p.payload,key)).text,r.text);}
 }
});
test('earlier stream changes affect later decoding and every valid stream can terminate',async()=>{
 const p=await encodeStructure(l,notes[2],'test'),raw=JSON.parse(new TextDecoder().decode(fromBase64(p.payload))),body=fromBase64(raw.body);body[0]^=1;
 const mutated={...raw,body:toBase64(body)};assert.equal(mutated.body.slice(8),raw.body.slice(8));
 const r=await decodeStructure(l,toBase64(new TextEncoder().encode(JSON.stringify(mutated))),'test');assert.notEqual(r.text,p.canonical);
 const shapes=new Set();for(let i=0;i<30;i++){const r=await decodeStructure(l,p.payload,'key-'+i);shapes.add(r.clauses.map(c=>c.pattern).join('|'));}assert.ok(shapes.size>10);
});
test('invalid frames are rejected independently of keys and source failures stay explicit',async()=>{
 const p=await encodeStructure(l,notes[0],'test'),raw=JSON.parse(new TextDecoder().decode(fromBase64(p.payload)));
 for(const patch of [{budget:0},{numbers:1000000},{body:'a'},{language:'wrong'}])assert.throws(()=>inspectStructure(l,toBase64(new TextEncoder().encode(JSON.stringify({...raw,...patch})))));
 await assert.rejects(()=>encodeStructure(l,'qzxvnonword is ready.','test'));
});
