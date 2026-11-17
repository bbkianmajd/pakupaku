# GitHub test deployment

Repository: https://github.com/bbkianmajd/pakupaku

Live editor: https://bbkianmajd.github.io/pakupaku/codec-demo.html

The site root redirects to the editor, preserving the query string and shared-message fragment. GitHub Actions checks the engine file lock and runs the Node tests before deploying pushes to `main`. Pull requests and other branches run validation without publishing. The saved release and UX branches are kept alongside `main`.

`node tools/release/build-site.js` assembles `_site/` using the app, locked vocabulary archive, and documentation. Development corpora, Git history, tools, and tests are not included in the Pages artifact. `_site/` is generated and ignored by Git. No server or API credentials are shipped to the browser.
