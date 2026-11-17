import {readFile,writeFile} from 'node:fs/promises';
import {createGrammar,parseNote,compileLayout} from '../../src/grammar.js';
import {encodeNote,decodeNote} from '../../src/codec.js';
import {deriveMappingSeed,hex} from '../../src/mapping.js';
const grammar=createGrammar(JSON.parse(await readFile('data/semantics.json'))),salt=new Uint8Array(16);
const texts=['hey. i just want to say that i love you. you mean a lot to me.','sarah, you are sexy.','sarah is happy.','i love sarah.'];
const rows=[];
for(const text of texts){
 const parsed=parseNote(grammar,text),plan=compileLayout(grammar,parsed.layout),payload=await encodeNote(grammar,text,'test',{salt});
 const keys=['t','te','tes','test'];const seeds=await Promise.all(keys.map(k=>deriveMappingSeed(k,salt,grammar.vocabulary.version,plan.layout)));
 const distances=seeds.slice(0,3).map(({seed},i)=>({key:keys[i],bitsDifferentFromAuthor:seed.reduce((n,v,j)=>n+(v^seeds[3].seed[j]).toString(2).replaceAll('0','').length,0)}));
 const readings=[];for(const key of keys)readings.push({key,text:await decodeNote(grammar,payload,key)});
 rows.push({text,slots:plan.slots.map(s=>({role:s.role,size:String(s.size)})),seedBitDifferences:distances,readings});
}
await writeFile('documentation/coverage/key-variation.json',JSON.stringify({scope:'Fixed all-zero test salt and public example key test. These readings are not from the user\'s original payload. Hash-distance checks are regression evidence, not a security proof or guarantee of semantic distance.',predicateAdjectives:grammar.pools.get('predicative').length,compatibleSingularNominals:grammar.pools.get('singular_nominal').length,rows},null,2)+'\n');
console.log(rows.map(r=>({text:r.text,keys:r.readings,seedBitDifferences:r.seedBitDifferences})));
