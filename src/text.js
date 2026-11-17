// Shared composer/parser token boundaries. Apostrophe spelling is reversible.
export const tokenMatches = text => {
  // Keep longer decimal spellings intact; a malformed amount must not turn
  // silently into a completed amount followed by a separate clock utterance.
  const matches=[...text.toLowerCase().matchAll(/[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*(?:['’\-](?!['’\-]))?|[0-9]+(?:\.[0-9]{3,})?|[^\s]/gu)];
  const result=[];let quoted=false;
  for(const match of matches) {
    if(match[0]==="'") quoted=!quoted;
    if(quoted && match[0].length>1 && match[0].endsWith("'")) {
      result.push({0:match[0].slice(0,-1),index:match.index},{0:"'",index:match.index+match[0].length-1});quoted=false;
    } else result.push(match);
  }
  return result;
};
export const tokenize = text => tokenMatches(text).map(match => match[0]);
export const isWord = text => /^[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*$/u.test(text);
export const canonicalize = text => text.toLowerCase().replace(/\s+/gu, ' ').trim().replace(/ +([.,!?;:])/g, '$1').replace(/(\d): +(?=\d)/g,'$1:').replace(/(\d) *\/ *(?=\d)/g,'$1/');
export const closingPunctuation = text => /^[.,!?;:]$/.test(text);

export const isWordPrefix = text => isWord(text) || (/['’\-]$/.test(text) && isWord(text.slice(0,-1)));
