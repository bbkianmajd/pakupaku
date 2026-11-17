#!/usr/bin/env python3
"""Select 1,000 common given names from pinned SSA national annual counts."""
import argparse
from collections import Counter
import hashlib
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[2]
SOURCE_SHA256 = '67cf9c3fbbbcc18994cc071417267c48545130131112bcda83a9a36b2abcbc7e'
YEAR_FILE = re.compile(r'yob(18[8-9][0-9]|19[0-9]{2}|20(0[0-9]|1[0-9]|20))\.txt\Z')
NAME = re.compile(r'[A-Za-z]{2,64}\Z')
EXCLUDE = {'baby', 'unknown', 'infant'}


def select(source):
    if hashlib.sha256(source.read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError('SSA source archive SHA-256 mismatch')
    counts = Counter()
    with zipfile.ZipFile(source) as archive:
        files = sorted(name for name in archive.namelist() if YEAR_FILE.fullmatch(name))
        if files[0] != 'yob1880.txt' or files[-1] != 'yob2020.txt' or len(files) != 141:
            raise ValueError('SSA source must contain the pinned 1880–2020 annual files')
        for filename in files:
            for line in archive.read(filename).decode('ascii').splitlines():
                name, sex, amount = line.split(',')
                if sex in ('F', 'M') and NAME.fullmatch(name):
                    name = name.lower()
                    if name not in EXCLUDE:
                        counts[name] += int(amount)
    return [name for name, _ in sorted(counts.items(), key=lambda item: (-item[1], item[0]))[:1000]]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='pinned SSA names.zip mirror')
    parser.add_argument('--output', type=Path,
                        default=ROOT / 'tools/vocabulary/ssa-top-1000.txt')
    args = parser.parse_args()
    names = select(args.source)
    args.output.write_text('\n'.join(names) + '\n')
    print(f'Wrote {len(names)} names to {args.output}')


if __name__ == '__main__':
    main()
