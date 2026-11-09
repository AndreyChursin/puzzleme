import type { Point } from './grid';
import { traverseEdge, type CubicSegment, type PuzzleDefinition, type PuzzlePiece } from './puzzle';

export type Side = 'top' | 'right' | 'bottom' | 'left';
export type Neighbors = Readonly<Record<Side, string | null>>;
export function getNeighbors(puzzle: PuzzleDefinition, piece: PuzzlePiece): Neighbors {
  const { row: r, column: c } = piece;
  return Object.freeze({
    top: r > 0 ? `piece:${r - 1}:${c}` : null,
    right: c + 1 < puzzle.columns ? `piece:${r}:${c + 1}` : null,
    bottom: r + 1 < puzzle.rows ? `piece:${r + 1}:${c}` : null,
    left: c > 0 ? `piece:${r}:${c - 1}` : null,
  });
}

function sample(s: CubicSegment, t: number): Point {
  const a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t ** 2, d = t ** 3;
  return { x: a * s.start.x + b * s.control1.x + c * s.control2.x + d * s.end.x,
    y: a * s.start.y + b * s.control1.y + c * s.control2.y + d * s.end.y };
}
/** Diagnostic polyline, not a rendering substitute for the original cubics. */
export function sampleContour(piece: PuzzlePiece, steps = 24): readonly Point[] {
  if (!Number.isInteger(steps) || steps < 2 || steps > 256) throw new RangeError('Steps must be 2..256');
  return piece.edges.flatMap(edge => traverseEdge(edge).flatMap(s =>
    Array.from({ length: steps }, (_, i) => sample(s, i / steps))));
}
const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function intersects(a: Point, b: Point, c: Point, d: Point): boolean {
  const on = (p: Point, q: Point, r: Point) => cross(p, q, r) === 0 &&
    r.x >= Math.min(p.x, q.x) && r.x <= Math.max(p.x, q.x) && r.y >= Math.min(p.y, q.y) && r.y <= Math.max(p.y, q.y);
  return (cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0) ||
    on(a, b, c) || on(a, b, d) || on(c, d, a) || on(c, d, b);
}
export function hasContourIntersection(piece: PuzzlePiece): boolean {
  const points = sampleContour(piece);
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 2; j < points.length; j++) {
      if (i === 0 && j === points.length - 1) continue;
      if (intersects(points[i]!, points[(i + 1) % points.length]!, points[j]!, points[(j + 1) % points.length]!)) return true;
    }
  }
  return false;
}

/** Returns structural errors; contour intersection diagnostics use 24 samples/cubic. */
export function validatePuzzle(puzzle: PuzzleDefinition): readonly string[] {
  const errors: string[] = [];
  if (puzzle.pieces.length !== puzzle.rows * puzzle.columns) errors.push('Incorrect piece count');
  const byId = new Map(puzzle.pieces.map(p => [p.id, p]));
  const ids = new Set(byId.keys());
  if (ids.size !== puzzle.pieces.length) errors.push('Duplicate piece IDs');
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  for (const [index, piece] of puzzle.pieces.entries()) {
    if (piece.row !== Math.floor(index / puzzle.columns) || piece.column !== index % puzzle.columns ||
      piece.id !== `piece:${piece.row}:${piece.column}`) errors.push(`${piece.id}: invalid grid position`);
    const neighbors = getNeighbors(puzzle, piece);
    const commands = piece.edges.flatMap(traverseEdge);
    if (commands.some((s, i) => {
      const next = commands[(i + 1) % commands.length]!;
      return s.end.x !== next.start.x || s.end.y !== next.start.y ||
        [s.start, s.control1, s.control2, s.end].some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y));
    })) errors.push(`${piece.id}: invalid contour`);
    if (hasContourIntersection(piece)) errors.push(`${piece.id}: intersecting contour`);
    sides.forEach((side, i) => {
      const edge = piece.edges[i]!;
      const neighborId = neighbors[side];
      if (edge.edge.flat !== (neighborId === null)) errors.push(`${piece.id}: invalid boundary`);
      if (edge.edge.flat) {
        const segments = edge.edge.segments;
        const first = segments[0]?.start, last = segments.at(-1)?.end;
        if (!first || !last || segments.some(s => [s.start, s.control1, s.control2, s.end].some(p => cross(first, last, p) !== 0))) {
          errors.push(`${piece.id}: non-flat exterior`);
        }
      }
      if (neighborId !== null) {
        const neighbor = byId.get(neighborId);
        const opposite = neighbor?.edges[(i + 2) % 4];
        if (!opposite || opposite.edge !== edge.edge || opposite.reversed === edge.reversed) {
          errors.push(`${piece.id}: invalid neighbor ${side}`);
        }
      }
    });
  }
  return errors;
}
