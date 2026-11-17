// Experimental, finite clause domains. The production grammar is not modified.
import {digest, hex} from '../mapping.js';

const words = text => text.match(/[^\s,.?!]+|[,.?!]/gu) || [];
const compare = (a,b) => a.text < b.text ? -1 : a.text > b.text ? 1 : 0;
const unique = entries => [...new Map(entries.map(e=>[e.text,e])).values()].sort(compare);
const field = (name,pool,verb=false) => ({name,pool,verb});
const agreement = (i,pl,sg) => ({agreement:{i,pl,sg}});
const finite = (name,pool) => field(name,pool,true);
const be = () => agreement('am','are','is');
const subject = () => field('subject','subjects');
const actor = () => field('subject','actors');
const adjective = () => field('adjective','adjectives');
const object = () => field('object','objects');
const verbRows = pairs => pairs.map(([text,third])=>({text,base:text,third,group:'verb'}));
const personHeads = new Set(['doctor','musician','teacher','friend','artist','neighbor','child','traveler','writer','student','nurse','engineer','driver','chef','scientist','actor','dancer']);

export function normalizeNote(text) {
  if(typeof text!=='string') throw Error('Enter a note.');
  let result=text.toLowerCase().replace(/\s+/g,' ').trim().replace(/\s+([,.?!])/g,'$1');
  result=result.replace(/([,.?!])(?=\S)/g,'$1 ');
  if(result && !/[.!?]$/.test(result))result+='.';
  return result;
}

export async function createPrototypeLanguage(vocabulary,{profile='strict'}={}) {
  const nominal=unique([
    ...vocabulary.entries.filter(e=>e.roles.includes('nominal-phrase') && !/[,.?!]/.test(e.text))
      .map(e=>({text:e.text,group:e.features.kind,agreement:'sg'})),
    ...[...personHeads].map(head=>({text:'the '+head,group:'count',agreement:'sg'})),
    ...(profile==='option3'?vocabulary.entries.filter(e=>e.roles.includes('count-noun')).map(e=>({text:e.forms.singular,group:'noun',agreement:'sg'})):[]),
    ...['paris','london','tokyo','berlin','rome'].map(text=>({text,group:'place',agreement:'sg'})),
  ]);
  const pronouns=[['i','me','i'],['you','you','pl'],['we','us','pl'],['they','them','pl'],['he','him','sg'],['she','her','sg']]
    .map(([text,object,agreement])=>({text,object,agreement,group:'pronoun:'+agreement}));
  const deictic=['it','this','that'].map(text=>({text,agreement:'sg',group:'fixed:'+text}));
  const plural=[{text:'the flowers',agreement:'pl',group:'plural'},{text:'the children',agreement:'pl',group:'plural'}];
  const people=nominal.filter(e=>e.group==='person'||personHeads.has(e.text.replace(/^the /,'')));
  const pools={
    subjects:unique([...nominal,...pronouns,...deictic,...plural]),
    actors:unique([...people,...pronouns,{text:'the children',agreement:'pl',group:'plural'}]),
    objects:unique([...people,...pronouns.map(e=>({...e,text:e.object})),{text:'the children',agreement:'pl',group:'plural'}]),
    addresses:unique(people),
    places:unique([
      ...vocabulary.entries.filter(e=>e.roles.includes('place-name')&&e.features.usage==='ordinary'&&!/[,.?!]/.test(e.text)).map(e=>({text:e.text,group:'place',agreement:'sg'})),
      ...nominal.filter(e=>e.group==='place'||['paris','london','tokyo','berlin','rome'].includes(e.text)).map(e=>({...e,group:'place'})),
    ]),
    adjectives:unique(vocabulary.entries.filter(e=>e.roles.includes('predicate-adjective')).map(e=>({text:e.text,group:'adjective'}))),
    events:verbRows([['wait','waits'],['smile','smiles'],['laugh','laughs'],['sleep','sleeps'],['dance','dances'],['work','works'],['arrive','arrives']]),
    relations:verbRows([['love','loves'],['like','likes'],['know','knows'],['remember','remembers'],['help','helps'],['call','calls'],['meet','meets'],['thank','thanks'],['trust','trusts']]),
    travel:verbRows([['go','goes'],['walk','walks'],['travel','travels']]),
    modals:['can','will','might'].map(text=>({text,group:'modal'})),
    times:['today','tomorrow','after lunch','this evening','on monday'].map(text=>({text,group:'time'})),
  };
  if(profile==='option3') {
    const verbs=unique(vocabulary.entries.filter(e=>e.roles.includes('framed-verb')).map(e=>({text:e.forms.base,base:e.forms.base,third:e.forms.third,group:'verb'})));
    pools.events=verbs;pools.relations=verbs;pools.travel=verbs;
    pools.actors=pools.subjects;
    pools.objects=unique([...nominal,...plural,...deictic,...pronouns.map(e=>({...e,text:e.object}))]);
    pools.adjectives=unique(vocabulary.entries.filter(e=>e.roles.some(r=>['adjective','predicate-adjective'].includes(r))).map(e=>({text:e.text,group:'adjective'})));
  }
  const definitions=[
    ['description','Describing something',[subject(),be(),adjective(),'.']],
    ['event','Someone doing something',[actor(),finite('verb','events'),'.']],
    ['relationship','Someone acting toward someone',[actor(),finite('verb','relations'),object(),'.']],
    ['travel','Someone going somewhere',[actor(),finite('verb','travel'),'to',field('place','places'),'.']],
    ['location','Saying where something is',[subject(),be(),'in',field('place','places'),'.']],
    ['modal','Something possible or planned',[actor(),field('modal','modals'),field('verb','events'),'.']],
    ['question','Asking a question',[agreement('do','do','does'),actor(),field('verb','relations'),object(),'?']],
    ['timed-event','Putting the time first',[field('time','times'),',',actor(),finite('verb','events'),'.']],
    ['address','Speaking to someone',[field('address','addresses'),',',subject(),be(),adjective(),'.']],
  ];
  const templates=definitions.map(([id,label,parts],index)=>{
    const fields=parts.filter(p=>p.name);
    return {id,label,index,parts,fields,size:fields.reduce((n,f)=>n*BigInt(pools[f.pool].length),1n)};
  });
  if(Object.values(pools).some(p=>!p.length))throw Error('Prototype vocabulary is incomplete.');
  // Equal-width family bands prevent the largest Cartesian product from
  // swallowing almost every reading. Multiple indices can render the same text.
  let band=1n;while(templates.some(t=>t.size>band))band<<=1n;
  const fingerprint=hex(await digest(new TextEncoder().encode(JSON.stringify({pools,definitions,version:1}))));
  const tries=new Map();
  function matches(pool,form,tokens,start) {
    const key=pool+':'+form;
    if(!tries.has(key)){
      const root={next:new Map(),ends:[]};
      pools[pool].forEach((entry,index)=>{
        let node=root;
        for(const token of words(entry[form]||entry.text)){
          if(!node.next.has(token))node.next.set(token,{next:new Map(),ends:[]});node=node.next.get(token);
        }
        node.ends.push(index);
      });tries.set(key,root);
    }
    let node=tries.get(key);const result=[];
    for(let end=start;end<tokens.length;end++){
      node=node.next.get(tokens[end]);if(!node)break;
      for(const index of node.ends)result.push({index,end:end+1});
    }
    return result.reverse();
  }
  const language={pools,templates,band,size:band*BigInt(templates.length),fingerprint,matches};
  return language;
}

const entriesFor = (language,template,values) => Object.fromEntries(template.fields.map((f,i)=>[f.name,language.pools[f.pool][Number(values[i])]]));
export function renderClause(language,template,values) {
  if(values.length!==template.fields.length || values.some((v,i)=>!Number.isSafeInteger(Number(v))||Number(v)<0||Number(v)>=language.pools[template.fields[i].pool].length))throw Error('Invalid clause values.');
  const entries=entriesFor(language,template,values),tokens=[];
  for(const part of template.parts){
    if(typeof part==='string')tokens.push(part);
    else if(part.agreement)tokens.push(part.agreement[entries.subject.agreement]);
    else {const entry=entries[part.name];tokens.push(part.verb ? entry[entries.subject.agreement==='sg'?'third':'base'] : entry.text);}
  }
  return tokens.join(' ').replace(/ ([,.?!])/g,'$1');
}

export function parseNote(language,input) {
  const canonical=normalizeNote(input),chunks=canonical.match(/[^.!?]+[.!?]/g)||[];
  if(!chunks.length||chunks.map(c=>c.trim()).join(' ')!==canonical)throw Error('Use complete clauses ending in a period or question mark.');
  const clauses=chunks.map((chunk,clauseIndex)=>{
    const tokens=words(chunk.trim());
    for(const template of language.templates){
      // Questions have an agreement word before their subject. Try its three
      // spellings, then verify the full rendered result after all fields exist.
      function walk(partIndex,position,values,entries){
        if(partIndex===template.parts.length){
          if(position===tokens.length&&renderClause(language,template,values)===chunk.trim())return values;
          return null;
        }
        const part=template.parts[partIndex];
        if(typeof part==='string')return tokens[position]===part?walk(partIndex+1,position+1,values,entries):null;
        if(part.agreement){
          const forms=entries.subject?[part.agreement[entries.subject.agreement]]:Object.values(part.agreement);
          return forms.includes(tokens[position])?walk(partIndex+1,position+1,values,entries):null;
        }
        const form=part.verb?(entries.subject.agreement==='sg'?'third':'base'):'text';
        for(const match of language.matches(part.pool,form,tokens,position)){
          const result=walk(partIndex+1,match.end,[...values,match.index],{...entries,[part.name]:language.pools[part.pool][match.index]});
          if(result)return result;
        }
        return null;
      }
      const values=walk(0,0,[],{});
      if(values)return {template:template.index,values};
    }
    throw Error(`Clause ${clauseIndex+1} is outside this prototype's nine patterns: “${chunk.trim()}” Try an example below.`);
  });
  return {canonical,clauses};
}

export function localRank(language,template,values) {
  renderClause(language,template,values); // Validate the complete tuple.
  return values.reduce((rank,value,i)=>rank*BigInt(language.pools[template.fields[i].pool].length)+BigInt(value),0n);
}
export function unrankClause(language,rank) {
  if(typeof rank!=='bigint'||rank<0n||rank>=language.size)throw Error('Invalid clause rank.');
  const template=language.templates[Number(rank/language.band)];
  let remainder=(rank%language.band)%template.size;
  const values=Array(template.fields.length);
  for(let i=values.length-1;i>=0;i--){const size=BigInt(language.pools[template.fields[i].pool].length);values[i]=Number(remainder%size);remainder/=size;}
  return {template:template.index,values,text:renderClause(language,template,values)};
}

export function slotPool(language,field,group=null) {
  const entries=language.pools[field.pool];
  return entries.flatMap((entry,index)=>group===null||entry.group===group?[index]:[]);
}
