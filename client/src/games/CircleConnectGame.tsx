import type { CircleConnectView, CircleConnectMove, GridPosition } from "@gamenite/shared";
import type { GameProps } from "../util/types.ts";
import { useState, useCallback, useRef, useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext.ts";
import * as Typography from "../libs/Typography.tsx";
import { Divider } from "../components/Divider.tsx";
import { TranslucentButton as Button } from "../components/Buttons.tsx";
import { hexToRGB } from "../util/utils.ts";

const PAIR_COLORS = [
  "#7b68ae",
  "#2a9d8f",
  "#c0623a",
  "#d4708a",
  "#5b9bd5",
  "#8cb440",
  "#e07b39",
  "#c74848",
];

/** Check if two cells are adjacent */
function adjacent(a: GridPosition, b: GridPosition): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

/**
 * Component for the CircleConnect game — a flow/pipe puzzle where players
 * draw paths between numbered marker pairs to fill the entire grid.
 */
export default function CircleConnectGame({
  view,
  makeMove,
  userPlayerIndex,
  players,
}: GameProps<CircleConnectView, CircleConnectMove>) {
  const { gridSize, markers, paths, moveCount, solved, forfeited, difficulty } = view;
  const { theme } = useContext(ThemeContext);
  const isLight = theme._id === "light";

  const [activePairId, setActivePairId] = useState<number | null>(null);
  const [drawingPath, setDrawingPath] = useState<GridPosition[]>([]);
  const isDrawingRef = useRef(false);
  const drawingRef = useRef<{ pairId: number; path: GridPosition[] } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  /** Convert a pointer's client coordinates to the grid cell under the cursor */
  const pointerToCell = useCallback(
    (clientX: number, clientY: number): GridPosition | null => {
      const grid = gridRef.current;
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
      const col = Math.floor((x / rect.width) * gridSize);
      const row = Math.floor((y / rect.height) * gridSize);
      return { row, col };
    },
    [gridSize],
  );

  /** Get the set of cells occupied by other pairs' committed paths */
  const getBlockedCells = useCallback(
    (pairId: number) => {
      const s = new Set<string>();
      for (let i = 0; i < paths.length; i++) {
        if (i === pairId) continue;
        for (const cell of paths[i]) {
          s.add(`${cell.row},${cell.col}`);
        }
      }
      return s;
    },
    [paths],
  );

  // Waiting state: difficulty selection
  if (gridSize === 0) {
    if (userPlayerIndex !== 0) {
      return (
        <div className="content" style={{ color: theme.text }}>
          <Typography.Paragraph style={{ color: theme.text }}>
            {players[0].display} is selecting difficulty
          </Typography.Paragraph>
        </div>
      );
    }
    return (
      <div className="content" style={{ color: theme.text }}>
        <form
          method="post"
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem", padding: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const diff = formData.get("difficulty");
            if (diff === "easy" || diff === "standard" || diff === "hard") {
              makeMove(diff);
            }
          }}
        >
          <Typography.LargeParagraph style={{ color: theme.text }}>
            Pick your difficulty level:
          </Typography.LargeParagraph>
          <select
            name="difficulty"
            defaultValue="standard"
            style={{
              background: theme.navBar,
              color: theme.text,
              border: `1px solid ${theme.secondaryText}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: "16px",
              fontFamily: "'fira-sans', sans-serif",
            }}
          >
            <option value="easy">Easy (5x5, 4 pairs)</option>
            <option value="standard">Standard (7x7, 6 pairs)</option>
            <option value="hard">Hard (9x9, 8 pairs)</option>
          </select>
          <Button type="submit" color="#43b9c6" text="#43b9c6">
            Submit
          </Button>
        </form>
      </div>
    );
  }

  // Build lookup maps for markers and committed paths
  const markerMap = new Map<string, number>();
  const pathMap = new Map<string, number>();

  for (const m of markers) {
    for (const pos of m.positions) {
      markerMap.set(`${pos.row},${pos.col}`, m.id);
    }
  }
  for (let i = 0; i < paths.length; i++) {
    for (const cell of paths[i]) {
      pathMap.set(`${cell.row},${cell.col}`, i);
    }
  }

  const drawingSet = new Set<string>();
  for (const cell of drawingPath) {
    drawingSet.add(`${cell.row},${cell.col}`);
  }

  /** Extend or backtrack the in-progress drawing path to include the given cell */
  function processCell(row: number, col: number) {
    const drawing = drawingRef.current;
    if (!drawing) return;

    const { pairId, path } = drawing;
    const lastCell = path[path.length - 1];
    if (!lastCell) return;

    if (lastCell.row === row && lastCell.col === col) return;
    if (!adjacent(lastCell, { row, col })) return;

    const key = `${row},${col}`;

    // Allow backtracking
    const existingIdx = path.findIndex((c) => c.row === row && c.col === col);
    if (existingIdx !== -1) {
      const trimmed = path.slice(0, existingIdx + 1);
      drawingRef.current = { pairId, path: trimmed };
      setDrawingPath(trimmed);
      return;
    }

    const blocked = getBlockedCells(pairId);
    if (blocked.has(key)) return;

    const newPath = [...path, { row, col }];
    drawingRef.current = { pairId, path: newPath };
    setDrawingPath(newPath);

    // Check if reached the other endpoint
    const marker = markers[pairId];
    const [epA, epB] = marker.positions;
    const startedAt = path[0];
    const target = startedAt.row === epA.row && startedAt.col === epA.col ? epB : epA;

    if (row === target.row && col === target.col) {
      makeMove({ pairId, path: newPath });
      isDrawingRef.current = false;
      drawingRef.current = null;
      setActivePairId(null);
      setDrawingPath([]);
    }
  }

  const gameOver = solved || !!forfeited;

  /** Begin drawing a path when the user presses on a marker or existing path cell */
  function handlePointerDown(e: React.PointerEvent) {
    if (gameOver) return;

    const cell = pointerToCell(e.clientX, e.clientY);
    if (!cell) return;

    const key = `${cell.row},${cell.col}`;
    let pairId: number | undefined;

    if (markerMap.has(key)) {
      pairId = markerMap.get(key);
    } else if (pathMap.has(key)) {
      pairId = pathMap.get(key);
    }

    if (pairId !== undefined) {
      isDrawingRef.current = true;
      drawingRef.current = { pairId, path: [cell] };
      setActivePairId(pairId);
      setDrawingPath([cell]);
    }
  }

  /** Extend the drawing path as the pointer moves across cells */
  function handlePointerMove(e: React.PointerEvent) {
    if (!isDrawingRef.current) return;
    const cell = pointerToCell(e.clientX, e.clientY);
    if (!cell) return;
    processCell(cell.row, cell.col);
  }

  /** Finalize the drawing: submit the path if it reaches the target, or clear it */
  function handlePointerUp(e: React.PointerEvent) {
    if (!isDrawingRef.current) return;

    // Process the cell under the pointer — some browsers fire pointerup
    // before the final pointermove, so the endpoint cell might not have
    // been processed yet.
    const cell = pointerToCell(e.clientX, e.clientY);
    if (cell) processCell(cell.row, cell.col);

    // If processCell reached the endpoint and submitted, it already
    // cleared everything. Nothing left to do.
    if (!isDrawingRef.current) return;

    // Fallback: check if the path ends at the target endpoint
    const drawing = drawingRef.current;
    if (drawing && drawing.path.length >= 2) {
      const marker = markers[drawing.pairId];
      const [epA, epB] = marker.positions;
      const startedAt = drawing.path[0];
      const target = startedAt.row === epA.row && startedAt.col === epA.col ? epB : epA;
      const last = drawing.path[drawing.path.length - 1];

      if (last.row === target.row && last.col === target.col) {
        makeMove({ pairId: drawing.pairId, path: drawing.path });
      }
    }

    // Click on a marker endpoint without dragging → disconnect that pair's path
    if (drawing && drawing.path.length === 1) {
      const clickedKey = `${drawing.path[0].row},${drawing.path[0].col}`;
      if (markerMap.has(clickedKey) && paths[drawing.pairId].length > 0) {
        makeMove({ pairId: drawing.pairId, path: [] });
      }
    }

    // Clear incomplete drawing
    isDrawingRef.current = false;
    drawingRef.current = null;
    setActivePairId(null);
    setDrawingPath([]);
  }

  // --- Rendering ---
  const gap = 4;
  const cellPx = Math.min(52, Math.floor((420 - gap * (gridSize - 1)) / gridSize));
  const totalSize = gridSize * cellPx + (gridSize - 1) * gap;
  const pipeWidth = Math.max(cellPx * 0.38, 14);
  const markerRadius = Math.max(cellPx * 0.33, 13);

  /** Convert a grid position to its SVG pixel center */
  function cellCenter(pos: GridPosition): [number, number] {
    return [pos.col * (cellPx + gap) + cellPx / 2, pos.row * (cellPx + gap) + cellPx / 2];
  }

  /** Build an SVG points string for a polyline */
  function pathToPoints(path: GridPosition[]): string {
    return path.map((p) => cellCenter(p).join(",")).join(" ");
  }

  // Merge committed paths with the in-progress drawing for display
  const displayPaths = paths.map((p, i) =>
    activePairId === i && drawingPath.length > 0 ? drawingPath : p,
  );

  /** Beveled translucent cell style — mirrors TranslucentButton / Minesweeper cells */
  function getCellStyle(row: number, col: number): React.CSSProperties {
    const key = `${row},${col}`;
    const isMarker = markerMap.has(key);
    const pairIdForPath = pathMap.get(key);
    const isOnDrawing = drawingSet.has(key) && activePairId !== null;
    const isOnPath = pairIdForPath !== undefined;

    // Default: empty cell
    let baseColor = theme.secondaryText;
    let bgOpacity = isLight ? 0.12 : 0.08;
    let bottomBorder = 4;

    if (isOnDrawing) {
      baseColor = PAIR_COLORS[activePairId % PAIR_COLORS.length];
      bgOpacity = 0.3;
      bottomBorder = 3;
    } else if (isOnPath) {
      baseColor = PAIR_COLORS[pairIdForPath % PAIR_COLORS.length];
      bgOpacity = 0.2;
      bottomBorder = 3;
    }

    if (isMarker) {
      const markerId = markerMap.get(key)!;
      baseColor = PAIR_COLORS[markerId % PAIR_COLORS.length];
      bgOpacity = isOnPath || isOnDrawing ? 0.35 : 0.25;
      bottomBorder = 5;
    }

    const { r, g, b } = hexToRGB(baseColor);

    return {
      width: cellPx,
      height: cellPx,
      background: `rgba(${r}, ${g}, ${b}, ${bgOpacity})`,
      border: `2px solid ${baseColor}`,
      borderBottomWidth: `${bottomBorder}px`,
      borderRadius: 8,
      transition: "all 0.1s",
    };
  }

  const connectedCount = paths.filter((p) => p.length > 0).length;

  return (
    <div
      className="content"
      style={{
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.75rem",
      }}
    >
      <Typography.Paragraph style={{ color: theme.secondaryText, textAlign: "center" }}>
        Connect matching numbered circles by drawing paths. Paths cannot cross. Fill every cell.
      </Typography.Paragraph>

      {solved && (
        <Typography.Code style={{ color: "#2ecc71", textAlign: "center" }}>
          {userPlayerIndex === 0 ? "You" : players[0].display} completed the puzzle in {moveCount}{" "}
          move{moveCount !== 1 ? "s" : ""}!
        </Typography.Code>
      )}

      {forfeited && (
        <Typography.Code style={{ color: theme.text, textAlign: "center" }}>
          {userPlayerIndex === 0 ? "You" : players[0].display} forfeited
        </Typography.Code>
      )}

      {/* Grid container: beveled cells + SVG pipe overlay */}
      <div
        ref={gridRef}
        style={{
          position: "relative",
          width: totalSize,
          height: totalSize,
          userSelect: "none",
          touchAction: "none",
          cursor: gameOver ? "default" : "pointer",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Layer 1: Beveled translucent cell grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridSize}, ${cellPx}px)`,
            gridTemplateRows: `repeat(${gridSize}, ${cellPx}px)`,
            gap: `${gap}px`,
          }}
        >
          {Array.from({ length: gridSize * gridSize }, (_, idx) => {
            const row = Math.floor(idx / gridSize);
            const col = idx % gridSize;
            return <div key={`${row}-${col}`} style={getCellStyle(row, col)} />;
          })}
        </div>

        {/* Layer 2: SVG pipe paths and marker circles */}
        <svg
          width={totalSize}
          height={totalSize}
          style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
        >
          {/* Pipe shadows */}
          {displayPaths.map((path, i) => {
            if (path.length < 2) return null;
            return (
              <polyline
                key={`shadow-${i}`}
                points={pathToPoints(path)}
                fill="none"
                stroke="rgba(0,0,0,0.25)"
                strokeWidth={pipeWidth + 3}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {/* Pipe paths */}
          {displayPaths.map((path, i) => {
            if (path.length < 2) return null;
            const color = PAIR_COLORS[i % PAIR_COLORS.length];
            const isActive = activePairId === i;
            return (
              <polyline
                key={`path-${i}`}
                points={pathToPoints(path)}
                fill="none"
                stroke={color}
                strokeWidth={pipeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isActive ? 0.75 : 1}
              />
            );
          })}

          {/* Single-cell drawing dot */}
          {activePairId !== null &&
            drawingPath.length === 1 &&
            (() => {
              const [cx, cy] = cellCenter(drawingPath[0]);
              const color = PAIR_COLORS[activePairId % PAIR_COLORS.length];
              return <circle cx={cx} cy={cy} r={pipeWidth / 2} fill={color} opacity={0.6} />;
            })()}

          {/* Marker circles (on top of everything) */}
          {markers.flatMap((m) => {
            const color = PAIR_COLORS[m.id % PAIR_COLORS.length];
            return m.positions.map((pos, pi) => {
              const [cx, cy] = cellCenter(pos);
              return (
                <g key={`marker-${m.id}-${pi}`}>
                  <circle cx={cx} cy={cy} r={markerRadius + 2} fill="rgba(0,0,0,0.3)" />
                  <circle cx={cx} cy={cy} r={markerRadius} fill={color} />
                  <text
                    x={cx}
                    y={cy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontFamily="'filson-pro', sans-serif"
                    fontWeight={700}
                    fontSize={markerRadius * 1.1}
                  >
                    {m.id + 1}
                  </text>
                </g>
              );
            });
          })}
        </svg>
      </div>

      <Divider color={theme.text} />
      <Typography.Paragraph style={{ color: theme.secondaryText, textAlign: "center" }}>
        Difficulty: {difficulty ?? "standard"} · {connectedCount}/{markers.length} pairs connected ·{" "}
        {moveCount} move{moveCount !== 1 ? "s" : ""}
      </Typography.Paragraph>

      {!gameOver && userPlayerIndex === 0 && (
        <Button onClick={() => makeMove("forfeit")} color="#e01313" text="#e01313" fitContent>
          Forfeit
        </Button>
      )}
    </div>
  );
}
