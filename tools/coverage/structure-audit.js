import{readFile,writeFile}from'node:fs/promises';
import{createStructureLanguage,encodeStructure,decodeStructure}from'../../src/structure-codec.js';
import{parseNote}from'../../src/grammar.js';
import{parseNote as parseSimple}from'../../src/prototypes/language.js';
const language=await createStructureLanguage(JSON.parse(await readFile('data/semantics.json')));
const before=JSON.parse(await readFile('documentation/coverage/stage2-progress.json'));
const rows=before.results.filter(r=>r.source!=='project'&&r.kind==='sentence');
const results=[];
for(const row of rows){
 let entry={id:row.id,previous:row.success,success:false};
 try{const p=await encodeStructure(language,row.text,'test');const recovered=await decodeStructure(language,p.payload,'test');if(recovered.text!==p.canonical)throw Error('Author mismatch');
 const readings=[];for(const key of ['t','tes']){const r=await decodeStructure(language,p.payload,key);try{parseNote(language.grammar,r.text);}catch{parseSimple(language.simple,r.text);}readings.push(r.text);}
 entry={...entry,success:true,readings};
 }catch(e){entry.error=e.message;}
 results.push(entry);if(results.length%100===0)console.log(results.length,results.filter(r=>r.success).length);
}
const counts={total:results.length,passed:results.filter(r=>r.success).length,regressions:results.filter(r=>r.previous&&!r.success).length};
await writeFile('documentation/coverage/structure-audit.json',JSON.stringify({scope:'Full grammar encoding, canonical author recovery and two alternate-key syntax replays. Development-trained data; not independent naturalness review or character-prefix benchmark.',counts,results},null,2)+'\n');console.log(counts);
