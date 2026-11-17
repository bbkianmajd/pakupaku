import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPrototypeLanguage,parseNote,renderClause,localRank,unrankClause,normalizeNote} from '../src/prototypes/language.js';
import {encodePrototype,decodePrototype,inspectPrototype,randomBelow} from '../src/prototypes/codec.js';
import {toBase64} from '../src/binary.js';
const vocabulary=JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url)));
const language=await createPrototypeLanguage(vocabulary);
const options={salt:new Uint8Array(16),randomBytes:n=>new Uint8Array(n)};
const serialize=p=>toBase64(new TextEncoder().encode(JSON.stringify(p)));
const original='this is cool. sarah is sexy.';

test('both experiments and narrow control recover each supported construction exactly',async()=>{
  const notes=[original,'i am ready. they are happy.','sarah waits.','i love you.','sarah travels to new york.',
    'the flowers are in paris.','we might dance.','does sarah know me?','tomorrow, she arrives.',
    'sarah, you are sexy.','after lunch, the doctor works.','this is cool. sarah is sexy. i love you.'];
  for(const mode of ['clauses','narrow','merged'])for(const note of notes){
    const encoded=await encodePrototype(language,note,'test',{...options,mode});
    assert.equal((await decodePrototype(language,encoded.payload,'test')).text,note);
    for(const key of ['','t','te','tes',' test','Tést']){
      const reading=await decodePrototype(language,encoded.payload,key);
      assert.equal(parseNote(language,reading.text).canonical,reading.text);
      assert.deepEqual(await decodePrototype(language,encoded.payload,key),reading);
    }
  }
  assert.equal(normalizeNote(' THIS is cool  '),'this is cool.');
});

test('whole-clause keys change grammar families; merging retains families but broadens subjects',async()=>{
  for(const mode of ['clauses','narrow','merged']){
    const {payload}=await encodePrototype(language,original,'test',{...options,mode});
    const packet=inspectPrototype(language,payload),shapes=new Set(),subjects=new Set();
    assert.equal(Object.hasOwn(packet,'layout'),mode!=='clauses');
    for(let i=0;i<64;i++){
      const reading=await decodePrototype(language,payload,'reader-'+i);
      for(const clause of reading.clauses)shapes.add(clause.template);
      if(mode!=='clauses'){
        const first=reading.clauses[0];subjects.add(language.pools.subjects[first.values[0]].text);
        assert.ok(reading.clauses.every(c=>c.template===0));
      }
      assert.doesNotThrow(()=>parseNote(language,reading.text));
    }
    if(mode==='clauses')assert.ok(shapes.size>=7,`Only ${shapes.size} patterns`);
    else if(mode==='narrow')assert.deepEqual([...subjects],['this']);
    else assert.ok(subjects.size>40);
  }
});

test('changing an earlier clause code changes later readings with identical later codes',async()=>{
  const {payload}=await encodePrototype(language,'this is cool. sarah is sexy. i love you.','test',options);
  const packet=inspectPrototype(language,payload),changed=structuredClone(packet);
  changed.codes[0]=String((BigInt(changed.codes[0])+1n)%language.size);
  assert.deepEqual(changed.codes.slice(1),packet.codes.slice(1));
  const before=await decodePrototype(language,payload,'test'),after=await decodePrototype(language,serialize(changed),'test');
  assert.notEqual(before.clauses[0].text,after.clauses[0].text);
  assert.notEqual(before.clauses[1].text,after.clauses[1].text);
  assert.notEqual(before.clauses[2].text,after.clauses[2].text);
  assert.equal(after.clauses[1].previous,after.clauses[0].text);
});

test('every index in a small complete construction domain renders and reparses, including alias bands',async()=>{
  const tiny=await createPrototypeLanguage({entries:[
    {text:'sarah',roles:['nominal-phrase'],features:{kind:'person'}},
    {text:'paris',roles:['nominal-phrase'],features:{kind:'place'}},
    {text:'ready',roles:['predicate-adjective']},
  ]});
  for(let rank=0n;rank<tiny.size;rank++){
    const clause=unrankClause(tiny,rank),template=tiny.templates[clause.template];
    assert.equal(localRank(tiny,template,clause.values),(rank%tiny.band)%template.size);
    const parsed=parseNote(tiny,clause.text).clauses[0];
    assert.equal(renderClause(tiny,tiny.templates[parsed.template],parsed.values),clause.text);
  }
  // Random aliases do not change the author message. No canonical-alias check
  // is made by the reader, so every index in each band remains usable.
  for(let i=0;i<5;i++){
    const {payload}=await encodePrototype(language,original,'test');
    assert.equal((await decodePrototype(language,payload,'test')).text,original);
  }
});

test('prototype agreement, complements, canonical packet ranges and vocabulary identity are enforced',async()=>{
  for(const text of ['they is sexy.','me am ready.','does sarah knows me?','sarah travel to paris.','sarah goes paris.','i love.','unknownperson is ready.','hey.'])assert.throws(()=>parseNote(language,text),undefined,text);
  for(const mode of ['clauses','merged','narrow']){
    const {payload}=await encodePrototype(language,original,'test',{...options,mode}),packet=inspectPrototype(language,payload);
    for(const patch of [{language:'0'.repeat(64)},{codes:[]},{extra:'unexpected'},{salt:'bad'}])assert.throws(()=>inspectPrototype(language,serialize({...packet,...patch})));
    const bad=structuredClone(packet);
    if(mode==='clauses')bad.codes[0]=String(language.size);else bad.codes[0][0]='999999999999999';
    assert.throws(()=>inspectPrototype(language,serialize(bad)));
  }
  let calls=0;
  assert.equal(randomBelow(3n,n=>new Uint8Array(n).fill(calls++?2:3)),2n);
  assert.equal(calls,2); // rejection sampling, not a biased remainder
});
