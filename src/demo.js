import { randomPasskey } from './codec.js';
import {payloadFromFragment, fragmentForPayload} from './release.js';

const element = id => document.getElementById(id);
const worker = new Worker(new URL('./codec-worker.js', import.meta.url), { type: 'module' });
let requestId = 0;
const pending = new Map();
worker.onmessage = ({ data }) => {
  const task = pending.get(data.id);
  if (!task) return;
  pending.delete(data.id);
  if (data.error) task.reject(Object.assign(new Error(data.error), { name: data.aborted ? 'AbortError' : 'Error' }));
  else task.resolve(data.result);
};
worker.onerror = () => {
  for (const task of pending.values()) task.reject(new Error('Unable to run the codec in this browser.'));
  pending.clear();
};
const call = (operation, fields = {}) => new Promise((resolve, reject) => {
  const id = ++requestId; pending.set(id, { resolve, reject }); worker.postMessage({ id, operation, ...fields });
});
let payload, generation = 0;
const note = element('note'), highlights = element('note-highlights');
let draftRevision = 0, draftTimer, composing = false;
element('writer-key').value = randomPasskey();
element('reader-key').value = randomPasskey();
for (const name of ['writer', 'reader']) {
  element(`hide-${name}-key`).addEventListener('change', () => {
    element(`${name}-key`).type = element(`hide-${name}-key`).checked ? 'password' : 'text';
  });
}

function paintNote(issue) {
  const value = note.value, fragment = document.createDocumentFragment();
  if (issue) {
    fragment.append(document.createTextNode(value.slice(0, issue.start)));
    const bad = document.createElement('span');
    bad.className = 'bad'; bad.textContent = value.slice(issue.start, issue.end);
    fragment.append(bad, document.createTextNode(value.slice(issue.end)));
  } else fragment.append(document.createTextNode(value));
  if (value.endsWith('\n')) fragment.append(document.createTextNode('\u200b'));
  highlights.replaceChildren(fragment);
  highlights.scrollTop = note.scrollTop; highlights.scrollLeft = note.scrollLeft;
}
function lowercaseNote() {
  const value = note.value, lower = value.toLowerCase();
  if (value === lower) return;
  const start = value.slice(0, note.selectionStart).toLowerCase().length;
  const end = value.slice(0, note.selectionEnd).toLowerCase().length;
  note.value = lower; note.setSelectionRange(start, end);
}
function invalidateLink() {
  draftRevision++;
  element('link').value = '';
  element('writer-status').textContent = '';
}
async function analyzeCurrent(revision) {
  try {
    const result = await call('analyze', { note: note.value });
    if (revision !== draftRevision) return null;
    paintNote(result.issue);
    element('note-feedback').textContent = result.message;
    return result;
  } catch (error) {
    if (revision === draftRevision) element('note-feedback').textContent = error.message;
    return null;
  }
}
function editedNote() {
  if (composing) return;
  lowercaseNote(); invalidateLink(); paintNote(null);
  element('note-feedback').textContent = 'Checking note…';
  clearTimeout(draftTimer);
  const revision = draftRevision;
  draftTimer = setTimeout(() => analyzeCurrent(revision), 180);
}
note.addEventListener('compositionstart', () => { composing = true; });
note.addEventListener('compositionend', () => { composing = false; editedNote(); });
note.addEventListener('input', editedNote);
note.addEventListener('scroll', () => {
  highlights.scrollTop = note.scrollTop; highlights.scrollLeft = note.scrollLeft;
});
element('writer-key').addEventListener('input', invalidateLink);

async function render() {
  const current = ++generation;
  if (!payload) return;
  element('reader-status').textContent = 'Updating reading…';
  try {
    const text = await call('decode', { payload, key: element('reader-key').value });
    if (current !== generation) return;
    element('reading').textContent = text;
    element('reader-status').textContent = '';
  } catch (error) {
    if (current === generation && error.name !== 'AbortError') { element('reading').textContent = ''; element('reader-status').textContent = error.message; }
  }
}
function readFragment() {
  generation++; payload = undefined; element('reading').textContent = '';
  element('reader-status').textContent = '';
  if (!location.hash) return;
  try { payload = payloadFromFragment(location.hash); render(); }
  catch (error) { element('reader-status').textContent = error.message; }
}
element('reader-key').addEventListener('input', render);
window.addEventListener('hashchange', readFragment);
element('encode').addEventListener('click', async () => {
  clearTimeout(draftTimer);
  element('encode').disabled = true; element('link').value = '';
  const revision = draftRevision;
  try {
    const analysis = await analyzeCurrent(revision);
    if (!analysis || revision !== draftRevision) return;
    if (!analysis.complete) {
      element('writer-status').textContent = 'Finish the highlighted note before creating a link.';
      return;
    }
    const currentNote = note.value, currentKey = element('writer-key').value;
    element('writer-status').textContent = 'Creating link…';
    const encoded = await call('encode', { note: currentNote, key: currentKey });
    if (revision !== draftRevision) return;
    const url = new URL(location.href); url.hash = fragmentForPayload(encoded);
    // Preserve the completed link even if this browser cannot put it in history.
    element('link').value = url.href;
    payload = encoded;
    try { history.replaceState(null, '', url); element('writer-status').textContent = 'Link ready to copy.'; }
    catch { element('writer-status').textContent = 'Link created, but this browser could not place it in the address bar. You can copy it below.'; }
    await render();
  } catch (error) { element('writer-status').textContent = error.message; }
  finally { element('encode').disabled = false; }
});
paintNote(null);
try { await call('init'); element('encode').disabled = false; await analyzeCurrent(draftRevision); }
catch (error) { element('writer-status').textContent = error.message; }
readFragment();
