// Two experiments using the existing full-key hash and rolling keyed mapping.
// Neither packet type is accepted by the production codec.
import {createMapping,hex} from '../mapping.js';
import {toBase64,fromBase64} from '../binary.js';
import {parseNote,renderClause,localRank,unrankClause,slotPool} from './language.js';

const FORMAT='pakupaku-experiment-1';
export const MAX_CLAUSES=64;
const MAX_PACKET=262144;
const utf8=new TextEncoder();
const defaultRandom=length=>crypto.getRandomValues(new Uint8Array(length));

export function randomBelow(limit,randomBytes=defaultRandom) {
  if(typeof limit!=='bigint'||limit<1n)throw Error('Invalid random domain.');
  if(limit===1n)return 0n;
  const bits=(limit-1n).toString(2).length,bytes=Math.ceil(bits/8),mask=(1n<<BigInt(bits))-1n;
  for(;;){
    const buffer=randomBytes(bytes);
    if(!(buffer instanceof Uint8Array)||buffer.length!==bytes)throw Error('Invalid random source.');
    const value=BigInt('0x'+hex(buffer))&mask;
    if(value<limit)return value;
  }
}

function encodePacket(packet){return toBase64(utf8.encode(JSON.stringify(packet)));}
function envelope(packet){
  return utf8.encode(JSON.stringify({format:FORMAT,language:packet.language,mode:packet.mode,count:packet.codes.length,...(packet.layout?{layout:packet.layout}:{})}));
}
function saltBytes(packet){return Uint8Array.from(packet.salt.match(/../g),s=>parseInt(s,16));}
function integer(value,size){
  if(typeof value!=='string'||! /^(0|[1-9]\d{0,31})$/.test(value))throw Error('Invalid encoded value.');
  const n=BigInt(value);if(n>=size)throw Error('Encoded value is out of range.');return n;
}
export function inspectPrototype(language,payload){
  if(typeof payload!=='string'||payload.length>MAX_PACKET)throw Error('Prototype link is too large.');
  let packet;
  try{packet=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(fromBase64(payload)));}catch{throw Error('Malformed prototype link.');}
  if(!packet||packet.format!==FORMAT||!['clauses','narrow','merged'].includes(packet.mode)||packet.language!==language.fingerprint||typeof packet.salt!=='string'||!/^[a-f0-9]{32}$/.test(packet.salt)||!Array.isArray(packet.codes)||!packet.codes.length||packet.codes.length>MAX_CLAUSES)throw Error('Unsupported or mismatched prototype link.');
  const expected=['format','language','mode','salt','codes',...(packet.mode==='clauses'?[]:['layout'])].sort();
  if(JSON.stringify(Object.keys(packet).sort())!==JSON.stringify(expected))throw Error('Unexpected prototype fields.');
  if(packet.mode==='clauses')packet.codes.forEach(code=>integer(code,language.size));
  else{
    if(!Array.isArray(packet.layout)||packet.layout.length!==packet.codes.length)throw Error('Invalid pool layout.');
    packet.layout.forEach((layout,i)=>{
      if(!layout||JSON.stringify(Object.keys(layout).sort())!==JSON.stringify(['groups','template'])||!Number.isSafeInteger(layout.template)||!language.templates[layout.template]||!Array.isArray(layout.groups))throw Error('Invalid pool construction.');
      const template=language.templates[layout.template];
      if(!Array.isArray(packet.codes[i])||packet.codes[i].length!==template.fields.length||layout.groups.length!==template.fields.length)throw Error('Incorrect pool field count.');
      template.fields.forEach((field,j)=>{
        const group=layout.groups[j];
        if(packet.mode==='merged'?group!==null:typeof group!=='string')throw Error('Invalid pool group.');
        const size=slotPool(language,field,group).length;if(!size)throw Error('Empty prototype pool.');
        integer(packet.codes[i][j],BigInt(size));
      });
    });
  }
  return packet;
}

export async function encodePrototype(language,text,key,{mode='clauses',salt=defaultRandom(16),randomBytes=defaultRandom,signal}={}) {
  if(typeof key!=='string'||Array.from(key).length<3)throw Error('Use at least three characters for the author key.');
  if(!['clauses','narrow','merged'].includes(mode))throw Error('Unknown prototype mode.');
  if(!(salt instanceof Uint8Array)||salt.length!==16)throw Error('Salt must contain 16 bytes.');
  if(typeof text!=='string'||text.length>20000)throw Error('Keep prototype notes under 20,000 characters.');
  const parsed=parseNote(language,text);
  if(parsed.clauses.length>MAX_CLAUSES)throw Error(`This prototype allows up to ${MAX_CLAUSES} clauses per note.`);
  const packet={format:FORMAT,language:language.fingerprint,mode,salt:hex(salt),codes:Array(parsed.clauses.length).fill(null)};
  if(mode!=='clauses')packet.layout=parsed.clauses.map(clause=>{
    const template=language.templates[clause.template];
    return {template:clause.template,groups:template.fields.map((field,i)=>mode==='merged'?null:language.pools[field.pool][clause.values[i]].group)};
  });
  const mapping=await createMapping(key,salt,FORMAT,envelope(packet),{signal});
  for(const [i,clause]of parsed.clauses.entries()){
    signal?.throwIfAborted();
    const template=language.templates[clause.template];
    if(mode==='clauses'){
      const rank=localRank(language,template,clause.values);
      const alternatives=(language.band-1n-rank)/template.size+1n;
      // Randomly use every equivalent representation, rather than reserving a
      // canonical index that could act as an author-key correctness marker.
      const semantic=BigInt(clause.template)*language.band+rank+randomBelow(alternatives,randomBytes)*template.size;
      const context=['whole-clause',i];
      const code=await mapping.value(semantic,language.size,context);
      packet.codes[i]=String(code);
      await mapping.advance(semantic,code,context);
    }else{
      const codes=[];
      for(const [j,field]of template.fields.entries()){
        const pool=slotPool(language,field,packet.layout[i].groups[j]);
        const semantic=BigInt(pool.indexOf(clause.values[j])),context=['pool-field',i,j];
        const code=await mapping.value(semantic,BigInt(pool.length),context);
        codes.push(String(code));await mapping.advance(semantic,code,context);
      }
      packet.codes[i]=codes;
    }
  }
  const payload=encodePacket(packet);
  inspectPrototype(language,payload);
  return {payload,canonical:parsed.canonical};
}

export async function decodePrototype(language,payload,key,{signal}={}) {
  const packet=inspectPrototype(language,payload);
  const mapping=await createMapping(key,saltBytes(packet),FORMAT,envelope(packet),{signal});
  const clauses=[];
  for(let i=0;i<packet.codes.length;i++){
    signal?.throwIfAborted();let clause;
    if(packet.mode==='clauses'){
      const code=BigInt(packet.codes[i]),context=['whole-clause',i];
      const rank=await mapping.value(code,language.size,context,true);
      clause=unrankClause(language,rank);
      // Both the selected structure and its words are part of rank. Feeding
      // that whole result forward makes the next structure key/history-dependent.
      await mapping.advance(rank,code,context);
    }else{
      const layout=packet.layout[i],template=language.templates[layout.template],values=[];
      for(const [j,field]of template.fields.entries()){
        const pool=slotPool(language,field,layout.groups[j]),code=BigInt(packet.codes[i][j]),context=['pool-field',i,j];
        const semantic=await mapping.value(code,BigInt(pool.length),context,true);
        values.push(pool[Number(semantic)]);await mapping.advance(semantic,code,context);
      }
      clause={template:template.index,values,text:renderClause(language,template,values)};
    }
    clauses.push({...clause,pattern:language.templates[clause.template].label,previous:i?clauses[i-1].text:null});
  }
  return {text:clauses.map(c=>c.text).join(' '),clauses,mode:packet.mode};
}
