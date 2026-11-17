# Valid-input rejection: testing messages

November 15, 2026. Scope: accept ordinary valid input without changing the UI,
selected grammar policy, or structure-changing encoder/decoder algorithm.

Reported input: `hi. just going to test if this works.`

The editor rejected `if`, but the underlying problem was the preceding word:
`test` had noun entries and restricted learned lexical entries, but lacked the
reusable verb forms used by the productive grammar. Adding the explicit forms
`test / tests / tested / tested / testing` fixes the complete sentence.

The existing grammar already supports both the informal omitted-subject opening
and the following question clause. Earlier suggestions that a new conversational
rule would necessarily be needed were too broad; no such rule was needed here.
The noun use remains available. No unknown-word fallback or blanket acceptance
was introduced, and the note is not rewritten to a different sentence.

`tests/input-acceptance.test.js` covers twelve nearby messages, including explicit
subjects, contractions, present/past/perfect forms and `if`/`whether`. Each is
checked through character-prefix replay, completed editor validation, encoding,
and canonical author recovery. The actual browser suite includes the reported
note and three related variants and retains lowercase/red-highlight checks.

The dependency grammar and pool metadata are regenerated from the same pinned
sources so the vocabulary build stays reproducible. Vocabulary fingerprints
change; existing experimental links may need to be recreated.

This is a targeted input-coverage fix, not a claim that all valid English is now
accepted. Further reported rejections should be diagnosed at their first missing
word use or construction and retained as regression cases.
