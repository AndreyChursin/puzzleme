import { describe, expect, it } from 'vitest';
import { createGrid } from './index';
describe('grid foundation', () => {
  it('creates an immutable rectangular grid', () => {
    expect(createGrid(3, 4)).toEqual({ rows: 3, columns: 4, pieceCount: 12 });
    expect(Object.isFrozen(createGrid(3, 4))).toBe(true);
  });
  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])('rejects invalid dimension %s', value => {
    expect(() => createGrid(value, 4)).toThrow(RangeError);
    expect(() => createGrid(4, value)).toThrow(RangeError);
  });
  it('rejects unsafe piece counts', () => expect(() => createGrid(Number.MAX_SAFE_INTEGER, 2)).toThrow(RangeError));
});
