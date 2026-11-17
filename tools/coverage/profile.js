import { readFile,writeFile } from 'node:fs/promises';
import { createGrammar,inspectParse } from '../../src/grammar.js';
const root=new URL('../../',import.meta.url);
const grammar=createGrammar(JSON.parse(await readFile(new URL('data/semantics.json',root))));
const samples=[];
for(const length of [1,10,100,1000]) samples.push({family:'coordination',length,text:Array(length).fill('tom sleeps').join(' and ')});
for(const length of [1,5,10,20]) samples.push({family:'relative',length,text:'the cat'+Array(length).fill(' that tom loves').join('')+' sleeps'});
for(const length of [1,5,10,20]) samples.push({family:'complement',length,text:'i think that '.repeat(length)+'she is ready'});
const results=[];
for(const {text,...sample} of samples){
 const before=performance.now(),parse=inspectParse(grammar,text);
 results.push({...sample,...parse,milliseconds:performance.now()-before});
}
await writeFile(new URL('documentation/coverage/stage2-profile.json',root),JSON.stringify({runtime:process.version,platform:process.platform,arch:process.arch,method:'Single Node CLI run, no browser claim. Merged states include ordinary chart deduplication, not a count of linguistic parses. Timings vary by machine.',results},null,2)+'\n');
console.log(results.map(r=>`${r.family} ${r.length}: ${r.complete}, ${r.states} states, ${Math.round(r.milliseconds)} ms`).join('\n'));
