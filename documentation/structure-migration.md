# Full-grammar migration to codec-demo.html

The active writing page now uses `src/structure-codec.js`. It accepts the
existing grammar's notes, including multi-sentence messages, contractions,
questions, times, dates, money, and productive/development-derived constructions.
It also retains the small reviewed prototype language as an additional choice.
Unsupported vocabulary or grammar remains an explicit writing error; there is
no arbitrary-plaintext escape and no author-key equality check.

The earlier migration was incomplete: it moved the nine-pattern example onto
the requested URL but removed broader authoring support. This implementation
restores that support while changing grammar structure under the reader key.

## Encoding

The author parser supplies a canonical derivation. The encoder walks its grammar
production choices, numeric categories, and lexical choices. Each choice is
encoded in a fixed-width random-alias field XORed with HMAC-derived bytes.
The entire exact key is SHA-256 hashed with the salt and public envelope first.
The recovered choice and ciphertext field advance a keyed rolling state before
the next choice. Production choices therefore participate in feedback, just as
words do. Writing and reading use the same sequence of states.

The packet contains a language fingerprint, salt, padded decision budget,
numeric-capacity bound, and an opaque stream. It does not contain the author's
public tree, original text, or a comparison-mode copy of that tree. Budgets and
packet length still reveal coarse complexity/capacity information.

A minimum-completion calculation reserves enough decisions for pending grammar
children. Each decoded production must fit the remaining budget. All remaining
stream bytes are random padding; no correct-key marker or padding validation is
used. Number domains retain their validity constraints. Resource bounds remain
explicit (65,536 decisions, numeric category ceiling 1,024, eight million stream
bytes); this is broader input support, not unlimited computation.

## Output choices and quality

A keyed family choice mixes the full grammar with the nine reviewed sentence
families. Nine of its ten values select reviewed families; one selects the full
grammar. This is a sampling allocation, not a promised percentage over user keys.
Simple author notes may use the reviewed families; other accepted notes use
the full grammar. Readers never validate an alleged author branch.

Reviewed output can vary its number of clauses, sentence construction, subjects,
and words. The full grammar can also change its tree. The language model remains
imperfect: some development-derived text sounds awkward, and semantic absurdity
is possible. This allocation favors readable results but also creates a prior
over structures; it is not a proof of concealment or cryptographic security.

The legacy rule contract permits some tree combinations the legacy recognizer
rejects, particularly nested punctuation. A failed generated derivation is
rejected as a whole; the decoder deterministically generates a complete reviewed
construction from the same keyed stream. It does not patch individual words,
return plaintext, or signal that a reader key failed. Thus this is a total text
mapping with aliases, not a bijection between surface strings and packets.

## Evidence

`tools/coverage/structure-audit.js` measures the same 1,000 development sentences:
new encoding, canonical author recovery, and two alternate-reader syntax replays.
Results are in `coverage/structure-audit.json`. This is separate from the earlier
character-prefix benchmark and is not an independent English naturalness review.

`tests/structure-codec.test.js` covers the previously reported messages, exact
recovery, changed structures, feedback, malformed framing, and unsupported input.
The updated browser checks exercise the actual codec-demo URL and shared links.

Old experimental links must be recreated. The comparison page remains available
as a historical experiment; it is not the active authoring language.

## Editor preservation

The active page again uses the original `src/demo.js` and `src/demo.css` interface: automatic lowercase conversion, selection-aware editing, red token highlights, live grammar feedback, and worker-backed analysis. `src/codec-worker.js` routes encoding and decoding to the structure codec. The UI redesign was reverted; only the encoding strategy changes. New links use `#a=`. Browser checks in `coverage/restored-editor-browser.json` exercise the restored editor and the new codec together.

## Active option-3 policy

The author grammar and reviewed output families now use [option 3](grammar-flexibility.md). Verb-context and semantic restrictions are intentionally relaxed while morphology is preserved. Packet version `pakupaku-grammar-stream-2-option3` and the fingerprint of actual pool memberships identify the new mapping; create new links.

## Number frequency

[Construction and magnitude weighting](number-frequency.md) now reduces numbers in alternate readings while retaining exact recovery. The active version is `pakupaku-grammar-stream-3-weighted-numbers`; earlier version labels above are historical.
