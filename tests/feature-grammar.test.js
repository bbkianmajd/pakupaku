import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGrammar, parseNote, compileLayout, renderPlan} from '../src/grammar.js';
import {encodeNote, decodeNote} from '../src/codec.js';
import {validateVocabulary} from '../src/vocabulary.js';
import {replay} from '../tools/coverage/run.js';
import {rules} from '../src/grammar-contract.js';
import {numberValue} from '../src/numbers.js';
const vocabulary=JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url)));
const grammar=createGrammar(vocabulary);
const subjects=[['i','am','was','have','do','love'],['you','are','were','have','do','love'],['she','is','was','has','does','loves'],['tom','is','was','has','does','loves'],['those cats','are','were','have','do','love']];
const samples=subjects.flatMap(([subject,be,past,have,doAux,verb])=>[
 `${subject} ${be} ready`,`${subject} ${past} not ready`,`${subject} ${verb} you`,`${subject} ${doAux} not love you`,
 `${subject} ${be} walking`,`${subject} ${have} seen me`,`${subject} ${have} been walking`,`${subject} will visit tom`,
 `${subject} might not have seen you`,`${be} ${subject} ready?`,`${doAux} ${subject} love you?`,`${have} ${subject} seen me?`,
 `${subject} ${be} in the park`,`${subject} ${be} a happy person`
]);
samples.push('this is a test','those are my books','there is an apple','there are some books',
 'an old friend is ready','a young woman was happy','each child is ready','these books are mine',
 'tom and i are ready','i and tom have seen her','please help me','do not chase the cats',
 "don't visit tom", "i'm ready",'we’re walking',"you're my friend",'why did she visit tom?',
 "i can't see you","she hasn't seen me","we aren't ready","he'll be ready","he's seen me",
 'sally ate','and sally slept','half an hour is important',
 'we have all the books','what do you think?','which book is ready?',
 'she picked him up','she picked up the book','i am gonna see you',
 "i'd like a book","she's not even looking at me",'oh, this is easy!',
 'apple computers','thanks for the note','a very happy child is ready',
 'the cat that tom loves sleeps','she wants to see you','i think that she is ready',
 'she gives me a book','he depends on you','the book was written by tom',
 'if she is ready, i will visit tom','a university is ready','an hour is important',
 'an unidentified person is ready',
 '2 cats love you','1 cat loves you','0 cats are ready','10000 cats love you',
 'hello. are you ready? i am ready! tom walks to the park.');
test('feature combinations render exactly and every prefix replays through production composer',()=>{
 for(const text of samples){
  assert.doesNotThrow(()=>parseNote(grammar,text),text);
  const parsed=parseNote(grammar,text),plan=compileLayout(grammar,parsed.layout);
  assert.equal(renderPlan(plan,parsed.values),text);
  assert.ok(replay(grammar,text),text);
  assert.deepEqual(parseNote(grammar,text),parsed);
 }
});
test('author recovery and sampled alternate-key readings retain frame, agreement and composer support',async()=>{
 for(const text of samples.filter((_,i)=>i%5===0)){
  const payload=await encodeNote(grammar,text,'author',{salt:new Uint8Array(16)});
  assert.equal(await decodeNote(grammar,payload,'author'),text);
  for(const key of ['','x','other','🔑']){
   const reading=await decodeNote(grammar,payload,key);
   assert.doesNotThrow(()=>parseNote(grammar,reading),reading);
   assert.ok(replay(grammar,reading),reading);
  }
 }
});
test('invalid controls fail instead of receiving guessed roles or agreement repair',()=>{
 for(const text of ['this are a test','those is my books','i is ready','she am ready','the cats is ready',
  'i has seen you','she have seen you','did she saw you','does she loves you','she does not loves you',
  'me am ready','he sees i','i am knowing you','i am needing you','an cat sleeps','a apple sleeps',
  'these book is ready','this books are ready','1 cats love you','2 cat loves you','there are a book','he depends you','she gives me','she wants see you','i am seem ready','the cats that sleeps are ready',"i isn't ready","she haven't seen you",'he becomes in the park','she seems a book',"there's my books",'she picked up him','i care you']) {
   assert.throws(()=>parseNote(grammar,text),undefined,text);
 }
});
test('numeric subject domains preserve agreement at every small-domain value',()=>{
 for(const text of ['1 cat loves you','2 cats love you','0 cats are ready']){
  const parsed=parseNote(grammar,text),plan=compileLayout(grammar,parsed.layout),slot=plan.slots.find(s=>s.category);
  for(let i=0n;i<slot.size;i++){
   const values=[...parsed.values];values[slot.index]=i;
   const reading=renderPlan(plan,values);
   assert.doesNotThrow(()=>parseNote(grammar,reading),reading);
   assert.equal(numberValue(slot.category,i)===1n,text.startsWith('1 '));
  }
 }
});
test('lexical frame schema rejects incomplete forms and supports Unicode without prototype dictionary ceiling',()=>{
 const copy=structuredClone(vocabulary),verb=copy.entries.find(e=>e.roles.includes('framed-verb'));
 delete verb.forms.participle;assert.throws(()=>validateVocabulary(copy),/inflections/);
 const large=structuredClone(vocabulary);
 while(large.entries.length<=10000) large.entries.push({id:large.entries.at(-1).id+1,text:'élise',roles:['person-name'],features:{}});
 assert.doesNotThrow(()=>validateVocabulary(large));
});
test('typed layout rules reject arbitrary feature substitutions before key mapping',()=>{
 const singular=rules.find(r=>r.result==='SUB_sg');
 const plural=rules.find(r=>r.result==='SUB_pl');
 const parent=rules.find(r=>r.result==='S'&&r.expansion[0]?.symbol==='SUB_sg');
 // Construct varints explicitly so feature IDs above 127 cannot be mistaken for bytes.
 const bytes=[];for(const id of [17,parent.id,plural.id]){let n=id;while(n>=128){bytes.push((n%128)|128);n=Math.floor(n/128);}bytes.push(n);}
 assert.ok(singular);assert.throws(()=>compileLayout(grammar,Uint8Array.from(bytes)),/production/);
});
