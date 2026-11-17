import {createStructureLanguage,encodeStructure,decodeStructure,inspectStructure} from '../structure-codec.js';
import {createPrototypeLanguage} from './language.js';
import {encodePrototype,decodePrototype,inspectPrototype} from './codec.js';
import {toBase64,fromBase64} from '../binary.js';
const $=id=>document.getElementById(id);
const primary=document.body.dataset.codec==='clauses';
const modes=primary?['clauses']:['narrow','merged','clauses'];
const updated=primary?'Reading updated. Try another key.':'Readings updated. Try another key to compare.';
let language,packets=null,revision=0,controller=null,timer;
const status=text=>{$('status').textContent=text;};
function share(){
  const url=new URL(location.href);url.hash=primary?'a='+packets.clauses:'x='+toBase64(new TextEncoder().encode(JSON.stringify(packets)));
  $('share-link').value=url.href;
}
async function read(){
  clearTimeout(timer);controller?.abort();controller=new AbortController();
  const current=++revision,signal=controller.signal;
  if(!packets)return;
  $('results').setAttribute('aria-busy','true');
  try{
    const results=await Promise.all(modes.map(async mode=>[mode,await (primary?decodeStructure:decodePrototype)(language,packets[mode],$('reader-key').value,{signal})]));
    if(current!==revision)return;
    for(const [mode,result]of results)$(mode+'-reading').textContent=result.text;
    $('chain').replaceChildren();
    for(const [i,clause]of results.find(([mode])=>mode==='clauses')[1].clauses.entries()){
      const li=document.createElement('li'),strong=document.createElement('strong'),text=document.createElement('span');
      strong.textContent=`Clause ${i+1} · ${clause.pattern}`;text.textContent=clause.text;
      li.append(strong,text);$('chain').append(li);
    }
    status(updated);
  }catch(error){if(!signal.aborted&&current===revision)status(error.message);}
  finally{if(current===revision)$('results').setAttribute('aria-busy','false');}
}
async function create(event){
  event?.preventDefault();
  controller?.abort();revision++;packets=null;
  $('compare').disabled=true;$('reader-key').disabled=true;$('share-link').value='';$('chain').replaceChildren();
  for(const mode of modes)$(mode+'-reading').textContent='Preparing reading…';
  const note=$('note').value,key=$('writer-key').value;
  $('note').disabled=true;$('writer-key').disabled=true;$('example').disabled=true;
  status(primary?'Creating your link…':'Creating the three versions…');
  try{
    const results=await Promise.all(modes.map(async mode=>[mode,(await (primary?encodeStructure:encodePrototype)(language,note,key,{mode})).payload]));
    packets=Object.fromEntries(results);share();$('reader-key').disabled=false;await read();
  }catch(error){status(error.message);for(const mode of modes)$(mode+'-reading').textContent='Choose a supported note to create a link.';}
  finally{$('compare').disabled=false;$('note').disabled=false;$('writer-key').disabled=false;$('example').disabled=false;}
}
$('writer-form').addEventListener('submit',create);
$('reader-key').addEventListener('input',()=>{controller?.abort();revision++;clearTimeout(timer);timer=setTimeout(read,100);});
for(const button of document.querySelectorAll('[data-key]'))button.addEventListener('click',()=>{$('reader-key').value=button.dataset.key;read();});
$('example').addEventListener('change',()=>{$('note').value=$('example').value;status('Example selected. Click the create button to use it.');});
for(const id of ['note','writer-key'])$(id).addEventListener('input',()=>status('Changes are not encoded yet. Click the create button to use them.'));
async function loadShared(){
  controller?.abort();revision++;
  if(!location.hash)return false;
  if(location.hash.length>1048576)throw Error('Link is too large.');
  if(primary&&!location.hash.startsWith('#a='))throw Error('This page now uses changing sentence structures. Create a new link; older experimental links are unsupported.');
  if(!primary&&!location.hash.startsWith('#x='))throw Error('Invalid comparison link.');
  const candidate=primary?{clauses:location.hash.slice(3)}:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(fromBase64(location.hash.slice(3))));
  if(!candidate||JSON.stringify(Object.keys(candidate).sort())!==JSON.stringify([...modes].sort()))throw Error('Incomplete comparison link.');
  for(const mode of modes)if((primary?inspectStructure:inspectPrototype)(language,candidate[mode]).mode!==mode)throw Error('Comparison modes do not match.');
  packets=candidate;$('compose').open=false;$('note').value='';$('writer-key').value='';$('reader-key').value='';$('reader-key').disabled=false;
  share();await read();return true;
}
window.addEventListener('hashchange',async()=>{try{await loadShared();}catch(error){status(error.message);}});
try{
  const response=await fetch('./data/semantics/1.0.0.json');if(!response.ok)throw Error('Could not load vocabulary.');
  language=await (primary?createStructureLanguage:createPrototypeLanguage)(await response.json());$('compare').disabled=false;
  if(!await loadShared())await create();
}catch(error){status(error.message);}
