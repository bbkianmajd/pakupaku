import importlib.util
import json
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('build_large', ROOT / 'tools/vocabulary/build_large.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class LargeVocabularyBuilderTests(unittest.TestCase):
    def test_regular_plural_rules_and_exclusion(self):
        self.assertEqual(module.pluralize('city'), 'cities')
        self.assertEqual(module.pluralize('church'), 'churches')
        self.assertEqual(module.pluralize('cat'), 'cats')
        manifest = json.loads((ROOT / 'tools/vocabulary/large-source-manifest.json').read_text())
        self.assertFalse(module.eligible_noun('woman', {'n': {'sense': []}}, {}, set(), manifest))
        self.assertFalse(module.eligible_adjective('five', {'a': {'sense': [{}]}}, manifest))
        self.assertFalse(module.eligible_adjective('running', {'a': {'sense': [{}]}}, manifest))
        self.assertFalse(module.eligible_adjective('bright', {'a': {'sense': [{'adjposition': 'p'}]}}, manifest))
        self.assertTrue(module.eligible_adjective('bright', {'a': {'sense': [{'adjposition': 'a'}]}}, manifest))

    def test_pinned_local_inputs(self):
        manifest = json.loads((ROOT / 'tools/vocabulary/large-source-manifest.json').read_text())
        module.check_digest(ROOT / 'tools/vocabulary/frequency-top-50000.txt', manifest['frequency_file_sha256'])
        module.check_digest(ROOT / 'data/candidates/seed-165.json', manifest['seed_candidate_sha256'])
        module.check_digest(ROOT / 'tools/vocabulary/ssa-top-1000.txt', manifest['ssa_top_1000_sha256'])
        names = (ROOT / 'tools/vocabulary/ssa-top-1000.txt').read_text().splitlines()
        self.assertEqual(len(names), 1000)
        self.assertEqual(len(set(names)), 1000)
        self.assertIn('tom', names)
        self.assertIn('bobby', names)


if __name__ == '__main__':
    unittest.main()
