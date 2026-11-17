> Current update: the nine-pattern-only page was an incomplete migration. The active [codec demo](../codec-demo.html) now accepts the existing broad grammar with the new structure-changing encoder. See [the correction and evidence](structure-migration.md). The experiment measurements below describe the earlier comparison.

# Two ways to make the readings less alike

Updated November 11, 2026. [Try the comparison demo](../prototypes.html).

**Both prototypes are built. Changing the whole sentence pattern makes a much bigger visible difference than just making the word groups larger.** Update November 12: the user selected Prototype A, and it now powers [codec-demo.html](../codec-demo.html). The comparison page still contains all three versions. The nine-pattern input limitation remains.

## Why the old readings looked alike

Think of a word pool as a box of choices. One box contains names, another contains adjectives, and another contains places.

The existing system mostly keeps a sentence with blanks:

> this is ____. ____ is ____.

Changing the key changes what fills the blanks. It usually does not change the sentence around them. Even millions of possible word combinations can therefore feel like the same sentence.

There are **3,090 registered pools** in the main app, but **2,621 have only one entry**. A box containing one word cannot produce any variety. Many of these tiny boxes came from cautious grammar rules learned from the development examples. Having more boxes is not automatically better.

## Prototype A: the key changes the sentence pattern too

This experiment lets the key choose both the words and the kind of sentence. A description can become an action, a question, a location, or a sentence beginning with a time.

Here are actual results from the saved test example:

| Key | Reading |
| --- | --- |
| test | this is cool. sarah is sexy. |
| t | on monday, wendell smiles. gianna goes to the marshall islands. |
| te | does albert trust jaime? does ariana help pauline? |
| tes | yolanda, the climbing is awake. iran is in michigan. |

The last row shows an important limit: a sentence can follow grammar rules and still have a strange or false meaning. These experiments do not yet judge whether the message sounds believable.

The same original key brings back the original note. Other keys can choose different sentence patterns. Creating a new comparison uses fresh randomness, so your exact results will differ from this saved example.

**The sentences also influence one another.** It works like this:

1. Use the key to read the first clause: its pattern and its words.
2. Mix that result into the state used for the next clause.
3. Read the next clause, then repeat.

So the second sentence is not an independent substitution. Its reading depends on what happened before it. In a test, I changed only the first stored choice and left the second stored choice untouched. Both resulting sentences changed. The demo's expandable explanation shows the choices in order.

This is an actual reversible encoding experiment. It does not generate an unrelated sentence and then make a special exception when the author key is entered.

For now, **the number of clauses stays the same**. The words, word count, pattern, and final period/question mark can change. Joining two clauses into one or splitting one into several is future work.

## Prototype B: combine the word boxes

This experiment keeps the kind of sentence but gives its blanks broader choices.

A subject can come from a shared group containing names, places, things, and pronouns. A whole phrase such as “the doctor” is one choice, so its article does not get lost. The verb ending follows the chosen subject: “I am,” “Sarah is,” and “they are.”

The shared subject group currently has **4,252 choices**. It reuses the main vocabulary and a small set of words added only for these experiments. Both prototypes use the same experimental vocabulary.

The page includes a narrow-pool control so the difference is easy to see:

| Version | Actual reading with key t in the saved test |
| --- | --- |
| Small, separate groups | this is awkward. marlene is lovely. |
| Merged groups | the goblet is fat. the democrat is exact. |
| Changing sentence patterns | on monday, wendell smiles. gianna goes to the marshall islands. |

Pool merging removes the fixed “this” and broadens the subject choices. But the merged version still contains two descriptions using “is.” It cannot become a question or an action just by adding more words.

Some groups remain separate for a good reason. A destination still needs a place. A person being addressed needs an appropriate name or phrase. “She” and “her” need the right positions. This experiment broadens compatible choices rather than treating every word as interchangeable.

The narrow control is a simplified experimental comparison, not the original app running in another panel.

## What the tests showed

I tried **128 reader keys on the same two-sentence note** in each version:

| Version | Different readings | Different pairs of sentence patterns |
| --- | ---: | ---: |
| Small, separate groups | 128 | 1 |
| Merged groups | 128 | 1 |
| Changing sentence patterns | 128 | **70** |

The structure experiment used all **nine supported pattern families**. All sampled readings could be read back by the experimental grammar. That checks the software's rules; it is not a human review of how natural every sentence sounds.

Tests also check recovery with the author key, repeatable readings, empty and short reader keys, incorrect grammar, malformed links, and the dependency between earlier and later clauses. The browser checks cover all five example notes in three modes, shared links, fast key changes, unsupported input, and a phone-sized layout.

The complete automated test suite passes **60 tests**. [Saved readings and measurements](coverage/prototype-audit.json) and [browser results](coverage/prototype-browser.json) are available for inspection.

## Does this let me write more notes yet?

**Not yet. These prototypes demonstrate variety, not broader English coverage.** Both currently accept the same nine simple patterns shown in the demo. They do not support all the main app's grammar, such as arbitrary conjunctions, contractions, numbers, and nested clauses.

To make that limitation explicit, I also checked the small experimental parser against the original 1,000 development sentences: **0/1,000 matched its restricted patterns.** That is a separate parse-only scope check, not a replacement for the main app's benchmark. The main app's recorded result remains **983/1,000**, measured on development data used to build its grammar.

The prototypes work with the supplied ordinary examples and many combinations of their names, places, adjectives, and verbs. But they are not ready to replace the broader app. Each prototype note is limited to 64 clauses. Names containing periods are excluded from this experiment.

The next step would be to bring more of the main app's grammar into these experiments and test fresh notes. We need to measure two things separately:

- **Can I write the note I want?** This requires wider vocabulary and grammar coverage.
- **Do other keys produce noticeably different kinds of sentences?** This requires changing the encoded structure, not just adding vocabulary.

## How strict should we be?

I recommend being flexible about the **kind of sentence**, while being strict about making the chosen sentence fit together.

Keep checks that prevent “they is,” missing articles, and verbs missing an essential part. Relax the requirement that a name stays a name, that the original “is” stays “is,” or that a description must stay a description.

Meaning needs a separate, softer check. We should prefer everyday combinations, but not reject every metaphor or unusual statement. “The city is asleep” is useful English even though a city cannot literally sleep.

The most useful next improvements are:

1. Bring more everyday sentence patterns into the structure prototype.
2. Prefer common, natural combinations so rare nouns and odd pairings do not dominate.
3. Expand the authoring grammar and measure new, unseen notes.
4. Then experiment with changing clause order and sentence grouping.

**Prototype A directly addresses the similarity you noticed. Prototype B is a useful building block for it.** The two ideas can work together: broad phrase choices inside a sentence pattern that the key is also free to change.

## Try it

Serve the repository as usual, then open **`/prototypes.html`**. If no local server is running, use `python3 -m http.server 8080 --bind 127.0.0.1` from the project directory and visit `http://127.0.0.1:8080/prototypes.html`.

Start with the default note and author key `test`. Try reader keys `t`, `te`, `tes`, and `test`. Compare the three panels, then try another example from the dropdown. The comparison link contains the stored experiments, not your keys.

These remain experiments rather than a security-reviewed replacement. More variety does not itself prove that a note is secure.

For implementation details, see [how the prototypes work](prototype-implementation.md). The original detailed assessment is preserved as the [technical pool-and-grammar review](word-pools-and-grammar-technical-review.md).
