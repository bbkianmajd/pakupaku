import option3Signatures from './option3-pool-signatures.js';
import { validateVocabulary } from './vocabulary.js';
import { ByteReader, putVarint, byteWidth } from './binary.js';
import { integerToken, categoryFor, quantityCategory, numberValue } from './numbers.js';

import { numericFormats, formatCategory, renderNumber, numericPrefix } from './numeric-formats.js';
import { tokenize, tokenMatches, canonicalize, closingPunctuation } from './text.js';
import { roles, rules, aliases, numericRules, nominalChoiceRules } from './grammar-contract.js';
const node = (rule, children = []) => ({ rule, children });
const literals = new Set(rules.flatMap(rule => rule.expansion.filter(e => e.literal).map(e => e.literal)));
const literalTerminals = { period: '.', comma: ',', ...Object.fromEntries([...literals].map(text => ['@'+text, text])) };
const declarations = [...aliases.map(p => ({ ...p, action: c => c[0] }))];
for (const rule of rules) for (const parse of rule.parse) {
  declarations.push({ ...parse, profile:rule.profile, spacing: rule.expansion.map(item=>item.matchJoinLeft), action: children => node(rule.id, children.filter((child, i) => {
    const term = parse.rhs[i];
    return !(term.startsWith('t:') && (['t:the','t:and'].includes(term) || literalTerminals[term.slice(2)]));
  })) });
}
const productions = declarations.sort((a,b) => a.priority-b.priority).map(p => [p.lhs,p.rhs,p.action,p.spacing,p.profile]);

export function createGrammar(input,{profile='strict'}={}) {
  const vocabulary = validateVocabulary(input), pools = new Map(), lexicons = new Map();
  const roleEntries=new Map(),signatureEntries=new Map();
  for(const entry of vocabulary.entries) {
    for(const role of entry.roles) {if(!roleEntries.has(role))roleEntries.set(role,[]);roleEntries.get(role).push(entry);}
    if(entry.roles.includes('dependency-lexeme')) {const key=entry.features.signature;if(!signatureEntries.has(key))signatureEntries.set(key,[]);signatureEntries.get(key).push(entry);}
  }
  const activeProductions=productions.filter(p=>!p[4]||p[4]===profile);
  const broadSignatures=new Map();
  if(profile==='option3')for(const [signature,entries]of signatureEntries){
    const key=option3Signatures[signature]||signature;
    if(!broadSignatures.has(key))broadSignatures.set(key,[]);broadSignatures.get(key).push(...entries);
  }
  for (const [terminal, [sourceRole, form, features]] of Object.entries(roles)) {
    const role = features ? terminal : sourceRole;
    if (!pools.has(role)) {
      let entries;
      if(sourceRole==='dependency-lexeme')entries=profile==='option3'?broadSignatures.get(option3Signatures[features.signature]||features.signature)||[]:signatureEntries.get(features.signature)||[];
      else {
        entries=roleEntries.get(sourceRole)||[];
        if(profile==='option3'&&['adjective','predicate-adjective'].includes(sourceRole))entries=[...(roleEntries.get('adjective')||[]),...(roleEntries.get('predicate-adjective')||[])];
        // Learned adjectives such as 'double' need the same modifier access
        // as dictionary adjectives. Do not infer roles for unknown spellings.
        if(profile==='option3'&&terminal==='option3_preverb_adjective')
          entries=[...entries,...(roleEntries.get('dependency-lexeme')||[]).filter(e=>option3Signatures[e.features.signature]?.startsWith('ADJ|')&&tokenize(e.text).length===1)];
        entries=entries.filter(e=>!features||Object.entries(features).every(([key,value])=>profile==='option3'&&((sourceRole==='framed-verb'&&['frame','progressive'].includes(key))||(sourceRole==='adverb'&&key==='position')) || (Array.isArray(value)?value.includes(e.features?.[key]):e.features?.[key]===value)));
      }
      if(profile==='option3'&&['option3_noun_s','option3_noun_p','option3_noun_consonant','option3_noun_vowel'].includes(terminal)) {
        const plural=terminal==='option3_noun_p';entries=[];
        for(const entry of vocabulary.entries) {
          if(entry.roles.includes('count-noun'))entries.push({...entry,text:entry.forms[plural?'plural':'singular']});
          if(!plural&&entry.roles.some(r=>['mass-noun','person-name','proper-noun','place-name'].includes(r)))entries.push(entry);
          const signature=entry.roles.includes('dependency-lexeme')?option3Signatures[entry.features.signature]:null;
          if(signature&&/^(NOUN|PROPN)\|/.test(signature)&&signature.includes(plural?'Number=Plur':'Number=Sing'))entries.push(entry);
        }
        if(terminal.endsWith('_consonant')||terminal.endsWith('_vowel')) {
          const expected=terminal.endsWith('_vowel')?'vowel':'consonant';
          entries=entries.filter(e=>{const known=e.features?.onset||option3Signatures[e.features?.signature]?.split('|')[2];return !['vowel','consonant'].includes(known)||known===expected;});
        }
      }
      if(profile==='option3')entries=[...new Map(entries.map(e=>[form==='text'?e.text:e.forms[form],e])).values()];
      pools.set(role,entries);
    }
    const index = new Map();
    pools.get(role).forEach((entry, i) => {
      const text = form === 'text' ? entry.text : entry.forms[form];
      if (!index.has(text)) index.set(text, i);
    });
    lexicons.set(terminal, index);
  }
  // Compile phrase-valued lexical terminals into local token recognizers.
  // Their action returns one lexical index; the stored layout reveals neither
  // the selected name's words nor its length. Components cannot recombine.
  const usedTerminals=new Set(activeProductions.flatMap(p=>p[1]));
  const phraseTerminals=new Set(Object.entries(roles).filter(([terminal,r])=>usedTerminals.has('t:'+terminal) && ['place-name','nominal-phrase','significance-expression'].includes(r[0])).map(([t])=>'t:'+t));
  const localProductions=activeProductions.map(p=>[p[0],p[1].map(t=>phraseTerminals.has(t)?'lex:'+t:t),p[2],p[3]]);
  for(const terminal of phraseTerminals) for(const [spelling,index] of lexicons.get(terminal.slice(2))) {
    localProductions.push(['lex:'+terminal,tokenize(spelling).map(w=>'t:='+w),()=>({value:BigInt(index)}),undefined]);
  }
  const localByLeft=new Map();
  localProductions.forEach((p,id)=>{if(!localByLeft.has(p[0]))localByLeft.set(p[0],[]);localByLeft.get(p[0]).push(id);});
  // Empty phrase pools have no productions but remain valid unavailable roles.
  for(const terminal of phraseTerminals)if(!localByLeft.has('lex:'+terminal))localByLeft.set('lex:'+terminal,[]);
  const availableLiterals = new Set([...literals].filter(text => !['the','and'].includes(text) || vocabulary.entries.some(e => e.text===text && e.roles.some(r => ['determiner','conjunction'].includes(r)))));
  if (!(pools.get('person-name').length || pools.get('mass-noun').length ||
      pools.get('count-noun').length || vocabulary.entries.some(e=>e.roles.includes('finite-pronoun'))) ||
      !(pools.get('past-transitive-verb').length || pools.get('past-intransitive-verb').length || vocabulary.entries.some(e=>e.roles.includes('framed-verb')))) {
    throw new Error('Vocabulary cannot produce a complete note.');
  }
  const surfaceWords = new Set(vocabulary.entries.flatMap(entry =>
    [entry.text, ...Object.values(entry.forms || {}), ...(entry.roles.some(r=>['place-name','nominal-phrase','significance-expression'].includes(r))?[entry.text,...Object.values(entry.forms||{})].flatMap(tokenize):[])]));
  return { profile, vocabulary, pools, lexicons, productions:localProductions, byLeft:localByLeft, literals: availableLiterals, surfaceWords: new Set([...surfaceWords,...availableLiterals,...Object.entries(numericFormats).filter(([mode])=>/Word|cardinal/.test(mode)).flatMap(([,format])=>Array.from({length:format.size},(_,i)=>format.render(i)))]) };
}

function terminalMatch(grammar, terminal, text) {
  const id = terminal.slice(2);
  if(id.startsWith('=')) return text===id.slice(1)?{literal:text}:null;
  if (literalTerminals[id]) return text === literalTerminals[id] && grammar.literals.has(text) ? {literal:text} : null;
  if (id === 'period' || id === 'comma') return text === (id === 'period' ? '.' : ',') ? { literal: text } : null;
  if (id === 'the' || id === 'and') return grammar.literals.has(id) && text === id ? { literal: id } : null;
  if (numericRules[id] !== undefined) {
    const rule=rules[numericRules[id]];
    if(rule.numeric.startsWith('format:')) {
      const value=numericFormats[rule.numeric.slice(7)].parse(text);
      return value===null?null:{rule:rule.id,category:0n,value:BigInt(value),children:[]};
    }
    if (!integerToken(text) || (rule.numeric!=='any' && (text === '1') !== (id === 'one-fixed'))) return null;
    const mode=rules[numericRules[id]].numeric, value=BigInt(text), base=categoryFor(value);
    const category=quantityCategory(base.id,mode);
    return {rule:numericRules[id],category:category.id,value:value-category.lo-(category.excludesOne && value>=2n?1n:0n),children:[]};
  }
  if (id === 'one' || id === 'other-number') {
    if (!integerToken(text) || (text === '1') !== (id === 'one')) return null;
    const value = BigInt(text), category = categoryFor(value);
    return { rule: 12, category: category.id, value: value - category.lo, children: [] };
  }
  const index = grammar.lexicons.get(id).get(text);
  return index === undefined ? null : { value: BigInt(index) };
}

// Earley chart recognition with one shared backpointer derivation per state.
// Competing states survive until the rest of the text resolves attachment.
// No recursive function calls or fixed input-length threshold are used.
// Immutable grammar instances own bounded recognition caches. Draft analysis
// asks about the same committed prefixes for every character; their complete
// derivations and frontiers are independent of the unfinished next word.
const chartCaches = new WeakMap();
function parseChart(grammar, tokens, spacing) {
  let cache=chartCaches.get(grammar);
  if(!cache){cache=new Map();chartCaches.set(grammar,cache);}
  const key=JSON.stringify(spacing ? [tokens,spacing] : tokens);
  if(cache.has(key)) {const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  const result=recognizeChart(grammar,tokens,spacing);
  cache.set(key,result);
  if(cache.size>512) cache.delete(cache.keys().next().value);
  return result;
}
function recognizeChart(grammar, tokens, spacing) {
  const {productions,byLeft}=grammar;
  const column = () => ({ states: [], seen: new Map(), waiting: new Map(), nullable: new Map() });
  const charts = [column()];
  const stats = { states:0, mergedStates:0, maxColumnStates:0, tokens:tokens.length };
  const add = (col, p, dot, start, previous = null, child = null) => {
    const key = `${p}:${dot}:${start}`;
    if (col.seen.has(key)) { stats.mergedStates++; return; }
    const state = { p, dot, start, previous, child };
    col.seen.set(key, state); col.states.push(state); stats.states++;
    stats.maxColumnStates=Math.max(stats.maxColumnStates,col.states.length);
  };
  for (const p of byLeft.get('ROOT')) add(charts[0], p, 0, 0);
  const frontier = new Set(), preferred=new Map();
  let complete;
  for (let pos = 0; pos <= tokens.length; pos++) {
    const col = charts[pos];
    if (!col || !col.states.length) return { complete: null, frontier: new Set(), stats };
    const matches = new Map();
    for (let cursor = 0; cursor < col.states.length; cursor++) {
      const state = col.states[cursor], [lhs, rhs, action] = productions[state.p];
      if (state.dot === rhs.length) {
        const children = new Array(rhs.length);
        let link = state;
        for (let i = children.length - 1; i >= 0; i--) { children[i] = link.child; link = link.previous; }
        const tree = action(children);
        if(tree.rule!==undefined && tree.start===undefined){tree.start=state.start;tree.end=pos;}
        if(tree.rule!==undefined && rules[tree.rule].preferred) {
          const key=`${rules[tree.rule].result}:${state.start}:${pos}`;
          if(!preferred.has(key))preferred.set(key,tree);
        }
        if (lhs === 'ROOT' && pos === tokens.length) complete ??= tree;
        if (state.start === pos) col.nullable.set(lhs, tree);
        for (const parent of charts[state.start].waiting.get(lhs) || []) {
          add(col, parent.p, parent.dot + 1, parent.start, parent, tree);
        }
      } else {
        const symbol = rhs[state.dot];
        if (symbol.startsWith('t:')) {
          if (pos === tokens.length) frontier.add(symbol);
          else {
            if (!matches.has(symbol)) matches.set(symbol, terminalMatch(grammar, symbol, tokens[pos]));
            const child = matches.get(symbol);
            const requiredSpacing=productions[state.p][3]?.[state.dot];
            if (child && (spacing===undefined || requiredSpacing==null || requiredSpacing===spacing[pos])) {
              charts[pos + 1] ??= column();
              add(charts[pos + 1], state.p, state.dot + 1, state.start, state, child);
            }
          }
        } else {
          if (!col.waiting.has(symbol)) col.waiting.set(symbol, []);
          col.waiting.get(symbol).push(state);
          for (const p of byLeft.get(symbol)) add(col, p, 0, pos);
          if (col.nullable.has(symbol)) add(col, state.p, state.dot + 1, state.start, state, col.nullable.get(symbol));
        }
      }
    }
  }
  return { complete, frontier, stats, preferred };
}

export function inspectParse(grammar,text) {
  const { complete,stats }=parseChart(grammar,tokenize(text));
  return {...stats,complete:!!complete};
}

export function parseNote(grammar, text) {
  if (typeof text !== 'string') throw new Error('Note must be text.');
  const canonicalText=canonicalize(text),matches=tokenMatches(canonicalText),tokens=matches.map(match=>match[0]);
  const spacing=matches.map((match,i)=>i>0 && matches[i-1].index+matches[i-1][0].length===match.index);
  if (!tokens.length) throw new Error('Enter a note.');
  const { complete,preferred } = parseChart(grammar, tokens, spacing);
  if (!complete) throw new Error('Note is outside the vocabulary or grammar.');
  const layout = [], values = [], stack = [complete];
  while (stack.length) {
    let current = stack.pop();
    if(current.rule!==undefined)current=preferred?.get(`${rules[current.rule].result}:${current.start}:${current.end}`)||current;
    if(current.rule!==undefined && current.start!==undefined) {
      const result=rules[current.rule].result;
      // Only complete, singular referents in compatible contexts are lifted.
      // Counted nouns, mass-only slots, articles and pronoun cases stay typed.
      const eligible=result==='N_s' || (result==='NP' && [2,3,4].includes(current.rule)) || (result==='THIRD_SUBJECT' && [56,57,58].includes(current.rule));
      if(eligible && current.end>current.start) {
        const start=matches[current.start].index,last=matches[current.end-1];
        const spelling=canonicalText.slice(start,last.index+last[0].length);
        const value=grammar.lexicons.get('singular_nominal').get(spelling);
        if(value!==undefined)current={rule:nominalChoiceRules[result],children:[{value:BigInt(value)}]};
      }
    }
    if (current.rule === undefined) values.push(current.value);
    else {
      putVarint(layout, current.rule);
      if (rules[current.rule].numeric) { putVarint(layout, current.category); values.push(current.value); }
      for (let i = current.children.length - 1; i >= 0; i--) stack.push(current.children[i]);
    }
  }
  return { layout: Uint8Array.from(layout), values };
}

const suggestionCaches=new WeakMap();
export function suggestNext(grammar, committed = [], prefix = '') {
  let cache=suggestionCaches.get(grammar);
  if(!cache){cache=new Map();suggestionCaches.set(grammar,cache);}
  const key=JSON.stringify([committed,prefix]);
  if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return value;}
  const value=computeSuggestions(grammar,committed,prefix);
  Object.freeze(value.words);Object.freeze(value);cache.set(key,value);
  if(cache.size>2048)cache.delete(cache.keys().next().value);
  return value;
}
function computeSuggestions(grammar, committed, prefix) {
  if (!Array.isArray(committed) || committed.some(t => typeof t !== 'string') || typeof prefix !== 'string') {
    throw new Error('Invalid composer tokens.');
  }
  const { complete, frontier } = parseChart(grammar, committed), words = new Set();
  let numberAllowed = false, numberCandidate = null, numberPrefixAllowed = false;
  for (const term of frontier) {
    const id = term.slice(2);
    if (id === 'one' || id === 'other-number' || numericRules[id] !== undefined) {
      const mode=rules[numericRules[id]]?.numeric;
      if(mode?.startsWith('format:') && /Word|cardinal/.test(mode)) {
        const format=numericFormats[mode.slice(7)];
        for(let value=0;value<format.size;value++) {const text=format.render(value);if(text.startsWith(prefix)) words.add(text);}
      } else {
        numberAllowed = true;
        numberPrefixAllowed ||= mode?.startsWith('format:') ? numericPrefix(mode.slice(7),prefix) : /^(?:0|[1-9][0-9]*)?$/.test(prefix);
      }
      if (terminalMatch(grammar, term, prefix)) numberCandidate = prefix;
    } else if (id.startsWith('=')) {
      const word=id.slice(1);if(word.startsWith(prefix))words.add(word);
    } else if (literalTerminals[id]) {
      const mark = literalTerminals[id];
      if (grammar.literals.has(mark) && mark.startsWith(prefix)) words.add(mark);
    } else if (id === 'comma' || id === 'period') {
      const mark = id === 'comma' ? ',' : '.';
      if (mark.startsWith(prefix)) words.add(mark);
    } else if (id === 'the' || id === 'and') {
      if (grammar.literals.has(id) && id.startsWith(prefix)) words.add(id);
    } else for (const word of grammar.lexicons.get(id).keys()) if (word.startsWith(prefix)) words.add(word);
  }
  return { words: [...words].sort(), numberAllowed, numberCandidate, numberPrefixAllowed, complete: !!complete };
}

// Validate and compile an arbitrary finite layout before interpreting a key.
export function compileLayout(grammar, layout, availableBytes) {
  const reader = new ByteReader(layout), stack = [{ symbol: 'ROOT' }], items = [], slots = [];
  let requiredBytes = 0n;
  while (stack.length) {
    const expected = stack.pop();
    if (expected.literal) {
      if (!grammar.literals.has(expected.literal)) throw new Error('Layout requires a missing grammatical word.');
      items.push({ literal: expected.literal, joinRight:expected.joinRight, joinLeft:expected.joinLeft }); continue;
    }
    if (expected.role) {
      const entries = grammar.pools.get(expected.role);
      if (!entries?.length) throw new Error('Layout requires an empty vocabulary role.');
      const slot = { ...expected, entries, size: BigInt(entries.length), index: slots.length };
      requiredBytes += BigInt(byteWidth(slot.size)); slots.push(slot); items.push(slot); continue;
    }
    const id = reader.varint();
    const rule = rules[Number(id)];
    if (!rule || rule.result !== expected.symbol) throw new Error(`Invalid grammar production in layout: ${id} produces ${rule?.result}, expected ${expected.symbol}.`);
    let expansion = rule.expansion;
    if (Number(id) === 5) {
      const quantity = {};
      expansion = expansion.map(item => item.quantity ? { ...item, quantity } : item);
    }
    if (rule.numeric) {
      const categoryId=reader.varint();
      const category = rule.numeric.startsWith('format:') ? formatCategory(rule.numeric.slice(7),categoryId) : quantityCategory(categoryId,rule.numeric,availableBytes);
      const slot = { category, size: category.size, index: slots.length };
      if (Number(id) === 12 && !expected.quantity) throw new Error('Number requires a quantity dependency.');
      if (expected.quantity) expected.quantity.index = slot.index;
      requiredBytes += BigInt(byteWidth(slot.size)); slots.push(slot); items.push(slot);
    }
    for (let i = expansion.length - 1; i >= 0; i--) stack.push(expansion[i]);
  }
  if (reader.remaining) throw new Error('Trailing layout records.');
  if (availableBytes !== undefined && requiredBytes !== BigInt(availableBytes)) throw new Error('Incorrect semantic body length.');
  return { layout, slots, items, requiredBytes };
}

export function renderPlan(plan, values) {
  const tokens = [];
  let attachNext=false;
  const append=(text,joinLeft=false)=>{ if((attachNext || joinLeft) && tokens.length) tokens[tokens.length-1]+=text; else tokens.push(text);attachNext=false; };
  for (const item of plan.items) {
    if (item.literal) {
      if (closingPunctuation(item.literal) || item.joinLeft) tokens[tokens.length - 1] += item.literal;
      else append(item.literal);
      attachNext=!!item.joinRight;
      continue;
    }
    const value = values[item.index];
    if (typeof value !== 'bigint' || value < 0n || value >= item.size) throw new Error('Semantic value outside its domain.');
    if (item.category) append(item.category.format ? renderNumber(item.category,value) : String(numberValue(item.category, value)),item.joinLeft);
    else {
      const entry = item.entries[Number(value)];
      let form = item.form;
      if (form === 'quantity') {
        const index = item.quantity.index;
        form = numberValue(plan.slots[index].category, values[index]) === 1n ? 'singular' : 'plural';
      }
      append(form === 'text' ? entry.text : entry.forms[form],item.joinLeft);
    }
  }
  return tokens.join(' ');
}
