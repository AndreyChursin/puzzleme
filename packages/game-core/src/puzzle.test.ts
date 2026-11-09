import { describe, expect, it } from 'vitest';
import { generatePuzzle, traverseEdge, type PuzzleOptions } from './index';

const options: PuzzleOptions = { rows: 3, columns: 4, pieceSize: 100, seed: 42 };

describe('deterministic puzzle geometry v1', () => {
  it('repeats identical output independently of other calls', () => {
    const first = generatePuzzle(options);
    generatePuzzle({ ...options, seed: 99 });
    expect(generatePuzzle(options)).toEqual(first);
    expect(generatePuzzle({ ...options, seed: 43 }).edges).not.toEqual(first.edges);
    expect(first.pieces.map(p => p.id)).toEqual(Array.from({ length: 12 }, (_, i) => `piece:${Math.floor(i / 4)}:${i % 4}`));
  });
  it('locks the version 1 random sequence', () => {
    const edge = generatePuzzle({ rows: 1, columns: 2, pieceSize: 1, seed: 0 }).edges.find(e => !e.flat)!;
    expect(edge.id).toBe('v:0:1');
    expect(edge.segments[1]!.end).toEqual({ x: 0.8258359216293321, y: 0.5255627007968724 });
  });
  it.each([[1, 1], [1, 7], [6, 1], [3, 4], [10, 12]])('closes every path for %s x %s', (rows, columns) => {
    const puzzle = generatePuzzle({ ...options, rows, columns });
    expect(puzzle.edges).toHaveLength((rows + 1) * columns + rows * (columns + 1));
    for (const piece of puzzle.pieces) {
      const commands = piece.edges.flatMap(traverseEdge);
      commands.forEach((command, i) => {
        expect(command.end).toEqual(commands[(i + 1) % commands.length]!.start);
        for (const p of [command.start, command.control1, command.control2, command.end]) {
          expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        }
      });
      expect(commands[0]!.start).toEqual({ x: piece.column * 100, y: piece.row * 100 });
    }
    for (const edge of puzzle.edges) {
      const uses = puzzle.pieces.flatMap(p => p.edges).filter(e => e.edge === edge);
      expect(uses).toHaveLength(edge.flat ? 1 : 2);
      if (edge.flat) {
        expect(edge.segments).toHaveLength(1);
      } else {
        expect(uses[0]!.reversed).not.toBe(uses[1]!.reversed);
        const forward = traverseEdge(uses[0]!);
        const backward = [...traverseEdge(uses[1]!)].reverse();
        forward.forEach((s, i) => expect(backward[i]).toEqual({
          start: s.end, control1: s.control2, control2: s.control1, end: s.start,
        }));
      }
    }
  });
  it('scales all geometry in puzzle units', () => {
    const small = generatePuzzle({ ...options, pieceSize: 1 });
    const large = generatePuzzle(options);
    small.edges.forEach((edge, i) => edge.segments.forEach((s, j) => {
      for (const key of ['start', 'control1', 'control2', 'end'] as const) {
        expect(large.edges[i]!.segments[j]![key]).toEqual({ x: s[key].x * 100, y: s[key].y * 100 });
      }
    }));
  });
  it('deeply freezes the output and reversed traversal', () => {
    const assertFrozen = (value: unknown): void => {
      if (value && typeof value === 'object') {
        expect(Object.isFrozen(value)).toBe(true);
        Object.values(value).forEach(assertFrozen);
      }
    };
    const puzzle = generatePuzzle(options);
    assertFrozen(puzzle);
    assertFrozen(traverseEdge(puzzle.pieces[0]!.edges[2]));
  });
  it.each([
    { rows: 0 }, { columns: 1.5 }, { rows: 101, columns: 100 },
    { pieceSize: 0 }, { pieceSize: NaN }, { pieceSize: Infinity }, { pieceSize: 1_000_001 },
    { seed: -1 }, { seed: 0x100000000 }, { seed: 1.5 }, { seed: NaN }, { seed: Infinity },
  ])('rejects invalid options %j', invalid => {
    expect(() => generatePuzzle({ ...options, ...invalid })).toThrow(RangeError);
  });
  it('accepts both unsigned seed endpoints', () => {
    expect(generatePuzzle({ ...options, seed: 0 }).seed).toBe(0);
    expect(generatePuzzle({ ...options, seed: 0xffffffff }).seed).toBe(0xffffffff);
  });
});
