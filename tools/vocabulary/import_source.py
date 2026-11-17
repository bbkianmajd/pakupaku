#!/usr/bin/env python3
"""Convert a pinned Wiktextract slice into a review-only semantics candidate."""
import argparse
from collections import defaultdict, Counter
import hashlib
import json
from pathlib import Path
import re

WORD = re.compile(r'[a-z]{1,64}\Z')
VERSION = re.compile(r'(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\Z')
VALID_ROLES = {'count-noun', 'mass-noun', 'adjective', 'person-name',
               'past-transitive-verb', 'past-intransitive-verb'}
BAD_SENSE_TAGS = {'archaic', 'obsolete', 'historical', 'dated', 'rare', 'slang',
                  'vulgar', 'offensive', 'regional', 'dialectal', 'abbreviation',
                  'initialism', 'form-of', 'alt-of'}
BAD_FORM_TAGS = BAD_SENSE_TAGS | {'humorous', 'nonstandard', 'poetic', 'alternative'}


def clean_word(text):
    return isinstance(text, str) and bool(WORD.fullmatch(text))


def accepted_senses(record, needed):
    for sense in record.get('senses', []):
        tags = set(sense.get('tags', []))
        if tags & BAD_SENSE_TAGS or 'form-of' in tags or 'alt-of' in tags:
            continue
        if needed == 'count-noun' and ('uncountable' not in tags or 'countable' in tags):
            yield sense
        elif needed == 'mass-noun' and ('uncountable' in tags or 'usually uncountable' in tags):
            yield sense
        elif needed == 'adjective' and 'predicative' not in tags:
            yield sense
        elif needed == 'past-transitive-verb' and 'transitive' in tags:
            yield sense
        elif needed == 'past-intransitive-verb' and 'intransitive' in tags:
            yield sense
        elif needed == 'person-name' and (sense.get('person_name_evidence') or
            'given-name' in tags or 'male given name' in tags or 'female given name' in tags
            or 'surname' in tags or 'first-name' in tags
        ):
            yield sense


def forms_for(record, wanted):
    values = set()
    for item in record.get('forms', []):
        form = item.get('form')
        tags = set(item.get('tags', []))
        if not clean_word(form) or tags & BAD_FORM_TAGS:
            continue
        if wanted == 'plural' and 'plural' in tags and not ('alternative' in tags or 'rare' in tags):
            values.add(form)
        elif wanted == 'past' and 'past' in tags and 'participle' not in tags:
            values.add(form)
    return values


def produce(proposals, records, seed, version, form_overrides=None):
    if not VERSION.fullmatch(version):
        raise ValueError('Invalid candidate version')
    form_overrides = form_overrides or {}
    by_word = defaultdict(list)
    for record in records:
        if record.get('lang_code') == 'en' and isinstance(record.get('word'), str):
            by_word[record['word']].append(record)
    entries = [dict(item) for item in seed['entries']]
    existing = {(entry['text'], role) for entry in entries for role in entry['roles']}
    next_id = max(entry['id'] for entry in entries) + 1
    report = []
    for role in sorted(proposals):
        for requested in sorted(set(proposals[role])):
            if role == 'excluded':
                report.append({'word': requested, 'role': role, 'status': 'excluded',
                               'reason': 'Unsupported grammar use; explicitly excluded'})
                continue
            if role not in VALID_ROLES:
                raise ValueError(f'Unknown role: {role}')
            candidates = [r for r in by_word[requested] if r.get('pos') == {
                'count-noun': 'noun', 'mass-noun': 'noun', 'adjective': 'adj',
                'person-name': 'name', 'past-transitive-verb': 'verb',
                'past-intransitive-verb': 'verb'}[role]
                and any(accepted_senses(r, role))]
            if not candidates:
                report.append({'word': requested, 'role': role, 'status': 'held',
                               'reason': 'No matching unrestricted English sense and grammatical role'})
                continue
            text = requested.lower()
            forms = None
            if role == 'count-noun':
                possibilities = set().union(*(forms_for(r, 'plural') for r in candidates))
                override = form_overrides.get(requested, {}).get('plural')
                if override is not None:
                    if override not in possibilities:
                        report.append({'word': requested, 'role': role, 'status': 'held',
                                       'reason': 'Proposed plural override has no source support',
                                       'source_forms': sorted(possibilities)})
                        continue
                    possibilities = {override}
                if len(possibilities) != 1:
                    report.append({'word': requested, 'role': role, 'status': 'held',
                                   'reason': 'Missing or ambiguous plural form',
                                   'source_forms': sorted(possibilities)})
                    continue
                forms = {'singular': text, 'plural': next(iter(possibilities))}
            elif role.startswith('past-'):
                possibilities = set().union(*(forms_for(r, 'past') for r in candidates))
                override = form_overrides.get(requested, {}).get('past')
                if override is not None:
                    if override not in possibilities:
                        report.append({'word': requested, 'role': role, 'status': 'held',
                                       'reason': 'Proposed past-tense override has no source support',
                                       'source_forms': sorted(possibilities)})
                        continue
                    possibilities = {override}
                if len(possibilities) != 1:
                    report.append({'word': requested, 'role': role, 'status': 'held',
                                   'reason': 'Missing or ambiguous past-tense form',
                                   'source_forms': sorted(possibilities)})
                    continue
                text = next(iter(possibilities))
            if not clean_word(text):
                report.append({'word': requested, 'role': role, 'status': 'held',
                               'reason': 'Surface form outside prototype alphabet/length'})
                continue
            if (text, role) in existing:
                report.append({'word': requested, 'role': role, 'status': 'already present',
                               'surface': text})
                continue
            entry = {'id': next_id, 'text': text, 'roles': [role], 'features': {}}
            if forms:
                entry['forms'] = forms
            entries.append(entry)
            existing.add((text, role))
            next_id += 1
            report.append({'word': requested, 'role': role, 'status': 'candidate',
                           'surface': text, 'id': entry['id']})
    if len(entries) > 10000:
        raise ValueError('Candidate exceeds current 10,000-entry codec limit')
    return {'version': version, 'language': 'en', 'entries': entries}, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('tools/vocabulary/source-slice.jsonl'))
    parser.add_argument('--manifest', type=Path, default=Path('tools/vocabulary/source-manifest.json'))
    parser.add_argument('--proposals', type=Path, default=Path('tools/vocabulary/proposals.json'))
    parser.add_argument('--form-overrides', type=Path, default=Path('tools/vocabulary/form-overrides.json'))
    parser.add_argument('--seed', type=Path, default=Path('tests/fixtures/starter-vocabulary.json'))
    parser.add_argument('--version', default='1.0.0')
    parser.add_argument('--output', type=Path, default=Path('data/candidates/seed-165.json'))
    parser.add_argument('--report', type=Path, default=Path('data/candidates/seed-165-report.json'))
    args = parser.parse_args()
    source = args.source.read_bytes()
    manifest = json.loads(args.manifest.read_text())
    if hashlib.sha256(source).hexdigest() != manifest['slice_sha256']:
        raise SystemExit('Source slice differs from pinned SHA-256; refusing import')
    records = [json.loads(line) for line in source.splitlines() if line.strip()]
    proposals = json.loads(args.proposals.read_text())
    overrides = json.loads(args.form_overrides.read_text())
    seed = json.loads(args.seed.read_text())
    candidate, decisions = produce(proposals, records, seed, args.version, overrides)
    summary = dict(Counter(item['status'] for item in decisions))
    report = {'status': 'awaiting owner review', 'version': args.version,
              'source_sha256': manifest['slice_sha256'], 'seed_version': seed['version'],
              'total_entries': len(candidate['entries']), 'summary': summary,
              'decisions': decisions}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(candidate, indent=2, ensure_ascii=False) + '\n')
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    print(json.dumps({k: report[k] for k in ['status', 'total_entries', 'summary']}, indent=2))


if __name__ == '__main__':
    main()
