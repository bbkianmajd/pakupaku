import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const {chromium,devices}=await import(process.env.PAKUPAKU_PLAYWRIGHT_MODULE||'playwright');
const root=new URL('../../',import.meta.url);
const server=createServer(async(req,res)=>{
 try{
  let path=new URL(req.url,'http://localhost').pathname;if(path.endsWith('/'))path+='index.html';
  const url=new URL('.'+path,root);if(!url.href.startsWith(root.href))throw Error('Outside site');
  const body=await readFile(url);res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.json')?'application/json':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.css')?'text/css':'text/html');res.end(body);
 }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const origin=`http://127.0.0.1:${server.address().port}`;
 for(const mobile of [false,true]){
  const context=await browser.newContext(mobile?devices['Pixel 7']:{});
  let requests=0,blocked=false;
  await context.route('**/release-lock.json*',async route=>{
   requests++;
   if(blocked||requests===1)await route.fulfill({status:blocked?503:404,body:'Temporary failure'});
   else await route.continue();
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/');await page.waitForFunction(()=>!document.querySelector('#encode').disabled);
  assert.equal(requests,2);
  assert.ok(await page.locator('.header-links a[href="https://github.com/bbkianmajd/pakupaku"]').isVisible());
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'),'https://bbkianmajd.github.io/pakupaku/');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  blocked=true;requests=0;await page.reload();
  await page.waitForFunction(()=>!document.querySelector('#retry-engine').hidden);
  assert.equal(requests,3);assert.match(await page.locator('#writer-status').textContent(),/HTTP 503/);
  assert.equal(await page.locator('#encode').isDisabled(),true);
  await page.locator('#note').fill('hello. i love you.');
  blocked=false;await page.locator('#retry-engine').click();await page.waitForFunction(()=>!document.querySelector('#encode').disabled&&document.querySelector('#note-feedback').textContent==='Note is ready to link.');
  assert.equal(await page.locator('#note').inputValue(),'hello. i love you.');
  await page.locator('#passkey').fill('');await page.locator('#encode').click();
  await page.waitForFunction(()=>document.querySelector('#link').hasAttribute('href')&&!document.querySelector('#note').readOnly);
  assert.equal(await page.locator('#note').inputValue(),'hello. i love you.');assert.deepEqual(errors,[]);
  await context.close();
 }
 const context=await browser.newContext();
 await context.route('**/src/text.js',async route=>{
  const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\n// deliberate release mismatch\n'});
 });
 const page=await context.newPage();await page.goto(origin+'/');await page.waitForFunction(()=>!document.querySelector('#retry-engine').hidden);
 assert.match(await page.locator('#writer-status').textContent(),/Wrong version/);assert.equal(await page.locator('#encode').isDisabled(),true);
 await context.close();
 console.log('Desktop + Android emulation: manifest retries, startup recovery without losing draft, empty keys, visible GitHub links, and unchanged hash enforcement passed.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
