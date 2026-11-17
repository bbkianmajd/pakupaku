import test from 'node:test';import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';
import{createStructureLanguage,encodeStructure,decodeStructure,inspectStructure}from'../src/structure-codec.js';
const data=JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url)));
test('weighted number choices recover small, medium, large, clock, date and monetary inputs',async()=>{
 const language=await createStructureLanguage(data);
 for(const text of ['i have 2 books.','i have 9999 books.','i have 123456 books.','i have 12345678901234567890 books.','meet me at 1530.','meet me on 02/29/2024 at 09:05.','i have $55,008.']){
 const p=await encodeStructure(language,text,'author');assert.equal((await decodeStructure(language,p.payload,'author')).text,p.canonical);for(const key of ['','t','test'])assert.ok((await decodeStructure(language,p.payload,key)).text.length);
 }
 const uniform=await createStructureLanguage(data,{numberPolicy:'uniform'});const p=await encodeStructure(uniform,'i have 2 books.','author');assert.throws(()=>inspectStructure(language,p.payload));
});
