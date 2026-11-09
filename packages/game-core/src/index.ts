/** Immutable coordinates in puzzle space, independent of screen density. */
export interface Point { readonly x: number; readonly y: number }
export interface GridDefinition { readonly rows: number; readonly columns: number; readonly pieceCount: number }
/** Phase 1 foundation: validate an explicit grid, without generating topology yet. */
export function createGrid(rows: number, columns: number): GridDefinition {
  if (!Number.isSafeInteger(rows) || !Number.isSafeInteger(columns) || rows < 1 || columns < 1 || !Number.isSafeInteger(rows * columns)) {
    throw new RangeError('Grid dimensions must be positive safe integers');
  }
  return Object.freeze({ rows, columns, pieceCount: rows * columns });
}
