# Passkeys, grammatical variation and adjective expansion

The entire exact passkey already entered SHA-256 before any semantic mapping.
The derivation is unchanged:

```
layoutHash = SHA256(layout)
seed = SHA256(JSON([domain, version, saltHex, layoutHashHex, fullPasskey]))
HMAC-SHA-256(seed, ...) drives the reversible per-slot permutations and chain.
```

`deriveMappingSeed` now exposes that existing setup for direct tests. There is
no prefix comparison or partial-key reuse. Case, spaces and Unicode distinctions
are preserved. Adding another standalone SHA-256 pass would not remove the
language/layout restrictions. The existing fixed codec vector still passes.
This custom mapping is not a standard cipher, and fast SHA-256 is not a
password-hardening KDF or protection against guessing a weak key.

The similar-looking readings came from a public, fixed layout and restricted
lexical pools. A one-choice `i` slot stays `i` for every key; four greetings can
collide even with unrelated keys. Hash diffusion does not guarantee that two
readings differ in meaning. In the deterministic test in
[key-variation.json](key-variation.json), the seeds for `t`, `te` and `tes`
differ from the `test` seed in 132, 126 and 123 of 256 bits respectively.
Those measurements are regression evidence, not a security proof. They use a
fixed test salt, not the user's original payload.

## Changes

- Added **297 reviewed predicate adjectives**, bringing that pool to **387**,
  including `sexy`, `attractive`, `thoughtful`, `passionate` and `confident`.
  Matching attributive senses are available separately. Attributive-only words
  are not blindly imported into the predicate pool.
- Expanded direct-address vocabulary with words such as `friend`, `doctor`,
  `darling` and `captain`; `sarah, you are sexy.` passes the full pipeline.
- The `you` and `we/they` subject pools now share their compatible conjugation
  class: `are/were/have/do` and base lexical verbs. `I/am` and third-person
  singular stay separate. Contraction spelling and other fixed literals still
  constrain variation.
- **4,234 complete singular noun phrases** share a semantic domain: names,
  ordinary place names, mass nouns, and definite common-noun phrases. For
  example, `Sarah`, `Paris` and `the doctor` are interchangeable in a compatible
  singular subject/object position. A bare count noun such as `doctor` is not
  substituted where its article is required. Counted nouns, plural agreement,
  mass-only contexts, pronoun case and direct-address roles retain constraints.
- Compatible atomic noun-phrase derivations use a shared stored representation.
  Recognition still uses existing productive grammar rather than thousands of
  redundant parse alternatives. Author spelling is recovered exactly; alternate
  readings may have different word counts because the whole phrase is mapped.
- `mean a lot to`, `matter very little to`, `mean everything to` and related
  expressions form a selected-complement family. Their inflections are mapped
  as whole units before the object, including finite, negative, perfect, modal
  and question patterns. Declared preferred productions resolve ambiguity before
  encoding; no post-decoding repairs change the text. The original example no
  longer turns this construction into `meet a gawker to`.

The fixed example `sarah is happy.` produces `the armada is fresh.`,
`the medic is ancient.` and `the college is real.` under `t`, `te` and `tes`.
The original key recovers `sarah is happy.` exactly. The JSON audit includes all
four example messages, selected pool sizes and complete readings.

## Limits and verification

This broadens compatible lexical/phrase choices and changes some internal
phrase shapes. It does not hide or arbitrarily resample the whole sentence tree.
To map `I am ready` to a substantially different clause construction, the codec
would need a keyed choice over compatible constructions with their dependencies,
not just an untyped union of words. Public structure, fixed literals and remaining
singleton pools still disclose information. Odd meaning remains possible.

`tests/variation.test.js` checks full-key hashing, the reported messages,
compatible pronouns, each nominal kind, selected complement forms and alternate
keys. Existing tests now check semantic fields instead of assuming each field
occupies exactly one written word. Grammar rejection controls and the original
fixed cryptographic vector remain intact. The browser suite includes both
reported messages. Verification passes **55 JavaScript tests**, **seven Python tests** and **43
Chromium composer/worker cases**. The unchanged development benchmark remains
**983/1,000 (98.3%)**, with zero regressions; all 33 project cases pass. Complete
source notes remain 0/3. This remains a development-trained score, not held-out
coverage of unseen English.

These remain pre-release data/layout changes. Reload the app and create a new
link for an edited note; old experimental links are not a compatibility promise.
