// Separate evidence for the experiments. Does not update the production score.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPrototypeLanguage,parseNote} from '../../src/prototypes/language.js';
import {encodePrototype,decodePrototype,inspectPrototype} from '../../src/prototypes/codec.js';
import {toBase64} from '../../src/binary.js';
const language=await createPrototypeLanguage(JSON.parse(await readFile('data/semantics.json')));
const note='this is cool. sarah is sexy.',keys=Array.from({length:128},(_,i)=>'review-'+String(i).padStart(3,'0'));
const output={scope:'Nine-construction experiments; no claim of production coverage or independent English review.',language:language.fingerprint,
  subjectChoices:language.pools.subjects.length,adjectives:language.pools.adjectives.length,clauseFamilies:language.templates.length,
  bandSize:String(language.band),domainSize:String(language.size),note,salt:'16 zero bytes',aliasRandomness:'Deterministic SHA-256 counter for this reproducible audit only; browser uses crypto.getRandomValues.',modes:{}};
for(const mode of ['narrow','merged','clauses']){
  let counter=0;
  const randomBytes=length=>new Uint8Array(createHash('sha256').update('prototype-audit:'+counter++).digest().subarray(0,length));
  const {payload}=await encodePrototype(language,note,'test',{mode,salt:new Uint8Array(16),randomBytes});
  const readings=[];
  for(const key of keys){const reading=await decodePrototype(language,payload,key);parseNote(language,reading.text);readings.push({key,text:reading.text,patterns:reading.clauses.map(c=>c.pattern)});}
  const patterns=readings.flatMap(r=>r.patterns);
  const samples=[];for(const key of ['t','te','tes','test'])samples.push({key,...await decodePrototype(language,payload,key)});
  output.modes[mode]={payload,authorRecovered:(await decodePrototype(language,payload,'test')).text===note,
    sampleCount:readings.length,uniqueReadings:new Set(readings.map(r=>r.text)).size,
    constructionCounts:Object.fromEntries([...new Set(patterns)].map(p=>[p,patterns.filter(v=>v===p).length])),
    uniqueConstructionSequences:new Set(readings.map(r=>r.patterns.join('|'))).size,allReadingsParse:true,samples,readings};
}
const original=inspectPrototype(language,output.modes.clauses.payload),changed=structuredClone(original);
changed.codes[0]=String((BigInt(changed.codes[0])+1n)%language.size);
const encode=p=>toBase64(new TextEncoder().encode(JSON.stringify(p)));
output.feedback={laterCodesUnchanged:JSON.stringify(original.codes.slice(1))===JSON.stringify(changed.codes.slice(1)),
  before:await decodePrototype(language,encode(original),'test'),after:await decodePrototype(language,encode(changed),'test')};
const corpus=JSON.parse(await readFile('data/coverage/items.json'));
const development=corpus.filter(r=>r.split==='development'&&r.source!=='project'&&r.kind==='sentence');
const passed=[];for(const row of development)try{parseNote(language,row.text);passed.push(row.id);}catch{}
output.developmentParseOnly={total:development.length,passed:passed.length,ids:passed,scope:'Parse-only scope check of the small experimental grammar; not the production full-pipeline benchmark.'};
output.implementation={};
for(const path of ['src/prototypes/language.js','src/prototypes/codec.js','src/mapping.js','data/semantics.json'])output.implementation[path]=createHash('sha256').update(await readFile(path)).digest('hex');
await writeFile('documentation/coverage/prototype-audit.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({subjectChoices:output.subjectChoices,families:output.clauseFamilies,parseOnly:output.developmentParseOnly,
  modes:Object.fromEntries(Object.entries(output.modes).map(([k,v])=>[k,{uniqueReadings:v.uniqueReadings,shapes:v.uniqueConstructionSequences,constructions:Object.keys(v.constructionCounts).length}]))}));
