// Redirect older demo links without losing their shared-message fragment.
const destination = new URL('./', location.href);
destination.search = location.search;
destination.hash = location.hash;
location.replace(destination);
