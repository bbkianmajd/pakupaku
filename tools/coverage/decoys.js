import {readFile,writeFile} from 'node:fs/promises';
import {createGrammar} from '../../src/grammar.js';
import {encodeNote,decodeNote} from '../../src/codec.js';
import {replay} from './run.js';
const root=new URL('../../',import.meta.url);
const grammar=createGrammar(JSON.parse(await readFile(new URL('data/semantics.json',root))));
const examples=['this is a test','i am ready','those are my books','an old cat sleeps','2 cats love you','do you love me?',"i can't see you",'she has been walking',"he's seen me",'tom walks to the park','she gives me a book','he depends on you','she wants to see you','i think that she is ready','the cat that tom loves sleeps','the book was written by tom','if she is ready, i will visit tom'];
const results=[];
for(const authorText of examples){
 const payload=await encodeNote(grammar,authorText,'author',{salt:new Uint8Array(16)});
 for(const key of ['','x','other','🔑']){
  const reading=await decodeNote(grammar,payload,key);
  results.push({authorText,key,reading,composerReplay:replay(grammar,reading),independentReview:'pending'});
 }
}
await writeFile(new URL('documentation/coverage/stage2-decoys.json',root),JSON.stringify({criteria:'English grammar, agreement, case, required complements and article sounds. Odd meanings are allowed. Parser/composer replay alone is not independent grammaticality evidence. All rows await independent review; these 68 readings do not satisfy the 1000-reading review gate.',results},null,2)+'\n');
console.log(`${results.length} readings, ${results.filter(r=>r.composerReplay).length} composer replays; independent review pending`);
