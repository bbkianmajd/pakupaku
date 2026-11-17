# PakuPaku

**[Try PakuPaku in your browser](https://bbkianmajd.github.io/pakupaku/)** · [Source code on GitHub](https://github.com/bbkianmajd/pakupaku)

**Locked release: 1.0.0** — parser, dictionary, and codec are versioned together. Links include `#v=1.0.0&a=…`. See [release rules and compatibility](documentation/release-1.0.0.md).

PakuPaku is a static, client-side note project for sharing a note through a URL. Every entered pass-key renders a complete note that the composer could produce with the link's vocabulary version. The writer's key reproduces their selected note; the page never identifies a key as correct or exposes failed grammar, unknown words, or internal markers. The page is designed for GitHub Pages and does not need an application server.

**Status:** [The live editor](https://bbkianmajd.github.io/pakupaku/) now combines the existing broad authoring grammar with key-dependent structure changes. Production choices and words feed a rolling keyed state, so later output depends on earlier choices. The author key recovers the canonical note. The active grammar uses [option 3: broad word categories with grammatical forms preserved](documentation/grammar-flexibility.md), deliberately accepting unusual verb usage for more coverage. Unsupported vocabulary and grammar remain explicit errors. The previous nine-pattern-only migration was incomplete and has been replaced; [migration details and evidence](documentation/structure-migration.md) describe the correction. Create fresh links for the new format.

**Coverage caution:** the historical 98.3% score was measured on development data used to build the grammar. It is not an estimate of acceptance on new everyday notes. User-reported false rejections remain the current priority.

Run tests with Node.js 22+: `npm test` (no dependency installation). See [implementation and API instructions](documentation/codec-implementation.md) for local use, exact payload bytes, and review status.

Try the separate [sentence-structure and pool-merging prototypes](prototypes.html). They compare larger word groups with key-dependent whole-clause choices and feedback between clauses. The [plain-language report](documentation/word-pools-and-grammar-review.md) explains what changes and what remains limited. Prototype A is now the active codec-demo flow. The comparison page retains both alternatives; historical coverage results describe the earlier implementation.

## Read the design

- [Functional design](documentation/functional-design.md): user flows, page wireframe, expected behavior, and open product decisions.
- [Technical design](documentation/technical-design.md): recursive syntax-tree payloads, versioned vocabulary, numeric categories, and limits of the ambiguity model.
- [Execution plan](documentation/execution-plan.md): staged milestones, tests, and required manual review at every stage.
- [Grammar coverage](documentation/grammar-coverage.md): supported sentence families, known gaps, and the rule for expanding coverage systematically.

## Earlier stored-layout implementation

The architecture notes below describe the retained earlier implementation. For the active demo, see [whole-clause implementation notes](documentation/prototype-implementation.md).

## Static layout

```text
pakupaku/
├── index.html                 # GitHub Pages entry point
├── codec-demo.html            # Working encoder/decoder test page
├── package.json               # Dependency-free Node unit tests
├── .nojekyll                  # Serve static files without Jekyll processing
├── README.md
├── documentation/
│   ├── functional-design.md
│   ├── technical-design.md
│   ├── execution-plan.md
│   └── vocabulary-source.md
├── data/
│   ├── semantics.json         # Current pre-release vocabulary
│   ├── semantics/
│   │   └── 1.0.0.json         # Matching archive for the intended first release
│   └── candidates/
│       └── draft-5000.json    # Import record retained for provenance
├── src/                       # Browser-native grammar, mapping, codec and demo
├── tools/vocabulary/          # Pinned offline vocabulary builders and sources
└── tests/                     # Unit tests and fixed regression vector
```

The app and its data will be served as static files. Message data will live in the URL fragment (`#...`), which browsers do not send in the HTTP request to GitHub Pages. Opening a link still loads the same `index.html`. Each link carries a public vocabulary version, so the browser loads its matching static JSON file; a missing version gets a clear error.

## Hosting

When the app is ready, enable GitHub Pages for the repository's root directory on the chosen branch. A local preview can use `python3 -m http.server` from this directory. Real key and URL tests require a secure context: GitHub Pages uses HTTPS, while `localhost` is treated as a secure context by browsers.

## Privacy at a glance

The secret key is never placed in the URL or browser storage. A randomly generated default key is offered for immediate use. The original three-character minimum applies when composing a shareable note. The reader renders with every input, including short or empty strings, without testing key correctness. Anyone can try keys and see grammatical readings; context may still reveal which reading was intended.

The source vocabulary and grammar are public. The format carries a vocabulary version, salt, recursive syntax layout, numeric categories, and transformed semantic values. Every key preserves the recorded layout. The running demo uses the stored-tree codec in a browser worker. Pre-release revisions replace earlier experiments without compatibility support. A fixed link has finitely many distinct readings, even though many keys can map to the same reading. A third-party URL shortener would also receive and retain the full destination URL, so shortening is optional and outside the local-only core.

## Sources

The grammar proposal uses the ordinary parse-tree distinction between phrase nodes and word leaves described in [Parse tree](https://en.wikipedia.org/wiki/Parse_tree). The key-derived mapping is specified in the [implementation notes](documentation/codec-implementation.md) and uses browser Web Crypto for hash/HMAC operations and randomness.

## Language benchmark

Run `npm run coverage` to verify pinned corpus hashes and split isolation and regenerate the development baseline. Rebuild fixtures offline with `python3 tools/coverage/build.py`. See [baseline and limitations](documentation/coverage/baseline.md). Coverage is unproven; the pilot does not satisfy release acceptance. Corpus material retains its separate CC BY-SA / CC BY-NC-SA licenses and upstream credits in `data/coverage/sources/*README.md`.

Stage 2 is in progress: the fixed development benchmark passes 983/1,000 sentences (98.3%), with zero regressions and 0/3 intact source notes. The new grammar uses development annotations; this is not held-out coverage. See the [90% plan and outcome](documentation/coverage/road-to-90.md) and [gap analysis](stage_2_report.txt). Run `npm run vocabulary:stage2` to rebuild the grammatical extension and `npm run coverage:stage2` for the current development report while retaining the Stage 1 baseline. See [engineering status and remaining gates](documentation/coverage/stage2.md).

The [geographic vocabulary](documentation/geography-vocabulary.md) includes all 50 states, five city/place selections per state with every capital, and 200 country/territory entries. Multiword names and common spelling variants work in the composer and codec.
