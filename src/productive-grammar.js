// Reusable constructions compose independently of the development treebank.
export function extendProductiveGrammar({define,lex,S,L,features,spellings,singularNoun,pluralNoun,massNoun}) {
  const agreements=Object.entries(features),forms=['base','third','past','participle','gerund'];
  for(const [agreement] of agreements) for(const conjunction of ['and','or','but']) {
    define(`FINITE_${agreement}`,[S(`FINITE_${agreement}`),S('MODS'),L(conjunction),S(`FINITE_${agreement}`)]);
  }
  for(const form of forms) {
    define(`V_${form}`,[S(`V_${form}`),S('PP')]);
    define(`V_${form}`,[S(`V_${form}`),S('ADVERB')]);
    define(`V_${form}`,[lex(`object_clause_${form}`,'framed-verb',form,{frame:'object-clause'}),S('OBJECT'),S('EMBEDDED_QUESTION')]);
    define(`V_${form}`,[lex(`object_clause_${form}`,'framed-verb',form,{frame:'object-clause'}),S('OBJECT'),L('that'),S('S')]);
    define(`V_${form}`,[lex(`object_infinitive_${form}`,'framed-verb',form,{frame:'object-infinitive'}),S('OBJECT'),L('to'),S('V_base')]);
    define(`V_${form}`,[lex(`object_predicate_${form}`,'framed-verb',form,{frame:'object-predicate'}),S('OBJECT'),S('ADJ_PRED')]);
    define(`V_${form}`,[lex(`embedded_clause_${form}`,'framed-verb',form,{frame:'clause'}),S('EMBEDDED_QUESTION')]);
    // A missing direct object is represented by a distinct phrase type.
    define(`GAP_V_${form}`,[lex(`gap_transitive_${form}`,'framed-verb',form,{frame:'transitive'})]);
    define(`GAP_V_${form}`,[lex(`gap_ditransitive_${form}`,'framed-verb',form,{frame:'ditransitive'}),S('OBJECT')]);
    define(`GAP_V_${form}`,[lex(`gap_infinitive_${form}`,'framed-verb',form,{frame:'infinitive'}),L('to'),S('GAP_V_base')]);
    define(`GAP_V_${form}`,[S('ADVERB'),S(`GAP_V_${form}`)]);
  }
  for(const complement of ['PASSIVE','V_gerund','PRED']) {
    define('V_base',[L('be'),S(complement)]);
    define('V_participle',[L('been'),S(complement)]);
  }
  define('V_gerund',[L('being'),S('PASSIVE')]);
  define('V_base',[L('have'),S('V_participle')]);
  define('V_base',[L('have'),L('not'),S('V_participle')]);
  define('GAP_V_base',[L('have'),S('GAP_V_participle')]);
  define('GAP_V_base',[L('be'),S('GAP_V_gerund')]);
  for(const [agreement,f] of agreements) {
    const sub=S(`SUB_${agreement}`);
    for(const form of [agreement==='sg'?'third':'base','past']) define(`GAP_FIN_${agreement}`,[S(`GAP_V_${form}`)]);
    for(const aux of [f.have,'had']) {
      define(`GAP_FIN_${agreement}`,[L(aux),S('GAP_V_participle')]);
      define(`GAP_FIN_${agreement}`,[L(aux),L('not'),S('GAP_V_participle')]);
    }
    for(const aux of [f.present,f.past]) define(`GAP_FIN_${agreement}`,[L(aux),S('GAP_V_gerund')]);
    for(const aux of ['will','would','can','could','may','might','must','should']) {
      define(`GAP_FIN_${agreement}`,[L(aux),S('GAP_V_base')]);
      define(`GAP_FIN_${agreement}`,[L(aux),L('not'),S('GAP_V_base')]);
    }
    for(const aux of [f.do,'did']) define(`GAP_FIN_${agreement}`,[L(aux),L('not'),S('GAP_V_base')]);
    define('REL_OBJECT',[sub,S(`GAP_FIN_${agreement}`),S('MODS')]);
    for(const wh of ['what','who','whom']) for(const aux of [f.do,'did','will','would','can','could','should']) {
      define('QUESTION',[L(wh),L(aux),sub,S('GAP_V_base'),S('MODS')]);
    }
  }
  for(const [number,agreement] of [['s','sg'],['m','sg'],['p','pl']]) {
    for(const relative of ['who','which']) define(`N_${number}`,[S(`N_${number}`),L(relative),S(`FINITE_${agreement}`),S('MODS')]);
    define(`N_${number}`,[S(`N_${number}`),S('REL_OBJECT')]);
    for(const relative of ['who','which','whom']) define(`N_${number}`,[S(`N_${number}`),L(relative),S('REL_OBJECT')]);
    define(`N_${number}`,[S(`N_${number}`),S('V_gerund')]);
  }
  for(const wh of ['what','who','whoever','whatever']) {
    define('N_s',[L(wh),S('REL_OBJECT')]);
    define('EMBEDDED_QUESTION',[L(wh),S('REL_OBJECT')]);
  }
  for(const wh of ['which','what','whose']) for(const noun of [singularNoun,pluralNoun]) {
    define('EMBEDDED_QUESTION',[L(wh),S('ADJS'),noun,S('REL_OBJECT')]);
  }
  for(const wh of ['whether','if','why','where','when','how']) define('EMBEDDED_QUESTION',[L(wh),S('S')]);
  for(const wh of ['how','what','where','when']) define('EMBEDDED_QUESTION',[L(wh),L('to'),S('V_base')]);
  define('PRED',[lex('adjective_question','framed-adjective','text',{complement:'question'}),S('EMBEDDED_QUESTION')]);
  define('PRED',[lex('adjective_clause','framed-adjective','text',{complement:'clause'}),L('that'),S('S')]);
  define('PRED',[lex('adjective_clause','framed-adjective','text',{complement:'clause'}),S('S')]);
  define('PRED',[lex('adjective_infinitive','framed-adjective','text',{complement:'infinitive'}),L('to'),S('V_base')]);
  for(const pronoun of ['someone','somebody','anyone','anybody','everyone','everybody','nobody','something','anything','everything','nothing']) define('INDEFINITE',[L(pronoun)]);
  define('N_s',[S('INDEFINITE')]);
  define('N_s',[S('INDEFINITE'),L('else')]);
  define('N_s',[S('INDEFINITE'),S('ADJ_PRED')]);
  for(const form of spellings("let's")) define('S',[L(form),S('V_base'),S('MODS')]);
  define('N_m',[S('V_gerund'),S('MODS')]);
  for(const degree of ['so','very','too','quite','really']) define('ADVERB',[L(degree),lex('graded_manner','adverb','text',{position:'manner'})]);
  for(const quantifier of [['a','little'],['a','little','more'],['a','bit','of'],['a','lot','of'],['lots','of']]) define('N_m',[...quantifier.map(L),S('ADJS'),massNoun]);
  for(const quantifier of [['a','few'],['a','few','more'],['a','lot','of'],['lots','of']]) define('N_p',[...quantifier.map(L),S('ADJS'),pluralNoun]);
}
