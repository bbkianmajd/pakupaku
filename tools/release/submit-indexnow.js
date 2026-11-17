import {readFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url),base='https://bbkianmajd.github.io/pakupaku/';
const key=(await readFile(new URL('indexnow-key.txt',root),'utf8')).trim();
if(!/^[a-f0-9]{32}$/.test(key))throw Error('Invalid IndexNow key file.');
const sitemap=await readFile(new URL('sitemap.xml',root),'utf8');
const urlList=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);
if(!urlList.length||urlList.some(url=>!url.startsWith(base)||new URL(url).hash))throw Error('Unexpected sitemap URL.');
const keyLocation=new URL('indexnow-key.txt',base).href;
let ready=false;
for(let attempt=0;attempt<3;attempt++){
 if(attempt)await new Promise(resolve=>setTimeout(resolve,attempt*1000));
 try{
  const response=await fetch(keyLocation,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(response.ok&&(await response.text()).trim()===key){ready=true;break;}
 }catch{}
}
if(!ready)throw Error('Deployed IndexNow key is unavailable; no URLs were submitted.');
const response=await fetch('https://api.indexnow.org/indexnow',{
 method:'POST',headers:{'Content-Type':'application/json; charset=utf-8'},
 body:JSON.stringify({host:new URL(base).host,key,keyLocation,urlList}),signal:AbortSignal.timeout(20000)
});
if(![200,202].includes(response.status))throw Error(`IndexNow submission failed: HTTP ${response.status}.`);
console.log(`IndexNow received ${urlList.length} page URLs (HTTP ${response.status}). This is a submission receipt, not a guarantee of indexing or ranking.`);
