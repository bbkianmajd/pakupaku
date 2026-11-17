import {createReleaseFetcher} from './release-fetch.js';
// Module loading may yield before the locked worker installs its message handler.
const queued = [];
self.onmessage = event => queued.push(event);
self.fetch = createReleaseFetcher(self.fetch.bind(self), new URL('../../release-lock.json', import.meta.url));
await import('../codec-worker.js');
const handle = self.onmessage;
for (const event of queued) handle(event);
