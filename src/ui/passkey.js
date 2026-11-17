const adjectives = ['bouncy', 'sleepy', 'wobbly', 'cosmic', 'tiny', 'fuzzy', 'silly', 'jolly', 'sneaky', 'sparkly', 'dancing', 'mighty', 'gentle', 'wonky', 'cheerful', 'dreamy'];
const nouns = ['otter', 'waffle', 'penguin', 'noodle', 'badger', 'teapot', 'mango', 'puffin', 'pickle', 'walrus', 'pancake', 'llama', 'turnip', 'turtle', 'biscuit', 'narwhal'];
export function randomPasskey() {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return `${adjectives[bytes[0] % adjectives.length]}_${adjectives[bytes[1] % adjectives.length]}_${nouns[bytes[2] % nouns.length]}`;
}
