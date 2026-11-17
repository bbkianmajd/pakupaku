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

function setLink(value) {
  const link = element('link');
  if (value) link.href = value; else link.removeAttribute('href');
  link.textContent = value; link.hidden = !value;
  element('empty-link').hidden = Boolean(value);
  element('copy-link').disabled = !value;
  element('copy-status').textContent = '';
  element('paper-mark').classList.toggle('folded', Boolean(value));
}
element('copy-link').addEventListener('click', async () => {
  const link = element('link').getAttribute('href');
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    element('copy-status').textContent = 'Copied. Ready to share.';
  } catch {
    element('copy-status').textContent = 'Copy unavailable in this browser. Select the link to copy it manually.';
  }
});

function setFeedback(message, state = 'done') {
  element('note-feedback').textContent = message;
  element('validation').dataset.state = state;
  const icon = element('validation-icon');
  icon.hidden = !message;
  icon.classList.toggle('folded', state === 'checking');
  note.setAttribute('aria-busy', String(state === 'checking'));
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
  setLink('');
  element('writer-status').textContent = '';
}
async function analyzeCurrent(revision) {
  try {
    setFeedback('Checking note…', 'checking');
    const result = await call('analyze', { note: note.value });
    if (revision !== draftRevision) return null;
    paintNote(result.issue);
    setFeedback(result.message, result.issue ? 'error' : 'done');
    return result;
  } catch (error) {
    if (revision === draftRevision) setFeedback(error.message, 'error');
    return null;
  }
}
function editedNote() {
  if (composing) return;
  generation++; payload = undefined; note.readOnly = false;
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  lowercaseNote(); invalidateLink(); paintNote(null);
  setFeedback('Checking note…', 'checking');
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
    setFeedback('Checking note…', 'checking');
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
    setFeedback('Message unfolded.');
    element('writer-status').textContent = '';
  } catch (error) {
    if (current === generation && error.name !== 'AbortError') { note.value = ''; paintNote(null); element('writer-status').textContent = error.message; }
  } finally { if (current === generation) note.readOnly = false; }
}
function readFragment() {
  clearTimeout(draftTimer); draftRevision++;
  generation++; payload = undefined; note.readOnly = false; note.value = ''; paintNote(null);
  setLink(''); setFeedback('');
  element('writer-status').textContent = '';
  if (!location.hash) { note.readOnly = false; return; }
  try { payload = payloadFromFragment(location.hash); setLink(location.href); render(); }
  catch (error) { element('writer-status').textContent = error.message; }
}

window.addEventListener('hashchange', readFragment);
element('encode').addEventListener('click', async () => {
  clearTimeout(draftTimer);
  element('encode').disabled = true; setLink('');
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
    const url = new URL('./', location.href); url.search = location.search; url.hash = fragmentForPayload(encoded);
    // Preserve the completed link even if this browser cannot put it in history.
    setLink(url.href);
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
