// Finite, reversible numeric spellings. Domains encode validity before key
// mapping, so alternate keys cannot produce 25:87 or an invalid 12-hour clock.
const cardinalWords = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
export const numericFormats = {
  military4: {size:1440, parse: text => /^\d{4}$/.test(text) && +text.slice(0,2)<24 && +text.slice(2)<60 ? +text.slice(0,2)*60 + +text.slice(2) : null,
    render: value => String(Math.floor(value/60)).padStart(2,'0')+String(value%60).padStart(2,'0')},
  military3: {size:540, parse: text => /^[1-9]\d{2}$/.test(text) && +text.slice(1)<60 ? (+text[0]-1)*60 + +text.slice(1) : null,
    render: value => String(Math.floor(value/60)+1)+String(value%60).padStart(2,'0')},
  hour12: {size:12,parse:text=>/^(?:[1-9]|1[0-2])$/.test(text)?+text-1:null,render:value=>String(value+1)},
  hour24: {size:24,parse:text=>/^(?:[0-9]|1[0-9]|2[0-3])$/.test(text)?+text:null,render:String},
  hour24padded: {size:24,parse:text=>/^\d{2}$/.test(text)&&+text<24?+text:null,render:value=>String(value).padStart(2,'0')},
  minute: {size:60,parse:text=>/^\d{2}$/.test(text)&&+text<60?+text:null,render:value=>String(value).padStart(2,'0')},
  hourWord: {size:12,parse:text=>cardinalWords.indexOf(text)>=1&&cardinalWords.indexOf(text)<=12?cardinalWords.indexOf(text)-1:null,render:value=>cardinalWords[value+1]},
  cardinalOne: {size:1,parse:text=>text==='one'?0:null,render:()=> 'one'},
  cardinalMany: {size:20,parse:text=>{
    const i=cardinalWords.indexOf(text);return i<0||i===1?null:i>1?i-1:i;
  },render:value=>cardinalWords[value>=1?value+1:value]},
};
export function formatCategory(mode,id) {
  if (id!==0n || !numericFormats[mode]) throw Error('Invalid numeric format category.');
  return {id:0n,lo:0n,size:BigInt(numericFormats[mode].size),format:mode};
}
export const renderNumber = (category,value) => numericFormats[category.format].render(Number(value));

// Calendar fields share a public day/month/leap-year class in their production.
// Independent mapped fields stay compatible within that class.
const finiteFormat = (values,width) => {
  const texts=values.map(n=>width?String(n).padStart(width,'0'):String(n));
  const index=new Map(texts.map((text,i)=>[text,i]));
  return {size:texts.length,parse:text=>index.get(text)??null,render:i=>texts[i]};
};
const range=(lo,hi)=>Array.from({length:hi-lo+1},(_,i)=>i+lo);
const leap=year=>year%4===0&&(year%100!==0||year%400===0);
export const calendarClasses = {
  ordinary:{days:range(1,28),months:range(1,12)},
  long:{days:[29,30],months:[1,3,4,5,6,7,8,9,10,11,12]},
  longest:{days:[31],months:[1,3,5,7,8,10,12]},
  leap:{days:[29],months:[2]},
};
for(const [kind,{days,months}] of Object.entries(calendarClasses)) {
  for(const width of [0,2]) {
    numericFormats[`day_${kind}_${width}`]=finiteFormat(days,width);
    numericFormats[`month_${kind}_${width}`]=finiteFormat(months,width);
  }
  for(const width of [2,4]) {
    let years=width===2?range(0,99):range(1,9999);
    if(kind==='leap') years=years.filter(y=>leap(width===2?2000+y:y));
    numericFormats[`year_${kind}_${width}`]=finiteFormat(years,width);
  }
}

const prefixCache=new Map();
export function numericPrefix(mode,prefix) {
  if(!prefix) return true;
  const format=numericFormats[mode];
  if(!format) return false;
  if(!prefixCache.has(mode)) {
    const prefixes=new Set();
    for(let i=0;i<format.size;i++) {
      const text=format.render(i);
      for(let length=1;length<=text.length;length++) prefixes.add(text.slice(0,length));
    }
    prefixCache.set(mode,prefixes);
  }
  return prefixCache.get(mode).has(prefix);
}
numericFormats.hour12padded={size:12,parse:text=>/^\d{2}$/.test(text)&&+text>=1&&+text<=12?+text-1:null,render:value=>String(value+1).padStart(2,'0')};

numericFormats.moneyLead=finiteFormat(range(1,999),0);
numericFormats.moneyGroup=finiteFormat(range(0,999),3);
numericFormats.cents=finiteFormat(range(0,99),2);
