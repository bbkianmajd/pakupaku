# Locked release 1.0.0

The accepted parser, dictionary, and weighted structure encoder/decoder ship together as release **1.0.0** on branch `release/1.0.0`. `src/release.js` is the shared release identity. The dictionary's archive version is also 1.0.0. The internal stream algorithm identifier remains `pakupaku-grammar-stream-3-weighted-numbers`.

Links now look like `codec-demo.html#v=1.0.0&a=…`. The version is visible; the payload stays in the URL fragment. Missing or different URL versions show a **Wrong version** error and no reading. The packet independently declares the release, stream algorithm, and language fingerprint. Changing only the URL version cannot bypass the packet check. Version errors do not depend on the reader's passkey.

`release-lock.json` contains SHA-256 hashes of the parser, dictionary (current and archive), codec, their supporting JavaScript. Presentation files (`codec-demo.html`, `src/demo.js`, `src/demo.css`, and `src/ui/`) are outside this engine lock, so UX changes do not change link compatibility. The worker verifies the locked files before accepting analysis, encoding, or decoding operations. A changed component fails initialization with a version error. This detects accidental mixed deployments; it is not a signed software authenticity system.

Run `npm run release:check` and `npm test` to verify this snapshot. GitHub Actions runs both checks on pushes and pull requests. The editor, word acceptance, number weighting, and author-key recovery behavior are preserved. Links created before the explicit release envelope must be recreated.

Keep this release branch as the baseline. Changes to parser behavior, vocabulary, pool order, numerical weighting, or codec mapping belong in a new release branch with a new shared release number, matching dictionary archive, and newly generated lock (`node tools/release/lock.js --write`). Do not regenerate the lock to silently change release 1.0.0. Deploy all locked files together and invalidate static caches. Old links should be opened in their matching release; this app does not silently migrate them.

A local Git branch is only a local snapshot until pushed to a GitHub repository. GitHub branch protection is a separate repository setting; the file lock and CI do not make a branch administratively immutable.

UI work continues on `ux/unified-editor`; `release/1.0.0` preserves the original snapshot. Removing presentation files from the UI branch's manifest preserves every engine hash.
