import { tokenize, isWord, canonicalize } from '../../src/text.js';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createGrammar, parseNote, suggestNext } from '../../src/grammar.js';
import { analyzeDraft } from '../../src/draft.js';
import { encodeNote, decodeNote } from '../../src/codec.js';
const root = new URL('../../', import.meta.url);
const read = path => readFile(new URL(path, root));
const hash = data => createHash('sha256').update(data).digest('hex');
export const canonical = canonicalize;
export const tokens = tokenize;
export function replay(grammar, text) {
  const committed = [];
  for (const token of tokens(text)) {
    // Exercise every character prefix, as well as committed-token continuation.
    for (let i = 1; i <= token.length; i++) {
      const prefix = token.slice(0, i), next = suggestNext(grammar, committed, prefix);
      if (!next.words.some(w => w.startsWith(prefix)) && !(next.numberAllowed && /^\d+$/.test(prefix))) return false;
      const draft = analyzeDraft(grammar, [...committed, prefix].join(' '));
      if (draft.issue) return false;
    }
    const next = suggestNext(grammar, committed, token);
    if (!next.words.includes(token) && next.numberCandidate !== token) return false;
    committed.push(token);
  }
  return suggestNext(grammar, committed).complete && analyzeDraft(grammar, text).complete;
}
export async function measure(grammar, item) {
  const text = canonical(item.text), failures = [], diagnostics = {};
  const words = tokens(text).filter(isWord);
  const missing = [...new Set(words.filter(w => !grammar.surfaceWords.has(w)))];
  diagnostics.words = words.length; diagnostics.missing = missing;
  if (missing.length) failures.push('missing word');
  if (tokens(text).some(t => !isWord(t) && !/^[0-9]+$/.test(t) && !grammar.literals.has(t) && !grammar.surfaceWords.has(t))) failures.push('punctuation');
  // Annotation evidence survives lexical failures: these are candidate secondary causes,
  // not assertions that adding vocabulary alone proves or repairs a construction.
  const evidence = [...new Set((item.annotations || []).flatMap(a => {
    const result=[];
    if (/^(cop|expl)$/.test(a.relation)) result.push('verb frame');
    if (/^(aux|aux:pass)$/.test(a.relation)) result.push('agreement');
    if (/^(acl|advcl|ccomp|xcomp|acl:relcl)$/.test(a.relation)) result.push('clause structure');
    if (/^(det|nmod:poss|nummod)$/.test(a.relation)) result.push('noun phrase');
    return result;
  }))];
  try { parseNote(grammar, text); diagnostics.parse = true; }
  catch (error) { diagnostics.parse = false; diagnostics.parseError = error.message; failures.push('clause structure'); }
  diagnostics.composer = replay(grammar, text);
  if (!diagnostics.composer) failures.push('UI');
  diagnostics.roundtrip = null; diagnostics.decoys = null;
  if (diagnostics.parse) {
    try {
      const payload = await encodeNote(grammar, text, 'benchmark-author', { salt: new Uint8Array(16) });
      diagnostics.roundtrip = await decodeNote(grammar, payload, 'benchmark-author') === text;
      if (!diagnostics.roundtrip) failures.push('tokenization', 'codec');
      diagnostics.decoys = true;
      for (const key of ['', 'x', 'wrong', 'benchmark-reader']) {
        const reading = await decodeNote(grammar, payload, key);
        try { parseNote(grammar, reading); if (!replay(grammar, reading)) throw Error('Composer replay'); }
        catch { diagnostics.decoys = false; failures.push('codec'); }
      }
    } catch (error) { failures.push('codec'); diagnostics.codecError = error.message; }
  }
  return { id:item.id, source:item.source, group:item.group, kind:item.kind, category:item.category, text, success:!failures.length, failures:[...new Set(failures)], secondaryCandidates: diagnostics.parse ? [] : evidence, diagnostics, length:tokens(text).length, names:(item.annotations||[]).some(a=>a.upos==='PROPN'), numbers:/\d/.test(text) };
}
export async function verify() {
  const manifest = JSON.parse(await read('data/coverage/manifest.json'));
  const raw = await read('data/coverage/items.json');
  if (hash(raw) !== manifest.corpus_sha256) throw Error('Corpus hash mismatch');
  for (const source of manifest.sources) {
    if (hash(await read(`data/coverage/sources/${source.id}-train.conllu`)) !== source.sha256 || hash(await read(`data/coverage/sources/${source.id}-README.md`)) !== source.readme_sha256) throw Error('Source hash mismatch');
  }
  const items = JSON.parse(raw), groups=new Map(), ids=new Set(), seen=[];
  for (const item of items) {
    if(ids.has(item.id)) throw Error('Duplicate ID'); ids.add(item.id);
    const group = `${item.source}:${item.group}`, prior=groups.get(group);
    if (prior && prior !== item.split) throw Error('Split leakage'); groups.set(group,item.split);
    if (item.source==='project') { if(item.split!=='development') throw Error('Generated acceptance item'); continue; }
    const set=new Set(canonical(item.text).match(/[a-z0-9]+/g)||[]);
    for(const other of seen) {
      const intersection=[...set].filter(x=>other.set.has(x)).length, union=new Set([...set,...other.set]).size;
      if(other.split!==item.split && (intersection===union || (Math.min(set.size,other.set.size)>=5 && intersection/union>=.85))) throw Error('Near duplicate split leakage');
    }
    seen.push({set,split:item.split});
  }
  return {manifest,items};
}
const tally = rows => ({ total:rows.length, passed:rows.filter(r=>r.success).length, failed:rows.filter(r=>!r.success).length });
export async function run({ reportName = 'baseline' } = {}) {
  const {manifest,items}=await verify();
  const grammar=createGrammar(JSON.parse(await read('data/semantics.json')));
  const results=[];
  for(const item of items.filter(x=>x.split==='development')) { results.push(await measure(grammar,item)); if(results.length%100===0) console.log(`Measured ${results.length} items; ${results.filter(r=>r.success).length} passed`); }
  const independent=results.filter(r=>r.source!=='project');
  const breakdown = key => Object.fromEntries([...new Set(independent.map(key))].sort().map(value=>[value,tally(independent.filter(r=>key(r)===value))]));
  const counts=Object.fromEntries(['sentence','note'].map(kind=>[kind,tally(independent.filter(r=>r.kind===kind))]));
  const ranking=Object.entries(results.reduce((out,r)=>{for(const family of new Set([...r.failures,...r.secondaryCandidates])) out[family]=(out[family]||0)+1; return out;},{})).sort((a,b)=>b[1]-a[1]);
  const implementation={};
  for(const path of ['src/grammar.js','src/grammar-contract.js','src/dependency-grammar-data.js','src/productive-grammar.js','tools/vocabulary/build_dependency_grammar.py','tools/vocabulary/dependency-lexicon.json','src/numeric-formats.js','src/text.js','tools/vocabulary/stage2-lexicon.json','tools/vocabulary/extend_stage2.py','tools/vocabulary/geography.json','tools/vocabulary/geography-source.json','tools/vocabulary/build_geography.py','tools/vocabulary/us-places.tsv','tools/vocabulary/geography-sources/countries.json','tools/vocabulary/geography-sources/LICENSE-countries','tools/vocabulary/cmudict.dict','tools/vocabulary/cmudict-LICENSE','src/draft.js','src/codec.js','src/mapping.js','src/vocabulary.js','src/numbers.js','src/binary.js','src/codec-worker.js','src/demo.js','data/semantics.json','tools/coverage/run.js','tools/coverage/build.py','data/coverage/inventory.json']) implementation[path]=hash(await read(path));
  const lexicalBacklog=Object.entries(independent.reduce((counts,row)=>{for(const word of row.diagnostics.missing) counts[word]=(counts[word]||0)+1;return counts;},{})).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const poolAudit={singletons:[...grammar.pools].filter(([name,entries])=>entries.length===1).map(([name])=>name).sort(),emptyPools:[...grammar.pools].filter(([name,entries])=>!entries.length).map(([name])=>name).sort(),fixedLiterals:[...grammar.literals].sort(),note:'Singleton choices and fixed grammar literals disclose content. Empty roles are unsupported, not pass-through.'};
  const report={lexicalBacklog,poolAudit,status:'Coverage is unproven. Development pilot only; no release confidence claim.',corpus:manifest.corpus_sha256,implementation,counts,regressions:tally(results.filter(r=>r.source==='project')),bySource:breakdown(r=>r.source),byCategory:breakdown(r=>r.category),byLength:breakdown(r=>r.length<=10?'1-10':r.length<=30?'11-30':'31+'),byNames:breakdown(r=>String(r.names)),byNumbers:breakdown(r=>String(r.numbers)),weighted:Object.fromEntries(['sentence','note'].map(kind=>[kind,Object.entries(manifest.mix).reduce((sum,[category,weight])=>{const rows=independent.filter(r=>r.kind===kind&&r.category===category);return sum+weight*(rows.filter(r=>r.success).length/rows.length);},0)])),ranking,results};
  await writeFile(new URL(`documentation/coverage/${reportName}.json`,root),JSON.stringify(report,null,2)+'\n');
  const inventory=JSON.parse(await read('data/coverage/inventory.json'));
  const lines=['# Language benchmark baseline','','**Coverage is unproven.** Only development items were measured. Reserved validation and acceptance pilot splits remain unmeasured. No release gate is satisfied.','', `Run \`python3 tools/coverage/build.py\` to reconstruct fixtures, \`npm run ${reportName==='baseline'?'coverage':'coverage:stage2'}\` to verify provenance/isolation and reproduce this report. No network is needed.`,'', '| Independent items | Passed | Total |','| --- | ---: | ---: |',...Object.entries(counts).map(([kind,c])=>`| ${kind} | ${c.passed} | ${c.total} |`),'',`Project regressions (including all known gaps): ${report.regressions.passed}/${report.regressions.total}.`,'',`See [manifest](../../data/coverage/manifest.json) for fixed sampling, license attribution, normalization and provisional weights; [machine report](${reportName}.json) for every failure, lexical miss, secondary candidate and source/category/length/name/number breakdown. Equal-source weighted scores are exploratory, not deployment estimates. No exclusions were applied, so all-submitted and pilot scores coincide.`,'', '## Construction audit','','Inventory audited against [UD syntax](https://universaldependencies.org/u/overview/syntax.html), [English relations](https://universaldependencies.org/en/dep/) and pinned EWT/GUM annotation evidence. Annotation flags identify candidate dependencies, not a complete grammar diagnosis. Untested cells remain blocked.','', '| Dimension | Required cells | Status and evidence |','| --- | --- | --- |',...inventory.map(r=>`| ${r.dimension} | ${r.cells.join('; ')} | ${r.status}; ${r.evidence} |`),'','## Measured backlog','','Counts overlap: lexical and structural blockers can affect the same input. These are family-level triage candidates; agreement and ambiguity require targeted analysis, not inference from a generic parse error.','',...ranking.map(([family,count])=>`- ${family}: ${count} items (direct failures or annotated secondary candidates).`),'','Dependencies: shared feature/verb-frame model → noun phrases and copulas → auxiliaries/questions → recursive clauses. Lexical form/role audit runs alongside each family. Punctuation/tokenization and composer continuation must preserve exact canonical round trips.','', '## Limits and owner review','','This small convenience pilot uses workplace email and transcribed conversation rather than a representative contemporary personal-message sample. Document isolation is verified; unknown shared authors/threads remain a clustering risk. Notes are whole source documents, including long ones. No component sentence of a sampled note is separately counted.','', 'The harness calls production parser, codec, draft analysis and suggestion APIs. It does not claim browser DOM/worker transport, latency, independent decoy grammaticality or every-key proof; those remain required later gates. Failed parse items retain null codec/decoy diagnostics and count as full-pipeline failures.','', 'Owner review pending: confirm personal-message scope, equal-source pilot mix, normalization and treatment of typos/emoji/URLs/code/jargon. Inspect examples in items.json and baseline.json. Larger representative collection, category labeling, fresh human challenge batches and acceptance quotas remain outstanding.'];
  await writeFile(new URL(`documentation/coverage/${reportName}.md`,root),lines.join('\n')+'\n');
  console.log(JSON.stringify({counts,regressions:report.regressions}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)) await run({reportName:process.argv.includes('--stage2')?'stage2-progress':'baseline'});
