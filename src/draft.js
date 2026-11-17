import { tokenMatches, isWord, isWordPrefix } from './text.js';
import { suggestNext } from './grammar.js';

// Report the first impossible token, while allowing an unfinished final word
// to remain a prefix. Positions refer to the exact textarea content.
export function analyzeDraft(grammar, text) {
  const source = text.toLowerCase();
  const matches = tokenMatches(source);
  const committed = [];
  for (const match of matches) {
    const token = match[0];
    const next = suggestNext(grammar, committed, token);
    if (next.words.includes(token) || next.numberCandidate === token) {
      committed.push(token);
      continue;
    }
    // A trailing apostrophe inside a quote can still begin a possessive.
    // Keep that lexical prefix available until a following character resolves it.
    const tail=source.slice(match.index);
    if(isWordPrefix(tail) && /['’]$/.test(tail) && suggestNext(grammar,committed,tail).words.length) {
      return {complete:false,issue:null,message:'Keep typing or choose a suggested word.'};
    }
    // While entering a doubled dash, the first dash is lexically ambiguous
    // with an interrupted word. A valid word + dash path remains a prefix.
    if(token.endsWith('-') && token.length>1 && match.index+token.length===source.length) {
      const body=token.slice(0,-1),before=suggestNext(grammar,committed,body);
      if(before.words.includes(body) && suggestNext(grammar,[...committed,body],'-').words.includes('-')) {
        return {complete:false,issue:null,message:'Keep typing or choose a suggested word.'};
      }
    }
    if ((isWordPrefix(token) || /^[0-9]+$/.test(token)) && match.index + token.length === source.length &&
        (next.words.length || next.numberPrefixAllowed)) {
      return { complete: false, issue: null, message: 'Keep typing or choose a suggested word.' };
    }
    const subject = grammar.lexicons.get('subjectPronoun');
    const object = grammar.lexicons.get('objectPronoun');
    const expected = suggestNext(grammar, committed).words;
    // A standalone object pronoun is a valid reply. If a verb follows it,
    // diagnose the subject case at the pronoun rather than blaming that verb.
    if(committed.length===1 && object.has(committed[0]) && !subject.has(committed[0]) &&
      grammar.vocabulary.entries.some(entry=>entry.roles.some(role=>role.includes('verb')) &&
        [entry.text,...Object.values(entry.forms||{})].includes(token))) {
      const first=matches[0];
      return {complete:false,issue:{start:first.index,end:first.index+first[0].length},
        message:`“${committed[0]}” is an object pronoun; use a subject pronoun here.`};
    }
    let message;
    if (isWord(token) && !grammar.surfaceWords.has(token)) {
      message = `“${token}” is not in the vocabulary.`;
    } else if (object.has(token) && !subject.has(token) &&
               expected.some(word => subject.has(word))) {
      message = `“${token}” is an object pronoun; use a subject pronoun here.`;
    } else if (subject.has(token) && !object.has(token) &&
               expected.some(word => object.has(word))) {
      message = `“${token}” is a subject pronoun; use an object pronoun here.`;
    } else if (grammar.lexicons.get('greeting').has(token) &&
               suggestNext(grammar, committed).complete) {
      message = `Add a period before “${token}” to start another greeting.`;
    } else if (/^[.!?]$/.test(token)) {
      message = 'Finish the current phrase before ending the sentence.';
    } else {
      message = `“${token}” is in the vocabulary but is not allowed here.`;
    }
    return { complete: false,
      issue: { start: match.index, end: match.index + token.length }, message };
  }
  if (!committed.length) return { complete: false, issue: null, message: 'Write a note to begin.' };
  const complete = suggestNext(grammar, committed).complete;
  return { complete, issue: null,
    message: complete ? 'Note is ready to link.' : 'Continue the sentence.' };
}
