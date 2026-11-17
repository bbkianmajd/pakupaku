import test from 'node:test';
import assert from 'node:assert/strict';
import {createReleaseFetcher} from '../src/ui/release-fetch.js';
const manifest='https://example.com/pakupaku/release-lock.json';
const options={wait:async()=>{}};
test('manifest retries bypass a cached failure and retain the project base path',async()=>{
 const urls=[];
 const fetcher=createReleaseFetcher(async url=>{urls.push(new URL(url));return new Response('{}',{status:urls.length===1?404:200});},manifest,options);
 assert.equal((await fetcher(manifest)).status,200);
 assert.equal(urls.length,2);assert.equal(urls[1].pathname,'/pakupaku/release-lock.json');assert.ok(urls[1].searchParams.has('_retry'));
});
test('network errors are retried but a persistent HTTP error fails explicitly',async()=>{
 let calls=0;
 const fetcher=createReleaseFetcher(async()=>{calls++;if(calls===1)throw TypeError('offline');return new Response('',{status:503});},manifest,options);
 await assert.rejects(()=>fetcher(manifest),/HTTP 503.*retry loading/);assert.equal(calls,3);
});
test('other resources, hosts, and aborts do not receive retries or altered cache options',async()=>{
 const input=new URL('https://example.com/pakupaku/src/grammar.js'),opts={cache:'reload'};let captured;
 const fetcher=createReleaseFetcher(async(...args)=>{captured=args;return new Response('original bytes');},manifest,options);
 assert.equal(await (await fetcher(input,opts)).text(),'original bytes');assert.deepEqual(captured,[input,opts]);
 const foreign='https://elsewhere.example/pakupaku/release-lock.json';await fetcher(foreign,opts);assert.deepEqual(captured,[foreign,opts]);
 let calls=0;const abort=createReleaseFetcher(async()=>{calls++;throw new DOMException('Aborted','AbortError');},manifest,options);
 await assert.rejects(()=>abort(manifest),{name:'AbortError'});assert.equal(calls,1);
});
