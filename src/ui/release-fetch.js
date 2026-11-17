// Transport resilience only: the locked verifier still checks every file hash.
export function createReleaseFetcher(fetcher, manifestURL, {wait = ms => new Promise(resolve => setTimeout(resolve, ms))} = {}) {
  const manifest = new URL(manifestURL);
  return async (input, options) => {
    const url = new URL(input instanceof Request ? input.url : input, manifest);
    if (url.origin !== manifest.origin || url.pathname !== manifest.pathname) return fetcher(input, options);
    let status;
    for (let attempt = 0; attempt < 3; attempt++) {
      const target = new URL(url);
      if (attempt) {
        await wait(attempt * 300);
        target.searchParams.set('_retry', `${Date.now()}-${attempt}`);
      }
      try {
        const response = await fetcher(target, {...options, cache: 'no-store'});
        if (response.ok) return response;
        status = response.status;
        if (![404, 408, 425, 429].includes(status) && status < 500) break;
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        status = undefined;
      }
    }
    throw Error(`Unable to load the release lock${status ? ` (HTTP ${status})` : ''}. Check your connection, then retry loading.`);
  };
}
