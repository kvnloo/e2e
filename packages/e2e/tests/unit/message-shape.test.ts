import type { ModelMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { sameShape, shapeOf } from '../../src/agent/message-shape.ts';

const bytes = () => new Uint8Array([137, 80, 78, 71]);

const screenshot = (): ModelMessage => ({
  role: 'user',
  content: [
    { type: 'text', text: 'Execute this test step: look.' },
    { type: 'file', data: bytes(), mediaType: 'image/png' },
  ],
});

const result = (value: string): ModelMessage => ({
  role: 'tool',
  content: [{ type: 'tool-result', toolCallId: 'c1', toolName: 'tap', output: { type: 'text', value } }],
});

describe('message shapes', () => {
  it('match for a clone of the same message, bytes included', () => {
    const message = screenshot();
    expect(sameShape(shapeOf(message), shapeOf(structuredClone(message)))).toBe(true);
  });

  it('ignore provider options, where a cache breakpoint moves and a signature rides', () => {
    const plain: ModelMessage = { role: 'assistant', content: [{ type: 'reasoning', text: '' }, { type: 'text', text: 'ok' }] };
    const marked: ModelMessage = {
      role: 'assistant',
      content: [
        { type: 'reasoning', text: '', providerOptions: { anthropic: { signature: 'sig' } } },
        { type: 'text', text: 'ok', providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } } },
      ],
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    };
    expect(sameShape(shapeOf(plain), shapeOf(marked))).toBe(true);
  });

  it('differ when a text, a tool result below its part, or the role changes', () => {
    const before = shapeOf(result('looked'));
    expect(sameShape(before, shapeOf(result('looked again')))).toBe(false);
    const edited = result('looked');
    (edited.content[0] as { output: unknown }).output = { type: 'text', value: 'looked [edited]' };
    expect(sameShape(before, shapeOf(edited))).toBe(false);
    expect(sameShape(shapeOf({ role: 'user', content: 'x' }), shapeOf({ role: 'assistant', content: 'x' }))).toBe(false);
  });

  it('keeps a bounded digest that detects an in-place binary edit', () => {
    const message = screenshot();
    const before = shapeOf(message);
    expect(before).toMatch(/^[a-f0-9]{64}$/u);
    const data = (message.content as { data: Uint8Array }[])[1]!.data;
    data[0] = 0;
    expect(sameShape(before, shapeOf(message))).toBe(false);
    expect(sameShape(before, shapeOf(screenshot()))).toBe(true);
  });

  it('keeps a fixed-size fingerprint for a large screenshot without copying it into the snapshot', () => {
    const content = new Uint8Array(2 * 1024 * 1024).fill(42);
    const message: ModelMessage = { role: 'user', content: [{ type: 'file', data: content, mediaType: 'image/png' }] };
    const before = shapeOf(message);
    expect(before).toHaveLength(64);
    expect(sameShape(before, shapeOf(structuredClone(message)))).toBe(true);
    content[content.length - 1] ^= 1;
    expect(sameShape(before, shapeOf(message))).toBe(false);
  });

  it('differ for payloads of another length or content, and for a file named by URL against one sent as bytes', () => {
    const shorter: ModelMessage = { role: 'user', content: [{ type: 'file', data: new Uint8Array([137, 80, 78]), mediaType: 'image/png' }] };
    const byUrl = (): ModelMessage => ({ role: 'user', content: [{ type: 'file', data: new URL('https://example.test/a.png'), mediaType: 'image/png' }] });
    const screenshotShape = shapeOf({ role: 'user', content: [{ type: 'file', data: bytes(), mediaType: 'image/png' }] });
    expect(sameShape(screenshotShape, shapeOf(shorter))).toBe(false);
    expect(sameShape(screenshotShape, shapeOf(byUrl()))).toBe(false);
    expect(sameShape(shapeOf(byUrl()), shapeOf(byUrl()))).toBe(true);
  });
});
