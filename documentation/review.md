# Design review

## Current checkpoint

The recursive stored-layout codec and iterative semantic feedback are implemented. This review replaces findings about the earlier finite-rank experiment; no earlier pre-release decoder is retained. See the [technical design](technical-design.md), [exact implementation](codec-implementation.md) and [execution plan](execution-plan.md).

| Area | Current result | Remaining work |
| --- | --- | --- |
| Recursive grammar | Stored production stream; sentence, noun and verb coordination; adjective chains; explicit stack | Complete language expansion and independent acceptance in execution-plan stages 2–4 before freezing rules |
| Note length | No fixed word, clause, nesting, character or payload cap | Measure real phone/browser/sharing-channel capacity; report concrete failures without truncation |
| Numbers | Public categories, computed integer offsets, noun agreement | Review whether category widths give useful readings |
| Every reader key | All strings map inside each recorded domain; no key verifier | Full UI must preserve the guarantee and avoid stale results |
| Semantic feedback | Recovered index and stored code feed a keyed rolling state across all slot types | No proven security claim; decide whether per-guess KDF cost is a release requirement |
| Exact format | PKL framing, ordered rule table, domain-width values, specified mapping and regression vector | Cross-browser vectors and review before first publication |
| Vocabulary | 6,005 distinct words including `and` and 12 pronouns; pinned sources and provenance | Sample lexical quality, names/verb coverage and naturalness |
| Version files | Exact version selection; missing file identifies its version | Retain published files in the static tree after releases; current drafts may change in place |
| UI | Worker-based demo with cancellation and current-result checks | Trie, constrained composer, final key/copy interactions and accessibility |

## 1. Grammatical output and natural language are different guarantees

The parser and decoder cover the same controlled language. Past-tense verb pools fit singular and plural subjects; numeric count nouns use explicit singular/plural forms; `the` avoids `a`/`an` mismatches. Numbers are distinct slots, so a word-only tree cannot acquire quantities when a key changes. Subject and object pronouns occupy separate slot roles; every key preserves their case. No internal `#` marker is displayed.

The grammar can still produce semantically unusual combinations. Source dictionaries and frequency filters do not guarantee that every imported noun or adjective sounds natural in every slot. The owner should review a fixed sample of intended and alternate readings for grammar failures versus expected semantic oddness. No topic-based subject/object filters are being added.

## 2. Iterative semantic feedback preserves every-key rendering

Each decoded semantic result updates the next slot's keyed state. The same key follows the encoder's states; another key follows different states without checking an expected word. Both paths always use the public role/category domains. The implementation tests forward/inverse permutations, changed earlier semantics affecting later mappings, and replay of decoys through the suggestion API.

This adds sequential dependence, not exponential resistance to guessing. A small key dictionary remains small; an attacker can score early phrases and parallelize different keys. Context, common words and published structure still help rank readings. The fast SHA-256 seed is not a password-hardening step. Evaluate a password KDF separately if resistance to offline guessing is part of the release promise. Do not call the custom mapping proven encryption.

## 3. Recursion has no fixed sentence limit

Every actual note has a finite tree even though the grammar describes an unbounded language. The decoder consumes production records with an explicit stack and rejects truncated or extra records before examining a key. It never expands randomly until a budget runs out. The chart parser retains ambiguous continuations without enumerating every tree.

Tests exercise 1,000-clause codec round trips and 10,000-clause parsing/structural traversal, including right-nested trees. These sizes establish coverage rather than a maximum. Ambiguous parsing, large integer arithmetic and cycle walking have costs beyond linear byte traversal. A browser worker keeps those jobs off the UI thread; synchronous parsing cannot observe a newer cancellation message until it yields. Phone performance remains to be measured.

## 4. Numeric categories and finite readings

Small, medium and large categories cover `0..99`, `100..9999` and `10000..999999`; larger categories preserve decimal digit count. Each fixed link therefore has finitely many semantic combinations, even though the grammar and key input space are unbounded. Different keys can coincide on a reading. Nothing promises that every suffix word changes after feedback changes.

Fixed body widths keep packet length independent of a slot's transformed value. Public category IDs and available body bytes are checked before constructing large numeric domains. Malformed packets are file/format errors determined before key interpretation, never evidence that a key is wrong.

## 5. Git-tracked publication files are sufficient

No separate archive service is required. The version selected by the public payload must exist as a static JSON file in the deployed tree; browsers do not search Git history. Current data must match its named version file. Missing or mismatched files get explicit errors without substituting the latest vocabulary.

There has been no public release, so internal edits remain at `1.0.0` and old experimental links can break. After the first publication, retain that exact data and publish vocabulary changes under new versions while keeping the codec fixed.

## 6. Composer and copy state remain UI work

The demo validates complete typed notes; it is not the final forced-choice composer. That UI still needs trie lookup, undo/edit behavior, incomplete/computing/ready states, keyboard controls and copy-state checks. Only a link computed from the current writer draft should be presented as ready. Reader revisions must never overwrite newer input with an older computation.

## Release checks

- Complete the language benchmark, broad English support, browser experience and independent acceptance gates in the execution plan.
- Review word coverage and sample decoys without promising equal real-world plausibility.
- Run cross-browser and phone tests, including long links and rapid edits.
- Review the exact custom mapping and decide on password-hardening requirements before freezing it.
- Select the code license, retain vocabulary attribution, and verify the deployed static version files.
- Publish only after the owner's final manual end-to-end check. No pre-release compatibility migration is required.
