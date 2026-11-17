#!/usr/bin/env python3
"""Capture a deterministic, compact Wiktextract source slice for offline import.

The download is a development-time action. Runtime note encoding never calls
Kaikki or Wiktionary. Each upstream raw page is hashed in the manifest.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

BASE = 'https://kaikki.org/dictionary/English/meaning'


def upstream_url(word):
    return f'{BASE}/{quote(word[:1])}/{quote(word[:2])}/{quote(word)}.jsonl'


def fetch(word):
    url = upstream_url(word)
    req = Request(url, headers={'User-Agent': 'PakuPakuVocabularyImporter/0.1 (open-source corpus audit)'})
    with urlopen(req, timeout=30) as response:
        payload = response.read()
    records = []
    for line in payload.splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        if item.get('word') != word or item.get('lang_code') != 'en':
            continue
        records.append({
            'word': item['word'], 'lang_code': 'en', 'pos': item.get('pos'),
            'forms': [
                {'form': form['form'], 'tags': form.get('tags', [])}
                for form in item.get('forms', []) if isinstance(form, dict) and 'form' in form
            ],
            'senses': [
                {'tags': sense.get('tags', []),
                 'person_name_evidence': any(
                     phrase in gloss.lower()
                     for gloss in sense.get('glosses', []) if isinstance(gloss, str)
                     for phrase in ('given name', 'first name', 'surname')
                 )}
                for sense in item.get('senses', []) if isinstance(sense, dict)
            ],
        })
    if not records:
        raise ValueError(f'{url}: no English records for {word}')
    return word, records, {'url': url, 'sha256': hashlib.sha256(payload).hexdigest(),
                           'bytes': len(payload), 'records': len(records)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--proposals', type=Path, default=Path('tools/vocabulary/proposals.json'))
    parser.add_argument('--output', type=Path, default=Path('tools/vocabulary/source-slice.jsonl'))
    parser.add_argument('--manifest', type=Path, default=Path('tools/vocabulary/source-manifest.json'))
    parser.add_argument('--workers', type=int, default=8)
    args = parser.parse_args()
    proposals = json.loads(args.proposals.read_text())
    words = sorted({word for group in proposals.values() for word in group})
    results, failures = {}, {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        pending = {pool.submit(fetch, word): word for word in words}
        for future in as_completed(pending):
            word = pending[future]
            try:
                name, records, info = future.result()
                results[name] = (records, info)
            except Exception as error:
                failures[word] = str(error)
    if failures:
        for word, error in sorted(failures.items()):
            print(f'{word}: {error}')
        raise SystemExit(f'Aborted: {len(failures)} source pages could not be captured')
    records = [record for word in words for record in results[word][0]]
    source_text = ''.join(json.dumps(record, sort_keys=True, ensure_ascii=False,
                                     separators=(',', ':')) + '\n' for record in records)
    manifest = {
        'source': 'Kaikki.org raw per-word Wiktextract JSONL for English Wiktionary',
        'source_index': 'https://kaikki.org/dictionary/English/',
        'license': 'Wiktionary CC BY-SA 4.0 / GFDL; see documentation/vocabulary-source.md',
        'slice_sha256': hashlib.sha256(source_text.encode()).hexdigest(),
        'pages': {word: results[word][1] for word in words},
    }
    args.output.write_text(source_text)
    args.manifest.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f'Captured {len(words)} words, {len(records)} records, {len(source_text):,} UTF-8 characters')


if __name__ == '__main__':
    main()
