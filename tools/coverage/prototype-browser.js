// The main demo retains the original editor; use its integration suite.
if(process.env.PROTOTYPE_PAGE==='codec-demo.html'){await import('./browser-smoke.js');process.exit(0);}
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
const {chromium}=await import(process.env.PAKUPAKU_PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../../',import.meta.url);
const primary=process.env.PROTOTYPE_PAGE==='codec-demo.html';
const modes=primary?['clauses']:['narrow','merged','clauses'];
const pagePath=primary?'codec-demo.html':'prototypes.html';
const server=createServer(async(req,res)=>{
  try{const path=new URL(req.url,'http://localhost').pathname,file=new URL('.'+path,root);
    if(!file.href.startsWith(root.href))throw Error('Outside site');
    const body=await readFile(file);res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':path.endsWith('.css')?'text/css':'text/html');res.end(body);
  }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
let browser;
try{
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[],requests=[],cases=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(origin+'/'+pagePath);
  const ready=async()=>page.waitForFunction(()=>/^Readings? updated/.test(document.querySelector('#status').textContent));
  await ready();
  const examples=await page.locator('#example option').evaluateAll(nodes=>nodes.map(n=>n.value));
  for(const example of examples){
    await page.locator('#example').selectOption(example);await page.locator('#writer-key').fill('test');
    await page.locator('#reader-key').fill('test');await page.locator('#compare').click();
    await page.waitForFunction(({text,modes})=>modes.every(m=>document.getElementById(m+'-reading').textContent===text),{text:example,modes});
    await page.locator('[data-key="tes"]').click();await ready();
    const readings=await page.locator('.card output').allTextContents();
    assert.ok(readings.every(r=>r.length>0));
    cases.push({example,authorRecovered:true,alternate:readings});
  }
  const link=await page.locator('#share-link').inputValue();
  if(primary){assert.ok(new URL(link).hash.startsWith('#a='));const packet=JSON.parse(Buffer.from(new URL(link).hash.slice(3),'base64url').toString());assert.equal(packet.version,'pakupaku-grammar-stream-1');assert.equal(Object.hasOwn(packet,'layout'),false);}
  const second=await browser.newPage();second.on('pageerror',e=>errors.push(e.message));await second.goto(link);
  await second.waitForFunction(()=>/^Readings? updated/.test(document.querySelector('#status').textContent));
  assert.equal(await second.locator('#writer-key').inputValue(),'');
  await second.locator('#reader-key').fill('test');
  await second.waitForFunction(({text,modes})=>modes.every(m=>document.getElementById(m+'-reading').textContent===text),{text:examples.at(-1),modes});
  // Rapid key edits must not let an older async response replace the last one.
  for(const key of ['t','te','tes','','tést','test'])await page.locator('#reader-key').fill(key);
  await page.waitForFunction(text=>document.querySelector('#clauses-reading').textContent===text,examples.at(-1));
  await page.locator('#note').fill('qzxvnonword is qzxvnonword.');await page.locator('#compare').click();
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('outside'));
  assert.equal(await page.locator('#share-link').inputValue(),'');
  await page.locator('#example').selectOption(examples[0]);await page.locator('#compare').click();await ready();
  await page.locator('[data-key="t"]').click();await ready();
  await page.screenshot({path:'/tmp/pakupaku-prototypes-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'/tmp/pakupaku-prototypes-mobile.png',fullPage:true});
  assert.deepEqual(errors,[]);assert.ok(requests.every(url=>url.startsWith(origin)));
  const report={page:pagePath,modes,cases,sharedLinkRecovered:true,rapidKeysPassed:true,unsupportedInputHandled:true,mobileOverflow:false,errors,localRequestsOnly:true,browser:await browser.version()};
  await writeFile(new URL(primary?'documentation/coverage/codec-demo-browser.json':'documentation/coverage/prototype-browser.json',root),JSON.stringify(report,null,2)+'\n');
  console.log(pagePath+': browser checks passed for '+modes.join(', ')+', shared links, rapid keys, unsupported input, and mobile layout.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
