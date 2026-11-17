import {readFile,writeFile} from 'node:fs/promises';
import {createGrammar,parseNote,compileLayout,renderPlan} from '../../src/grammar.js';
import {canonicalize} from '../../src/text.js';
const g=createGrammar(JSON.parse(await readFile('data/semantics.json')));
const items=JSON.parse(await readFile('data/coverage/items.json')).filter(i=>i.split==='development'&&i.kind==='sentence');
const results=[];const start=performance.now();
for(const i of items){const text=canonicalize(i.text);let error=null;
 try{const p=parseNote(g,text);const rendered=renderPlan(compileLayout(g,p.layout),p.values);if(rendered!==text)error='render: '+rendered;}
 catch(e){error=e.message;}
 results.push({id:i.id,source:i.source,text,success:!error,error});
}
await writeFile('documentation/coverage/stage2-quick.json',JSON.stringify({seconds:(performance.now()-start)/1000,passed:results.filter(r=>r.source!=='project'&&r.success).length,results},null,2)+'\n');
console.log(JSON.stringify({seconds:(performance.now()-start)/1000,passed:results.filter(r=>r.source!=='project'&&r.success).length,project:results.filter(r=>r.source==='project'&&r.success).length}));
