import {extendProductiveGrammar} from './productive-grammar.js';
import dependencyGrammar from './dependency-grammar-data.js';
export const roles = {
  name: ['person-name', 'text'], mass: ['mass-noun', 'text'],
  singular: ['count-noun', 'singular'], plural: ['count-noun', 'plural'],
  adjective: ['adjective', 'text'], intransitive: ['past-intransitive-verb', 'text'],
  transitive: ['past-transitive-verb', 'text'],
  subjectPronoun: ['subject-pronoun', 'text'], objectPronoun: ['object-pronoun', 'text'],
  greeting: ['greeting', 'text'], vocative: ['vocative', 'text'],
  salutation: ['salutation', 'text'], timeOfDay: ['time-of-day', 'text'],
  basePronoun: ['present-base-pronoun', 'text'],
  thirdPronoun: ['present-third-pronoun', 'text'],
  presentIntransitiveBase: ['present-intransitive-verb', 'base'],
  presentIntransitiveThird: ['present-intransitive-verb', 'third'],
  presentTransitiveBase: ['present-transitive-verb', 'base'],
  presentTransitiveThird: ['present-transitive-verb', 'third'],
};

const word = (role, form = 'text', quantity = null) => ({ role, form, quantity });
export const rules = [
  { id: 0, result: "S", parse: [{"lhs": "C", "rhs": ["SUBJECT", "VP"], "priority": 4}], expansion: [{ symbol: 'SUBJECT' }, { symbol: 'VP' }] },
  { id: 1, result: "S", parse: [{"lhs": "S", "rhs": ["S", "t:and", "C"], "priority": 2}], expansion: [{ symbol: 'S' }, { literal: 'and' }, { symbol: 'S' }] },
  { id: 2, result: "NP", parse: [{"lhs": "A", "rhs": ["t:name"], "priority": 19}], expansion: [word('person-name')] },
  { id: 3, result: "NP", parse: [{"lhs": "A", "rhs": ["t:mass"], "priority": 19}], expansion: [word('mass-noun')] },
  { id: 4, result: "NP", parse: [{"lhs": "A", "rhs": ["t:the", "ADJS", "t:singular"], "priority": 20}], expansion: [{ literal: 'the' }, { symbol: 'ADJS' }, word('count-noun', 'singular')] },
  { id: 5, result: "NP", parse: [{"lhs": "A", "rhs": ["t:one", "ADJS", "t:singular"], "priority": 21}, {"lhs": "A", "rhs": ["t:other-number", "ADJS", "t:plural"], "priority": 22}], expansion: [{ symbol: 'NUMBER', quantity: true }, { symbol: 'ADJS' }, word('count-noun', 'quantity', true)] },
  { id: 6, result: "NP", parse: [{"lhs": "NP", "rhs": ["NP", "t:and", "A"], "priority": 17}], expansion: [{ symbol: 'NP' }, { literal: 'and' }, { symbol: 'NP' }] },
  { id: 7, result: "VP", parse: [{"lhs": "V", "rhs": ["t:intransitive"], "priority": 25}], expansion: [word('past-intransitive-verb')] },
  { id: 8, result: "VP", parse: [{"lhs": "V", "rhs": ["t:transitive", "OBJECT"], "priority": 26}], expansion: [word('past-transitive-verb'), { symbol: 'OBJECT' }] },
  { id: 9, result: "VP", parse: [{"lhs": "VP", "rhs": ["VP", "t:and", "V"], "priority": 23}], expansion: [{ symbol: 'VP' }, { literal: 'and' }, { symbol: 'VP' }] },
  { id: 10, result: "ADJS", parse: [{lhs:"ADJS",rhs:[],priority:32}], expansion: [] },
  { id: 11, result: "ADJS", parse: [{"lhs": "ADJS", "rhs": ["ADJS", "t:adjective"], "priority": 28}], expansion: [{ symbol: 'ADJS' }, word('adjective')] },
  { id: 12, result: "NUMBER", parse: [], expansion: [] },
  { id: 13, result: "S", parse: [{"lhs": "S", "rhs": ["S", "t:comma", "t:and", "C"], "priority": 3}], expansion: [{ symbol: 'S' }, { literal: ',' }, { literal: 'and' }, { symbol: 'S' }] },
  { id: 14, result: "NP", parse: [{"lhs": "NP", "rhs": ["NP", "t:comma", "t:and", "A"], "priority": 18}], expansion: [{ symbol: 'NP' }, { literal: ',' }, { literal: 'and' }, { symbol: 'NP' }] },
  { id: 15, result: "VP", parse: [{"lhs": "VP", "rhs": ["VP", "t:comma", "t:and", "V"], "priority": 24}], expansion: [{ symbol: 'VP' }, { literal: ',' }, { literal: 'and' }, { symbol: 'VP' }] },
  { id: 16, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["S", "t:period"], "priority": 1}], expansion: [{ symbol: 'S' }, { literal: '.' }] },
  { id: 17, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["S"], "priority": 0}], expansion: [{ symbol: 'S' }] },
  { id: 18, result: "SUBJECT", parse: [{"lhs": "SUBJECT_ATOM", "rhs": ["NP"], "priority": 10}], expansion: [{ symbol: 'NP' }] },
  { id: 19, result: "SUBJECT", parse: [{"lhs": "SUBJECT_ATOM", "rhs": ["t:subjectPronoun"], "priority": 11}], expansion: [word('subject-pronoun')] },
  { id: 20, result: "SUBJECT", parse: [{"lhs": "SUBJECT", "rhs": ["SUBJECT", "t:and", "SUBJECT_ATOM"], "priority": 8}], expansion: [{ symbol: 'SUBJECT' }, { literal: 'and' }, { symbol: 'SUBJECT' }] },
  { id: 21, result: "SUBJECT", parse: [{"lhs": "SUBJECT", "rhs": ["SUBJECT", "t:comma", "t:and", "SUBJECT_ATOM"], "priority": 9}], expansion: [{ symbol: 'SUBJECT' }, { literal: ',' }, { literal: 'and' }, { symbol: 'SUBJECT' }] },
  { id: 22, result: "OBJECT", parse: [{"lhs": "OBJECT_ATOM", "rhs": ["NP"], "priority": 15}], expansion: [{ symbol: 'NP' }] },
  { id: 23, result: "OBJECT", parse: [{"lhs": "OBJECT_ATOM", "rhs": ["t:objectPronoun"], "priority": 16}], expansion: [word('object-pronoun')] },
  { id: 24, result: "OBJECT", parse: [{"lhs": "OBJECT", "rhs": ["OBJECT", "t:and", "OBJECT_ATOM"], "priority": 13}], expansion: [{ symbol: 'OBJECT' }, { literal: 'and' }, { symbol: 'OBJECT' }] },
  { id: 25, result: "OBJECT", parse: [{"lhs": "OBJECT", "rhs": ["OBJECT", "t:comma", "t:and", "OBJECT_ATOM"], "priority": 14}], expansion: [{ symbol: 'OBJECT' }, { literal: ',' }, { literal: 'and' }, { symbol: 'OBJECT' }] },
  { id: 26, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["t:greeting"], "priority": 29}], expansion: [word('greeting')] },
  { id: 27, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["t:greeting", "t:period"], "priority": 30}], expansion: [word('greeting'), { literal: '.' }] },
  { id: 28, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["t:greeting", "t:vocative"], "priority": 31}], expansion: [word('greeting'), word('vocative')] },
  { id: 29, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["t:greeting", "t:comma", "t:vocative"], "priority": 32}], expansion: [word('greeting'), { literal: ',' }, word('vocative')] },
  { id: 30, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["t:greeting", "t:vocative", "t:period"], "priority": 33}], expansion: [word('greeting'), word('vocative'), { literal: '.' }] },
  { id: 31, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["t:greeting", "t:comma", "t:vocative", "t:period"], "priority": 34}], expansion: [word('greeting'), { literal: ',' }, word('vocative'), { literal: '.' }] },
  { id: 32, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["t:vocative", "t:comma", "S"], "priority": 35}], expansion: [word('vocative'), { literal: ',' }, { symbol: 'S' }] },
  { id: 33, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["t:vocative", "t:comma", "S", "t:period"], "priority": 36}], expansion: [word('vocative'), { literal: ',' }, { symbol: 'S' }, { literal: '.' }] },
  { id: 34, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["DOC"], "priority": 37}], expansion: [{ symbol: 'DOC' }] },
  { id: 35, result: "ROOT", parse: [{"lhs": "ROOT", "rhs": ["DOC", "t:period"], "priority": 38}], expansion: [{ symbol: 'DOC' }, { literal: '.' }] },
  { id: 36, result: "DOC", parse: [{"lhs": "DOC", "rhs": ["UTTERANCE"], "priority": 39}], expansion: [{ symbol: 'UTTERANCE' }] },
  { id: 37, result: "DOC", parse: [{"lhs": "DOC", "rhs": ["DOC", "t:period", "UTTERANCE"], "priority": 40}], expansion: [{ symbol: 'DOC' }, { literal: '.' }, { symbol: 'UTTERANCE' }] },
  { id: 38, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["S"], "priority": 41}], expansion: [{ symbol: 'S' }] },
  { id: 39, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:greeting"], "priority": 42}], expansion: [word('greeting')] },
  { id: 40, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:greeting", "t:vocative"], "priority": 43}], expansion: [word('greeting'), word('vocative')] },
  { id: 41, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:greeting", "t:comma", "t:vocative"], "priority": 44}], expansion: [word('greeting'), { literal: ',' }, word('vocative')] },
  { id: 42, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:vocative", "t:comma", "S"], "priority": 45}], expansion: [word('vocative'), { literal: ',' }, { symbol: 'S' }] },
  { id: 43, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:salutation", "t:timeOfDay"], "priority": 46}], expansion: [word('salutation'), word('time-of-day')] },
  { id: 44, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:greeting", "t:salutation", "t:timeOfDay"], "priority": 47}], expansion: [word('greeting'), word('salutation'), word('time-of-day')] },
  { id: 45, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:greeting", "t:comma", "t:salutation", "t:timeOfDay"], "priority": 48}], expansion: [word('greeting'), { literal: ',' }, word('salutation'), word('time-of-day')] },
  { id: 46, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:salutation", "t:timeOfDay", "t:vocative"], "priority": 49}], expansion: [word('salutation'), word('time-of-day'), word('vocative')] },
  { id: 47, result: "UTTERANCE", parse: [{"lhs": "UTTERANCE", "rhs": ["t:salutation", "t:timeOfDay", "t:comma", "t:vocative"], "priority": 50}], expansion: [word('salutation'), word('time-of-day'), { literal: ',' }, word('vocative')] },
  { id: 48, result: "S", parse: [{"lhs": "C", "rhs": ["BASE_SUBJECT", "BASE_VP"], "priority": 5}], expansion: [{ symbol: 'BASE_SUBJECT' }, { symbol: 'BASE_VP' }] },
  { id: 49, result: "S", parse: [{"lhs": "C", "rhs": ["THIRD_SUBJECT", "THIRD_VP"], "priority": 6}], expansion: [{ symbol: 'THIRD_SUBJECT' }, { symbol: 'THIRD_VP' }] },
  { id: 50, result: "BASE_SUBJECT", parse: [{"lhs": "BASE_SUBJECT", "rhs": ["t:basePronoun"], "priority": 51}], expansion: [word('present-base-pronoun')] },
  { id: 51, result: "BASE_SUBJECT", parse: [{"lhs": "BASE_SUBJECT", "rhs": ["t:the", "ADJS", "t:plural"], "priority": 52}], expansion: [{ literal: 'the' }, { symbol: 'ADJS' }, word('count-noun', 'plural')] },
  { id: 52, result: "BASE_SUBJECT", parse: [{"lhs": "BASE_SUBJECT", "rhs": ["THIRD_SUBJECT", "t:and", "THIRD_SUBJECT"], "priority": 53}], expansion: [{ symbol: 'THIRD_SUBJECT' }, { literal: 'and' }, { symbol: 'THIRD_SUBJECT' }] },
  { id: 53, result: "BASE_SUBJECT", parse: [{"lhs": "BASE_SUBJECT", "rhs": ["BASE_SUBJECT", "t:and", "THIRD_SUBJECT"], "priority": 54}], expansion: [{ symbol: 'BASE_SUBJECT' }, { literal: 'and' }, { symbol: 'THIRD_SUBJECT' }] },
  { id: 54, result: "BASE_SUBJECT", parse: [{"lhs": "BASE_SUBJECT", "rhs": ["THIRD_SUBJECT", "t:and", "BASE_SUBJECT"], "priority": 55}], expansion: [{ symbol: 'THIRD_SUBJECT' }, { literal: 'and' }, { symbol: 'BASE_SUBJECT' }] },
  { id: 55, result: "THIRD_SUBJECT", parse: [{"lhs": "THIRD_SUBJECT", "rhs": ["t:thirdPronoun"], "priority": 56}], expansion: [word('present-third-pronoun')] },
  { id: 56, result: "THIRD_SUBJECT", parse: [{"lhs": "THIRD_SUBJECT", "rhs": ["t:name"], "priority": 57}], expansion: [word('person-name')] },
  { id: 57, result: "THIRD_SUBJECT", parse: [{"lhs": "THIRD_SUBJECT", "rhs": ["t:mass"], "priority": 58}], expansion: [word('mass-noun')] },
  { id: 58, result: "THIRD_SUBJECT", parse: [{"lhs": "THIRD_SUBJECT", "rhs": ["t:the", "ADJS", "t:singular"], "priority": 59}], expansion: [{ literal: 'the' }, { symbol: 'ADJS' }, word('count-noun', 'singular')] },
  { id: 59, result: "BASE_VP", parse: [{"lhs": "BASE_VP", "rhs": ["t:presentIntransitiveBase"], "priority": 60}], expansion: [word('present-intransitive-verb', 'base')] },
  { id: 60, result: "BASE_VP", parse: [{"lhs": "BASE_VP", "rhs": ["t:presentTransitiveBase", "OBJECT"], "priority": 61}], expansion: [word('present-transitive-verb', 'base'), { symbol: 'OBJECT' }] },
  { id: 61, result: "BASE_VP", parse: [{"lhs": "BASE_VP", "rhs": ["BASE_VP", "t:and", "BASE_VP"], "priority": 62}], expansion: [{ symbol: 'BASE_VP' }, { literal: 'and' }, { symbol: 'BASE_VP' }] },
  { id: 62, result: "THIRD_VP", parse: [{"lhs": "THIRD_VP", "rhs": ["t:presentIntransitiveThird"], "priority": 63}], expansion: [word('present-intransitive-verb', 'third')] },
  { id: 63, result: "THIRD_VP", parse: [{"lhs": "THIRD_VP", "rhs": ["t:presentTransitiveThird", "OBJECT"], "priority": 64}], expansion: [word('present-transitive-verb', 'third'), { symbol: 'OBJECT' }] },
  { id: 64, result: "THIRD_VP", parse: [{"lhs": "THIRD_VP", "rhs": ["THIRD_VP", "t:and", "THIRD_VP"], "priority": 65}], expansion: [{ symbol: 'THIRD_VP' }, { literal: 'and' }, { symbol: 'THIRD_VP' }] },
];
export const aliases = [
  {
    "lhs": "S",
    "rhs": [
      "C"
    ],
    "priority": 2
  },
  {
    "lhs": "SUBJECT",
    "rhs": [
      "SUBJECT_ATOM"
    ],
    "priority": 7
  },
  {
    "lhs": "OBJECT",
    "rhs": [
      "OBJECT_ATOM"
    ],
    "priority": 12
  },
  {
    "lhs": "NP",
    "rhs": [
      "A"
    ],
    "priority": 17
  },
  {
    "lhs": "VP",
    "rhs": [
      "V"
    ],
    "priority": 23
  }
];

// Feature-specialized symbols make agreement public in the stored layout.
// Each mapped lexical pool satisfies the features of its surrounding rule.
const symbol = symbol => ({ symbol });
const literal = literal => ({ literal });
const lex = (name, sourceRole, form = 'text', features = {}) => {
  roles[name] = [sourceRole, form, features];
  return word(name, form);
};
const define = (lhs, expansion) => {
  const id = rules.length;
  const rhs = expansion.map(item => (item.parseSymbol || item.symbol) || `t:${item.literal ? '@'+item.literal : item.role}`);
  rules.push({ id, result: lhs, parse: [{ lhs, rhs, priority: 1000+id }], expansion });
};
const S = symbol, L = literal;
// General noun phrases carry countability and number; case remains a property
// of the pronoun pool, rather than guessed from a word's spelling.
const singularNoun = lex('noun_s', 'count-noun', 'singular');
const pluralNoun = lex('noun_p', 'count-noun', 'plural');
const massNoun = lex('noun_m', 'mass-noun');
const name = lex('proper_name','person-name');
const adjective = lex('modifier','adjective');
define('N_s', [name]);
define('N_m', [massNoun]);
define('N_p', [pluralNoun]);
for (const [feature,noun] of [['s',singularNoun],['p',pluralNoun],['m',massNoun]]) {
  for (const determiner of ['the','my','your','his','her','its','our','their',
    ...(feature==='s'?['this','that','each','every']:feature==='p'?['these','those','some','any','no','many','several']:['some','any','no','much'])]) {
    define(`N_${feature}`, [L(determiner), S('ADJS'), noun]);
  }
  // A wrapper is stored explicitly: passing through a different feature symbol
  // without a record would allow malformed layouts to bypass type checking.
  define('NP', [S(`N_${feature}`)]);
}
for (const [article,onset] of [['a','consonant'],['an','vowel']]) {
  define('N_s',[L(article),lex(`article_noun_${onset}`,'count-noun','singular',{onset})]);
  define('N_s',[L(article),lex(`article_adj_${onset}`,'adjective','text',{onset}), S('ADJS'),singularNoun]);
}
for (const form of ['this','that']) define('N_s',[L(form)]);
for (const form of ['these','those']) define('N_p',[L(form)]);
const features = {
  i: {present:'am',past:'was',have:'have',do:'do'},
  you: {present:'are',past:'were',have:'have',do:'do'},
  sg: {present:'is',past:'was',have:'has',do:'does'},
  pl: {present:'are',past:'were',have:'have',do:'do'},
};
for (const agreement of Object.keys(features)) define(`SUB_${agreement}`, [lex(`pronoun_${agreement}`,'finite-pronoun','text',{agreement})]);
define('SUB_sg',[S('N_s')]); define('SUB_sg',[S('N_m')]); define('SUB_pl',[S('N_p')]);
for (const agreement of Object.keys(features)) define('ANY_SUB',[S(`SUB_${agreement}`)]);
define('SUB_pl',[S('ANY_SUB'),L('and'),S('ANY_SUB')]);
// Predicative adjective senses are reviewed separately from attributive senses.
define('PRED',[lex('predicative','predicate-adjective')]);
define('PRED',[S('NP')]);
for (const possessive of ['mine','yours','his','hers','ours','theirs']) define('PRED',[L(possessive)]);
// The simple prepositional modifier family is separate from required verb
// complements; adding a word to this pool cannot invent a new verb frame.
for (const preposition of ['in','on','at','near','with','from','to','for','by','after','before','under','over','about','without']) {
  define('PP',[L(preposition),S('OBJECT')]);
}
define('PRED',[S('PP')]);
define('MODS',[]); define('MODS',[S('MODS'),S('PP')]);
// Frames select complete verb-complement units, reused at every inflection.
for (const form of ['base','third','past','participle','gerund']) {
  for (const frame of ['intransitive','transitive']) {
    const verb = lex(`verb_${frame}_${form}`,'framed-verb',form,{frame,...(form==='gerund'?{progressive:true}:{})});
    define(`V_${form}`, [verb,...(frame==='transitive'?[S('OBJECT')]:[])]);
  }
  define(`V_${form}`,[S(`V_${form}`),L('and'),S(`V_${form}`)]);
}
for (const [agreement,f] of Object.entries(features)) {
  const sub=S(`SUB_${agreement}`);
  for (const form of [agreement==='sg'?'third':'base','past']) define(`FINITE_${agreement}`,[S(`V_${form}`)]);
  for (const tense of ['present','past']) {
    for (const negative of [false,true]) {
      const be = [L(f[tense]),...(negative?[L('not')]:[])];
      define(`FINITE_${agreement}`,[...be,S('PRED')]);
      define(`FINITE_${agreement}`,[...be,S('V_gerund')]);
      define('QUESTION',[L(f[tense]),sub,...(negative?[L('not')]:[]),S('PRED'),S('MODS')]);
      define('QUESTION',[L(f[tense]),sub,...(negative?[L('not')]:[]),S('V_gerund'),S('MODS')]);
    }
  }
  for (const auxiliary of [f.have,'had']) for (const negative of [false,true]) {
    const aux=[L(auxiliary),...(negative?[L('not')]:[])];
    define(`FINITE_${agreement}`,[...aux,S('V_participle')]);
    define(`FINITE_${agreement}`,[...aux,L('been'),S('V_gerund')]);
    define(`FINITE_${agreement}`,[...aux,L('been'),S('PRED')]);
    define('QUESTION',[L(auxiliary),sub,...(negative?[L('not')]:[]),S('V_participle'),S('MODS')]);
  }
  for (const auxiliary of [f.do,'did']) {
    define(`FINITE_${agreement}`,[L(auxiliary),L('not'),S('V_base')]);
    define('QUESTION',[L(auxiliary),sub,S('V_base'),S('MODS')]);
    define('QUESTION',[L(auxiliary),sub,L('not'),S('V_base'),S('MODS')]);
    const contraction = auxiliary==='does'?"doesn't":auxiliary==='did'?"didn't":"don't";
    define(`FINITE_${agreement}`,[L(contraction),S('V_base')]);
    define('QUESTION',[L(contraction),sub,S('V_base'),S('MODS')]);
  }
  for (const auxiliary of ['will','would','can','could','may','might','must','should']) {
    for (const negative of [false,true]) {
      const aux=[L(auxiliary),...(negative?[L('not')]:[])];
      define(`FINITE_${agreement}`,[...aux,S('V_base')]);
      define(`FINITE_${agreement}`,[...aux,L('be'),S('PRED')]);
      define(`FINITE_${agreement}`,[...aux,L('be'),S('V_gerund')]);
      define(`FINITE_${agreement}`,[...aux,L('have'),S('V_participle')]);
      define('QUESTION',[L(auxiliary),sub,...(negative?[L('not')]:[]),S('V_base'),S('MODS')]);
    }
  }
  define('S',[sub,S(`FINITE_${agreement}`),S('MODS')]);
  // Explicit contraction spelling is public and recovers exactly, including
  // straight/curly apostrophe variants. No post-decoding agreement repair.
  const contractions = agreement==='i'?[["i'm",'present'],["i’ve",'perfect'],["i've",'perfect']]:
    agreement==='you'?[["you're",'present'],["you've",'perfect']]:
    agreement==='sg'?[["he's",'present'],["she's",'present'],["it's",'present']]:[["we're",'present'],["they're",'present'],["we've",'perfect'],["they've",'perfect']];
  for(const [spelling,kind] of contractions) for(const suffix of kind==='perfect'?['V_participle']:['PRED','V_gerund']) {
    define('S',[L(spelling),S(suffix),S('MODS')]);
    if(spelling.includes("'")) define('S',[L(spelling.replace("'",'’')),S(suffix),S('MODS')]);
  }
}
for(const [number,be] of [['s','is'],['p','are'],['m','is']]) {
  define('S',[L('there'),L(be),S(`N_${number}`),S('MODS')]);
  define('QUESTION',[L(be),L('there'),S(`N_${number}`),S('MODS')]);
}
define('S',[S('V_base'),S('MODS')]);
define('S',[L('please'),S('V_base'),S('MODS')]);
define('S',[L('do'),L('not'),S('V_base'),S('MODS')]);
define('S',[L("don't"),S('V_base'),S('MODS')]);
for (const wh of ['when','where','why','how']) define('QUESTION',[L(wh),S('QUESTION')]);
// Utterances can end and continue with mixed punctuation. Question marks are
// confined to interrogatives; statements/commands retain period/exclamation.
define('UTTERANCE',[S('QUESTION')]);
define('DOC',[S('DOC'),L('?'),S('UTTERANCE')]);
define('DOC',[S('DOC'),L('!'),S('UTTERANCE')]);
define('ROOT',[S('DOC'),L('?')]);
define('ROOT',[S('DOC'),L('!')]);

// Numeric terminals use the same records as ordinary productions, with an
// explicitly typed value domain. This is grammar data, not a phrase exception.
rules[12].numeric = 'any';
export const numericRules = {};
for (const [mode,terminal] of [['singular','one-fixed'],['plural','plural-number']]) {
  const id=rules.length;
  numericRules[terminal]=id;
  rules.push({id,result:`NUMBER_${mode}`,parse:[],expansion:[],numeric:mode});
  // The parser terminal creates the numeric node and value directly.
  aliases.push({lhs:`DIGITS_${mode}`,rhs:[`t:${terminal}`],priority:3000});
  define(`N_${mode==='singular'?'s':'p'}`,[S(`DIGITS_${mode}`),S('ADJS'),mode==='singular'?singularNoun:pluralNoun]);
  // Parser-only DIGITS alias yields the same NUMBER symbol in stored layout.
  rules.at(-1).expansion[0]=S(`NUMBER_${mode}`);
}

// Additional sense-specific complement frames reuse the same inflection and
// auxiliary machinery. Required complements are stored with their verb slot.
for (const form of ['base','third','past','participle','gerund']) {
  for (const [frame,complement] of [
    ['ditransitive',[S('OBJECT'),S('OBJECT')]],
    ['object-location',[S('OBJECT'),S('LOCATION_PP')]],
    ['bare-infinitive',[S('OBJECT'),S('V_base')]],
    ['infinitive',[L('to'),S('V_base')]],
    ['clause',[L('that'),S('S')]],
    ['predicate',[S('ADJ_PRED')]],
    ...['on','to','at','about','for','from','with','into'].map(preposition=>[`preposition:${preposition}`,[L(preposition),S('OBJECT')]]),
  ]) {
    const verb=lex(`frame_${frame}_${form}`,'framed-verb',form,{frame,...(form==='gerund'?{progressive:true}:{})});
    define(`V_${form}`,[verb,...complement]);
    if(frame==='clause') define(`V_${form}`,[verb,S('S')]);
  }
}
define('V_base',[L('be'),S('PRED')]);
const passive=lex('passive_participle','framed-verb','participle',{frame:'transitive'});
define('PASSIVE',[passive]);
define('PASSIVE',[passive,L('by'),S('OBJECT')]);
for(const [agreement,f] of Object.entries(features)) {
  for(const tense of ['present','past']) for(const negative of [false,true]) {
    define(`FINITE_${agreement}`,[L(f[tense]),...(negative?[L('not')]:[]),S('PASSIVE')]);
    define('QUESTION',[L(f[tense]),S(`SUB_${agreement}`),...(negative?[L('not')]:[]),S('PASSIVE'),S('MODS')]);
  }
  define(`FINITE_${agreement}`,[L(f.have),L('been'),S('PASSIVE')]);
}
// Relative clause subject features are fixed by the antecedent's number.
for (const [number,agreement] of [['s','sg'],['p','pl'],['m','sg']]) {
  define(`N_${number}`,[S(`N_${number}`),L('that'),S(`FINITE_${agreement}`),S('MODS')]);
  define(`N_${number}`,[S(`N_${number}`),L('that'),S('REL_OBJECT')]);
}
for (const agreement of Object.keys(features)) {
  for (const form of [agreement==='sg'?'third':'base','past']) {
    define('REL_OBJECT',[S(`SUB_${agreement}`),lex(`relative_transitive_${form}`,'framed-verb',form,{frame:'transitive'}),S('MODS')]);
  }
}
for(const conjunction of ['because','although','when','while','if']) {
  define('S',[S('S'),L(conjunction),S('S')]);
  define('S',[L(conjunction),S('S'),L(','),S('S')]);
}

define('ADJ_PRED',[lex('adjective_complement','predicate-adjective')]);

const spellings = word => word.includes("'") ? [word,word.replace("'",'’')] : [word];
for(const [agreement,f] of Object.entries(features)) {
  const sub=S(`SUB_${agreement}`);
  const negativeBe={is:"isn't",are:"aren't",was:"wasn't",were:"weren't"};
  for(const be of new Set([f.present,f.past])) if(negativeBe[be]) for(const contracted of spellings(negativeBe[be])) {
    for(const complement of ['PRED','V_gerund','PASSIVE']) {
      define(`FINITE_${agreement}`,[L(contracted),S(complement)]);
      define('QUESTION',[L(contracted),sub,S(complement),S('MODS')]);
    }
  }
  for(const have of [f.have,'had']) for(const contracted of spellings(have==='has'?"hasn't":have==='had'?"hadn't":"haven't")) {
    define(`FINITE_${agreement}`,[L(contracted),S('V_participle')]);
    define(`FINITE_${agreement}`,[L(contracted),L('been'),S('V_gerund')]);
    define(`FINITE_${agreement}`,[L(contracted),L('been'),S('PRED')]);
    define('QUESTION',[L(contracted),sub,S('V_participle'),S('MODS')]);
  }
  for(const contracted of ["can't","cannot","couldn't","won't","wouldn't","shouldn't","mustn't"]) for(const variant of spellings(contracted)) {
    define(`FINITE_${agreement}`,[L(variant),S('V_base')]);
    define('QUESTION',[L(variant),sub,S('V_base'),S('MODS')]);
  }
}
for(const pronoun of ['i','you','he','she','it','we','they']) for(const contracted of spellings(pronoun+"'ll")) {
  define('S',[L(contracted),S('V_base'),S('MODS')]);
}
for(const pronoun of ['he','she','it']) for(const contracted of spellings(pronoun+"'s")) {
  define('S',[L(contracted),S('V_participle'),S('MODS')]);
}

// Shared finite numeric terminals preserve exact spelling and clock validity.
const formattedTerminals = new Map();
const formattedNumber = mode => {
  if(formattedTerminals.has(mode)) return formattedTerminals.get(mode);
  const terminal=`formatted_${mode}`,id=rules.length,result=`NUMBER_${mode}`;
  numericRules[terminal]=id;
  rules.push({id,result,parse:[],expansion:[],numeric:`format:${mode}`});
  const lhs=`DIGITS_${mode}`;
  aliases.push({lhs,rhs:[`t:${terminal}`],priority:4000+id});
  const value={symbol:result,parseSymbol:lhs};
  formattedTerminals.set(mode,value);
  return value;
};
// define() supports a parser alias while retaining the validated layout type.
const formattedDefine = (lhs,expansion) => {
  const id=rules.length;
  define(lhs,expansion.map(item=>item.parseSymbol?S(item.parseSymbol):item));
  rules[id].expansion=expansion.map(({parseSymbol,...item})=>item);
};
const clockHour=formattedNumber('hour12'),clockHour24=formattedNumber('hour24'),clockHour24pad=formattedNumber('hour24padded');
const clockMinute=formattedNumber('minute'),clockHourWord=formattedNumber('hourWord');
for(const mode of ['military4','military3']) formattedDefine('CLOCK',[formattedNumber(mode)]);
for(const hour of [clockHour,clockHourWord]) {
  formattedDefine('SPOKEN_HOUR',[hour]);
  for(const meridiem of ['am','pm']) {
    formattedDefine('CLOCK',[hour,L(meridiem)]);
    formattedDefine('CLOCK',[hour,clockMinute,L(meridiem)]);
  }
}
for(const hour of [clockHour24,clockHour24pad]) {
  formattedDefine('CLOCK',[hour,{literal:':',joinRight:true},clockMinute]);
}
for(const meridiem of ['am','pm']) formattedDefine('CLOCK',[clockHour,{literal:':',joinRight:true},clockMinute,L(meridiem)]);
for(const fraction of ['half','quarter']) {
  define('CLOCK',[L(fraction),L('past'),S('SPOKEN_HOUR')]);
  define('CLOCK',[L('a'),L(fraction),L('past'),S('SPOKEN_HOUR')]);
}
define('CLOCK',[L('quarter'),L('to'),S('SPOKEN_HOUR')]);
define('CLOCK',[L('a'),L('quarter'),L('to'),S('SPOKEN_HOUR')]);
for(const minute of ['five','ten','twenty','twenty five']) for(const direction of ['past','to']) {
  define('CLOCK',[...minute.split(' ').map(L),L(direction),S('SPOKEN_HOUR')]);
}
for(const time of ['noon','midnight']) define('CLOCK',[L(time)]);
for(const prep of ['at','by','before','after','until','around']) define('PP',[L(prep),S('CLOCK')]);
for(const [mode,number,noun] of [['cardinalOne','s',singularNoun],['cardinalMany','p',pluralNoun]]) {
  formattedDefine(`N_${number}`,[formattedNumber(mode),S('ADJS'),noun]);
}

// Frequent function-word families, rather than individual corpus phrases.
// Postmodifying "of" phrases apply to noun phrases, not arbitrary verb frames.
for(const number of ['s','p','m']) define(`N_${number}`,[S(`N_${number}`),L('of'),S('OBJECT')]);
for(const conjunction of ['or','but','so']) define('S',[S('S'),L(conjunction),S('S')]);
for(const number of ['s','p','m']) define(`N_${number}`,[S(`N_${number}`),L('or'),S(`N_${number}`)]);
for(const number of ['p','m']) {
  const noun=number==='p'?pluralNoun:massNoun;
  for(const quantifier of ['all','more','enough','most','some','any','no']) define(`N_${number}`,[L(quantifier),S('ADJS'),noun]);
  define(`N_${number}`,[L('all'),S(`N_${number}`)]);
}
for(const number of ['s','p','m']) define(`N_${number}`,[S(`N_${number}`),S('PP')]);
// Degree modification is restricted to a reviewed gradable adjective pool.
// The lexical list is deliberately narrower than the imported attributive pool.
const gradable=lex('gradable_predicate','predicate-adjective','text',{gradable:true});
for(const degree of ['very','really','so','quite','too']) define('ADJ_PRED',[L(degree),gradable]);
define('PRED',[S('ADJ_PRED')]);
for(const kind of ['manner','frequency','time']) define('ADVERB',[lex(`adverb_${kind}`,'adverb','text',{position:kind})]);
define('MODS',[S('MODS'),S('ADVERB')]);
for(const agreement of Object.keys(features)) {
  define(`FINITE_${agreement}`,[lex('frequency_adverb','adverb','text',{position:'frequency'}),S(`FINITE_${agreement}`)]);
}
for(const form of ['base','third','past','participle','gerund']) define(`V_${form}`,[S('ADVERB'),S(`V_${form}`)]);
const sentenceAdverb=lex('sentence_adverb','adverb','text',{position:'sentence'});
define('S',[sentenceAdverb,S('S')]);
define('S',[sentenceAdverb,L(','),S('S')]);
const fragment=lex('discourse','discourse-fragment');
define('UTTERANCE',[fragment]);
define('UTTERANCE',[fragment,L(','),S('S')]);
for(const interjection of ['oh','well','hey']) define('UTTERANCE',[L(interjection),fragment]);
// Subject and object wh questions retain the subject's agreement and the
// omitted direct-object frame; a generic verb cannot silently lose a complement.
for(const wh of ['who','what']) define('QUESTION',[L(wh),S('FINITE_sg'),S('MODS')]);
for(const agreement of Object.keys(features)) {
  const f=features[agreement],sub=S(`SUB_${agreement}`);
  for(const wh of ['who','what','whom']) for(const auxiliary of [f.do,'did','will','would','can','could','should']) {
    define('QUESTION',[L(wh),L(auxiliary),sub,lex('wh_transitive_base','framed-verb','base',{frame:'transitive'}),S('MODS')]);
  }
  for(const wh of ['what','who','where','how']) define('QUESTION',[L(wh),L(f.present),sub,S('MODS')]);
}
// Embedded declarative wh complements preserve their own internal agreement.
for(const wh of ['why','where','when','how']) define('S',[L(wh),S('S')]);

// Informal replies, nominal fragments and letter-style names are utterances in
// the declared message population. They still use typed pools and layouts.
define('UTTERANCE',[S('OBJECT')]);
define('NAME_LIST',[name]);
define('NAME_LIST',[S('NAME_LIST'),name]);
define('NAME_LIST',[S('NAME_LIST'),L(','),name]);
define('UTTERANCE',[S('NAME_LIST')]);
define('UTTERANCE',[S('NAME_LIST'),L(',')]);
define('UTTERANCE',[S('NAME_LIST'),L(':')]);
define('UTTERANCE',[fragment,L(',')]);
define('UTTERANCE',[L('thank'),L('you'),L(',')]);
// Demonstrative copulas and existential contractions have different frames.
for(const variant of spellings("that's")) define('S',[L(variant),S('PRED'),S('MODS')]);
for(const spelling of ["there's","here's"]) for(const variant of spellings(spelling)) for(const number of ['s','m']) {
  define('S',[L(variant),S(`N_${number}`),S('MODS')]);
}
// Elliptical replies/questions retain a finite auxiliary, with a typed subject.
for(const [agreement,f] of Object.entries(features)) {
  for(const aux of [f.present,f.past,f.have,f.do,'did','had','will','would','can','could','should']) {
    define('QUESTION',[L(aux),S(`SUB_${agreement}`)]);
    define('QUESTION',[L(aux),S(`SUB_${agreement}`),S('ADVERB')]);
  }
  for(const aux of ["don't","didn't",...(agreement==='sg'?["doesn't"]:[])]) {
    if(aux==="don't"&&agreement==='sg') continue;
    define('QUESTION',[L(aux),S(`SUB_${agreement}`)]);
  }
  for(const wh of ['what','who','where','how']) define('QUESTION',[L(wh),L(f.past),S(`SUB_${agreement}`),S('MODS')]);
}
define('UTTERANCE',[L('not'),S('ADVERB')]);
// Punctuation runs are stored exactly; no decoder repair or dropped marks.
define('ENDING',[L('?')]); define('ENDING',[L('!')]);
define('ENDING',[S('ENDING'),L('?')]);define('ENDING',[S('ENDING'),L('!')]);
define('ENDING',[L('.'),L('.'),L('.')]);
define('ROOT',[S('DOC'),S('ENDING')]);
define('DOC',[S('DOC'),S('ENDING'),S('UTTERANCE')]);
// Discourse conjunctions may begin a new conversational sentence.
for(const conjunction of ['and','but','so']) define('S',[L(conjunction),S('S')]);

// Calendar classes keep month lengths and leap days valid under every key.
for(const kind of ['ordinary','long','longest','leap']) {
  for(const monthWidth of [0,2]) for(const dayWidth of [0,2]) for(const yearWidth of [2,4]) {
    const month=formattedNumber(`month_${kind}_${monthWidth}`),day=formattedNumber(`day_${kind}_${dayWidth}`),year=formattedNumber(`year_${kind}_${yearWidth}`);
    for(const [first,second] of [[month,day],[day,month]]) formattedDefine('DATE',[first,{literal:'/',joinLeft:true,joinRight:true},second,{literal:'/',joinLeft:true,joinRight:true},year]);
  }
}
define('UTTERANCE',[S('CLOCK')]);
define('UTTERANCE',[S('DATE')]);
define('UTTERANCE',[S('DATE'),S('CLOCK')]);
for(const prep of ['on','by','before','after','until','around']) define('PP',[L(prep),S('DATE')]);
// Time adverbs occur before a clause, as well as after its predicate.
define('S',[lex('initial_time_adverb','adverb','text',{position:'time'}),S('S')]);
// Common omitted-subject message fragments retain a typed finite predicate.
for(const agreement of ['i','pl']) define('UTTERANCE',[S(`FINITE_${agreement}`),S('MODS')]);

// Fractional quantities inherit agreement/countability from their complement.
for(const number of ['s','p','m']) {
  define(`N_${number}`,[L('half'),S(`N_${number}`)]);
  define(`N_${number}`,[L('half'),L('of'),S(`N_${number}`)]);
  define(`N_${number}`,[L('a'),L('quarter'),L('of'),S(`N_${number}`)]);
}
define('N_s',[L('another'),S('ADJS'),singularNoun]);

// Productive nominal compounds preserve the head's number; determiners never
// appear inside a noun modifier sequence.
for(const [number,noun] of [['s',singularNoun],['p',pluralNoun],['m',massNoun]]) {
  define(`COMPOUND_${number}`,[singularNoun,noun]);
  define(`COMPOUND_${number}`,[singularNoun,S(`COMPOUND_${number}`)]);
  for(const determiner of ['the','my','your','his','her','our','their',...(number==='s'?['this','that']:number==='p'?['these','those','some','many','all']:['some'])]) {
    define(`N_${number}`,[L(determiner),S('ADJS'),S(`COMPOUND_${number}`)]);
  }
}
define('N_p',[S('COMPOUND_p')]);
define('UTTERANCE',[S('COMPOUND_s')]);
define('UTTERANCE',[singularNoun]);
define('UTTERANCE',[S('OBJECT'),S('MODS')]);
define('UTTERANCE',[S('ADVERB')]);
define('UTTERANCE',[sentenceAdverb,L(','),S('OBJECT'),S('MODS')]);
for(const quantifier of ['all','some','none','many','most','both','enough','much']) define('UTTERANCE',[L(quantifier)]);
define('UTTERANCE',[L('thanks'),L('for'),S('OBJECT')]);
define('UTTERANCE',[L('sorry'),L('about'),S('OBJECT')]);
define('UTTERANCE',[L('take'),L('care'),L(',')]);

const gradableAttributive=lex('gradable_attributive','predicate-adjective','text',{gradable:true,attributive:true});
for(const [degree,onset] of [['very','consonant'],['really','consonant'],['quite','consonant'],['too','consonant'],['so','consonant'],['extremely','vowel']]) {
  define('ADJS',[S('ADJS'),L(degree),gradableAttributive]);
  define('N_s',[L(onset==='vowel'?'an':'a'),L(degree),gradableAttributive,S('ADJS'),singularNoun]);
}
define('PRED',[L('as'),gradable,L('as'),S('OBJECT')]);
define('S',[S('S'),L('as'),S('S')]);
define('S',[L('as'),S('S'),L(','),S('S')]);
define('S',[L('as'),L('soon'),L('as'),S('S'),L(','),S('S')]);
for(const [number,noun,agreement] of [['s',singularNoun,'sg'],['p',pluralNoun,'pl']]) {
  define('QUESTION',[L('which'),S('ADJS'),noun,S(`FINITE_${agreement}`),S('MODS')]);
}
define('N_s',[L('one')]);define('N_p',[L('ones')]);
for(const determiner of ['the','this','that','another']) define('N_s',[L(determiner),S('ADJS'),L('one')]);
for(const determiner of ['the','these','those','some']) define('N_p',[L(determiner),S('ADJS'),L('ones')]);

// Phrasal-verb senses retain both their particle and object-position rules.
for(const form of ['base','third','past','participle','gerund']) {
  for(const particle of ['up','out','back','down','away']) {
    const verb=lex(`particle_${particle}_${form}`,'framed-verb',form,{frame:`particle:${particle}`});
    define(`V_${form}`,[verb,L(particle)]);
  }
  for(const particle of ['up','out']) {
    const verb=lex(`particle_object_${particle}_${form}`,'framed-verb',form,{frame:`particle-object:${particle}`});
    define(`V_${form}`,[verb,S('OBJECT'),L(particle)]);
    // Personal pronouns precede separable particles ("pick him up").
    define(`V_${form}`,[verb,L(particle),S('NP')]);
  }
}
for(const [agreement,f] of Object.entries(features)) {
  define(`FINITE_${agreement}`,[L(f.present),L('gonna'),S('V_base')]);
  define(`FINITE_${agreement}`,[L('gotta'),S('V_base')]);
  if(agreement!=='sg') define(`FINITE_${agreement}`,[L('wanna'),S('V_base')]);
}
for(const pronoun of ['i','you','he','she','it','we','they']) for(const variant of spellings(pronoun+"'d")) {
  define('S',[L(variant),S('V_base'),S('MODS')]);
  define('S',[L(variant),S('V_participle'),S('MODS')]);
}
for(const agreement of Object.keys(features)) {
  for(const auxiliary of ['isn\'t','aren\'t','wasn\'t','weren\'t']) {
    const f=features[agreement];
    if((auxiliary==="isn't"&&f.present!=='is')||(auxiliary==="aren't"&&f.present!=='are')||
       (auxiliary==="wasn't"&&f.past!=='was')||(auxiliary==="weren't"&&f.past!=='were')) continue;
    define('QUESTION',[L(auxiliary),S(`SUB_${agreement}`)]);
  }
}
for(const conjunction of ['because','cause','although','if']) define('UTTERANCE',[L(conjunction),S('S')]);

// Discourse markers compose with a following utterance, including another
// reply fragment. This supports everyday hesitant speech without admitting
// arbitrary text or discarding punctuation.
const discoursePrefix=lex('discourse_prefix','discourse-fragment','text',{prefix:true});
define('UTTERANCE',[discoursePrefix,S('UTTERANCE')]);
define('UTTERANCE',[discoursePrefix,L(','),S('UTTERANCE')]);
define('PRED',[lex('predicate_frequency','adverb','text',{position:'frequency'}),S('PRED')]);
define('CONTRACTED_BE',[S('PRED')]);
define('CONTRACTED_BE',[S('V_gerund')]);
define('CONTRACTED_BE',[S('PASSIVE')]);
define('CONTRACTED_BE',[L('not'),S('CONTRACTED_BE')]);
define('CONTRACTED_BE',[lex('contracted_frequency','adverb','text',{position:'frequency'}),S('CONTRACTED_BE')]);
for(const contracted of ["i'm","you're","he's","she's","it's","we're","they're","that's"]) for(const variant of spellings(contracted)) {
  define('S',[L(variant),S('CONTRACTED_BE'),S('MODS')]);
}
for(const agreement of Object.keys(features)) {
  const f=features[agreement];
  for(const auxiliary of [f.do,'did']) define('QUESTION',[L('what'),L(auxiliary),S(`SUB_${agreement}`),lex('wh_clause_verb','framed-verb','base',{frame:'clause'}),S('MODS')]);
}
define('ADVERB',[L('very'),L('much')]);
define('UTTERANCE',[L('thanks'),S('ADVERB')]);
define('UTTERANCE',[L('thanks'),S('ADVERB'),L('for'),S('OBJECT')]);
// Sentential adverbs also permit a comma after an initial time word.
define('S',[lex('initial_time_comma','adverb','text',{position:'time'}),L(','),S('S')]);

// Reviewed proper nouns have grammatical third-person singular behavior.
define('N_s',[lex('reviewed_proper','proper-noun')]);
for(const prep of ['into','against','per','regarding','through','during','since','between','off','like']) define('PP',[L(prep),S('OBJECT')]);
define('PRED',[L('the'),L('least')]);
for(const conjunction of ['since','though']) {
  define('S',[S('S'),L(conjunction),S('S')]);
  define('S',[L(conjunction),S('S'),L(','),S('S')]);
}
// Balanced delimiters wrap typed phrases and utterances, preserving every mark.
// There is no rule that accepts unmatched delimiters or arbitrary token runs.
for(const [open,close]of [['(',')'],['[',']'],['"','"'],['“','”'],["'","'"]]) {
  for(const type of ['N_s','N_p','N_m','OBJECT','UTTERANCE']) define(type,[{literal:open,joinRight:true},S(type),{literal:close,joinLeft:true}]);
  define('S',[S('S'),{literal:open,joinRight:true},S('S'),{literal:close,joinLeft:true}]);
}
for(const separator of [';','—','–','-']) {
  define('DOC',[S('DOC'),L(separator),S('UTTERANCE')]);
}
for(const dash of ['—','–','-']) {
  define('ROOT',[S('DOC'),L(dash)]);
  define('S',[S('S'),L(dash),S('S')]);
  define('UTTERANCE',[S('NAME_LIST'),L(dash)]);
}
// Parenthetical asides and comma-separated discourse preserve their structure.

define('S',[S('PP'),L(','),S('S')]);
define('UTTERANCE',[S('PP')]);
define('PRED',[S('OBJECT')]);
define('QUESTION',[L('can'),S('SUB_you'),L('please'),S('V_base'),S('MODS')]);
for(const hour of [clockHour24pad]) for(const meridiem of ['am','pm']) {
  // A padded 12-hour domain is narrower than the 24-hour domain.
  formattedDefine('CLOCK',[formattedNumber('hour12padded'),{literal:':',joinRight:true},clockMinute,L(meridiem)]);
}
for(const preposition of ['at','on','in','under','near','into','behind','over']) define('LOCATION_PP',[L(preposition),S('OBJECT')]);
for(const number of ['s','p','m']) {
  define(`N_${number}`,[L('at'),L('least'),S(`N_${number}`)]);
  if(number!=='s') define(`N_${number}`,[L('such'),S('ADJS'),number==='p'?pluralNoun:massNoun]);
}
for(const [article,onset]of [['a','consonant'],['an','vowel']]) {
  define('N_s',[L('such'),L(article),word(`article_noun_${onset}`,'singular')]);
  define('N_s',[L('such'),L(article),word(`article_adj_${onset}`),S('ADJS'),singularNoun]);
}
// Monetary amounts use the existing unbounded integer categories and optional
// two-digit cents. Symbols attach to numbers; they are never dropped.
const amountId=rules.length;
numericRules['amount-number']=amountId;
rules.push({id:amountId,result:'AMOUNT_NUMBER',parse:[],expansion:[],numeric:'any'});
aliases.push({lhs:'AMOUNT_DIGITS',rhs:['t:amount-number'],priority:6000});
for(const currency of ['$','£','€']) {
  define('MONEY_BASE',[{literal:currency,joinRight:true},S('AMOUNT_DIGITS')]);
  rules.at(-1).expansion[1]=S('AMOUNT_NUMBER');
}
define('OBJECT',[S('MONEY')]);define('PRED',[S('MONEY')]);define('UTTERANCE',[S('MONEY')]);

const moneyGroup=formattedNumber('moneyGroup'),moneyLead=formattedNumber('moneyLead');
formattedDefine('MONEY_GROUPS',[{literal:',',joinLeft:true,joinRight:true},moneyGroup]);
formattedDefine('MONEY_GROUPS',[S('MONEY_GROUPS'),{literal:',',joinLeft:true,joinRight:true},moneyGroup]);
for(const currency of ['$','£','€']) formattedDefine('MONEY_BASE',[{literal:currency,joinRight:true},moneyLead,S('MONEY_GROUPS')]);
define('MONEY',[S('MONEY_BASE')]);
formattedDefine('MONEY',[S('MONEY_BASE'),{literal:'.',joinLeft:true,joinRight:true},formattedNumber('cents')]);

extendProductiveGrammar({define,lex,S,L,features,spellings,singularNoun,pluralNoun,massNoun});

// Local development-treebank productions use the same typed layout contract.
for(const pool of Object.keys(dependencyGrammar.pools)) lex(pool,'dependency-lexeme','text',{signature:pool});
for(const [lhs,expansion] of dependencyGrammar.rules) define(lhs,expansion);
for(const root of dependencyGrammar.roots) define('UTTERANCE',[S(root)]);

// A geographic name is one mapped choice, even when its spelling has spaces.
define('N_s',[lex('geographic_name','place-name','text',{agreement:'sg',usage:'ordinary'})]);
define('UTTERANCE',[lex('geographic_label','place-name','text',{agreement:'sg',usage:'label'})]);

// Compatible subject pronouns share the same conjugation in every supported
// tense. I/am and third-person singular remain separate.
for(const agreement of ['you','pl']) roles[`pronoun_${agreement}`][2]={agreement:['you','pl']};

export const nominalChoiceRules={};
for(const result of ['N_s','NP','THIRD_SUBJECT']) {
  nominalChoiceRules[result]=rules.length;
  define(result,[lex('singular_nominal','nominal-phrase','text',{agreement:'sg'})]);
  // Existing noun-phrase productions recognize every member; this record is
  // their shared stored representation, not thousands of duplicate parses.
  rules.at(-1).parse=[];
}
// These expressions select a to-object as a unit. Their verbs and internal
// noun/degree phrases cannot drift into incompatible generic verb frames.
for(const form of ['base','third','past','participle']) {
  const expression=lex(`significance_${form}`,'significance-expression',form);
  define(`V_${form}`,[expression,S('OBJECT')]);
  for(const [agreement] of Object.entries(features)) {
    if(form==='past' || form===(agreement==='sg'?'third':'base')) {
      define('S',[S(`SUB_${agreement}`),expression,S('OBJECT'),S('MODS')]);
      rules.at(-1).parse[0].priority=-100;rules.at(-1).preferred=true;
    }
  }
}
// Prefer the selected construction through auxiliaries and questions as well.
for(const [agreement,f] of Object.entries(features)) {
  const subject=S(`SUB_${agreement}`);
  const prefixes=[
    ...[f.do,'did'].flatMap(aux=>[[[L(aux),L('not')],'base']]),
    ...[f.do==='does'?"doesn't":"don't","didn't","can't","cannot","couldn't","won't","wouldn't","shouldn't",'will','would','can','could','should','may','might','must'].map(aux=>[[L(aux)],'base']),
    ...[f.have,'had'].flatMap(aux=>[[[L(aux)],'participle'],[[L(aux),L('not')],'participle']]),
    ...[f.have==='has'?"hasn't":"haven't","hadn't"].map(aux=>[[L(aux)],'participle']),
  ];
  for(const [prefix,form] of prefixes) {
    define('S',[subject,...prefix,{role:`significance_${form}`,form},S('OBJECT'),S('MODS')]);
    rules.at(-1).preferred=true;
  }
  for(const aux of [f.do,'did','will','would','can','could','should']) {
    define('QUESTION',[L(aux),subject,{role:'significance_base',form:'base'},S('OBJECT'),S('MODS')]);
    rules.at(-1).preferred=true;
  }
}

// Option 3: retain word forms and order, remove verb valency restrictions.
// Kept separate so historical strict tests/measurements remain reproducible.
const option3Start=rules.length;
for(const form of ['base','third','past','participle','gerund']) {
  const verb=lex(`option3_verb_${form}`,'framed-verb',form);
  for(const tail of [[],[S('OBJECT')],[S('OBJECT'),S('OBJECT')],[S('PP')],
    [S('EMBEDDED_QUESTION')],[L('that'),S('S')],[L('to'),S('V_base')],
    [S('OBJECT'),L('to'),S('V_base')],[S('PRED')]])define(`V_${form}`,[verb,...tail]);
}
// Deliberately permissive: any recognized adjective can precede a lexical
// verb phrase, including repeated modifiers and every supported verb form.
for(const form of ['base','third','past','participle','gerund'])
  define(`V_${form}`,[lex('option3_preverb_adjective','adjective'),S(`V_${form}`)]);
define('MODS',[S('MODS'),lex('option3_adverb','adverb')]);
for(const [agreement] of Object.entries(features))define('S',[S(`SUB_${agreement}`),lex('option3_adverb','adverb'),S(`FINITE_${agreement}`),S('MODS')]);
// One noun domain across count/mass/name/place uses; only number remains.
const anySingularNoun=lex('option3_noun_s','nominal-phrase');
const anyPluralNoun=lex('option3_noun_p','nominal-phrase');
for(const result of ['N_s','N_m'])define(result,[anySingularNoun]);
define('N_p',[anyPluralNoun]);
for(const [number,noun] of [['s',anySingularNoun],['p',anyPluralNoun]]) {
  define(`N_${number}`,[S('ADJS'),noun]);
  for(const det of ['the','my','your','his','her','its','our','their','some','any','no',...(number==='s'?['this','that','each','every','much','little']:['these','those','many','several','few','all'])])
    define(`N_${number}`,[L(det),S('ADJS'),noun]);
}
for(const [article,onset]of [['a','consonant'],['an','vowel']])
  define('N_s',[L(article),lex(`option3_noun_${onset}`,'nominal-phrase')]);
for(const prefix of [['a','little'],['a','little','more'],['a','bit','of'],['a','lot','of'],['lots','of']])
  define('N_m',[...prefix.map(L),S('ADJS'),anySingularNoun]);
for(const rule of rules.slice(option3Start))rule.profile='option3';
