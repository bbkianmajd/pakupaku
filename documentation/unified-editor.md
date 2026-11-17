# Shared message editor

The passkey appears above the message. It starts hidden, with a checked “Hide passkey” checkbox. Unchecking it reveals exactly what was entered. New pages receive a playful name such as `sleepy_cosmic_otter`. The UI does not trim, lowercase, or impose a minimum length on keys. However, the locked encoder itself rejects author keys shorter than three characters; allowing empty and short author keys remains pending an explicit exception to the engine lock. Decoder keys remain unrestricted.

One message textarea handles composition and readings. Opening a versioned link loads its reading into this textarea. Changing the passkey requests another reading of that same payload. Editing the message leaves the linked reading and starts a new draft, clears the old share link and URL fragment, and restores grammar feedback. Create link encodes the current draft and passkey. The editor keeps automatic lowercase conversion for message text and red highlights for unsupported input.

`src/demo.js` owns presentation and editor state; `src/demo.css` owns styling; `src/ui/passkey.js` generates default names; `src/ui/engine-client.js` wraps worker communication. UI modules use the worker's existing init/analyze/encode/decode operations. No parser, dictionary, encoder, decoder, worker, or release protocol source was changed.

The engine manifest excludes presentation files; the remaining 20 hashes are unchanged from the locked release. The UI branch is `ux/unified-editor`, retaining the earlier `release/1.0.0` branch. Engine version 1.0.0 remains in links.
