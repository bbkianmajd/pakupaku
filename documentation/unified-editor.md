# Shared message editor

The passkey appears above the message. It starts visible, with an unchecked “Hide passkey” checkbox. Checking it masks the key; unchecking it reveals exactly what was entered. New pages receive a playful name such as `sleepy_cosmic_otter`. The UI does not trim, lowercase, or impose a minimum length on keys. With the explicitly approved exception to the engine lock, the author-key minimum-length check has been removed. Empty and short author keys now use the same mapping as reader keys.

One message textarea handles composition and readings. Opening a versioned link loads its reading into this textarea. Changing the passkey requests another reading of that same payload. Editing the message leaves the linked reading and starts a new draft, clears the old share link and URL fragment, and restores grammar feedback. Create link encodes the current draft and passkey. The editor keeps automatic lowercase conversion for message text and red highlights for unsupported input.

`src/demo.js` owns presentation and editor state; `src/demo.css` owns styling; `src/ui/passkey.js` generates default names; `src/ui/engine-client.js` wraps worker communication. UI modules use the worker's existing init/analyze/encode/decode operations. No parser, dictionary, encoder, decoder, worker, or release protocol source was changed.

The engine manifest excludes presentation files; the remaining 20 hashes are unchanged from the locked release. The UI branch is `ux/unified-editor`, retaining the earlier `release/1.0.0` branch. Engine version 1.0.0 remains in links.

## Paper-inspired interface

The editor now uses a responsive paper-and-sage design. The origami PakuPaku mark is drawn as two native SVG states, with a short fold transition when a link becomes available and an unfold transition when editing clears it. Reduced-motion preferences disable the transition.

The main page has a compact header with guidance below the share link. The introductory copy and a nostalgic note-passing story live on `about.html`. The share link is a regular clickable anchor, visually shortened with an ellipsis while preserving the complete URL. Copy link writes the entire URL to the clipboard and announces success. If clipboard access is unavailable or denied, it explains how to copy the link manually. Editing clears the link and disables copying so an old message is not shared accidentally. No clipboard operation runs without a user click.

Verified: desktop and 390px mobile layout, copying the exact versioned URL, clipboard rejection feedback, fold/unfold state, draft invalidation, lowercase conversion, red highlights, and existing worker round trips. The locked engine hashes are unchanged.

## Compact editor and validation

The header is 68px on desktop and 60px on phones. A small origami mark remains beside the wordmark. Validation has its own 22px origami icon: folded during the debounce and worker check, open after completion. Errors retain red highlights and now have red feedback text. The status text remains announced to screen readers and the message field exposes its busy state.

The cursor offset came from focus styling that added 10px of padding to the editor container: the textarea shifted while the absolutely positioned highlight layer stayed in place. Focus now uses a shadow without changing geometry. Both layers share font, spacing, ligature, kerning, padding, and wrapping settings. Browser checks compare their positions and text styling while focused at desktop and phone widths.
