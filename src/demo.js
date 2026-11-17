import {randomPasskey} from './ui/passkey.js';
import {payloadFromFragment, fragmentForPayload} from './release.js';

const element = id => document.getElementById(id);
import {call} from './ui/engine-client.js';
let payload, generation = 0;
const note = element('note'), highlights = element('note-highlights');
let draftRevision = 0, draftTimer, composing = false;
const passkey = element('passkey');
passkey.value = randomPasskey();
element('hide-passkey').addEventListener('change', () => { passkey.type = element('hide-passkey').checked ? 'password' : 'text'; });

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
  generation++; payload = undefined; note.readOnly = false;
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
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
passkey.addEventListener('input', () => {
  if (payload) { draftRevision++; render(); }
  else {
    invalidateLink(); clearTimeout(draftTimer);
    const revision = draftRevision;
    draftTimer = setTimeout(() => analyzeCurrent(revision), 180);
  }
});

async function render() {
  const current = ++generation;
  if (!payload) return;
  note.readOnly = true;
  element('writer-status').textContent = 'Updating reading…';
  try {
    const text = await call('decode', { payload, key: passkey.value });
    if (current !== generation) return;
    note.value = text; paintNote(null);
    element('note-feedback').textContent = 'Edit this message to create a new link, or change the passkey for another reading.';
    element('writer-status').textContent = '';
  } catch (error) {
    if (current === generation && error.name !== 'AbortError') { note.value = ''; paintNote(null); element('writer-status').textContent = error.message; }
  } finally { if (current === generation) note.readOnly = false; }
}
function readFragment() {
  clearTimeout(draftTimer); draftRevision++;
  generation++; payload = undefined; note.readOnly = false; note.value = ''; paintNote(null);
  element('link').value = ''; element('note-feedback').textContent = '';
  element('writer-status').textContent = '';
  if (!location.hash) { note.readOnly = false; return; }
  try { payload = payloadFromFragment(location.hash); element('link').value = location.href; render(); }
  catch (error) { element('writer-status').textContent = error.message; }
}

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
    const currentNote = note.value, currentKey = passkey.value;
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
if (!element('encode').disabled && location.hash) readFragment();
