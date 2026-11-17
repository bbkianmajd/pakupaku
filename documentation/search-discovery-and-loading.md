# Search discovery and startup loading

The main page links directly to https://github.com/bbkianmajd/pakupaku in the header, guidance, and footer. The repository's Website points back to https://bbkianmajd.github.io/pakupaku/. Repository topics and the README identify the live app.

The main and About pages have specific titles, descriptions, canonical URLs, and an SVG favicon. The main page also has social preview metadata and a semantic PakuPaku heading. `sitemap.xml` contains only the canonical main and About pages, never message fragments or passkeys. Every successful main deployment notifies IndexNow of those two URLs using the public ownership file `indexnow-key.txt`. A 200 or 202 receipt does not mean the pages are indexed or ranked. A submission failure does not fail an otherwise successful deployment.

## Google setup requiring the site owner's login

1. Open https://search.google.com/search-console/ and add a **URL-prefix** property for `https://bbkianmajd.github.io/pakupaku/`.
2. Choose the HTML tag verification method. Provide the verification meta tag for placement in the main page, then verify after deployment. No Google password or access token is needed in chat.
3. Submit `https://bbkianmajd.github.io/pakupaku/sitemap.xml` in Sitemaps.
4. Inspect the root URL and request indexing. Optionally inspect the About page as well.

Only an owner or full user of the verified property can request indexing. Discovery can take days or weeks, and inclusion/ranking is not guaranteed. The phrase “pakupaku” already has other meanings and projects, so being indexed is distinct from ranking above them.

No project-level robots.txt was added: crawlers read it at the host root (`https://bbkianmajd.github.io/robots.txt`), outside this repository's `/pakupaku/` deployment. That URL currently returns 404, which does not prohibit crawling. Submitting the sitemap through Search Console avoids depending on a subdirectory robots file.

References: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl and https://www.indexnow.org/documentation.

## Android startup report

“Unable to load the release lock” is thrown before language initialization when the manifest fetch has a non-success HTTP status. On investigation the live manifest returned 200 with both desktop and Android user agents; the exact reported phone failure was not reproduced, so a transient or cached failed response is a hypothesis, not a confirmed diagnosis.

UI transport now retries the manifest fetch up to three times, using fresh query parameters on retries to avoid a cached negative response. Permanent failures report the HTTP status when available. The Retry loading button recreates the worker and reruns initialization without clearing the draft or shared URL. Loading queues messages until the locked worker installs its handler.

The wrapper changes only loading behavior. All 20 engine file hashes remain unchanged. The original locked verifier still validates the release identity and every source/dictionary hash; mismatches are not ignored or repaired. No encoder, decoder, parser, dictionary, or locked release/worker source was edited.

Verification covers retry after a 404, persistent 503 failure, manual recovery retaining the draft, an empty-key link round trip, and a deliberate file hash mismatch. Browser tests use desktop and Pixel 7 emulation; this does not replace testing on the user's physical Android phone.
