import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { verify, measure, canonical } from '../tools/coverage/run.js';
import { createGrammar } from '../src/grammar.js';
const grammar=createGrammar(JSON.parse(await readFile(new URL('../data/semantics.json',import.meta.url))));
test('pinned corpus provenance and independent splits verify; known gaps stay in development',async()=>{
 const {items}=await verify();
 const legacy=JSON.parse(await readFile(new URL('../data/coverage/everyday.json',import.meta.url)));
 for(const text of Object.values(legacy.known_gaps).flat()) assert.ok(items.some(i=>i.text===text&&i.split==='development'));
 assert.ok(items.some(i=>i.kind==='note'&&i.source!=='project'));
 for(const source of ['ewt','gum']) assert.equal(items.filter(i=>i.source===source&&i.split==='development'&&i.kind==='sentence').length,500);
});
test('full-pipeline failure remains in denominator with secondary evidence',async()=>{
 const result=await measure(grammar,{id:'bad',text:'This is a benchmarkunknownword🛸',annotations:[{relation:'cop'}]});
 assert.equal(result.success,false);assert.ok(result.failures.includes('punctuation'));
 assert.ok(result.secondaryCandidates.includes('verb frame'));
 assert.equal(result.diagnostics.roundtrip,null);
});
test('supported item passes real composer, codec and alternate keys',async()=>{
 const result=await measure(grammar,{id:'good',text:'I LOVE YOU',annotations:[]});
 assert.equal(result.success,true,JSON.stringify(result));
 assert.equal(canonical('  Hi,  TOM.\n'),'hi, tom.');
});
