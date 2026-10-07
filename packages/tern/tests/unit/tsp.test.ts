import { expect, it } from 'vitest';
import { toolCards } from '../../src/tsp.ts';
it('preserves native tool and surface identity rather than inventing live status', () => {
  const frame = (sf: string, name: string) => JSON.stringify({ body: { sf, ops: [['add', null, 0, { id: 'tool-1', k: 'tool', p: { name, target: '/inert/fixture', status: 'running' } }]] } });
  const cards = toolCards(frame('a', 'Read') + '\n' + frame('b', 'Write') + '\nnot a frame');
  expect(cards).toHaveLength(2);
  expect(cards[0]).toEqual({ id: 'tool-1', surface: 'a', name: 'Read', target: '/inert/fixture', statusAtAdd: 'running' });
  expect(cards[1]?.surface).toBe('b');
});
