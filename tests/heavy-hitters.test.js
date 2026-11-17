import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGrammar,parseNote} from '../src/grammar.js';
import {encodeNote,decodeNote} from '../src/codec.js';
import {replay} from '../tools/coverage/run.js';
const g=createGrammar(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
const examples=['enron is ready.','the file is attached.','put the book on the table.',
 'such a book is important.','such an apple is lovely.','look into the case.','hello; i love you.','hello — i love you.','hello – i love you.',
 '(i love you)','"i love you"',"'i love you'",'i love (you).','i love you (you love me).',
 'i have $55,008.','i have $15.30.','i have €1,200.05.', 'meet me at 09:14 am.'];
test('reviewed words and structured punctuation recover exactly under author keys and replay alternate keys',async()=>{
 for(const text of examples){
  assert.ok(replay(g,text),text);
  const p=await encodeNote(g,text,'author',{salt:new Uint8Array(16)});
  assert.equal(await decodeNote(g,p,'author'),text);
  for(const key of ['','other']) {const reading=await decodeNote(g,p,key);assert.ok(replay(g,reading),reading);}
 }
});
test('delimiters, monetary formatting and required put complements reject invalid controls',()=>{
 for(const text of ['(i love you','i love you)','"i love you','put the book.','such a apple is ready.','such the books are ready.','i have $01,200.','i have $3.123.','i have $3.20.30.','meet me at 19:14 am.']) assert.throws(()=>parseNote(g,text),undefined,text);
});
