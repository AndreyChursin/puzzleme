import type { PuzzleDefinition } from './puzzle';
/** Mutable runtime state is separate from the immutable geometry definition. */
export interface PieceState { x: number; y: number; selected: boolean }
export interface GameState { pieces: Record<string, PieceState> }
export function createAssembledState(puzzle: PuzzleDefinition): GameState {
  return { pieces: Object.fromEntries(puzzle.pieces.map(p => [p.id, {
    x: p.column * puzzle.pieceSize, y: p.row * puzzle.pieceSize, selected: false,
  }])) };
}
