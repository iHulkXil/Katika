/**
 * Connect Four Engine (7 columns x 6 rows)
 * Grid is 42 cells, row-major, row 0 = bottom (gravity).
 * Cell index: row * 7 + col.
 * Cell values: 0 = empty, 1 = red (creator/first), 2 = yellow (opponent/second).
 */

export const FOUR_COLS = 7;
export const FOUR_ROWS = 6;
export const FOUR_CELLS = FOUR_COLS * FOUR_ROWS; // 42

export type FourColor = 1 | 2;

export interface FourBoardState {
  cells: number[]; // length 42
  moves: number[]; // columns played in order
  winningCells?: number[];
}

export function createInitialFourBoard(): FourBoardState {
  return {
    cells: new Array(FOUR_CELLS).fill(0),
    moves: [],
  };
}

/**
 * Returns list of columns (0-6) that still have space (i.e. top row is empty).
 */
export function legalCols(cells: number[]): number[] {
  const result: number[] = [];
  for (let col = 0; col < FOUR_COLS; col++) {
    // Top row is FOUR_ROWS - 1 (row 5)
    if (cells[(FOUR_ROWS - 1) * FOUR_COLS + col] === 0) {
      result.push(col);
    }
  }
  return result;
}

/**
 * Drops a token in column for color (1 or 2).
 * Returns the updated cells and row index dropped to, or null if column full.
 */
export function applyDrop(
  cells: number[],
  col: number,
  color: FourColor
): { cells: number[]; row: number; cellIndex: number } | null {
  if (col < 0 || col >= FOUR_COLS) return null;

  for (let row = 0; row < FOUR_ROWS; row++) {
    const idx = row * FOUR_COLS + col;
    if (cells[idx] === 0) {
      const nextCells = [...cells];
      nextCells[idx] = color;
      return { cells: nextCells, row, cellIndex: idx };
    }
  }
  return null; // Column is full
}

/**
 * Checks if board is completely full (no empty cells).
 */
export function isFull(cells: number[]): boolean {
  return cells.every((cell) => cell !== 0);
}

/**
 * Checks for 4 in a row. Returns winning color (1 or 2) and winning cell indices, or 0 if none.
 */
export function checkWin(cells: number[]): { winner: 0 | 1 | 2; winningCells: number[] } {
  // Horizontal, Vertical, Diagonal Up-Right (/), Diagonal Down-Right (\)
  const directions = [
    { dr: 0, dc: 1 },  // Horizontal
    { dr: 1, dc: 0 },  // Vertical
    { dr: 1, dc: 1 },  // Diagonal Up-Right
    { dr: -1, dc: 1 }, // Diagonal Down-Right
  ];

  for (let r = 0; r < FOUR_ROWS; r++) {
    for (let c = 0; c < FOUR_COLS; c++) {
      const startIdx = r * FOUR_COLS + c;
      const color = cells[startIdx];
      if (color === 0) continue;

      for (const { dr, dc } of directions) {
        const line: number[] = [startIdx];
        let match = true;

        for (let step = 1; step < 4; step++) {
          const nr = r + dr * step;
          const nc = c + dc * step;

          if (nr < 0 || nr >= FOUR_ROWS || nc < 0 || nc >= FOUR_COLS) {
            match = false;
            break;
          }

          const nIdx = nr * FOUR_COLS + nc;
          if (cells[nIdx] !== color) {
            match = false;
            break;
          }

          line.push(nIdx);
        }

        if (match && line.length === 4) {
          return { winner: color as 1 | 2, winningCells: line };
        }
      }
    }
  }

  return { winner: 0, winningCells: [] };
}

export function winner(cells: number[]): 0 | 1 | 2 {
  return checkWin(cells).winner;
}

/**
 * Calculate pot, 4% house rake, and prize
 * pot = 2 * stake
 * rake = floor(pot * 0.04)
 * prize = pot - rake
 */
export function calculateClubPayout(stake: number): {
  pot: number;
  rake: number;
  prize: number;
} {
  const pot = stake * 2;
  const rake = Math.floor(pot * 0.04);
  const prize = pot - rake;
  return { pot, rake, prize };
}
