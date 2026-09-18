import assert from "node:assert/strict";
import {
  FOUR_COLS,
  FOUR_ROWS,
  applyDrop,
  calculateClubPayout,
  checkWin,
  createInitialFourBoard,
  isFull,
  legalCols,
  winner,
} from "./four-engine";
import {
  SAFE_TILES,
  applyMove,
  applyRoll,
  createInitialLudoBoard,
  distanceToHome,
  getLegalMoveTarget,
  getLegalTokens,
  serverRollDice,
} from "./ludo-engine";

console.log("--- RUNNING CONNECT FOUR UNIT TESTS ---");

// 1. Payout: 50 + 50 -> pot 100, rake 4, prize 96
{
  const { pot, rake, prize } = calculateClubPayout(50);
  assert.equal(pot, 100, "Pot must be 100");
  assert.equal(rake, 4, "Rake must be 4% of 100 = 4");
  assert.equal(prize, 96, "Prize must be 96");
  console.log("✓ Payout test passed: 50+50 -> rake 4, prize 96");
}

// 2. Horizontal win
{
  let { cells } = createInitialFourBoard();
  // Red drops in cols 0, 1, 2, 3 on bottom row
  cells = applyDrop(cells, 0, 1)!.cells;
  cells = applyDrop(cells, 0, 2)!.cells; // yellow
  cells = applyDrop(cells, 1, 1)!.cells;
  cells = applyDrop(cells, 1, 2)!.cells; // yellow
  cells = applyDrop(cells, 2, 1)!.cells;
  cells = applyDrop(cells, 2, 2)!.cells; // yellow
  assert.equal(winner(cells), 0, "No win yet before 4th drop");
  cells = applyDrop(cells, 3, 1)!.cells;
  const result = checkWin(cells);
  assert.equal(result.winner, 1, "Red should win horizontally");
  assert.deepEqual(result.winningCells, [0, 1, 2, 3]);
  console.log("✓ Horizontal win passed");
}

// 3. Vertical win
{
  let { cells } = createInitialFourBoard();
  // Yellow stacks 4 in column 4
  cells = applyDrop(cells, 4, 2)!.cells;
  cells = applyDrop(cells, 4, 2)!.cells;
  cells = applyDrop(cells, 4, 2)!.cells;
  assert.equal(winner(cells), 0);
  cells = applyDrop(cells, 4, 2)!.cells;
  const result = checkWin(cells);
  assert.equal(result.winner, 2, "Yellow should win vertically");
  assert.deepEqual(result.winningCells, [4, 11, 18, 25]);
  console.log("✓ Vertical win passed");
}

// 4. Diagonal Up-Right (/) win
{
  let { cells } = createInitialFourBoard();
  // Build staircase in cols 0,1,2,3 for diagonal at (0,0), (1,1), (2,2), (3,3)
  // col 0: Red (row 0)
  cells = applyDrop(cells, 0, 1)!.cells;
  // col 1: Yellow, then Red (row 1)
  cells = applyDrop(cells, 1, 2)!.cells;
  cells = applyDrop(cells, 1, 1)!.cells;
  // col 2: Yellow, Yellow, then Red (row 2)
  cells = applyDrop(cells, 2, 2)!.cells;
  cells = applyDrop(cells, 2, 2)!.cells;
  cells = applyDrop(cells, 2, 1)!.cells;
  // col 3: Yellow, Yellow, Yellow, then Red (row 3)
  cells = applyDrop(cells, 3, 2)!.cells;
  cells = applyDrop(cells, 3, 2)!.cells;
  cells = applyDrop(cells, 3, 2)!.cells;
  assert.equal(winner(cells), 0);
  cells = applyDrop(cells, 3, 1)!.cells;
  const result = checkWin(cells);
  assert.equal(result.winner, 1, "Red should win diagonal up-right");
  console.log("✓ Diagonal up-right win passed");
}

// 5. Diagonal Down-Right (\) win
{
  let { cells } = createInitialFourBoard();
  // col 0: 3 yellow + 1 red (row 3)
  cells = applyDrop(cells, 0, 2)!.cells;
  cells = applyDrop(cells, 0, 2)!.cells;
  cells = applyDrop(cells, 0, 2)!.cells;
  cells = applyDrop(cells, 0, 1)!.cells; // (3,0)
  // col 1: 2 yellow + 1 red (row 2)
  cells = applyDrop(cells, 1, 2)!.cells;
  cells = applyDrop(cells, 1, 2)!.cells;
  cells = applyDrop(cells, 1, 1)!.cells; // (2,1)
  // col 2: 1 yellow + 1 red (row 1)
  cells = applyDrop(cells, 2, 2)!.cells;
  cells = applyDrop(cells, 2, 1)!.cells; // (1,2)
  // col 3: 1 red (row 0)
  assert.equal(winner(cells), 0);
  cells = applyDrop(cells, 3, 1)!.cells; // (0,3)
  const result = checkWin(cells);
  assert.equal(result.winner, 1, "Red should win diagonal down-right");
  console.log("✓ Diagonal down-right win passed");
}

// 6. Full-column rejection
{
  let { cells } = createInitialFourBoard();
  for (let r = 0; r < FOUR_ROWS; r++) {
    cells = applyDrop(cells, 0, 1)!.cells;
  }
  // 7th drop in col 0 must fail
  const failedDrop = applyDrop(cells, 0, 2);
  assert.equal(failedDrop, null, "Dropping into a full column must return null");
  const openCols = legalCols(cells);
  assert.equal(openCols.includes(0), false, "Column 0 must not be legal");
  assert.equal(openCols[0], 1, "Leftmost open column is 1");
  console.log("✓ Full column rejection & legal columns passed");
}

// 7. Draw on full board (42 cells, no 4 in a row)
{
  // Known draw pattern without 4 in a row
  // 1 1 2 2 1 1 2
  // 2 2 1 1 2 2 1
  // 1 1 2 2 1 1 2
  // 2 2 1 1 2 2 1
  // 1 1 2 2 1 1 2
  // 2 2 1 1 2 2 1
  const drawCells = new Array(42).fill(0);
  const pattern = [
    [1, 1, 2, 2, 1, 1, 2],
    [2, 2, 1, 1, 2, 2, 1],
    [1, 1, 2, 2, 1, 1, 2],
    [2, 2, 1, 1, 2, 2, 1],
    [1, 1, 2, 2, 1, 1, 2],
    [2, 2, 1, 1, 2, 2, 1],
  ];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      drawCells[r * 7 + c] = pattern[r][c];
    }
  }
  assert.equal(isFull(drawCells), true, "Board must be recognized as full");
  assert.equal(winner(drawCells), 0, "No winner in draw pattern");
  assert.deepEqual(legalCols(drawCells), [], "No legal columns when full");
  console.log("✓ Full board draw passed");
}

console.log("\n--- RUNNING LUDO QUICK UNIT TESTS ---");

// 8. Yard exit: need 6 to leave yard
{
  const board = createInitialLudoBoard();
  // Die = 5: cannot leave yard
  const moveNon6 = getLegalMoveTarget(board.red[0], 5, "red", board.red, board.yellow);
  assert.equal(moveNon6, null, "Die 5 must not allow leaving yard");

  // Die = 6: leaves yard to start tile 0
  const move6 = getLegalMoveTarget(board.red[0], 6, "red", board.red, board.yellow);
  assert.notEqual(move6, null, "Die 6 must allow leaving yard");
  assert.equal(move6!.targetPos, "ring:0", "Red must enter ring:0");
  assert.equal(move6!.capturesOpponent, false, "Safe tile 0 does not capture");

  // Yellow leaves yard to start tile 26 on 6
  const yellowMove6 = getLegalMoveTarget(board.yellow[0], 6, "yellow", board.yellow, board.red);
  assert.equal(yellowMove6!.targetPos, "ring:26", "Yellow must enter ring:26");
  console.log("✓ Yard exit rules passed (6 leaves yard, <6 rejected)");
}

// 9. Exact home & overshoot rejection
{
  const board = createInitialLudoBoard();
  // Red token at home:4
  board.red[0].pos = "home:4";
  // Roll 2 -> reaches done!
  const moveExact = getLegalMoveTarget(board.red[0], 2, "red", board.red, board.yellow);
  assert.equal(moveExact!.targetPos, "done", "Home:4 + 2 must reach done");

  // Roll 3 -> overshoot!
  const moveOvershoot = getLegalMoveTarget(board.red[0], 3, "red", board.red, board.yellow);
  assert.equal(moveOvershoot, null, "Home:4 + 3 is overshoot and must be rejected");

  // Roll 1 -> home:5
  const moveStep = getLegalMoveTarget(board.red[0], 1, "red", board.red, board.yellow);
  assert.equal(moveStep!.targetPos, "home:5");
  console.log("✓ Exact home & overshoot rejection passed");
}

// 10. Capture off safe tiles & immunity on safe tiles
{
  const board = createInitialLudoBoard();
  board.red[0].pos = "ring:10";
  board.yellow[0].pos = "ring:14"; // 14 is NOT in SAFE_TILES

  // Red rolls 4: lands on yellow at 14 -> captures yellow!
  const moveCapture = getLegalMoveTarget(board.red[0], 4, "red", board.red, board.yellow);
  assert.equal(moveCapture!.targetPos, "ring:14");
  assert.equal(moveCapture!.capturesOpponent, true, "Landing on unsafe tile must capture");

  // Apply move with capture
  board.die = 4;
  board.phase = "await_move";
  const { nextBoard, captured, extraTurn } = applyMove(board, "red", 0);
  assert.equal(captured, true, "Captured flag must be true");
  assert.equal(nextBoard.yellow[0].pos, "yard", "Captured yellow token must return to yard");
  assert.equal(extraTurn, true, "Capture earns an extra turn");

  // Safe tile immunity test (tile 8 is a star / safe tile)
  board.red[0].pos = "ring:5";
  board.yellow[0].pos = "ring:8"; // 8 IS in SAFE_TILES
  const moveSafe = getLegalMoveTarget(board.red[0], 3, "red", board.red, board.yellow);
  assert.equal(moveSafe!.targetPos, "ring:8");
  assert.equal(moveSafe!.capturesOpponent, false, "Safe tile 8 must NOT allow capture");
  console.log("✓ Capture on unsafe & safe tile immunity passed");
}

// 11. Own-stack block: opponent cannot land or pass
{
  const board = createInitialLudoBoard();
  // Yellow has a block at ring:15 (both tokens on ring:15)
  board.yellow[0].pos = "ring:15";
  board.yellow[1].pos = "ring:15";

  // Red is at ring:12
  board.red[0].pos = "ring:12";

  // Red rolls 3: trying to land on ring:15 -> BLOCKED!
  const redLanding = getLegalMoveTarget(board.red[0], 3, "red", board.red, board.yellow);
  assert.equal(redLanding, null, "Opponent cannot land on a 2-token block");

  // Red rolls 4: trying to pass through ring:15 to ring:16 -> BLOCKED!
  const redPassing = getLegalMoveTarget(board.red[0], 4, "red", board.red, board.yellow);
  assert.equal(redPassing, null, "Opponent cannot pass through a 2-token block");

  // Red rolls 2: landing on ring:14 -> allowed!
  const redBefore = getLegalMoveTarget(board.red[0], 2, "red", board.red, board.yellow);
  assert.equal(redBefore!.targetPos, "ring:14", "Movement before block is allowed");
  console.log("✓ 2-token block prevents opponent landing and passing passed");
}

// 12. Extra turns capped at 3 in a row
{
  let board = createInitialLudoBoard();
  board.red[0].pos = "ring:0";

  // 1st extra turn on rolling 6
  board.die = 6;
  board.extras = 0;
  let res = applyMove(board, "red", 0);
  assert.equal(res.extraTurn, true, "1st 6 gives extra turn");
  assert.equal(res.nextTurnColor, "red", "Turn stays red");
  assert.equal(res.nextBoard.extras, 1);

  // 2nd extra turn
  board = res.nextBoard;
  board.die = 6;
  res = applyMove(board, "red", 0);
  assert.equal(res.extraTurn, true, "2nd 6 gives extra turn");
  assert.equal(res.nextTurnColor, "red");
  assert.equal(res.nextBoard.extras, 2);

  // 3rd extra turn
  board = res.nextBoard;
  board.die = 6;
  res = applyMove(board, "red", 0);
  assert.equal(res.extraTurn, true, "3rd 6 gives extra turn");
  assert.equal(res.nextTurnColor, "red");
  assert.equal(res.nextBoard.extras, 3);

  // 4th 6: extras reached cap of 3 -> moves but no 4th extra turn!
  board = res.nextBoard;
  board.die = 6;
  res = applyMove(board, "red", 0);
  assert.equal(res.extraTurn, false, "4th 6 does not grant an extra turn (cap 3)");
  assert.equal(res.nextTurnColor, "yellow", "Turn passes to opponent");
  assert.equal(res.nextBoard.extras, 0, "Extras reset to 0");
  console.log("✓ Extra turns max 3 in a row cap passed");
}

// 13. Win condition: both tokens home
{
  const board = createInitialLudoBoard();
  board.red[0].pos = "done";
  board.red[1].pos = "home:5";
  board.die = 1;
  const res = applyMove(board, "red", 1);
  assert.equal(res.winner, "red", "Both tokens home must declare red winner");
  assert.equal(res.nextBoard.red[1].pos, "done");
  console.log("✓ Win condition (both tokens home) passed");
}

// 14. Server dice verification
{
  for (let i = 0; i < 50; i++) {
    const roll = serverRollDice();
    assert.ok(roll >= 1 && roll <= 6, "Roll must be between 1 and 6");
  }
  console.log("✓ Server RNG verified");
}

console.log("\nALL CONNECT FOUR & LUDO QUICK TESTS PASSED SUCCESSFULLY! 🎉\n");
