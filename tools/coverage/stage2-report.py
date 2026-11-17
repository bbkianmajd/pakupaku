"""Current full-pipeline gap analysis, with training provenance and disclosure."""
import collections, hashlib, json, pathlib
ROOT=pathlib.Path(__file__).resolve().parents[2]
def read(p):return (ROOT/p).read_bytes()
def sha(b):return hashlib.sha256(b).hexdigest()
def obj(p):return json.loads(read(p))
raw=read('documentation/coverage/stage2-progress.json');report=json.loads(raw)
for path,digest in report['implementation'].items():assert sha(read(path))==digest,f'Stale measured implementation: {path}'
assert sha(read('data/coverage/items.json'))==report['corpus']
prefix=obj('documentation/coverage/stage2-prefix-audit.json');assert prefix['snapshot_sha256']==sha(raw)
layout=obj('documentation/coverage/stage2-layout-audit.json');assert layout['measurement_sha256']==sha(raw)
previous=obj('documentation/coverage/stage2-before-90.json')
rows=[r for r in report['results']if r['source']!='project'and r['kind']=='sentence'];failed=[r for r in rows if not r['success']]
old={r['id']:r for r in previous['results']if r['source']!='project'and r['kind']=='sentence'}
assert set(old)=={r['id']for r in rows}and previous['corpus']==report['corpus']
notes=[r for r in report['results']if r['source']!='project'and r['kind']=='note']
audit={r['id']:r for r in prefix['diagnostics']};training=obj('documentation/coverage/dependency-grammar-audit.json')
skipped={r['id']:r['reason']for r in training['skipped']}
# Reviewed families diagnose construction breadth. The extraction's skipped-tree
# reason is retained separately and is not asserted to be a complete root cause.
family={
 'ewt:email-enronsent34_01-0008':'Comparison and relative-clause composition',
 'ewt:email-enronsent00_01-0003':'Relative gaps with a stranded preposition',
 'ewt:email-enronsent34_01-0021':'Unfinished greeting/vocative ending in a comma',
 'ewt:email-enronsent03_01-0122':'Unfinished greeting/vocative ending in a comma',
 'gum:GUM_conversation_blacksmithing-89':'Discourse prefixes and informal wh-question composition',
 'gum:GUM_conversation_zero-84':'Mathematical labels and coordinated nominal ellipsis',
 'gum:GUM_conversation_blacksmithing-43':'Relative gaps with a stranded preposition',
 'gum:GUM_conversation_christmas-30':'Conversational restarts and stranded complements',
}
def primary(r):
 d=r['diagnostics'];missing=bool(d['missing']);surface='punctuation'in r['failures']
 if missing:return 'Missing words plus unsupported surface tokens'if surface else'Missing words (possibly also structural gaps)'
 if surface:return 'Unsupported surface tokens (known words)'
 if not d['parse']:return 'Known-word construction/role rejection'
 if not d['roundtrip']:return 'Author recovery / canonical rendering failure'
 if not d['composer']:return 'Composer prefix/continuation failure'
 if not d['decoys']:return 'Alternate-reader structural/composer failure'
 return 'Other full-pipeline failure'
counts=collections.Counter(primary(r)for r in failed)
construction=collections.Counter();per_item=[]
for r in failed:
 cause=family.get(r['id'],'Interrupted, restarted or dislocated conversational clauses'if skipped.get(r['id'])=='nonprojective dependency'else primary(r))
 if not r['diagnostics']['parse']:construction[cause]+=1
 per_item.append({'id':r['id'],'primary':primary(r),'reviewed_family':cause,'extraction_skip':skipped.get(r['id']),'first_rejection':audit[r['id']]['firstRejection'],'text':r['text'],'diagnostics':r['diagnostics']})
rescued=[r['id']for r in rows if r['success']and not old[r['id']]['success']]
regressed=[r['id']for r in rows if not r['success']and old[r['id']]['success']]
missing=collections.Counter(w for r in failed for w in r['diagnostics']['missing'])
surface=collections.Counter(w for r in failed for w in audit[r['id']]['unsupportedTokens'])
n=len(rows);f=len(failed);passed=n-f
pct=lambda c,d=n:f'{100*c/d:.2f}%'if d else'n/a'
lines=['STAGE 2 REPORT: DEVELOPMENT COVERAGE ABOVE 90%', '='*47,'',
 f'Full-pipeline sentences: {passed}/{n} ({pct(passed)}). Target: at least 901/{n}.',
 f'Before: {sum(r["success"]for r in old.values())}/{n}; newly passing: {len(rescued)}; regressions: {len(regressed)}.',
 f'Complete source notes: {sum(r["success"]for r in notes)}/{len(notes)}. Project cases: {report["regressions"]["passed"]}/{report["regressions"]["total"]}.',
 'All original input IDs, texts and denominators retained. No excluded failures.',
 f'Corpus SHA-256: {report["corpus"]}',f'Measurement SHA-256: {sha(raw)}',
 'All implementation hashes verified against the frozen measured files.','',
 'INTERPRETATION: DEVELOPMENT-TRAINED, NOT HELD-OUT COVERAGE',
 'The new local dependency grammar and lexical classes are learned from the',
 'development annotations, including constituent sentences of development notes.',
 'This is a training-set engineering score. It does not establish 90% success',
 'on unseen English. Validation and acceptance were not used or measured.',
 'The runtime has typed reusable phrase rules and finite vocabulary pools, not',
 'a source-sentence lookup or arbitrary-text fallback. Source-annotation errors',
 'and sparse phrase patterns still limit generalization and decoy grammaticality.',
 'Stage 2 remains open: the 99.5% sentence/note gates and independent review fail.','',
 'WHAT CHANGED',
 '1. Reproducible development-only dependency grammar and sourced lexical roles.',
 '   It preserves morphology, case/markers, selected complements, pronunciation',
 '   onset, delimiter interfaces and exact token joining. Sentence endings share',
 '   the existing document grammar, so learned and productive utterances combine.',
 '2. Productive finite coordination, auxiliary/passive chains, relative/object',
 '   gaps, embedded questions, selected object/adjective complements, indefinite',
 '   pronouns, gerund phrases and modifiers. Reviewed verb/noun/adjective breadth.',
 '3. Bounded per-grammar recognition/suggestion caches and indexed lexical pools.',
 '   These remove repeated prefix work while preserving deterministic parsing.',
 '4. The initial extraction-only candidate passed 2/15 newly authored ordinary',
 '   messages. Productive grammar fixes now pass '+str(layout['composition']['passed'])+'/15 through the full pipeline.',
 '   Those messages are now regression fixtures, not independent acceptance.','',
 'RANKED EXCLUSIVE FAILURE BUCKETS',
 f'Denominators: {n} sentences; {f} failures. Rows sum to all failures.',
 'Rank | Count | % of all sentences | % of failures | Necessary observed blocker']
for i,(label,c)in enumerate(counts.most_common(),1):lines.append(f'{i:>4} | {c:>5} | {pct(c):>18} | {pct(c,f):>13} | {label}')
lines+=['','REVIEWED STRUCTURAL FAMILIES (PARSER FAILURES ONLY)',
 'Labels summarize the visible construction; they are not proof that one fix',
 'alone rescues an input. Source-extraction skip reasons are recorded separately.']
for label,c in construction.most_common():lines.append(f'  {c:>3} ({pct(c)} of all; {pct(c,f)} of failures) {label}')
lines+=['','OVERLAPPING REMAINING LEXICAL AND SURFACE GAPS',
 f'Missing-word items: {sum(bool(r["diagnostics"]["missing"])for r in failed)}/{n}.',
 f'Unsupported surface-token items: {sum("punctuation"in r["failures"]for r in failed)}/{n}.',
 'Missing spellings: '+(', '.join(f'{w} ({c})'for w,c in missing.most_common())or'none'),
 'Unsupported surface tokens: '+(', '.join(f'{w!r} ({c})'for w,c in surface.most_common())or'none'),'',
 'PIPELINE EVIDENCE',
 f'Parse successes: {sum(r["diagnostics"]["parse"]for r in rows)}/{n}.',
 f'Parse-success/composer failures: {sum(r["diagnostics"]["parse"]and not r["diagnostics"]["composer"]for r in rows)}.',
 f'Author recoveries: {sum(r["diagnostics"]["roundtrip"]is True for r in rows)}/{n}.',
 f'Four sampled alternate-reader keys pass: {sum(r["diagnostics"]["decoys"]is True for r in rows)}/{n}.',
 'Each successful item passed every-character prefix replay, exact author-key',
 'recovery and all four alternate-key replays. Missing diagnostics mean not',
 'reached, never passed. Replay does not independently certify grammaticality.','',
 'PUBLIC-LAYOUT / LEXICAL DISCLOSURE',
 f'Generated local productions: {training["rules"]}; lexical pools: {training["pools"]}; singleton pools: {training["singleton_pools"]}.']
lc=layout['counts']
lines +=[f'Across passing sentences: {lc["slots"]} semantic slots; {lc["variableSlots"]} have multiple choices; {lc["singletonSlots"]} are singleton.',
 f'Fixed word-literal occurrences: {lc["fixedWordLiterals"]}. Sentences with no variable slots: {lc["sentencesWithoutVariableSlots"]}/{lc["sentences"]}.',
 f'Deterministic 50-reading disclosure sample: {layout["sample"]["unchanged"]} readings unchanged under the sampled other key.',
 'Singletons, grammatical literals and distinctive layouts disclose content.',
 'Narrow/unreviewed senses are deliberately not exchanged with arbitrary POS',
 'peers. This protects local grammatical compatibility but reduces concealment.',
 'The required independent 1,000-reading grammatical review remains outstanding.','',
 'EVERY REMAINING FAILED SENTENCE']
for row in per_item:
 issue=row['first_rejection'];at=issue['token']if issue else 'see pipeline diagnostics'
 lines +=[f'{row["id"]}: {row["primary"]}',f'  Family: {row["reviewed_family"]}; first rejection: {at!r}; extraction: {row["extraction_skip"] or "not skipped"}',f'  {row["text"]}']
lines +=['','COMPLETE SOURCE NOTES',*[f'  {r["id"]}: '+('PASS'if r['success']else', '.join(r['failures']))for r in notes],
 'Short mixed notes have separate automated/browser coverage; they do not',
 'replace these three intact source documents in the note denominator.','',
 'BENCHMARK LIMITS',
 'The fixed pilot contains 449 email, 51 newsgroup and 500 transcribed',
 'conversation sentences from 13 documents/conversations. An original selector',
 'also matched newsgroup IDs containing emails. Math, restarts, partial words,',
 'typos and unusual source content remain counted. Three notes are insufficient',
 'to estimate note coverage. Future representative collection must be declared',
 'in advance; do not discard these failures or retune a held-out acceptance set.','',
 'CONCLUSION AND RANKED NEXT WORK',
 'The requested development engineering checkpoint is '+('met.'if passed>900 else'NOT met.'),
 '1. Measure fresh, predeclared held-out messages and complete notes to test',
 '   generalization; keep the development-trained score explicitly labeled.',
 '2. Expand productive relative/preposition gaps, comparisons, discourse repairs',
 '   and question/ellipsis composition. Avoid source-specific sentence rules.',
 '3. Expand reviewed grammatical lexical equivalence classes to reduce singleton',
 '   disclosure, while independently auditing alternate-reader English.',
 '4. Complete source-document composition and resource/latency checks, retaining',
 '   every failed note. Preserve negative controls and exact author recovery.',
 '5. Reach 99.5% development AND validation sentence/note coverage and complete',
 '   the independent decoy review before closing Stage 2 or publishing.','',
 'REPRODUCTION',
 '  python3 tools/vocabulary/build_dependency_grammar.py',
 '  python3 tools/vocabulary/extend_stage2.py',
 '  node tools/coverage/run.js --stage2',
 '  node tools/coverage/stage2-diagnostics.js',
 '  node tools/coverage/layout-audit.js',
 '  python3 tools/coverage/stage2-report.py',
 'Plan: documentation/coverage/road-to-90.md.',
 'Design/provenance: documentation/coverage/dependency-grammar.md.',
 'Previous result retained as documentation/coverage/stage2-before-90.json.']
geography_path=ROOT/'tools/vocabulary/geography.json'
if geography_path.exists():
 geo=json.loads(geography_path.read_text());geo_before_path=ROOT/'documentation/coverage/stage2-before-geography.json'
 geo_before=json.loads(geo_before_path.read_text()) if geo_before_path.exists() else None
 lines+=['','GEOGRAPHY FOLLOW-UP',
  f"Inventory: {len(geo['states'])} states, {sum(len(s['cities'])for s in geo['states'])} city/state memberships including all capitals, {len(geo['countries'])} country/territory entities.",
  'This is broad geographic coverage, not a measured discussion-frequency ranking.',
  'Multiword names are one semantic choice; continuation tokens do not mix names.',
  'See documentation/geography-vocabulary.md for the full catalog and sources.']
 if geo_before:
  old_geo={r['id']:r for r in geo_before['results']if r['source']!='project'and r['kind']=='sentence'}
  assert set(old_geo)=={r['id']for r in rows} and geo_before['corpus']==report['corpus']
  lines.append(f"Before geography: {sum(r['success']for r in old_geo.values())}/{n}; after: {passed}/{n}; regressions: {sum(old_geo[r['id']]['success']and not r['success']for r in rows)}.")
variation_path=ROOT/'documentation/coverage/key-variation.json'
if variation_path.exists():
 variation=json.loads(variation_path.read_text())
 lines+=['','KEY AND PHRASE VARIATION FOLLOW-UP',
  'Full exact passkeys already entered SHA-256 before HMAC-based mapping; derivation is unchanged.',
  f"Predicate adjective choices: {variation['predicateAdjectives']}; compatible singular noun phrases: {variation['compatibleSingularNominals']}.",
  'Names, places, mass nouns and complete definite noun phrases can share compatible singular positions.',
  'Selected significance expressions preserve their required complement instead of exchanging arbitrary verbs/nouns.',
  'See documentation/coverage/key-variation.md and key-variation.json for constraints and sample keys.']
 before_variation_path=ROOT/'documentation/coverage/stage2-before-variation.json'
 if before_variation_path.exists():
  before_variation=json.loads(before_variation_path.read_text())
  old_variation={r['id']:r for r in before_variation['results']if r['source']!='project'and r['kind']=='sentence'}
  assert set(old_variation)=={r['id']for r in rows} and before_variation['corpus']==report['corpus']
  lines.append(f"Before variation: {sum(r['success']for r in old_variation.values())}/{n}; after: {passed}/{n}; regressions: {sum(old_variation[r['id']]['success']and not r['success']for r in rows)}.")
(ROOT/'stage_2_report.txt').write_text('\n'.join(lines)+'\n')
(ROOT/'documentation/coverage/stage2-root-causes.json').write_text(json.dumps({'measurement_sha256':sha(raw),'corpus_sha256':report['corpus'],'counts':{'passed':passed,'failed':f,'total':n},'exclusive':dict(counts.most_common()),'structural_families':dict(construction.most_common()),'rescued':rescued,'regressed':regressed,'failures':per_item},indent=2)+'\n')
print(f'{passed}/{n}; failures {f}; rescued {len(rescued)}; regressions {len(regressed)}')
