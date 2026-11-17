const bytes = text => new TextEncoder().encode(text);
export const hex = value => Array.from(value, n => n.toString(16).padStart(2, '0')).join('');
export const digest = async value => new Uint8Array(await crypto.subtle.digest('SHA-256', value));

// The entire exact passkey is inside this SHA-256 input before any mapping.
// No prefix comparison, incremental key reuse, or similarity-based key path.
export async function deriveMappingSeed(passkey, salt, version, layout) {
  if(typeof passkey!=='string')throw new TypeError('Pass-key must be a string.');
  const layoutHash=hex(await digest(layout));
  const seed=await digest(bytes(JSON.stringify(['pakupaku-layout-seed',version,hex(salt),layoutHash,passkey])));
  return {seed,layoutHash};
}

// A keyed permutation of a power-of-two domain, cycle-walked onto each finite
// slot domain. Eight Feistel rounds; this is a custom mapping, not standard FPE.
export async function createMapping(passkey, salt, version, layout, { signal } = {}) {
  if (typeof passkey !== 'string') throw new TypeError('Pass-key must be a string.');
  const {seed,layoutHash}=await deriveMappingSeed(passkey,salt,version,layout);
  const key = await crypto.subtle.importKey('raw', seed, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  let chain = layoutHash;
  async function roundValue(right, round, bits, context) {
    let result = 0n;
    const blocks = Math.ceil(bits / 256);
    for (let block = 0; block < blocks; block++) {
      signal?.throwIfAborted();
      const signed = new Uint8Array(await crypto.subtle.sign('HMAC', key,
        bytes(JSON.stringify(['slot-round', context, chain, round, right.toString(16), block]))));
      result = (result << 256n) | BigInt(`0x${hex(signed)}`);
    }
    return result & ((1n << BigInt(bits)) - 1n);
  }
  return {
    async value(value, size, context, inverse = false) {
      signal?.throwIfAborted();
      if (typeof value !== 'bigint' || value < 0n || value >= size) throw new Error('Semantic value outside its domain.');
      if (size === 1n) return 0n;
      const bits = Math.ceil((size - 1n).toString(2).length / 2), shift = BigInt(bits), mask = (1n << shift) - 1n;
      let output = value;
      do {
        let left = output >> shift, right = output & mask;
        for (let step = 0; step < 8; step++) {
          const round = inverse ? 7 - step : step;
          if (inverse) [left, right] = [right ^ await roundValue(left, round, bits, context), left];
          else [left, right] = [right, left ^ await roundValue(right, round, bits, context)];
        }
        output = (left << shift) | right;
      } while (output >= size);
      return output;
    },
    async advance(semantic, code, context) {
      signal?.throwIfAborted();
      // Both sides know the recovered semantic result before advancing.
      // Include the role/context, result and stored code in a keyed rolling state.
      chain = hex(new Uint8Array(await crypto.subtle.sign('HMAC', key,
        bytes(JSON.stringify(['slot-chain', chain, context, semantic.toString(16), code.toString(16)])))));
    },
  };
}
