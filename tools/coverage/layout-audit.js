// Public-layout disclosure and alternate-reading evidence for the current run.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGrammar,parseNote,compileLayout} from '../../src/grammar.js';
import {encodeNote,decodeNote} from '../../src/codec.js';
import {measure} from './run.js';
const hash=data=>createHash('sha256').update(data).digest('hex');
const raw=await readFile('documentation/coverage/stage2-progress.json');const report=JSON.parse(raw);
for(const [path,digest]of Object.entries(report.implementation))if(hash(await readFile(path))!==digest)throw Error('Stale measurement: '+path);
const grammar=createGrammar(JSON.parse(await readFile('data/semantics.json')));
const rows=report.results.filter(r=>r.source!=='project'&&r.kind==='sentence'&&r.success);
const layoutRows=rows.map(row=>{
 const parsed=parseNote(grammar,row.text),plan=compileLayout(grammar,parsed.layout);
 return {id:row.id,slots:plan.slots.length,variableSlots:plan.slots.filter(s=>s.size>1n).length,
  dependencySlots:plan.slots.filter(s=>s.role?.startsWith('dep_')).length,
  singletonSlots:plan.slots.filter(s=>s.size===1n).length,
  fixedWordLiterals:plan.items.filter(i=>i.literal&&/\p{L}/u.test(i.literal)).length};
});
const sample=[...rows].sort((a,b)=>hash(a.id).localeCompare(hash(b.id))).slice(0,50),readings=[];
for(const row of sample){const payload=await encodeNote(grammar,row.text,'layout-audit-author',{salt:new Uint8Array(16)});const reading=await decodeNote(grammar,payload,'layout-audit-reader');readings.push({id:row.id,text:row.text,reading,unchanged:reading===row.text});}
const challenge=[];
const messages=(await readFile('tests/fixtures/composition-messages.txt','utf8')).trim().split('\n');
for(const [i,text]of messages.entries())challenge.push(await measure(grammar,{id:'composition:'+i,source:'project',kind:'sentence',text}));
const total=key=>layoutRows.reduce((sum,r)=>sum+r[key],0);
const output={measurement_sha256:hash(raw),scope:'Development-trained grammar; these disclosures and scripted readings are not independent grammaticality certification.',
 counts:{sentences:rows.length,slots:total('slots'),variableSlots:total('variableSlots'),singletonSlots:total('singletonSlots'),dependencySlots:total('dependencySlots'),fixedWordLiterals:total('fixedWordLiterals'),sentencesWithoutVariableSlots:layoutRows.filter(r=>!r.variableSlots).length},
 composition:{total:challenge.length,passed:challenge.filter(r=>r.success).length,results:challenge},sample:{total:readings.length,unchanged:readings.filter(r=>r.unchanged).length,readings},layouts:layoutRows};
await writeFile('documentation/coverage/stage2-layout-audit.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({counts:output.counts,composition:output.composition.passed,sampleUnchanged:output.sample.unchanged}));
