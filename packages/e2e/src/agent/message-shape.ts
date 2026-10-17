/**
 * Model-message content fingerprint for detecting edits to a signed thinking
 * prefix without retaining another copy of the history, including screenshots.
 * Provider metadata is excluded: moved cache breakpoints and signatures are
 * not changes to the model-visible content.
 */

import { createHash } from 'node:crypto';
import type { ModelMessage } from 'ai';

/** SHA-256 digest of one model-visible message. */
export type MessageShape = string;

const PROVIDER_KEYS = new Set(['providerOptions', 'providerMetadata']);

/**
 * Hashes a message's content as read by the model. Binary payload bytes enter
 * the digest synchronously, so a subsequent in-place edit changes the next
 * shape even if the same Uint8Array object is reused.
 */
export function shapeOf(message: ModelMessage): MessageShape {
  const hash = createHash('sha256');
  const write = (value: string | undefined): void => { hash.update(value ?? ''); };
  const walk = (value: unknown): void => {
    if (value instanceof Uint8Array) {
      write(`<bytes ${String(value.byteLength)}>`);
      hash.update(value);
    } else if (value instanceof ArrayBuffer) {
      walk(new Uint8Array(value));
    } else if (Array.isArray(value)) {
      write('[');
      for (const item of value) walk(item);
      write(']');
    } else if (typeof value === 'object' && value !== null && !(value instanceof URL)) {
      write('{');
      for (const [key, item] of Object.entries(value)) {
        if (PROVIDER_KEYS.has(key) || item === undefined) continue;
        write(JSON.stringify(key));
        write(':');
        walk(item);
      }
      write('}');
    } else {
      write(JSON.stringify(value instanceof URL ? value.href : value));
      write(',');
    }
  };
  walk(message);
  return hash.digest('hex');
}

/** Whether two snapshots carry the same model-visible message. */
export function sameShape(a: MessageShape, b: MessageShape): boolean {
  return a === b;
}
