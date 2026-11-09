import { createGrid, type Point } from './grid';

export interface CubicSegment {
  readonly start: Point;
  readonly control1: Point;
  readonly control2: Point;
  readonly end: Point;
}
export interface PuzzleEdge {
  readonly id: string;
  readonly flat: boolean;
  /** Canonical direction: left to right, or top to bottom. */
  readonly segments: readonly CubicSegment[];
}
export interface PieceEdge {
  readonly edge: PuzzleEdge;
  readonly reversed: boolean;
}
export interface PuzzlePiece {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  /** Top, right, bottom, left; clockwise in y-down puzzle coordinates. */
  readonly edges: readonly [PieceEdge, PieceEdge, PieceEdge, PieceEdge];
}
export interface PuzzleDefinition {
  readonly version: 1;
  readonly seed: number;
  readonly rows: number;
  readonly columns: number;
  readonly pieceSize: number;
  readonly pieceHeight?: number;
  readonly edges: readonly PuzzleEdge[];
  readonly pieces: readonly PuzzlePiece[];
}
export interface PuzzleOptions {
  readonly rows: number;
  readonly columns: number;
  readonly pieceSize: number;
  readonly pieceHeight?: number;
  /** Unsigned 32-bit integer; zero is valid. */
  readonly seed: number;
}

const point = (x: number, y: number): Point => Object.freeze({ x, y });
const segment = (start: Point, control1: Point, control2: Point, end: Point): CubicSegment =>
  Object.freeze({ start, control1, control2, end });

/** Return cubic commands in the piece's traversal direction, including swapped handles. */
export function traverseEdge({ edge, reversed }: PieceEdge): readonly CubicSegment[] {
  if (!reversed) return edge.segments;
  return Object.freeze([...edge.segments].reverse().map(s => segment(s.end, s.control2, s.control1, s.start)));
}

/** Version 1: row-major horizontal edges, then vertical edges, using a 32-bit LCG.
 * Geometry is expressed in puzzle units, with y increasing downwards.
 */
export function generatePuzzle({ rows, columns, pieceSize, pieceHeight = pieceSize, seed }: PuzzleOptions): PuzzleDefinition {
  const grid = createGrid(rows, columns);
  if (grid.pieceCount > 10_000) throw new RangeError('At most 10000 pieces are supported');
  if (!Number.isFinite(pieceSize) || pieceSize < 1 || pieceSize > 1_000_000) {
    throw new RangeError('Piece size must be finite and between 1 and 1000000');
  }
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    throw new RangeError('Seed must be an unsigned 32-bit integer');
  }
  if(!Number.isFinite(pieceHeight)||pieceHeight<1||pieceHeight>1_000_000) throw new RangeError('Invalid piece height');
  let state = seed;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const edges: PuzzleEdge[] = [];
  const makeEdge = (id: string, x: number, y: number, vertical: boolean, flat: boolean): PuzzleEdge => {
    const p = (along: number, normal: number) => point(
      (x + (vertical ? normal : along)) * pieceSize,
      (y + (vertical ? along : normal)) * pieceHeight,
    );
    const start = p(0, 0);
    const end = p(1, 0);
    let segments: readonly CubicSegment[];
    if (flat) {
      segments = [segment(start, p(1 / 3, 0), p(2 / 3, 0), end)];
    } else {
      const depth = (0.16 + random() * 0.06) * (random() < 0.5 ? -1 : 1);
      const center = 0.46 + random() * 0.08;
      const neckStart = p(center - 0.1, 0);
      const crown = p(center, depth);
      const neckEnd = p(center + 0.1, 0);
      segments = [
        segment(start, p(0.16, 0), p(center - 0.04, -depth * 0.15), neckStart),
        segment(neckStart, p(center - 0.22, depth), p(center - 0.13, depth), crown),
        segment(crown, p(center + 0.13, depth), p(center + 0.22, depth), neckEnd),
        segment(neckEnd, p(center + 0.04, -depth * 0.15), p(0.84, 0), end),
      ];
    }
    const edge = Object.freeze({ id, flat, segments: Object.freeze(segments) });
    edges.push(edge);
    return edge;
  };
  const horizontal = Array.from({ length: rows + 1 }, (_, r) =>
    Array.from({ length: columns }, (_, c) => makeEdge(`h:${r}:${c}`, c, r, false, r === 0 || r === rows)));
  const vertical = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: columns + 1 }, (_, c) => makeEdge(`v:${r}:${c}`, c, r, true, c === 0 || c === columns)));
  const reference = (edge: PuzzleEdge, reversed: boolean): PieceEdge => Object.freeze({ edge, reversed });
  const pieces = Array.from({ length: grid.pieceCount }, (_, index): PuzzlePiece => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    // Arrays above are constructed to the validated grid dimensions.
    const boundary: PuzzlePiece['edges'] = Object.freeze([
      reference(horizontal[row]![column]!, false),
      reference(vertical[row]![column + 1]!, false),
      reference(horizontal[row + 1]![column]!, true),
      reference(vertical[row]![column]!, true),
    ]);
    return Object.freeze({ id: `piece:${row}:${column}`, row, column, edges: boundary });
  });
  return Object.freeze({ version: 1, seed, rows, columns, pieceSize, ...(pieceHeight===pieceSize?{}:{pieceHeight}), edges: Object.freeze(edges), pieces: Object.freeze(pieces) });
}
