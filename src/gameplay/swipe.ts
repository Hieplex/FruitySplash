import type { Board, Position } from '@/game/types';
import { isWithinBounds } from '@/game/board';

export type SwipeDelta = {
  dx: number;
  dy: number;
};

export type BoardPoint = {
  x: number;
  y: number;
};

export type BoardWindowOrigin = {
  x: number;
  y: number;
};

export type BoardTouchMetrics = {
  rows: number;
  cols: number;
  tileSize: number;
  gap: number;
  boardPadding: number;
};

const DEFAULT_MIN_SWIPE_DISTANCE = 18;

export function getBoardCellFromPoint(point: BoardPoint, metrics: BoardTouchMetrics): Position | null {
  const localX = point.x - metrics.boardPadding;
  const localY = point.y - metrics.boardPadding;
  const pitch = metrics.tileSize + metrics.gap;
  const boardWidth = metrics.cols * metrics.tileSize + (metrics.cols - 1) * metrics.gap;
  const boardHeight = metrics.rows * metrics.tileSize + (metrics.rows - 1) * metrics.gap;

  if (localX < 0 || localY < 0) {
    return null;
  }

  if (localX > boardWidth || localY > boardHeight) {
    return null;
  }

  const col = Math.max(0, Math.round((localX - metrics.tileSize / 2) / pitch));
  const row = Math.max(0, Math.round((localY - metrics.tileSize / 2) / pitch));

  if (row < 0 || row >= metrics.rows || col < 0 || col >= metrics.cols) {
    return null;
  }

  return { row, col };
}

export function getBoardCellFromPagePoint(
  point: BoardPoint,
  boardOrigin: BoardWindowOrigin | null,
  metrics: BoardTouchMetrics,
): Position | null {
  if (!boardOrigin) {
    return null;
  }

  return getBoardCellFromPoint(
    {
      x: point.x - boardOrigin.x,
      y: point.y - boardOrigin.y,
    },
    metrics,
  );
}

export function getSwipeTargetFromReleaseCell(
  origin: Position,
  releaseCell: Position | null,
  board: Board,
): Position | null {
  if (!releaseCell || !isWithinBounds(releaseCell, board)) {
    return null;
  }

  const rowDistance = Math.abs(releaseCell.row - origin.row);
  const colDistance = Math.abs(releaseCell.col - origin.col);

  return rowDistance + colDistance === 1 ? releaseCell : null;
}

export function getSwipeTarget(
  origin: Position,
  delta: SwipeDelta,
  board: Board,
  minDistance = DEFAULT_MIN_SWIPE_DISTANCE,
): Position | null {
  const absX = Math.abs(delta.dx);
  const absY = Math.abs(delta.dy);

  if (Math.max(absX, absY) < minDistance) {
    return null;
  }

  const target =
    absX > absY
      ? { row: origin.row, col: origin.col + Math.sign(delta.dx) }
      : { row: origin.row + Math.sign(delta.dy), col: origin.col };

  return isWithinBounds(target, board) ? target : null;
}
