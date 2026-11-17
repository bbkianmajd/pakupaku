export const VERSION_PATTERN = /^(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})\.(0|[1-9][0-9]{0,5})$/;
const ROLES = new Set(['person-name', 'place-name', 'proper-noun', 'mass-noun', 'count-noun',
  'adjective', 'determiner', 'conjunction', 'past-transitive-verb', 'past-intransitive-verb',
  'subject-pronoun', 'object-pronoun', 'greeting', 'vocative', 'salutation', 'time-of-day',
  'present-base-pronoun', 'present-third-pronoun',
  'present-transitive-verb', 'present-intransitive-verb', 'finite-pronoun', 'framed-verb', 'predicate-adjective', 'adverb', 'discourse-fragment', 'dependency-lexeme','framed-adjective','nominal-phrase','significance-expression']);
const word = value => typeof value === 'string' && value.length > 0 &&
  value === value.toLowerCase() && /^[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}]+)*$/u.test(value);

export function validateVersion(version) {
  if (typeof version !== 'string' || version.trim() !== version || !VERSION_PATTERN.test(version)) {
    throw new Error('Malformed vocabulary version.');
  }
  return version;
}

export function validateVocabulary(input, expectedVersion = input?.version) {
  validateVersion(input?.version);
  if (input.version !== expectedVersion) throw new Error('Vocabulary version mismatch.');
  if (input.language !== 'en' || !Array.isArray(input.entries) ||
      input.entries.length === 0) {
    throw new Error('Invalid vocabulary file.');
  }
  const data = structuredClone(input);
  const ids = new Set();
  for (const entry of data.entries) {
    if (!Number.isSafeInteger(entry.id) || entry.id < 0 || ids.has(entry.id) ||
        !(word(entry.text) || (entry.roles?.length===1 && ['place-name','nominal-phrase','significance-expression'].includes(entry.roles[0]) && typeof entry.text==='string' && entry.text===entry.text.toLowerCase() && entry.text.split(' ').every(part=>word(part)||/^[a-z]+\.$/.test(part))) || (entry.roles?.includes('dependency-lexeme') && typeof entry.text==='string' && /^[\p{L}\p{M}0-9]+(?:['’\-.][\p{L}\p{M}0-9]*)*$/u.test(entry.text))) || !Array.isArray(entry.roles) || !entry.roles.length ||
        new Set(entry.roles).size !== entry.roles.length ||
        entry.roles.some(role => !ROLES.has(role))) throw new Error('Invalid vocabulary entry.');
    ids.add(entry.id);
    if (entry.roles.includes('determiner') && entry.text !== 'the') {
      throw new Error('The fixed grammar only supports the determiner the.');
    }
    if (entry.roles.includes('conjunction') && entry.text !== 'and') {
      throw new Error('The grammar currently supports the conjunction and.');
    }
    if (entry.roles.includes('count-noun') &&
        (!word(entry.forms?.singular) || !word(entry.forms?.plural))) {
      throw new Error('Count nouns require explicit singular and plural forms.');
    }
    if ((entry.roles.includes('present-transitive-verb') ||
         entry.roles.includes('present-intransitive-verb')) &&
        (!word(entry.forms?.base) || !word(entry.forms?.third))) {
      throw new Error('Present-tense verbs require base and third-person forms.');
    }
    if (entry.roles.includes('finite-pronoun') && !['i','you','sg','pl'].includes(entry.features?.agreement)) throw new Error('Pronouns require agreement features.');
    if (entry.roles.includes('framed-verb') && (!['intransitive','transitive','ditransitive','object-location','object-clause','object-infinitive','object-predicate','bare-infinitive','infinitive','clause','predicate','preposition:on','preposition:to','preposition:at','preposition:about','preposition:for','preposition:from','preposition:with','preposition:into','particle:up','particle:out','particle:back','particle:down','particle:away','particle-object:up','particle-object:out'].includes(entry.features?.frame) || ['base','third','past','participle','gerund'].some(form => !word(entry.forms?.[form])))) throw new Error('Verbs require a reviewed frame and all inflections.');
    if(entry.roles.includes('significance-expression') && ['base','third','past','participle'].some(form=>typeof entry.forms?.[form]!=='string' || !entry.forms[form].split(' ').every(word))) throw new Error('Significance expressions require all finite/perfect forms.');
    if (entry.features) Object.freeze(entry.features);
    Object.freeze(entry.roles);
    if (entry.forms) Object.freeze(entry.forms);
    Object.freeze(entry);
  }
  data.entries.sort((a, b) => a.id - b.id);
  Object.freeze(data.entries);
  return Object.freeze(data);
}

export async function loadVocabulary(version, { base = './data/', fetcher = globalThis.fetch } = {}) {
  validateVersion(version);
  const response = await fetcher(`${base}semantics/${version}.json`);
  if (response.status === 404) throw new Error(`Vocabulary version ${version} is missing.`);
  if (!response.ok) throw new Error('Vocabulary could not be loaded. Please retry.');
  return validateVocabulary(await response.json(), version);
}

export async function loadCurrentVocabulary({ base = './data/', fetcher = globalThis.fetch } = {}) {
  const response = await fetcher(`${base}semantics.json`);
  if (!response.ok) throw new Error('Current vocabulary could not be loaded. Please retry.');
  const current = validateVocabulary(await response.json());
  const archived = await loadVocabulary(current.version, { base, fetcher });
  if (JSON.stringify(current) !== JSON.stringify(archived)) {
    throw new Error('Current vocabulary does not match its archived version.');
  }
  return archived;
}
