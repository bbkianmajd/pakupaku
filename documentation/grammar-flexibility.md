# Grammar flexibility spectrum

Decision: **Option 3 is the active authoring and decoding policy**, selected by
 the user on November 12, 2026. Keep the original editor and the structure-changing
encoding. Accept more combinations even when verbs are used in ways ordinary
English would reject. The stricter profile is retained for historical tests.

A word pool is a set of choices for a position. Pool breadth and sentence-shape
variation are separate controls: the key already changes sentence structures;
this decision broadens the choices inside them and what the writer can enter.

| Level | What is interchangeable | Example | Benefit | Cost |
| --- | --- | --- | --- | --- |
| 1. One category | Every word | quickly sandwich the happy | Maximum substitution freedom | Mostly word salad; parsing would also need to be removed to accept arbitrary input |
| 2. Parts of speech | All nouns, all verbs, all adjectives, etc. | Sarah arrive the sandwich | Broad word choice | Incorrect agreement and word forms |
| **3. Parts of speech + forms** | Broad pools with number, person, tense, case and articles retained | **Sarah arrives the sandwich** | More accepted combinations and more varied readings | Verb usage can be wrong even though forms agree; meaning can be nonsense |
| 4. Broad constructions | Verbs grouped by required objects/complements; broad noun phrases | The sandwich asks whether the moon is tired | More conventional syntax | Rejects combinations such as “arrives the sandwich” |
| 5. Meaning compatibility | Add people/object/place and other meaning restrictions | The teacher asks whether Sarah is tired | More natural readings | Less variety; metaphors and unusual uses can be rejected |
| 6. Detailed context | Preserve observed attachment, exact complements and sometimes lemma identity | “Wonder” only in an observed “wonder about” context | Conservative generation | Ordinary notes fail despite known words; many tiny or singleton pools |

The earlier system mixed levels: large noun-phrase pools alongside highly
restricted generated verb contexts. This caused both rejected ordinary input
and implausible output. The current decision deliberately accepts more than
option 4. “Sarah arrives the sandwich” is a successful example, not a regression.

## What option 3 changes

- Verb pools ignore semantic frame, transitivity and progressive-use exclusions.
  Explicit base/third-person/past/participle/gerund forms remain distinct.
- Productive rules let those verbs stand alone or precede objects, two objects,
  prepositional phrases, predicates, infinitives and embedded/question clauses.
- Adjective pools broaden across attributive and predicative uses. This can
  produce awkward English such as an adjective in an unusual position.
- Adverbs share broader pools instead of retaining their observed positional
  subtype. They still occupy explicit modifier positions; arbitrary word order
  is not accepted.
- Development-derived pools merge by part of speech and morphology. The merge
  discards original lemma identity, dependency attachment, complement frame,
  adverb governor and similar contextual restrictions. Numeric validity,
  possessive spelling, noun countability and article sound remain protected.
- Whole noun phrases still permit names, places, things and abstract nouns to
  share compatible subject/object positions. Bare count nouns are not blindly
  substituted where an article is needed. Subject/object pronoun case and
  subject–verb agreement remain separate grammatical requirements.
- The frequent reviewed output families also use the broad verb, adjective and
  subject/object pools. The change reaches actual alternate readings, not only
  a rarely selected grammar branch.

“Wonder” and “pass” now have explicit reusable verb forms. “Sentence/sentences,”
“sandwich/sandwiches” and “moon/moons” were added as count nouns. The requested
“I wonder how many sentences will pass?” is supported. The correctly spelled
“Sarah arrives the sandwich” is supported; option 3 does not silently correct
“Sarrah arives” or accept arbitrary unknown spellings.

## What remains restricted

The grammar still enforces recognized word forms and compositional order. “They
arrives,” “me am,” “a apple,” unknown words and invalid clock values remain
failures. Relaxing context does not create every missing word, recognize every
informal construction or guarantee that all ordinary English is covered.

Semantic nonsense and some incorrect verb usage are now an explicit accepted
tradeoff. Exact canonical author recovery and deterministic alternate readings
remain requirements. The editor still lowercases input, highlights rejected
spans in red and uses the same active grammar as encoding.

## Implementation and measurement

`createGrammar(vocabulary, {profile: 'option3'})` builds broad pools and enables
additional productive rules. `structure-codec.js` selects this profile for the
active worker and also broadens its reviewed sentence families. The default
strict grammar remains available to reproduce old controls; it is not the active
codec-demo policy. The new packet version/fingerprint requires fresh links.

`tools/vocabulary/build_option3_pools.py` reproducibly derives the coarse learned
pool classes from the pinned dependency audit. It is included in the vocabulary
build. No part of speech or inflection is guessed from an unknown user's word.

`tests/option3.test.js` checks the deliberately unusual accepted sentences,
editor/encoder agreement, exact recovery, broader generated pools and retained
negative controls. The original 1,000-item development encoding audit is rerun
without changing its inputs. Its previous result is preserved in
`coverage/structure-before-option3.json`. Counts are development-trained
measurements, not unseen-English coverage or a naturalness rating.

## Measured result

With the same current vocabulary, changing from the strict to the option-3
profile reduces singleton pools from **2,620 to 1,073**. Registered role names
remain 3,095 because the parser keeps its existing interfaces; the entries behind
many of those names now share broader groups. Distinct learned spelling sets
fall from 1,872 to 831. Unknown pronunciation/countability remains conservative
rather than guessing article or noun-form compatibility.

Predicate adjective choices grow from **387 to 2,523**, and the base verb pool
used for transitive positions grows from **93 to 158**. All eight authored
feature probes change from rejected to accepted. These are targeted regression
examples, not held-out coverage evidence. [Pool measurements](coverage/option3-pools.json)
can be reproduced with `node tools/coverage/option3-pools.js`.

The retained 1,000-sentence development encoding audit remains **983/1,000**,
with zero regressions. This change broadens accepted combinations but does not
improve that aggregate score. Missing vocabulary and unsupported larger
constructions still require separate work. The full test suite passes 66 tests;
browser integration exercises 46 notes plus lowercase/highlight behavior.

## Adjectives before verbs: acceptance-first extension

The user reports a much higher rejection rate on their ordinary notes than the
98.3% development-trained score suggests (their estimate is roughly 70%). That
estimate is user feedback, not a measured validation result. The training score
must not be presented as evidence of real-world input acceptance. No independent
held-out acceptance rate has been established.

The active permissive policy now allows any recognized adjective before a lexical
verb phrase. This includes learned adjective entries such as “double,” not just
words already listed in the general adjective dictionary. It applies to base,
third-person, past, participle and gerund forms, and allows repeated modifiers.
Thus “can you double check if this works?” and the deliberately unusual “can you
purple check if this works?” are accepted. Inflection, case and unknown-word
checks remain. Hyphenated compounds remain separate vocabulary entries: this
change does not promise support for every hyphenated spelling.

This is a general acceptance rule, not a special case for the reported sentence.
It intentionally admits more nonstandard English to reduce false rejections.
The original editor and encoding algorithm are retained. Tests cover character
prefixes, completed validation, author recovery, and alternate readings. These
reported examples are regression fixtures, not an independent generalization
benchmark. Fresh input collection must be evaluated before being used for tuning.

## Noun merging correction

The user clarified that noun categories were to be merged, not left as rejection
barriers. The active grammar now has a shared singular noun domain containing
count nouns, mass nouns, names, places, and observed singular noun spellings.
They may appear bare or with the supported determiners; count/mass labels no
longer gate those phrase positions. Explicit plural forms share a plural domain
so number agreement is preserved. Pronouns retain case. No unknown plural or
unknown word is invented. This deliberately also admits unusual combinations
such as “the Sarah.” “Is this ready for production?” now works without adding a
special production-specific rule or changing its dictionary category.

The existing specialized rules remain as alternatives for historical formats
and constructions; they no longer prevent these broad noun-phrase paths from
accepting input. The common generated sentence families also include bare count
nouns. The original editor and the encoding algorithm are unchanged.

The follow-up explicitly prioritizes reducing false rejections. Shared noun
choices therefore also apply after determiners and quantities such as “much,”
“every,” and “a lot of,” and after “a/an.” Known article sounds are respected;
unknown sound metadata is no longer a reason to reject a noun in that position.
This allows extra unusual combinations by design. Count/mass/person/place labels
are not acceptance gates in these shared paths. Singular/plural forms and pronoun
case remain, and unknown words still require vocabulary coverage.
