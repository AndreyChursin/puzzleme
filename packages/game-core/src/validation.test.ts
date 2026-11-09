import { describe, expect, it } from 'vitest';
import { createAssembledState, generatePuzzle, getNeighbors, hasContourIntersection, sampleContour, validatePuzzle, type PuzzlePiece } from './index';
describe('geometry validation and state separation', () => {
  it.each([0, 1, 42, 1337, 0xffffffff])('validates contours and neighbors for seed %s', seed => {
    expect(validatePuzzle(generatePuzzle({ rows: 3, columns: 4, pieceSize: 100, seed }))).toEqual([]);
  });
  it.each([[1, 1], [1, 5], [5, 1]])('validates boundary case %s x %s', (rows, columns) => {
    expect(validatePuzzle(generatePuzzle({ rows, columns, pieceSize: 1, seed: 12 }))).toEqual([]);
  });
  it('provides reciprocal neighbor IDs and null exterior neighbors', () => {
    const puzzle = generatePuzzle({ rows: 2, columns: 3, pieceSize: 100, seed: 2 });
    expect(getNeighbors(puzzle, puzzle.pieces[0]!)).toEqual({ top: null, left: null, right: 'piece:0:1', bottom: 'piece:1:0' });
    expect(getNeighbors(puzzle, puzzle.pieces[1]!).left).toBe(puzzle.pieces[0]!.id);
    expect(validatePuzzle({ ...puzzle, pieces: puzzle.pieces.slice(1) })).toContain('Incorrect piece count');
  });
  it('checks winding and contour crossings over 64 seeds', () => {
    for (let seed = 0; seed < 64; seed++) {
      const puzzle = generatePuzzle({ rows: 2, columns: 3, pieceSize: 1, seed: Math.imul(seed, 2654435761) >>> 0 });
      expect(validatePuzzle(puzzle)).toEqual([]);
      for (const piece of puzzle.pieces) {
        const points = sampleContour(piece);
        const area = points.reduce((sum, p, i) => {
          const q = points[(i + 1) % points.length]!;
          return sum + p.x * q.y - q.x * p.y;
        }, 0) / 2;
        expect(area).toBeGreaterThan(0.5);
        expect(area).toBeLessThan(1.5);
      }
    }
  });
  it('detects a crossing contour', () => {
    const points = [{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 0 }];
    const edges = points.map((start, i) => {
      const end = points[(i + 1) % 4]!;
      return { reversed: false, edge: { id: String(i), flat: true, segments: [{ start, control1: start, control2: end, end }] } };
    });
    expect(hasContourIntersection({ id: 'crossing', row: 0, column: 0, edges } as unknown as PuzzlePiece)).toBe(true);
  });
  it('keeps independent mutable state outside frozen geometry', () => {
    const puzzle = generatePuzzle({ rows: 2, columns: 2, pieceSize: 100, seed: 0 });
    const first = createAssembledState(puzzle), second = createAssembledState(puzzle);
    first.pieces['piece:0:1']!.x = 500;
    expect(second.pieces['piece:0:1']!.x).toBe(100);
    expect(puzzle.pieces[1]!.column).toBe(1);
    expect(Object.isFrozen(puzzle)).toBe(true);
  });
});
