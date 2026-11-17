// Diagnostic evidence for the report; does not modify grammar, corpus or scores.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createGrammar,suggestNext} from '../../src/grammar.js';
import {tokenize,isWord} from '../../src/text.js';
const root=new URL('../../',import.meta.url);
const raw=await readFile(new URL('documentation/coverage/stage2-progress.json',root));
const report=JSON.parse(raw),grammar=createGrammar(JSON.parse(await readFile(new URL('data/semantics.json',root))));
const rows=report.results.filter(row=>row.kind==='sentence'&&row.source!=='project');
const diagnostics=[];
for(const row of rows){
 const unsupportedTokens=[...new Set(tokenize(row.text).filter(token=>!isWord(token)&&!/^\d+$/.test(token)&&!grammar.literals.has(token)&&!grammar.surfaceWords.has(token)))];
 let firstRejection=null;
 if(!row.success&&!row.diagnostics.missing.length&&!unsupportedTokens.length){
  const committed=[];
  for(const token of tokenize(row.text)){
   const next=suggestNext(grammar,committed,token);
   if(!next.words.includes(token)&&next.numberCandidate!==token){firstRejection={token,preceding:committed.slice(-8),completeBefore:next.complete};break;}
   committed.push(token);
  }
  firstRejection ||= {token:'<end>',preceding:committed.slice(-8),completeBefore:false};
 }
 diagnostics.push({id:row.id,unsupportedTokens,firstRejection});
}
await writeFile(new URL('documentation/coverage/stage2-prefix-audit.json',root),JSON.stringify({snapshot_sha256:createHash('sha256').update(raw).digest('hex'),diagnostics},null,2)+'\n');
