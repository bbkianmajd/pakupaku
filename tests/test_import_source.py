"""Behavior checks for the offline vocabulary admission rules."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools' / 'vocabulary'))
from import_source import produce  # noqa: E402


class ImportSourceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.proposals = json.loads((ROOT / 'tools/vocabulary/proposals.json').read_text())
        cls.records = [json.loads(line) for line in
                       (ROOT / 'tools/vocabulary/source-slice.jsonl').read_text().splitlines()]
        cls.seed = json.loads((ROOT / 'tests/fixtures/starter-vocabulary.json').read_text())
        cls.overrides = json.loads((ROOT / 'tools/vocabulary/form-overrides.json').read_text())

    def test_candidate_is_deterministic_and_preserves_old_ids(self):
        one, first = produce(self.proposals, self.records, self.seed, '1.0.0', self.overrides)
        two, second = produce(self.proposals, reversed(self.records), self.seed, '1.0.0', self.overrides)
        self.assertEqual(one, two)
        self.assertEqual(first, second)
        self.assertEqual(one['entries'][:len(self.seed['entries'])], self.seed['entries'])
        self.assertEqual(len(one['entries']), 165)
        self.assertEqual(len({entry['id'] for entry in one['entries']}), 165)

    def test_source_has_supported_forms_and_unsupported_uses_stay_out(self):
        candidate, decisions = produce(self.proposals, self.records, self.seed, '1.0.0', self.overrides)
        entries = candidate['entries']
        self.assertIn({'id': next(e['id'] for e in entries if e['text'] == 'mouse'),
                       'text': 'mouse', 'roles': ['count-noun'], 'features': {},
                       'forms': {'singular': 'mouse', 'plural': 'mice'}}, entries)
        self.assertTrue(any(e['text'] == 'bought' and e['roles'] == ['past-transitive-verb'] for e in entries))
        self.assertTrue(any(e['text'] == 'alice' and e['roles'] == ['person-name'] for e in entries))
        self.assertFalse(any(e['text'] == 'put' and 'past-transitive-verb' in e['roles'] for e in entries))
        self.assertTrue(any(d['word'] == 'put' and d['status'] == 'excluded' for d in decisions))
        self.assertTrue(any(d['word'] == 'choose' and d['status'] == 'held' for d in decisions))
        self.assertTrue(any(d['word'] == 'wake' and d['status'] == 'held' for d in decisions))

    def test_bad_form_override_is_held_instead_of_invented(self):
        bad = {**self.overrides, 'mouse': {'plural': 'mousez'}}
        candidate, report = produce(self.proposals, self.records, self.seed, '1.0.0', bad)
        self.assertFalse(any(e['text'] == 'mouse' for e in candidate['entries']))
        self.assertTrue(any(d['word'] == 'mouse' and d['status'] == 'held' and
                            'source support' in d['reason'] for d in report))

    def test_missing_source_record_is_held(self):
        proposals = {'count-noun': ['cloud']}
        candidate, report = produce(proposals, [], self.seed, '1.0.0')
        self.assertEqual(candidate['entries'], self.seed['entries'])
        self.assertEqual(report[0]['status'], 'held')

    def test_cli_rejects_changed_pinned_source_before_writing_candidate(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'changed.jsonl'
            output = Path(directory) / 'candidate.json'
            source.write_bytes((ROOT / 'tools/vocabulary/source-slice.jsonl').read_bytes() + b'\n')
            result = subprocess.run(
                [sys.executable, 'tools/vocabulary/import_source.py',
                 '--source', str(source), '--output', str(output)],
                cwd=ROOT, capture_output=True, text=True, check=False,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('pinned SHA-256', result.stderr)
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
