import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {RELEASE_VERSION,payloadFromFragment,fragmentForPayload,verifyReleaseFiles} from '../src/release.js';
import {createStructureLanguage,encodeStructure,decodeStructure} from '../src/structure-codec.js';
import {fromBase64,toBase64} from '../src/binary.js';
test('links require an explicit matching release',()=>{
 assert.equal(payloadFromFragment('#'+fragmentForPayload('abc_-')),'abc_-');
 for(const fragment of ['#a=abc','#v=99.0.0&a=abc','#v=1.0.0&v=1.0.0&a=abc'])assert.throws(()=>payloadFromFragment(fragment));
});
test('packet release and component identity are checked independently of URL and key',async()=>{
 const language=await createStructureLanguage(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
 const encoded=await encodeStructure(language,'this is cool.','author');
 const packet=JSON.parse(new TextDecoder().decode(fromBase64(encoded.payload)));
 assert.equal(packet.release,RELEASE_VERSION);
 for(const patch of [{release:'99.0.0'},{release:undefined},{language:'changed'},{version:'changed'}]){
  const payload=toBase64(new TextEncoder().encode(JSON.stringify({...packet,...patch})));
  await assert.rejects(()=>decodeStructure(language,payload,'author'),/Wrong version/);
 }
 assert.equal((await decodeStructure(language,encoded.payload,'author')).text,'this is cool.');
});
test('release manifest detects component drift',async()=>{
 const base=new URL('../',import.meta.url);
 await verifyReleaseFiles({base,fetcher:async url=>new Response(await readFile(url))});
 await assert.rejects(()=>verifyReleaseFiles({base,fetcher:async url=>new Response(url.pathname.endsWith('/src/grammar.js')?'changed':await readFile(url))}),/Wrong version/);
});
