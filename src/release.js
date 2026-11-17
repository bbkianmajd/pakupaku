// Shared release identity for the parser, dictionary, and codec.
export const RELEASE_VERSION = '1.0.0';
export function requireRelease(version) {
  if (version !== RELEASE_VERSION) throw new Error(`Wrong version: this app supports ${RELEASE_VERSION}; the link requires ${version || 'an unspecified version'}.`);
}
export function payloadFromFragment(fragment) {
  const params = new URLSearchParams(fragment.replace(/^#/, ''));
  requireRelease(params.get('v'));
  if (params.getAll('v').length !== 1 || params.getAll('a').length !== 1 || !params.get('a')) throw new Error('Invalid versioned link.');
  return params.get('a');
}
export function fragmentForPayload(payload) {
  return `v=${RELEASE_VERSION}&a=${encodeURIComponent(payload)}`;
}
export async function verifyReleaseFiles({base = new URL('../', import.meta.url), fetcher = fetch} = {}) {
  const response = await fetcher(new URL('release-lock.json', base), {cache:'no-store'});
  if (!response.ok) throw new Error('Unable to load the release lock.');
  const lock = await response.json();
  requireRelease(lock.version);
  if (!lock.files || !Object.keys(lock.files).length) throw new Error('Invalid release lock.');
  await Promise.all(Object.entries(lock.files).map(async ([path, expected]) => {
    const file = await fetcher(new URL(path, base), {cache:'no-store'});
    if (!file.ok) throw new Error(`Unable to load locked release file: ${path}.`);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer())), b => b.toString(16).padStart(2,'0')).join('');
    if (hash !== expected) throw new Error(`Wrong version: ${path} does not match locked release ${RELEASE_VERSION}.`);
  }));
  return lock;
}
