// Optional integration check: npm install playwright separately, or point
// PAKUPAKU_PLAYWRIGHT_MODULE to an installed module. No production dependency.
import assert from 'node:assert/strict';
import {canonicalize} from '../../src/text.js';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PAKUPAKU_PLAYWRIGHT_MODULE || 'playwright');
const root=new URL('../../',import.meta.url);
const server=createServer(async(req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=new URL('.'+path,root);
  if(!file.href.startsWith(root.href)) throw Error('Outside site');
  const body=await readFile(file);
  res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':path.endsWith('.css')?'text/css':'text/html');res.end(body);
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),errors=[],requests=[];
 page.on('pageerror',error=>errors.push(error.message));page.on('request',req=>requests.push(req.url()));
 const origin=`http://127.0.0.1:${server.address().port}`;
 await page.goto(origin+'/codec-demo.html');
 await page.waitForFunction(()=>!document.querySelector('#encode').disabled);
 const results=[];
 await page.locator('#note').fill('HELLO. I LOVE YOU.');
 await page.waitForFunction(()=>document.querySelector('#note').value==='hello. i love you.');
 await page.waitForFunction(()=>document.querySelector('#note-feedback').textContent==='Note is ready to link.');
 await page.locator('#note').fill('hello qzxvnonword');
 await page.waitForFunction(()=>document.querySelector('#note-highlights .bad')?.textContent==='qzxvnonword');
 assert.ok((await page.locator('#note-feedback').textContent()).includes('not in the vocabulary'));
 await page.locator('#note').fill('they is ready.');
 await page.waitForFunction(()=>!!document.querySelector('#note-highlights .bad'));
 await page.locator('#note').fill('they are ready.');
 await page.waitForFunction(()=>document.querySelector('#note-feedback').textContent==='Note is ready to link.');
 assert.equal(await page.locator('#note-highlights .bad').count(),0);
 const composition=(await readFile(new URL('tests/fixtures/composition-messages.txt',root),'utf8')).trim().split('\n');
 composition.push('is this ready for production?', 'production is ready.', 'the productions are ready.', 'can you double check if this works?', 'we have double checked whether this works.', 'can you purple check if this works?', 'hi. just going to test if this works.', "hi. i am just going to test if this works.", "i'm going to test whether this works.", 'we have tested whether this works.', 'i wonder how many sentences will pass?', 'sarah arrives the sandwich.', 'the sandwich wonders whether the moon is tired.', 'sarah, you are sexy.','sarah is happy.','hey. i just want to say that i love you. you mean a lot to me.','i live in north dakota.','meet me in salt lake city.','we live in the united kingdom.','i live in st. paul.',"the word was invented by jonathan swift and used in his book 'gulliver's travels'.",'i looked at the uecomm master and had some comments--such as our name is wrong, the cross default threshold for us should be us $ and not aud, and there were a few other questions i had.','they kept the name oracle and created the rdbms engine. god alone is salvation. i love you.','hello. the attached file contains the updated schedule. can you send the updated file to everyone? meet me at 2 30 pm.');
 for(const source of ['enron is ready.','"i love you"','i love (you).','hello — i love you.','i have $55,008.','put the book on the table.','hello. i love you. can you help me? meet me at 1530.  ','meet me at 2 30 pm','meet me at 2:30 pm.','meet me at half past two.','meet me on 02/29/2024 at 09:05.','this is a test',"i'm ready. are you ready?",'2 cats love you','the cat that tom loves sleeps','she wants to see you','if she is ready, i will visit tom',...composition]){
  const text=canonicalize(source);
  await page.locator('#note').fill(source);
  await page.waitForFunction(()=>document.querySelector('#note-feedback').textContent==='Note is ready to link.');
  await page.locator('#writer-key').fill('author');await page.locator('#encode').click();
  await page.waitForFunction(()=>document.querySelector('#link').value.includes('#v=1.0.0&a='));
  await page.locator('#reader-key').fill('author');
  await page.waitForFunction(text=>document.querySelector('#reading').textContent===text,text);
  const payload=new URLSearchParams(new URL(await page.locator('#link').inputValue()).hash.slice(1)).get('a');
  // Exercise the actual worker's alternate decode and composer analyze API.
  const decoy=await page.evaluate(async payload=>{
   const worker=new Worker('/src/codec-worker.js',{type:'module'});
   let id=0;const call=(operation,fields={})=>new Promise((resolve,reject)=>{
    const request=++id;worker.onmessage=({data})=>{if(data.id===request){if(data.error)reject(Error(data.error));else resolve(data.result);}};
    worker.postMessage({id:request,operation,...fields});
   });
   try{const reading=await call('decode',{payload,key:'other'});const analysis=await call('analyze',{note:reading});return {reading,complete:analysis.complete};}
   finally{worker.terminate();}
  },payload);
  assert.ok(decoy.complete,decoy.reading);results.push({text,authorRecovered:true,alternate:decoy});
 }
 const validLink=await page.locator('#link').inputValue();
 for(const hash of ['#v=99.0.0&a=invalid','#a=invalid']){
  await page.evaluate(hash=>{location.hash=hash;},hash);
  await page.waitForFunction(()=>document.querySelector('#reader-status').textContent.startsWith('Wrong version:'));
  assert.equal(await page.locator('#reading').textContent(),'');
 }
 await page.goto(validLink);
 await page.locator('#reader-key').fill('author');
 await page.waitForFunction(text=>document.querySelector('#reading').textContent===text,results.at(-1).text);
 assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(origin)));
 const report={browser:await browser.version(),scope:'Desktop Chromium integration subset through actual demo and worker; not full browser acceptance or device responsiveness certification.',results,errors,localRequestsOnly:true};
 await writeFile(new URL('documentation/coverage/restored-editor-browser.json',root),JSON.stringify(report,null,2)+'\n');
 console.log(`${results.length} browser composer/worker round trips and alternate-key analyses passed`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
