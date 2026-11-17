import{readFile,writeFile}from'node:fs/promises';
import{createStructureLanguage,encodeStructure,decodeStructure}from'../../src/structure-codec.js';
const vocab=JSON.parse(await readFile('data/semantics.json'));
const notes=['this is cool. sarah is sexy.','hello. i love you. can you help me? meet me at 1530.','i have 123456 books.','is this ready for production?'];
const report={scope:'Uniform versus weighted selection on the same grammar. Four saved packets per policy; 400 reader keys per packet. Descriptive experiment, not a natural-language or security benchmark.',results:{}};
for(const numberPolicy of ['uniform','weighted']){
 const language=await createStructureLanguage(vocab,{numberPolicy});const result={readings:0,withDigits:0,withLargeNumber:0,authorRecoveries:0,packets:[],samples:[]};
 for(const note of notes){const p=await encodeStructure(language,note,'author');if((await decodeStructure(language,p.payload,'author')).text!==p.canonical)throw Error('Recovery failed');result.authorRecoveries++;result.packets.push({note,payload:p.payload});
 for(let i=0;i<400;i++){const text=(await decodeStructure(language,p.payload,'number-audit-'+i)).text;const digits=/\d/.test(text),large=(text.match(/\d+(?:,\d{3})*(?:\.\d+)?/g)||[]).some(x=>Number(x.replaceAll(',',''))>=10000);result.readings++;result.withDigits+=Number(digits);result.withLargeNumber+=Number(large);if(digits&&result.samples.length<12)result.samples.push(text);}
 console.log(numberPolicy,result.readings,result.withDigits,result.withLargeNumber);}
 report.results[numberPolicy]=result;
}
await writeFile('documentation/coverage/number-weight-audit.json',JSON.stringify(report,null,2)+'\n');
