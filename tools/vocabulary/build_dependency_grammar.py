"""Compile local typed dependency productions from licensed DEVELOPMENT annotations.

No runtime sentence IDs, source sentences or sentence lookup. The output is a
CFG of local dependency configurations and grammatical lexical equivalence
classes. Corpus membership is used only to select the declared training split.
"""
import collections, hashlib, json, pathlib, re
ROOT=pathlib.Path(__file__).resolve().parents[2]
BASE=ROOT/'data/coverage'
items=json.loads((BASE/'items.json').read_text())
manifest=json.loads((BASE/'manifest.json').read_text())
assert hashlib.sha256((BASE/'items.json').read_bytes()).hexdigest()==manifest['corpus_sha256']
dev=[i for i in items if i['split']=='development' and i['source']!='project']
ids={(i['source'],i['sid']) for i in dev if i['kind']=='sentence'}
notes={(i['source'],i['group']) for i in dev if i['kind']=='note'}
WORD=re.compile(r"[^\W\d_]+(?:['’\-][^\W\d_]+)*(?:['’\-](?!['’\-]))?|[0-9]+(?:\.[0-9]{3,})?|[^\s]",re.UNICODE)
def canonical(text):
 text=re.sub(r'\s+',' ',text.lower()).strip()
 text=re.sub(r' +([.,!?;:])',r'\1',text)
 text=re.sub(r'(\d): +(?=\d)',r'\1:',text)
 return re.sub(r'(\d) */ *(?=\d)',r'\1/',text)
def tokenize(text):
 tokens=[];quoted=False
 for m in WORD.finditer(text):
  w=m[0]
  if w=="'":quoted=not quoted
  if quoted and len(w)>1 and w.endswith("'"):
   tokens.extend([(w[:-1],m.start(),m.end()-1),("'",m.end()-1,m.end())]);quoted=False
  else:tokens.append((w,m.start(),m.end()))
 return tokens
# Content words are mapped. Closed grammatical words remain explicit literals,
# as in the hand-authored grammar. Surface forms have source POS/morphology.
CLOSED={'AUX','ADP','DET','CCONJ','SCONJ','PART','PRON','PUNCT','SYM','FUSED'}
onsets={}
pronunciation_source=json.loads((ROOT/'tools/vocabulary/stage2-lexicon.json').read_text())['pronunciation_source']
assert hashlib.sha256((ROOT/'tools/vocabulary/cmudict.dict').read_bytes()).hexdigest()==pronunciation_source['sha256']
for line in (ROOT/'tools/vocabulary/cmudict.dict').read_text().splitlines():
 parts=line.split()
 if len(parts)>1:onsets.setdefault(re.sub(r'\(\d+\)$','',parts[0]),'vowel' if parts[1][0] in 'AEIOU' else 'consonant')
def onset(word):return onsets.get(word,'unreviewed:'+word)
spec=json.loads((ROOT/'tools/vocabulary/stage2-lexicon.json').read_text())
base=json.loads((ROOT/'data/candidates/draft-5000.json').read_text())['entries']
trusted_counts={e.get('forms',{}).get('singular',e['text']) for e in base if 'count-noun' in e['roles']}|{r.split()[0] for r in spec['count_nouns']}
trusted_masses={e['text'] for e in base if 'mass-noun' in e['roles']}|set(spec['mass_nouns'])
trusted_adjectives={e['text'] for e in base if 'adjective' in e['roles']}|set(spec['attributive_adjectives'])
trusted_predicates=set(spec['predicate_adjectives'])
trusted_verbs={r.split()[0] for group in ['verbs','extra_frames'] for rows in spec[group].values() for r in rows}
adverb_classes={w:kind for kind,words in spec['adverbs'].items() for w in words}
# Lexicalized grammatical operators do not share content-word pools just
# because a source POS tag resembles an ordinary noun, verb or adverb.
operators=set("please pm am noon midnight due regarding concerning following pending including notwithstanding alone else own more less most least only even just almost nearly very really quite rather too enough so as how when where why not never ever always still already yet also instead again together back away out up down here there now then ago hence thus otherwise therefore however nevertheless furthermore kinda gonna wanna gotta uh um er erm hm hmm mmm mm mhm uh-huh mm-hm uh-oh".split())
idioms=["due to","in order to","a lot","lots of","as a matter of fact","of course","on the other hand","to whom it may concern","at least","at most","as well as","such as","no longer","sort of","kind of","take care","thank you","let's","best regards","best rgds"]
lexicon=collections.defaultdict(set);pool_signatures={};symbol_signatures={};productions=set();root_symbols=set();skipped=[];accepted=[];rules_evidence=collections.Counter()
features_keep={'Number','Person','Case','VerbForm','Tense','Mood','Degree','PronType','Poss','Reflex','NumType','Polarity'}
def morph(row):
 f=dict(p.split('=',1) for p in row[5].split('|') if '=' in p)
 return ','.join(k+'='+f[k] for k in sorted(features_keep&f.keys()))
def digest(x):return hashlib.sha256(x.encode()).hexdigest()[:20]
def dependency(block,source,sid):
 text=canonical(re.search(r'^# text = (.+)$',block,re.M)[1]);tokens=tokenize(text)
 fixed=set()
 for phrase in idioms:
  pattern=phrase.split()
  for start in range(len(tokens)-len(pattern)+1):
   if [t[0] for t in tokens[start:start+len(pattern)]]==pattern:fixed.update(range(start,start+len(pattern)))
 rows={int(r[0]):r for line in block.splitlines() if re.match(r'^\d+\t',line) for r in [line.split('\t')]}
 ranges={int(r[0].split('-')[0]):(int(r[0].split('-')[1]),r[1]) for line in block.splitlines() if re.match(r'^\d+-\d+\t',line) for r in [line.split('\t')]}
 spans={};cursor=0;end_mwt=0
 for i,r in rows.items():
  if i<=end_mwt:continue
  end,display=ranges.get(i,(i,r[1]));display=display.lower()
  if not text[cursor:].lstrip().startswith(display):
   raise ValueError('surface alignment')
  start=cursor+len(text[cursor:])-len(text[cursor:].lstrip());cursor=start+len(display)
  for j in range(i,end+1):spans[j]=(start,cursor)
  end_mwt=end
 if text[cursor:].strip():raise ValueError('unconsumed surface')
 # Map UD tokens to composer tokens. Multiword contraction nodes are collapsed;
 # punctuation within an orthographic UD token is expanded to typed leaves.
 tok_ids=[]
 for w,a,b in tokens:
  members=[i for i,(l,r) in spans.items() if l<b and r>a]
  if not members:raise ValueError('unannotated token')
  tok_ids.append(members)
 representatives={i:next(j for j,ids_ in enumerate(tok_ids) if i in ids_) for i in rows}
 nodes=[]
 for j,((w,a,b),members) in enumerate(zip(tokens,tok_ids)):
  external=[i for i in members if int(rows[i][6]) not in members]
  head=next((i for i in external if rows[i][6]=='0'),external[0] if external else members[0])
  row=rows[head];parent=int(row[6]);parent=representatives[parent] if parent else -1
  if representatives[head]!=j:parent=representatives[head]
  pos=row[3];relation=row[7]
  if len(members)>1:
   content=[i for i in members if rows[i][3] in {'NOUN','PROPN','ADJ'}]
   pos=rows[content[0]][3] if content else 'FUSED'
  if not re.search(r'[^\W_]',w):pos='PUNCT'
  if w in operators or j in fixed or w.endswith('-') or row[7] in {'fixed','case','mark'}:pos='FUSED'
  if representatives[head]!=j:relation='flat:surface'
  nodes.append(dict(word=w,pos=pos,morph=morph(row),parent=parent,relation=relation,row=row,children=[],start=a,end=b))
 for j,n in enumerate(nodes):
  if n['parent']==j:raise ValueError('collapsed self-cycle')
  if n['parent']>=0:nodes[n['parent']]['children'].append(j)
 roots=[i for i,n in enumerate(nodes) if n['parent']==-1]
 if len(roots)!=1:raise ValueError('multiple roots')
 if nodes[roots[0]]['pos']=='INTJ' and tokens[-1][0]==',':raise ValueError('unfinished interjection')
 # Sentence endings belong to the shared document grammar. A learned phrase
 # can therefore combine with any other supported utterance in a note.
 trimmed=set();last=len(nodes)-1
 while last!=roots[0] and last>=0 and nodes[last]['word'] in {'.','!','?'} and nodes[last]['parent']==roots[0] and not nodes[last]['children']:
  trimmed.add(last);nodes[roots[0]]['children'].remove(last);last-=1
 # Compute intervals iteratively; reject nonprojective examples instead of
 # memorizing them as flat sentence templates.
 order=[];stack=[roots[0]];seen=set()
 while stack:
  j=stack.pop()
  if j in seen:raise ValueError('cycle')
  seen.add(j);order.append(j);stack.extend(nodes[j]['children'])
 if len(order)!=len(nodes)-len(trimmed):raise ValueError('disconnected')
 for j in reversed(order):
  n=nodes[j];indices={j}
  for c in n['children']:indices.update(nodes[c]['indices'])
  if max(indices)-min(indices)+1!=len(indices):raise ValueError('nonprojective dependency')
  n['indices']=indices;n['lo']=min(indices);n['hi']=max(indices)
 # A symbol describes grammatical features, attachment role and edge spacing.
 # Function-word spelling is included so parent frames cannot change case,
 # negation, auxiliary selection or required prepositions under substitution.
 for j in order:
  n=nodes[j];lo=n['lo'];role=n['relation'].split(':')[0]
  # Attachment roles remain distinct: finite roots are not clause complements.
  category=n['pos']+'|'+n['morph']+'|'+role
  if n['pos'] in CLOSED:category+='|'+n['word']
  # Case-marked and bare noun phrases have different attachment contracts.
  marks=[nodes[c]['word'] for c in n['children'] if nodes[c]['relation'].split(':')[0] in {'case','mark','cc'}]
  category+='|mark='+','.join(marks)+'|onset='+onset(tokens[lo][0])
  marks_in_span=[tokens[k][0] for k in sorted(n['indices']) if tokens[k][0] in {'(',')','[',']','\"','“','”'}]
  balance=[]
  pairs={')':'(',']':'[','”':'“'}
  for mark in marks_in_span:
   if mark in pairs and balance and balance[-1]==pairs[mark]:balance.pop()
   elif mark=='\"' and balance and balance[-1]=='\"':balance.pop()
   else:balance.append(mark)
  category+='|delimiters='+''.join(balance)
  category+='|tight='+str(lo>0 and tokens[lo-1][2]==tokens[lo][1])
  n['symbol']='dep_'+digest(category);symbol_signatures[n['symbol']]=category
 local=[]
 for j in reversed(order):
  n=nodes[j];w=n['word'];tight=j>0 and tokens[j-1][2]==tokens[j][1]
  if n['pos'] in CLOSED or not re.search(r'[^\W_]',w):
   head={'literal':w,'joinLeft':tight,'matchJoinLeft':tight if j>0 else None}
  else:
   # Required complement frames travel with the verb; adjuncts do not invent
   # transitivity. Other lexical classes preserve source morphology.
   frame=[]
   if n['pos'] in {'VERB','ADJ'}:
    for c in n['children']:
     d=nodes[c];rel=d['relation']
     if rel.split(':')[0] in {'obj','iobj','ccomp','xcomp','obl'} or rel=='compound:prt':
      frame.append((rel,d['pos'],d['morph'],[nodes[k]['word'] for k in d['children'] if nodes[k]['relation'] in {'mark','case'}],d['word'] if rel=='compound:prt' else ''))
   # Article onset is public, as in the existing reviewed pools.
   sound=onset(w)
   signature=n['pos']+'|'+n['morph']+'|'+n['relation']+'|'+json.dumps(frame,sort_keys=True)+'|'+sound
   lemma=n['row'][2].lower()
   signature+='|possessiveSpelling='+str(w.endswith(("'s",'’s',"s'",'s’')))
   known=True
   if n['pos']=='NOUN':
    known=lemma in trusted_counts or lemma in trusted_masses or 'Number=Plur' in n['morph']
    signature+='|countability='+('count' if lemma in trusted_counts else 'mass' if lemma in trusted_masses else 'plural' if 'Number=Plur' in n['morph'] else 'unreviewed')
   elif n['pos']=='ADJ':
    attributive=n['relation'].split(':')[0] in {'amod','compound'}
    known=lemma in (trusted_adjectives if attributive else trusted_predicates)
    signature+='|adjectiveUse='+str(attributive)
   elif n['pos']=='VERB':known=lemma in trusted_verbs
   elif n['pos']=='ADV':
    known=w in adverb_classes
    parent=nodes[n['parent']] if n['parent']>=0 else None
    signature+='|adverbClass='+adverb_classes.get(w,'unreviewed')+'|governor='+str(parent['pos'] if parent else 'root')
   elif n['pos']=='INTJ':known=w in spec['fragments']
   if len(w)==1 and w.isalpha():signature+='|letter'
   if not known:signature+='|unreviewedLemma='+lemma
   if n['pos']=='NOUN':
    dets=sorted(nodes[c]['word'] for c in n['children'] if nodes[c]['relation'].split(':')[0]=='det')
    signature+='|determiners='+','.join(dets)
   if n['pos']=='NUM' or w.isdigit():
    # Keep numeric spellings and local clock/calendar domains compatible.
    signature+='|numeric='+('digit' if w.isdigit() else 'word')+'|width='+str(len(w))+'|one='+str(w in {'1','one'})
    if w.isdigit():
     value=int(w)
     signature+='|range='+('0' if value==0 else '1' if value==1 else '2-12' if value<=12 else '13-23' if value<=23 else '24-28' if value<=28 else '29' if value==29 else '30' if value==30 else '31' if value==31 else '32-59' if value<=59 else '60+')
    signature+='|padded='+str(w.startswith('0') and len(w)>1)
   pool='dep_'+digest(signature);lexicon[pool].add(w);pool_signatures[pool]=signature
   head={'role':pool,'form':'text','joinLeft':tight,'matchJoinLeft':tight if j>0 else None}
  parts=[(j,head)]+[(nodes[c]['lo'],{'symbol':nodes[c]['symbol']}) for c in n['children']]
  expansion=[p for _,p in sorted(parts,key=lambda pair:pair[0])]
  local.append((n['symbol'],json.dumps(expansion,ensure_ascii=False,sort_keys=True)))
 for p in local:productions.add(p);rules_evidence[p]+=1
 root_symbols.add(nodes[roots[0]]['symbol']);accepted.append(source+':'+sid)
for record in manifest['sources']:
 source=record['id'];raw=(BASE/f'sources/{source}-train.conllu').read_bytes()
 assert hashlib.sha256(raw).hexdigest()==record['sha256']
 doc=None
 for block in raw.decode().split('\n\n'):
  match=re.search(r'^# newdoc id = (.+)$',block,re.M)
  if match:doc=match[1]
  match=re.search(r'^# sent_id = (.+)$',block,re.M)
  if not match:continue
  sid=match[1]
  if (source,sid) not in ids and (source,doc) not in notes:continue
  try:dependency(block,source,sid)
  except ValueError as e:skipped.append({'id':source+':'+sid,'reason':str(e)})
output={'pools':{k:sorted(v) for k,v in sorted(lexicon.items())},'rules':[[lhs,json.loads(rhs)] for lhs,rhs in sorted(productions)],'roots':sorted(root_symbols)}
(ROOT/'tools/vocabulary/dependency-lexicon.json').write_text(json.dumps(output['pools'],ensure_ascii=False,indent=2)+'\n')
js='// GENERATED by tools/vocabulary/build_dependency_grammar.py. See dependency-grammar-audit.json.\nexport default '+json.dumps(output,ensure_ascii=False,separators=(',',':'))+';\n'
(ROOT/'src/dependency-grammar-data.js').write_text(js)
audit={'training':'development only; local dependency rules, no whole-sentence templates','corpus_sha256':manifest['corpus_sha256'],'sources':manifest['sources'],'accepted_training_sentences':len(accepted),'rules':len(productions),'pools':len(lexicon),'singleton_pools':sum(len(v)==1 for v in lexicon.values()),'rule_occurrences':dict(collections.Counter(rules_evidence.values())),'skipped':skipped,'pool_signatures':pool_signatures,'symbol_signatures':symbol_signatures,'output_sha256':hashlib.sha256(js.encode()).hexdigest()}
(ROOT/'documentation/coverage/dependency-grammar-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print(json.dumps({k:v for k,v in audit.items() if k not in {'sources','skipped','pool_signatures','symbol_signatures'}},indent=2));print('Skipped:',collections.Counter(r['reason'] for r in skipped))
