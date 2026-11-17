import {RELEASE_VERSION, requireRelease} from './release.js';
import {createPrototypeLanguage,parseNote as parseSimple,renderClause} from './prototypes/language.js';
// Full grammar, bounded derivation codec. Every key selects productions as well
// as leaves; no original tree or plaintext is included in the packet.
import {createGrammar,parseNote,compileLayout,renderPlan} from './grammar.js';
import {rules} from './grammar-contract.js';
import {ByteReader,putVarint,toBase64,fromBase64} from './binary.js';
import {quantityCategory} from './numbers.js';
import {formatCategory} from './numeric-formats.js';
import {digest,hex} from './mapping.js';
import {randomBelow} from './prototypes/codec.js';
const enc=new TextEncoder(),VERSION='pakupaku-grammar-stream-3-weighted-numbers';
const random=n=>{const b=new Uint8Array(n);for(let i=0;i<n;i+=65536)crypto.getRandomValues(b.subarray(i,i+65536));return b;};
const ceil=n=>{let v=1;while(v<n)v*=2;return v;};
export async function createStructureLanguage(vocabulary,{numberPolicy='weighted'}={}){
 if(!['weighted','uniform'].includes(numberPolicy))throw Error('Unknown number policy.');
 const simple=await createPrototypeLanguage(vocabulary,{profile:'option3'}),grammar=createGrammar(vocabulary,{profile:'option3'}),byResult=new Map(),minimum=new Map();
 for(const r of rules){if(!byResult.has(r.result))byResult.set(r.result,[]);byResult.get(r.result).push(r);}
 const cost=e=>e.literal?0:e.role?(grammar.pools.get(e.role)?.length?1:Infinity):(minimum.get(e.symbol)??Infinity);
 let changed=true;while(changed){changed=false;for(const r of rules){const c=(r.numeric?3:1)+r.expansion.reduce((s,e)=>s+cost(e),0);if(c<(minimum.get(r.result)??Infinity)){minimum.set(r.result,c);changed=true;}}}
 // Find productions which necessarily introduce digits, including wrappers
 // around times, dates, money and observed numeric lexical classes.
 const numericSymbols=new Map([...byResult.keys()].map(k=>[k,true]));
 const numericItem=e=>e.literal?/\d/.test(e.literal):e.role?!!grammar.pools.get(e.role)?.length&&grammar.pools.get(e.role).every(x=>/\d/.test(e.form==='text'?x.text:x.forms?.[e.form]||x.text)):numericSymbols.get(e.symbol);
 let numericChanged=true;while(numericChanged){numericChanged=false;for(const [name,list]of byResult)if(numericSymbols.get(name)&&list.some(r=>!r.numeric&&!r.expansion.some(numericItem))){numericSymbols.set(name,false);numericChanged=true;}}
 const numericRules=new Set(rules.filter(r=>r.numeric||r.expansion.some(numericItem)).map(r=>r.id));
 const fingerprint=hex(await digest(enc.encode(JSON.stringify({vocabulary,rules,numberPolicy,pools:[...grammar.pools].map(([name,entries])=>[name,entries.map(e=>e.id)]),simple:simple.fingerprint,version:VERSION}))));
 return {grammar,byResult,minimum,cost,fingerprint,simple,numberPolicy,numericRules};
}
const category=(r,id)=>r.numeric.startsWith('format:')?formatCategory(r.numeric.slice(7),id):quantityCategory(id,r.numeric);
function sourceTrace(language,text){
 const parsed=parseNote(language.grammar,text),reader=new ByteReader(parsed.layout),trace=[],stack=[{symbol:'ROOT'}];let value=0,maxCategory=2;
 while(stack.length){const e=stack.pop();if(e.literal)continue;if(e.role){trace.push(parsed.values[value++]);continue;}
 const id=Number(reader.varint()),r=rules[id];trace.push(BigInt(id));
 if(r.numeric){const c=reader.varint();maxCategory=Math.max(maxCategory,Number(c));trace.push(c,parsed.values[value++]);}
 for(let i=r.expansion.length-1;i>=0;i--)stack.push(r.expansion[i]);
 }
 return {trace,maxCategory,canonical:renderPlan(compileLayout(language.grammar,parsed.layout),parsed.values)};
}
function width(language,maxCategory){
 let max=BigInt(rules.length*12);for(const p of language.grammar.pools.values())if(BigInt(p.length)>max)max=BigInt(p.length);
 for(const r of rules)if(r.numeric){const c=category(r,BigInt(r.numeric.startsWith('format:')||r.numeric==='singular'?0:maxCategory));if(c.size>max)max=c.size;}
 return Math.ceil((max-1n).toString(2).length/8);
}
export function inspectStructure(language,payload){
 if(typeof payload!=='string'||payload.length>16000000)throw Error('Link exceeds the prototype resource limit.');
 let p;try{p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(fromBase64(payload)));}catch{throw Error('Invalid structure link.');}
 requireRelease(p?.release);
 if(p.version!==VERSION || p.language!==language.fingerprint)throw Error('Wrong version: parser, dictionary, or codec does not match this link.');
 if(!Number.isSafeInteger(p.budget)||p.budget<language.minimum.get('ROOT')+1||p.budget>65536||!Number.isSafeInteger(p.numbers)||p.numbers<2||p.numbers>1024||! /^[a-f0-9]{32}$/.test(p.salt)||typeof p.body!=='string')throw Error('Unsupported structure link.');
 const body=fromBase64(p.body),bytes=width(language,p.numbers);if(body.length!==p.budget*bytes)throw Error('Incorrect structure stream length.');
 return {...p,body,bytes,mode:'clauses'};
}
async function transform(language,packet,key,trace,signal,simpleSource=null,simpleOnly=false){
 if(typeof key!=='string')throw Error('Key must be text.');
 const header=JSON.stringify([VERSION,packet.language,packet.budget,packet.numbers,packet.salt]);
 const seed=await digest(enc.encode(JSON.stringify([header,key]))),hmac=await crypto.subtle.importKey('raw',seed,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const sign=async s=>new Uint8Array(await crypto.subtle.sign('HMAC',hmac,enc.encode(s)));
 let chain=hex(seed),position=0,traceIndex=0;
 const body=trace?random(packet.budget*packet.bytes):packet.body;
 async function choose(size,context,wanted){
  signal?.throwIfAborted();if(position>=packet.budget)throw Error('Derivation budget exhausted.');
  let mask=new Uint8Array(packet.bytes);for(let i=0;i<mask.length;i+=32)mask.set((await sign(JSON.stringify(['mask',chain,position,context,i]))).subarray(0,Math.min(32,mask.length-i)),i);
  let block=body.subarray(position*packet.bytes,(position+1)*packet.bytes),plain;
  if(trace){const limit=1n<<BigInt(packet.bytes*8),aliases=(limit-1n-wanted)/size+1n;let n=wanted+randomBelow(aliases)*size;plain=new Uint8Array(packet.bytes);for(let i=plain.length-1;i>=0;i--){plain[i]=Number(n&255n);n>>=8n;}for(let i=0;i<block.length;i++)block[i]=plain[i]^mask[i];}
  else plain=Uint8Array.from(block,(b,i)=>b^mask[i]);
  const choice=BigInt('0x'+hex(plain))%size;
  chain=hex(await sign(JSON.stringify(['next',chain,position,context,choice.toString(),hex(block)])));position++;return choice;
 }
 async function weighted(weights,context,wanted){
  const total=weights.reduce((a,b)=>a+b,0n);
  let ticket;
  if(trace){ticket=weights.slice(0,Number(wanted)).reduce((a,b)=>a+b,0n)+randomBelow(weights[Number(wanted)]);}
  let decoded=await choose(total,context,ticket);
  for(let i=0;i<weights.length;i++){if(decoded<weights[i])return BigInt(i);decoded-=weights[i];}
  throw Error('Invalid weighted choice.');
 }
 const family=await choose(10n,['language-family'],trace?(simpleSource?randomBelow(9n):9n):undefined);
 if(simpleOnly||family!==9n){
  const maxClauses=Math.max(1,Math.floor((packet.budget-2)/5));
  const count=Number(await choose(BigInt(maxClauses),['clause-count'],trace?BigInt(simpleSource.clauses.length-1):undefined))+1;
  const clauses=[];
  for(let i=0;i<count;i++){
   const source=simpleSource?.clauses[i];
   const t=language.simple.templates[Number(await choose(9n,['construction',i],trace?BigInt(source.template):undefined))],values=[];
   for(const [j,f]of t.fields.entries())values.push(Number(await choose(BigInt(language.simple.pools[f.pool].length),['clause-word',i,j],trace?BigInt(source.values[j]):undefined)));
   clauses.push({text:renderClause(language.simple,t,values),pattern:t.label,previous:i?clauses[i-1].text:null});
  }
  return {body,text:clauses.map(c=>c.text).join(' '),decisions:position,clauses,mode:'clauses'};
 }
 const layout=[],values=[],stack=[{symbol:'ROOT'}];let reserve=language.cost(stack[0]);
 while(stack.length){const e=stack.pop();reserve-=language.cost(e);if(e.literal)continue;
  if(e.role){values.push(await choose(BigInt(language.grammar.pools.get(e.role).length),['word',e.role],trace?.[traceIndex++]));continue;}
  const candidates=language.byResult.get(e.symbol).filter(r=>(r.numeric?3:1)+r.expansion.reduce((s,x)=>s+language.cost(x),0)<=packet.budget-position-reserve);
  const target=trace?.[traceIndex++];
  const wanted=trace?candidates.findIndex(r=>BigInt(r.id)===target):undefined;
  if(!candidates.length||wanted===-1)throw Error('No productive construction fits the budget: '+JSON.stringify({symbol:e.symbol,position,reserve,budget:packet.budget,wanted:trace?.[traceIndex-1]?.toString(),candidates:candidates.map(r=>r.id)}));
  const weights=candidates.map(r=>language.numberPolicy==='weighted'&&!language.numericRules.has(r.id)?12n:1n);
  const r=candidates[Number(await weighted(weights,['rule',e.symbol],trace?BigInt(wanted):undefined))];putVarint(layout,r.id);
  if(r.numeric){const count=r.numeric.startsWith('format:')||r.numeric==='singular'?1:packet.numbers+1;const tail=BigInt(Math.max(1,count-2));const weights=Array.from({length:count},(_,i)=>language.numberPolicy==='uniform'?1n:i===0?90n*tail:i===1?9n*tail:1n);const id=await weighted(weights,['category',r.numeric],trace?.[traceIndex++]);putVarint(layout,id);values.push(await choose(category(r,id).size,['number',r.numeric,id.toString()],trace?.[traceIndex++]));}
  for(let i=r.expansion.length-1;i>=0;i--){stack.push(r.expansion[i]);reserve+=language.cost(r.expansion[i]);}
 }
 if(trace&&traceIndex!==trace.length)throw Error('Unconsumed author derivation.');
 const text=renderPlan(compileLayout(language.grammar,Uint8Array.from(layout)),values);
 // The legacy stored-rule contract admits some combinations its recognizer
 // cannot consume (especially nested delimiters). Reject that derivation, not
 // its words: deterministically sample a complete reviewed construction.
 try{parseNote(language.grammar,text);}catch(error){if(trace)throw error;return transform(language,packet,key,null,signal,null,true);}
 return {body,text,layout,decisions:position,clauses:[{text,pattern:'Key-selected grammar tree',previous:null}],mode:'clauses'};
}
export async function encodeStructure(language,text,key,{signal}={}){
 if(typeof key!=='string'||Array.from(key).length<3)throw Error('Use at least three characters for the author key.');
 let simpleSource=null;try{const p=parseSimple(language.simple,text);if(p.canonical===text.trim().toLowerCase())simpleSource=p;}catch{}
 let source;try{source=sourceTrace(language,text);}catch(error){if(!simpleSource)throw error;source={trace:[],maxCategory:2,canonical:simpleSource.canonical};}
 const budget=ceil(Math.max(32,source.trace.length+1,simpleSource?2+simpleSource.clauses.length*5:0)),numbers=Math.max(2,ceil(source.maxCategory));
 if(budget>65536||numbers>1024||budget*width(language,numbers)>8000000)throw Error('Note exceeds the prototype resource limit.');
 const p={release:RELEASE_VERSION,version:VERSION,language:language.fingerprint,budget,numbers,salt:hex(random(16)),bytes:width(language,numbers)};
 const result=await transform(language,p,key,source.trace,signal,simpleSource);if(result.text!==source.canonical)throw Error('Author recovery mismatch.');
 delete p.bytes;p.body=toBase64(result.body);return {payload:toBase64(enc.encode(JSON.stringify(p))),canonical:source.canonical};
}
export async function decodeStructure(language,payload,key,{signal}={}){return transform(language,inspectStructure(language,payload),key,null,signal);}
