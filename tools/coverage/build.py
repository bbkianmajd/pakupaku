"""Rebuild the pilot from pinned UD 2.15 sources; never consult parser results."""
import hashlib, json, pathlib, re
ROOT = pathlib.Path(__file__).resolve().parents[2]
BASE = ROOT / 'data/coverage'
def digest(value): return hashlib.sha256(value).hexdigest()
def write(path, value): path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')
def fingerprint(text): return set(re.findall(r"[a-z0-9]+", text.lower()))
def near(a,b):
    return a == b or (min(len(a),len(b)) >= 5 and len(a & b)/len(a | b) >= .85)
items=[]; sources=[]; seen=[]; source_docs={}
for source, genre, license in [('ewt','email','CC-BY-SA-4.0'),('gum','conversation','CC-BY-NC-SA-4.0')]:
    raw=(BASE/f'sources/{source}-train.conllu').read_bytes()
    readme=(BASE/f'sources/{source}-README.md').read_bytes()
    repo='UD_English-'+source.upper()
    sources.append(dict(id=source,url=f'https://github.com/UniversalDependencies/{repo}/tree/r2.15',license=license,sha256=digest(raw),readme_sha256=digest(readme),attribution=f'Universal Dependencies {repo}, release 2.15; full credits in sources/{source}-README.md'))
    docs={}; doc=None
    for block in raw.decode().split('\n\n'):
        m=re.search(r'^# newdoc id = (.+)$',block,re.M)
        if m: doc=m[1]
        text=re.search(r'^# text = (.+)$',block,re.M)
        sid=re.search(r'^# sent_id = (.+)$',block,re.M)
        if doc and genre in doc and text and sid:
            rows=[line.split('\t') for line in block.splitlines() if re.match(r'^\d+\t',line)]
            docs.setdefault(doc,[]).append(dict(text=text[1],sid=sid[1],annotations=[dict(form=r[1],lemma=r[2],upos=r[3],features=r[5],relation=r[7]) for r in rows]))
    # Hash ordering is fixed before measuring. Whole documents are the sampling unit.
    ordered=sorted(docs,key=lambda d:digest(d.encode()))
    accepted=0
    for doc in ordered:
        sentences=docs[doc]
        combined=' '.join(s['text'] for s in sentences)
        fp=fingerprint(combined)
        if any(near(fp,x) for x in seen): continue
        # Prevent exact and near duplicates of utterances across all selected documents.
        fps=[fingerprint(s['text']) for s in sentences]
        if any(any(near(f,x) for x in seen) for f in fps): continue
        split=['development','validation','acceptance'][accepted % 10 // 8 if accepted % 10 < 9 else 2]
        kind='note' if accepted % 3 == 0 else 'sentence'
        candidates=[dict(text=combined,sid=doc,annotations=sum([s['annotations'] for s in sentences],[]))] if kind=='note' else sentences
        for s in candidates:
            f=fingerprint(s['text'])
            if kind=='sentence' and any(near(f,x) for x in seen): continue
            items.append(dict(id=f'{source}:{s["sid"]}',source=source,group=doc,split=split,kind=kind,category='work' if source=='ewt' else 'conversation',**s))
            seen.append(f)
        seen.extend(fps); accepted+=1
        if accepted==30: break
    source_docs[source]=(ordered,docs)
for source, (ordered,docs) in source_docs.items():
    # Preserve the original pilot's groups and reserved splits. Add sentence-only
    # documents in the same hash order, without consulting language support.
    selected_groups={i['group'] for i in items if i['source']==source}
    count=sum(i['source']==source and i['split']=='development' and i['kind']=='sentence' for i in items)
    for doc in ordered:
        if count>=500: break
        if doc in selected_groups: continue
        for sentence in docs[doc]:
            f=fingerprint(sentence['text'])
            if any(near(f,x) for x in seen): continue
            items.append(dict(id=f'{source}:{sentence["sid"]}',source=source,group=doc,split='development',kind='sentence',category='work' if source=='ewt' else 'conversation',**sentence))
            seen.append(f); count+=1
            if count>=500: break
    if count<500: raise ValueError(f'{source}: insufficient independent sentence candidates ({count}/500)')

legacy=json.loads((BASE/'everyday.json').read_text())
for i,text in enumerate(legacy['supported']+sum(legacy['known_gaps'].values(),[])):
    items.append(dict(id=f'regression:{i}',source='project',group='project',split='development',kind='sentence',category='regression',text=text,annotations=[]))
write(BASE/'items.json',items)
manifest=dict(version=1,scope='Ordinary contemporary English personal messages. Pilot proxies: workplace email and spoken conversation; not a representative deployment sample.',normalization='Lowercase; collapse whitespace; remove spaces before closing sentence punctuation, around numeric date slashes and after a clock colon. No paraphrase or word removal.',exclusions='None in this pilot. Typos, emoji, URLs, code, non-English and jargon retained in all-submitted denominators; future representative collection must prelabel scope before measurement.',sampling='UD r2.15 training files, email/conversation documents in SHA256(document ID) order. Preserve original pilot: first 30 nonduplicate documents per source, every third retained document supplies an intact note; others supply sentences, 80/10/10 document split by retained ordinal. Expansion: scan unselected documents in the same order, adding development sentences until each source has exactly 500 development sentences. Reserved pilot groups remain unchanged. The last expansion document may be partially sampled. Global token-set Jaccard >= .85 for >=5 tokens or identical token sets removed before sampling. Conservative similarity can remove legitimate repeated greetings.',mix={'work':.5,'conversation':.5},mix_status='Provisional equal source weighting, not observed deployment frequencies; owner scope review pending.',acceptance_status='Reserved pilot split, not measured by default. Insufficient size and author/thread metadata for release independence; obtain fresh human challenge batches and representative 10000 sentences/2000 notes for stage 4.',sources=sources,corpus_sha256=digest((BASE/'items.json').read_bytes()))
write(BASE/'manifest.json',manifest)
