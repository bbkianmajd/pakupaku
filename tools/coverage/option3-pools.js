import{readFile,writeFile}from'node:fs/promises';
import{createGrammar,parseNote}from'../../src/grammar.js';
const data=JSON.parse(await readFile('data/semantics.json'));
const strict=createGrammar(data),loose=createGrammar(data,{profile:'option3'});
const stats=g=>({pools:g.pools.size,singletons:[...g.pools.values()].filter(p=>p.length===1).length,predicateChoices:g.pools.get('predicative').length,baseVerbChoices:g.pools.get('verb_transitive_base').length,uniqueLearnedSpellingSets:new Set([...g.pools].filter(([n])=>n.startsWith('dep_')).map(([,p])=>[...new Set(p.map(e=>e.text))].sort().join('|'))).size});
const examples=['i wonder how many sentences will pass?','sarah arrives the sandwich.','the sandwich wonders whether the moon is tired.','the moon sleeps the sandwich.','they arrive the sandwich.','she depends the book.','she wonders whether they will arrive.','i wonder why she left.'];
const accepts=(g,t)=>{try{parseNote(g,t);return true;}catch{return false;}};
const report={scope:'Authored feature probes, not an independent validation set.',strict:stats(strict),option3:stats(loose),examples:examples.map(text=>({text,strict:accepts(strict,text),option3:accepts(loose,text)}))};
await writeFile('documentation/coverage/option3-pools.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
