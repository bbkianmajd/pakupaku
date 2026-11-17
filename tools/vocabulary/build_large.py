#!/usr/bin/env python3
"""Build the pre-release vocabulary from pinned WordNet 2025 and authored grammar words.

The release archives are fetched at development time and SHA-256 checked. The
browser receives only the resulting static JSON, never these source archives.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from urllib.request import urlopen
import zipfile

ROOT = Path(__file__).resolve().parents[2]
WORD = re.compile(r'[a-z]{2,64}\Z')
SUBJECT_PRONOUNS = ('i', 'you', 'he', 'she', 'it', 'we', 'they')
OBJECT_PRONOUNS = ('me', 'you', 'him', 'her', 'it', 'us', 'them')
GREETINGS = ('hello', 'hi', 'hey', 'greetings')
VOCATIVES = ('world', 'sally', 'alice', 'everyone', 'friends', 'team')
SALUTATIONS = ('good', 'pleasant', 'lovely')
TIMES_OF_DAY = ('morning', 'afternoon', 'evening', 'night')
PRESENT_TRANSITIVE = ('love', 'like', 'know', 'see', 'help', 'want', 'need', 'trust',
                      'miss', 'admire', 'hate', 'remember', 'hear', 'find', 'follow',
                      'call', 'support', 'thank', 'meet', 'watch', 'visit', 'greet',
                      'hug', 'invite', 'respect', 'understand', 'teach', 'guide',
                      'cherish', 'serve', 'feed', 'chase', 'hold', 'buy', 'carry', 'notice')
PRESENT_INTRANSITIVE = ('sleep', 'laugh', 'smile', 'walk', 'run', 'arrive', 'wait',
                        'work', 'sing', 'dance', 'swim', 'travel', 'speak', 'rest',
                        'play', 'cry', 'dream', 'live', 'move', 'grow', 'fall',
                        'sit', 'stand', 'return', 'stay', 'stop', 'listen')
BASE_PRONOUNS = {'i', 'you', 'we', 'they'}
THIRD_PRONOUNS = {'he', 'she', 'it'}


def check_digest(path, expected):
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected:
        raise ValueError(f'{path}: SHA-256 mismatch ({digest})')


def archive(path, record, offline):
    if not path.exists():
        if offline:
            raise FileNotFoundError(f'{path}: pinned source not cached; run without --offline once')
        with urlopen(record['url'], timeout=120) as response:
            payload = response.read()
        if hashlib.sha256(payload).hexdigest() != record['sha256']:
            raise ValueError(f'{record["url"]}: downloaded release SHA-256 mismatch')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
    check_digest(path, record['sha256'])
    return zipfile.ZipFile(path)


def pluralize(lemma):
    if lemma.endswith('y') and lemma[-2] not in 'aeiou':
        return lemma[:-1] + 'ies'
    if lemma.endswith(('ch', 'sh', 's', 'x', 'z')):
        return lemma + 'es'
    return lemma + 's'


def read_source(json_zip, wndb_zip):
    entries = {}
    synsets = {}
    for name in json_zip.namelist():
        if name.startswith('entries-') and name.endswith('.json'):
            entries.update(json.loads(json_zip.read(name)))
        elif name.startswith('noun.') and name.endswith('.json'):
            for synset_id, value in json.loads(json_zip.read(name)).items():
                synsets[synset_id] = (name, value.get('definition', []))
    irregular = {
        base for line in wndb_zip.read('oewn2025/noun.exc').decode().splitlines()
        for base in line.split()[1:]
    }
    return entries, synsets, irregular


def eligible_noun(word, entry, synsets, irregular, manifest):
    if word in irregular or word.endswith('s') or word in manifest['noun_exclusions']:
        return False
    # A rare noun sense of an ordinary verb/adjective makes poor decoy text.
    if any(role in entry for role in ('v', 'a', 'r', 's')):
        return False
    senses = entry.get('n', {}).get('sense', [])
    allowed = set(manifest['noun_synset_files'])
    for sense in senses:
        file, definitions = synsets.get(sense.get('synset'), (None, []))
        if file in allowed and any(definition.lower().startswith(('a ', 'an '))
                                   for definition in definitions):
            return True
    return False


def eligible_adjective(word, entry, manifest):
    if word in manifest['adjective_exclusions']:
        return False
    # Participles in this source often require a phrase-specific complement.
    if word.endswith(('ed', 'ing')):
        return False
    if any(role in entry for role in ('v', 'r')):
        return False
    senses = entry.get('a', {}).get('sense', [])
    return bool(senses) and senses[0].get('adjposition') not in ('p', 'ip') and any(
        sense.get('adjposition') not in ('p', 'ip') for sense in senses
    )


def build(seed, words, entries, synsets, irregular, manifest, names):
    result = [dict(item) for item in seed['entries']]
    seen = {entry['text'] for entry in result}
    next_id = max(entry['id'] for entry in result) + 1
    # Fixed grammatical terminal for recursive coordination, authored locally.
    result.append({'id': next_id, 'text': 'and', 'roles': ['conjunction'], 'features': {}})
    seen.add('and')
    next_id += 1
    # Case-specific pronouns are authored grammar entries, not WordNet imports.
    for text in dict.fromkeys((*SUBJECT_PRONOUNS, *OBJECT_PRONOUNS)):
        roles = []
        if text in SUBJECT_PRONOUNS:
            roles.append('subject-pronoun')
            roles.append('present-base-pronoun' if text in BASE_PRONOUNS
                         else 'present-third-pronoun')
        if text in OBJECT_PRONOUNS:
            roles.append('object-pronoun')
        result.append({'id': next_id, 'text': text, 'roles': roles, 'features': {}})
        seen.add(text)
        next_id += 1
    counts = {'count-noun': 0, 'adjective': 0}
    evidence = []
    noun_target = manifest['target_new_count_nouns']
    target = manifest['target_distinct_words']
    # First choose frequent count nouns, then fill with frequent attributive
    # adjectives. One new surface word per entry keeps the target unambiguous.
    for role in ('count-noun', 'adjective'):
        for frequency_rank, word in enumerate(words, 1):
            if len(seen) >= target or (role == 'count-noun' and counts[role] >= noun_target):
                break
            if not WORD.fullmatch(word) or word in seen:
                continue
            item = entries.get(word)
            if not item:
                continue
            if role == 'count-noun':
                if not eligible_noun(word, item, synsets, irregular, manifest):
                    continue
                forms = {'singular': word, 'plural': pluralize(word)}
            else:
                if not eligible_adjective(word, item, manifest):
                    continue
                forms = None
            entry = {'id': next_id, 'text': word, 'roles': [role], 'features': {}}
            if forms:
                entry['forms'] = forms
            result.append(entry)
            seen.add(word)
            evidence.append({'word': word, 'role': role, 'frequency_rank': frequency_rank})
            counts[role] += 1
            next_id += 1
    if len(seen) < target:
        raise ValueError(f'Only {len(seen)} distinct words met the current selection rules')
    for role, words in (('greeting', GREETINGS), ('vocative', VOCATIVES),
                        ('salutation', SALUTATIONS), ('time-of-day', TIMES_OF_DAY)):
        for text in words:
            result.append({'id': next_id, 'text': text, 'roles': [role], 'features': {}})
            next_id += 1
    for role, words in (('present-transitive-verb', PRESENT_TRANSITIVE),
                        ('present-intransitive-verb', PRESENT_INTRANSITIVE)):
        for text in words:
            result.append({'id': next_id, 'text': text, 'roles': [role],
                           'features': {}, 'forms': {'base': text, 'third': pluralize(text)}})
            next_id += 1
    personal_names = {entry['text'] for entry in result if 'person-name' in entry['roles']}
    vocatives = {entry['text'] for entry in result if 'vocative' in entry['roles']}
    for text in names:
        roles = []
        if text not in personal_names:
            roles.append('person-name')
        if text not in vocatives:
            roles.append('vocative')
        if roles:
            result.append({'id': next_id, 'text': text, 'roles': roles, 'features': {}})
            next_id += 1
    return {'version': '1.0.0', 'language': 'en', 'entries': result}, evidence, counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache-dir', type=Path, default=Path.home() / '.cache/pakupaku-vocabulary')
    parser.add_argument('--offline', action='store_true', help='require archives in the cache')
    parser.add_argument('--output', type=Path, default=ROOT / 'data/candidates/draft-5000.json')
    parser.add_argument('--report', type=Path, default=ROOT / 'data/candidates/draft-5000-report.json')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'tools/vocabulary/large-source-manifest.json').read_text())
    frequency_path = ROOT / 'tools/vocabulary/frequency-top-50000.txt'
    seed_path = ROOT / 'data/candidates/seed-165.json'
    check_digest(frequency_path, manifest['frequency_file_sha256'])
    check_digest(seed_path, manifest['seed_candidate_sha256'])
    names_path = ROOT / 'tools/vocabulary/ssa-top-1000.txt'
    check_digest(names_path, manifest['ssa_top_1000_sha256'])
    names = names_path.read_text().splitlines()
    if len(names) != 1000 or len(set(names)) != 1000 or not all(WORD.fullmatch(x) for x in names):
        raise ValueError('Invalid pinned SSA name list')
    words = frequency_path.read_text().splitlines()
    with archive(args.cache_dir / 'english-wordnet-2025-json.zip',
                 manifest['wordnet_json'], args.offline) as json_zip, \
         archive(args.cache_dir / 'english-wordnet-2025.zip',
                 manifest['wordnet_wndb'], args.offline) as wndb_zip:
        entries, synsets, irregular = read_source(json_zip, wndb_zip)
    seed = json.loads(seed_path.read_text())
    candidate, evidence, counts = build(seed, words, entries, synsets, irregular, manifest, names)
    report = {
        'status': 'promoted to current pre-release vocabulary', 'version': '1.0.0',
        'distinct_words': len({entry['text'] for entry in candidate['entries']}),
        'entries': len(candidate['entries']), 'new_role_counts': counts,
        'source': 'Open English WordNet 2025 and wordfreq 3.1.1, plus pinned Wiktextract seed',
        'source_manifest': 'tools/vocabulary/large-source-manifest.json',
        'name_source': 'SSA national annual counts, 1880–2020, pinned archive mirror',
        'authored_grammar_entries': [
            {'word': entry['text'], 'roles': entry['roles'], 'source': 'project grammar'}
            for entry in (candidate['entries'][len(seed['entries']):len(seed['entries']) + 13] +
                          candidate['entries'][len(seed['entries']) + 13 + sum(counts.values()):
                                               len(seed['entries']) + 13 + sum(counts.values()) + 17 +
                                               len(PRESENT_TRANSITIVE) + len(PRESENT_INTRANSITIVE)])
        ],
        'selection': 'Frequent count nouns from selected synsets with article-led definitions and regular plural; then frequent attributive adjectives',
        'review_evidence': evidence,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(candidate, indent=2, ensure_ascii=False) + '\n')
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({k: report[k] for k in ['status','distinct_words','entries','new_role_counts']}, indent=2))


if __name__ == '__main__':
    main()
