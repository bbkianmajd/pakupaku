# Experimental codecs: implementation notes

The [comparison page](../prototypes.html) has two separate packet modes plus a narrow-pool control. As of November 12, `codec-demo.html` uses the whole-clause mode alone and shares a single packet under `#a=`. The old stored-tree modules and vocabulary files are retained; they no longer power that page. All three experiments use the same new clause recognizer; the narrow control is not the production codec.

## Shared language

`src/prototypes/language.js` builds finite lexical tables from the current vocabulary's complete singular nominals and predicate adjectives. The experiment adds a short explicit set of people phrases, five international cities, pronouns, two plural phrases, and small verb/time/modal lists. Both prototypes therefore have identical input coverage. Names containing sentence punctuation are excluded so abbreviation parsing does not obscure the structural experiment.

Nine compositional families cover description, intransitive action, transitive person-to-person action, travel, location, modal action, a do/does question, an initial time phrase, and an addressed description. These are products of lexical choices, not a table of complete example sentences. A token trie recognizes multiword fields; the recognizer verifies the rendered agreement form. A selected subject determines am/is/are, do/does, and finite verb inflection.

The author interface normalizes lowercase and spaces and supplies a missing final period. Exact recovery refers to this canonical note, not the original capitalization/whitespace. Periods and question marks are supported; contractions, quotations, numbers, coordination, and arbitrary subordinate clauses are outside this small language. Limits are 64 clauses and 20,000 input characters per experimental packet; they are prototype resource limits, not claims about the production grammar.

## A: whole-clause choices with feedback

Each family has a mixed-radix rank over its lexical fields. Its domain size is the product of those field sizes. Let B be the smallest power of two at least as large as the largest family domain. Each of the nine families gets one band of width B, giving a total domain of 9B.

For a decoded index R:

```
family = floor(R / B)
local = (R mod B) mod size(family)
fields = mixedRadixUnrank(local)
text = render(family, fields)
```

Every index renders a complete clause. Equal-width bands prevent the largest family from dominating the entire domain. They do not guarantee a uniform distribution across natural-language strings or across arbitrary human-selected keys. Within a band, some strings have one more equivalent representation than others.

Writing chooses a random equivalent index for the author's local rank r:

```
R = family * B + r + k * size(family)
0 <= k <= floor((B - 1 - r) / size(family))
```

`k` is selected with rejection sampling using Web Crypto randomness. Always selecting the lowest alias could create a detectable author convention, so the live encoder uses every alias; the decoder accepts all of them. The mapping is reversible over indices; surface strings intentionally have multiple representations. Re-encoding a decoded string is not promised to reproduce the same packet. The author key does reproduce the original canonical text.

The packet carries format, vocabulary fingerprint, mode, salt, and one encoded index per clause. It carries no author-selected family IDs or per-clause word layout. The shared mapping hashes the whole exact key with salt, version, and a public envelope that contains the count and language identity. There is no dependency on a hidden tree to derive the initial key state.

For each clause, encoding applies the existing keyed permutation to R and stores code C. Decoding applies its inverse to C. Both directions then advance the existing keyed chain with R, C, and the clause context. The family and all lexical choices are contained in R. The next permutation therefore depends on the preceding recovered construction and words, as well as the chain's earlier history. Equivalent surface aliases also participate in this state.

Changing a key can change both family and fields. Changing an early stored code can alter later decoded text even when all later codes are untouched. Collisions remain possible; every key is not promised a distinct structure. The number of clauses remains public and fixed. Decoded punctuation follows the family, so a period can become a question mark.

## B: pool merging, with a narrow control

The `narrow` and `merged` packet modes retain public family IDs and have one encoded value per lexical field. Both use the same rolling mapping, advancing after each field.

In narrow mode, a field retains the author's subgroup: a name maps to another name, a place to another place, and “this” remains in a singleton group. In merged mode, the field can choose any entry compatible with its construction. Description/location subjects can range over names, places, common-noun phrases, mass nouns, and pronouns. They currently have 4,252 choices. Agreement words are generated from the selected subject.

Required complements still constrain choices. A travel destination remains a place; a vocative remains an addressable person; person-action subjects and objects use the person tables, with subject/object pronoun case handled separately. Pool merging deliberately does not turn “in Paris” into “in Sarah.” Semantic implausibility remains possible even where syntax is well formed.

## Framing, version identity, and UI

Packets are experimental JSON encoded as base64url. Mode, shape, ranges, field counts, salt, and language fingerprint are validated before a reader key is used. The language fingerprint hashes the selected lexical tables, family definitions, and language version. Prototype links require that exact experimental language. This is not a stable published archive or a compatibility promise for future revisions.

The page shares a bundle of the three independent packets in a URL fragment. Author keys, reader keys, and the input note are not serialized as extra bundle fields. Narrow-mode layout metadata still exposes its selected categories. The bundle intentionally includes the narrow control and therefore is a comparison artifact, not a concealment experiment for the structure-only packet. Requests are local static assets; the page uses no external model or runtime service.

Rapid reader edits cancel earlier work and ignore stale results. Shared links open without an author key or input note. Unsupported writing clears the old comparison rather than displaying it as a successful new encoding.

These experiments reuse a custom Feistel/HMAC mapping and are not a standard encryption scheme or a security-reviewed replacement. Broader syntax and improved diversity are the properties being demonstrated.

## Reproduction and evidence

Run with Node.js 22 or newer:

```
npm run test:prototypes
npm run audit:prototypes
node tools/coverage/prototype-browser.js
```

The browser check needs Playwright installed separately; `PAKUPAKU_PLAYWRIGHT_MODULE` can point to its entry module. Serve the repository locally and open `/prototypes.html` for manual use. The primary files are [language.js](../src/prototypes/language.js), [codec.js](../src/prototypes/codec.js), and [the tests](../tests/prototypes.test.js).

[The deterministic audit](coverage/prototype-audit.json) records complete sample readings, construction counts, a feedback demonstration, implementation hashes, and a separate development parse-only scope check. It uses a fixed salt and a declared deterministic alias source solely to reproduce this experiment. The browser uses fresh cryptographic randomness. [Browser evidence](coverage/prototype-browser.json) covers the actual UI, shared links, rapid key changes, unsupported input, and mobile overflow.

The tests exhaust every index in a reduced vocabulary's complete domain, verify author recovery and alternate-key replay, assert structural diversity, change an earlier code while retaining later codes, and reject malformed packets and incorrect grammar. These are correctness checks, not independent judgments of fluent English.
