import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGrammar,parseNote,compileLayout,renderPlan,suggestNext} from '../src/grammar.js';
import {encodeNote,decodeNote} from '../src/codec.js';
import {replay} from '../tools/coverage/run.js';
const g=createGrammar(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
const messages=(await readFile(new URL('./fixtures/composition-messages.txt',import.meta.url),'utf8')).trim().split('\n');
test('ordinary messages compose auxiliaries, gaps, complements and modifiers across phrase families',async()=>{
  for(const text of messages){
    assert.ok(replay(g,text),text);
    const payload=await encodeNote(g,text,'author',{salt:new Uint8Array(16)});
    assert.equal(await decodeNote(g,payload,'author'),text);
    for(const key of ['','other']){const reading=await decodeNote(g,payload,key);assert.ok(replay(g,reading),reading);}
  }
});
test('productive rules preserve agreement, case and selected complements',()=>{
  for(const text of ['she have received your message.','i has received your message.',
    'the file contain the schedule.','i can helps if you send me the details.',
    'the people who works here are friendly.','the person who work here is friendly.',
    'we should have be told about this.','we should has been told about this.',
    "let's meets after work.",'i put the book that you gave i on the table.',
    'can you send the file to she?','there is nothing else we needs to do.',
    'i want him see the file.','i am ready see you.']) assert.throws(()=>parseNote(g,text),undefined,text);
});
test('source grammar preserves significant joining without rewriting words',()=>{
  const examples=["jeff skilling has agreed to work with harvard business school (hbs) on a 5-year case study called 'modern giants'.",
    'hello. i love you. can you help me? meet me at 1530.'];
  for(const text of examples){const p=parseNote(g,text);assert.equal(renderPlan(compileLayout(g,p.layout),p.values),text);}
});
test('bounded parser/suggestion caches preserve edited prefixes and grammar isolation',async()=>{
  const original=suggestNext(g,['the','cats'],'are');
  assert.ok(original.words.includes('are'));
  assert.ok(!suggestNext(g,['the','cat'],'are').words.includes('are'));
  for(let i=0;i<2100;i++)suggestNext(g,['i','have'],String(i));
  assert.deepEqual(suggestNext(g,['the','cats'],'are'),original);
  const small=createGrammar(JSON.parse(await readFile(new URL('./fixtures/starter-vocabulary.json',import.meta.url))));
  assert.throws(()=>parseNote(small,'the attached file contains the updated schedule.'));
});
test('learned utterances and productive clauses compose in complete notes',async()=>{
  for(const text of [
    'they kept the name oracle and created the rdbms engine. god alone is salvation. i love you.',
    'hello. the attached file contains the updated schedule. can you send the updated file to everyone? meet me at 2 30 pm.',
  ]){
    const payload=await encodeNote(g,text,'author',{salt:new Uint8Array(16)});
    assert.equal(await decodeNote(g,payload,'author'),text);
    assert.ok(replay(g,text));
    const reading=await decodeNote(g,payload,'other');assert.ok(replay(g,reading),reading);
  }
});
test('quoted possessives and doubled dashes preserve every real typing prefix',async()=>{
  const examples=["the word was invented by jonathan swift and used in his book 'gulliver's travels'.",
    'i looked at the uecomm master and had some comments--such as our name is wrong, the cross default threshold for us should be us $ and not aud, and there were a few other questions i had.'];
  const {analyzeDraft}=await import('../src/draft.js');
  for(const text of examples){
    for(let end=1;end<=text.length;end++)assert.equal(analyzeDraft(g,text.slice(0,end)).issue,null,text.slice(0,end));
    assert.ok(replay(g,text));
    const payload=await encodeNote(g,text,'benchmark-author',{salt:new Uint8Array(16)});
    assert.equal(await decodeNote(g,payload,'benchmark-author'),text);
    for(const key of ['','x','wrong','benchmark-reader']){const reading=await decodeNote(g,payload,key);assert.ok(replay(g,reading),reading);}
  }
});
