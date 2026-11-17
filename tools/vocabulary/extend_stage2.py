"""Idempotently extend the current pre-release static vocabulary from reviewed data."""
import hashlib,json,pathlib,re
root=pathlib.Path(__file__).resolve().parents[2]
spec=json.loads((root/'tools/vocabulary/stage2-lexicon.json').read_text())
path=root/'data/semantics.json'
data=json.loads((root/'data/candidates/draft-5000.json').read_text())
# Remove only our generated roles before rebuilding; leave original pool order intact.
roles={'finite-pronoun','framed-verb','predicate-adjective'}
data['entries']=[e for e in data['entries'] if not roles.intersection(e['roles']) and e.get('source')!='project-stage2']
# CMU's first listed pronunciation supplies sound classes. Do not guess the
# grammatical role or pronunciation of words absent from the pinned source.
pronunciation=(root/'tools/vocabulary/cmudict.dict').read_bytes()
record=spec['pronunciation_source']
if hashlib.sha256(pronunciation).hexdigest()!=record['sha256']: raise ValueError('Pronunciation source hash mismatch')
license=(root/'tools/vocabulary'/record['license_file']).read_bytes()
if hashlib.sha256(license).hexdigest()!=record['license_sha256']: raise ValueError('Pronunciation license hash mismatch')
onsets={}
for line in pronunciation.decode().splitlines():
 parts=line.split()
 if len(parts)<2: continue
 text=re.sub(r'\(\d+\)$','',parts[0])
 onsets.setdefault(text,'vowel' if parts[1][0] in 'AEIOU' else 'consonant')
for entry in data['entries']:
 if any(role in entry['roles'] for role in ['count-noun','adjective']):
  text=entry.get('forms',{}).get('singular',entry['text'])
  entry.setdefault('features',{})['onset']=onsets.get(text,'unreviewed')
next_id=max(e['id'] for e in data['entries'])+1
def add(text,role,features=None,forms=None):
 global next_id
 entry=dict(id=next_id,text=text,roles=[role],features=features or {},source='project-stage2')
 if forms: entry['forms']=forms
 data['entries'].append(entry);next_id+=1
for text,agreement in spec['pronouns'].items(): add(text,'finite-pronoun',dict(agreement=agreement,case='subject'))
for text in spec['predicate_adjectives']: add(text,'predicate-adjective',dict(gradable=text not in ['possible','available','right','wrong','sure','well'],attributive=text not in ['alone','well','sorry']))
for frame,rows in spec['verbs'].items():
 for row in rows:
  forms=dict(zip(['base','third','past','participle','gerund'],row.split()))
  add(forms['base'],'framed-verb',dict(frame=frame,progressive=forms['base'] not in spec['stative_verbs']),forms)
for frame,rows in spec['extra_frames'].items():
 for row in rows:
  forms=dict(zip(['base','third','past','participle','gerund'],row.split()))
  add(forms['base'],'framed-verb',dict(frame=frame,progressive=forms['base'] not in spec['stative_verbs'] and forms['base'] not in ['seem','belong']),forms)
for complement,words in spec.get('adjective_complements',{}).items():
 for text in words:add(text,'framed-adjective',dict(complement=complement))
existing={e['forms']['singular'] for e in data['entries'] if 'count-noun' in e['roles']}
for row in spec['count_nouns']:
 singular,plural=row.split()
 if singular in existing: continue
 add(singular,'count-noun',dict(onset=onsets.get(singular,'unreviewed')),dict(singular=singular,plural=plural))
existing_adjectives={e['text'] for e in data['entries'] if 'adjective' in e['roles']}
for text in spec['attributive_adjectives']:
 if text not in existing_adjectives: add(text,'adjective',dict(onset=onsets.get(text,'unreviewed')))
for kind,words in spec['adverbs'].items():
 for text in words: add(text,'adverb',dict(position=kind))
for text in spec['fragments']: add(text,'discourse-fragment',dict(prefix=text in ['oh','well','yeah','yes','no','okay','ok','wow','uh','um','sure']))
existing_mass={e['text'] for e in data['entries'] if 'mass-noun' in e['roles']}
for text in spec['mass_nouns']:
 if text not in existing_mass: add(text,'mass-noun')
for text in spec['proper_nouns']: add(text,'proper-noun')
dependency=root/'tools/vocabulary/dependency-lexicon.json'
if dependency.exists():
 for signature,words in json.loads(dependency.read_text()).items():
  for text in words:add(text,'dependency-lexeme',dict(signature=signature))
geography=json.loads((root/'tools/vocabulary/geography.json').read_text())
places=set()
for state in geography['states']:
 places.add(state['name']);places.update(state['cities'])
for country in geography['countries']:places.update(country['spellings'])
for aliases in geography['city_aliases'].values():places.update(aliases)
article_labels={name[4:] for country in geography['countries'] for name in country['spellings'] if name.startswith('the ')}
for text in sorted(places):add(text,'place-name',dict(agreement='sg',usage='label' if text in article_labels else 'ordinary'))
existing_vocatives={e['text'] for e in data['entries'] if 'vocative' in e['roles']}
for text in spec.get('vocatives',[]):
 if text not in existing_vocatives:add(text,'vocative')
for row in spec.get('significance_expressions',[]):
 add(row[0],'significance-expression',{},dict(zip(['base','third','past','participle'],row)))
# Whole singular noun phrases can share a domain without dropping articles or
# changing subject agreement. This is not a union of bare noun spellings.
nominals={}
for entry in data['entries'][:]:
 if 'person-name' in entry['roles']:nominals.setdefault(entry['text'],'person')
 if 'proper-noun' in entry['roles']:nominals.setdefault(entry['text'],'proper')
 if 'place-name' in entry['roles'] and entry['features']['usage']=='ordinary':nominals.setdefault(entry['text'],'place')
 if 'mass-noun' in entry['roles']:nominals.setdefault(entry['text'],'mass')
 if 'count-noun' in entry['roles']:nominals.setdefault('the '+entry['forms']['singular'],'count')
for text,kind in sorted(nominals.items()):add(text,'nominal-phrase',dict(agreement='sg',kind=kind))
for target in [path,root/'data/semantics/1.0.0.json']:
 target.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
