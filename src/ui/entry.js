// Keep shared fragments intact when someone opens the site root.
location.replace(new URL(`codec-demo.html${location.search}${location.hash}`, location.href));
