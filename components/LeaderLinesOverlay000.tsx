import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import computeLayers from "../layout/computeLayers";
import type { RawDevice } from "../types/types";
import DownJunctionIcon from "./DownJunctionIcon";

/* ──────────────────────────────────────────────
   TYPES
────────────────────────────────────────────── */
type Rect = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };

type Edge = {
  fromId: string;
  toId: string;
  isDown: boolean;
  path: string;
  icon1?: Point;
  icon2?: Point;
};

type Box = {
  id: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
};

type HorizontalSeg = { y: number; x1: number; x2: number };
type VerticalLane = { x: number; y1: number; y2: number };

/* ──────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────── */
const JUNCTION_GAP = 15;
const LANE_SPACING = 15;
const TARGET_SEPARATION = 20;

const STROKE_WIDTH = 2;
const HIT_PAD = 2 + STROKE_WIDTH * 2; // geometry padding

const VERTICAL_LANE_SPACING = 12;
const MAX_VERTICAL_LANES = 30;
const MAX_LANE_SEARCH = 2500;

const DIRECT_Y_EPS = 2; // “same row” threshold

const MIN_ELBOW_DELTA = 18;
const STEP_OFFSET = 20;

/* ──────────────────────────────────────────────
   GEOMETRY HELPERS
────────────────────────────────────────────── */
function getCenter(r: Rect): Point {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function getOutJunction(from: Rect, to: Rect): Point {
  const fc = getCenter(from);
  const tc = getCenter(to);
  return tc.x >= fc.x
    ? { x: from.left + from.width + JUNCTION_GAP, y: fc.y }
    : { x: from.left - JUNCTION_GAP, y: fc.y };
}

function getInJunction(from: Rect, to: Rect): Point {
  const tc = getCenter(to);
  const fc = getCenter(from);
  return tc.x >= fc.x
    ? { x: to.left - JUNCTION_GAP, y: tc.y }
    : { x: to.left + to.width + JUNCTION_GAP, y: tc.y };
}

function overlaps(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(a1, b1) <= Math.min(a2, b2);
}

/* ──────────────────────────────────────────────
   BOX LIST (X-aware no-go)
────────────────────────────────────────────── */
function buildBoxes(rects: Map<string, Rect>): Box[] {
  const boxes: Box[] = [];
  rects.forEach((r, id) => {
    boxes.push({
      id,
      x1: r.left - HIT_PAD,
      x2: r.left + r.width + HIT_PAD,
      y1: r.top - HIT_PAD,
      y2: r.top + r.height + HIT_PAD,
    });
  });
  return boxes;
}

function horizontalHitsAnyBox(
  y: number,
  x1: number,
  x2: number,
  boxes: Box[],
  excludeIds: Set<string>
) {
  const a1 = Math.min(x1, x2);
  const a2 = Math.max(x1, x2);
  for (const b of boxes) {
    if (excludeIds.has(b.id)) continue;
    if (y >= b.y1 && y <= b.y2 && overlaps(a1, a2, b.x1, b.x2)) return true;
  }
  return false;
}

function verticalHitsAnyBox(
  x: number,
  y1: number,
  y2: number,
  boxes: Box[],
  excludeIds: Set<string>
) {
  const a1 = Math.min(y1, y2);
  const a2 = Math.max(y1, y2);
  for (const b of boxes) {
    if (excludeIds.has(b.id)) continue;
    if (x >= b.x1 && x <= b.x2 && overlaps(a1, a2, b.y1, b.y2)) return true;
  }
  return false;
}

/* ──────────────────────────────────────────────
   SEGMENT COLLISIONS (line-on-line)
────────────────────────────────────────────── */
function horizontalCollides(y: number, x1: number, x2: number, used: HorizontalSeg[]) {
  const a1 = Math.min(x1, x2);
  const a2 = Math.max(x1, x2);
  return used.some(h =>
    Math.abs(h.y - y) < STROKE_WIDTH * 2 &&
    overlaps(a1, a2, h.x1, h.x2)
  );
}

function verticalCollides(x: number, y1: number, y2: number, used: VerticalLane[]) {
  const a1 = Math.min(y1, y2);
  const a2 = Math.max(y1, y2);
  return used.some(v =>
    Math.abs(v.x - x) < STROKE_WIDTH * 2 &&
    overlaps(a1, a2, v.y1, v.y2)
  );
}

/* ──────────────────────────────────────────────
   LANE HELPERS
────────────────────────────────────────────── */
function getGapKey(a: number, b: number) {
  const x = Math.min(a, b);
  const y = Math.max(a, b);
  return `${x}->${y}`;
}

/**
 * Choose a Y lane only when needed.
 * Blocks:
 * - line crosses boxes (X-aware)
 * - horizontal overlaps with other horizontal segments
 * - +20 separation for different targets (same toId can reuse)
 */
function allocateSafeLaneY(
  desiredY: number,
  gapKey: string,
  toId: string,
  claimedByGap: Map<string, { y: number; toId: string }[]>,
  boxes: Box[],
  excludeIds: Set<string>,
  outBaseX: number,
  inBaseX: number,
  usedHorizontals: HorizontalSeg[]
): number {
  const claimed = claimedByGap.get(gapKey) ?? [];

  const blocked = (y: number) =>
    horizontalHitsAnyBox(y, outBaseX, inBaseX, boxes, excludeIds) ||
    horizontalCollides(y, outBaseX, inBaseX, usedHorizontals);

  // fan-in reuse: only reuse lane if same target
  for (const lane of claimed) {
    if (lane.toId === toId && !blocked(lane.y)) return lane.y;
  }

  let offset = 0;
  while (offset <= MAX_LANE_SEARCH) {
    const candidates = offset === 0 ? [desiredY] : [desiredY - offset, desiredY + offset];
    for (const y of candidates) {
      if (blocked(y)) continue;

      const tooCloseToOtherTarget = claimed.some(
        l => l.toId !== toId && Math.abs(l.y - y) < TARGET_SEPARATION
      );
      if (tooCloseToOtherTarget) continue;

      claimed.push({ y, toId });
      claimedByGap.set(gapKey, claimed);
      return y;
    }
    offset += LANE_SPACING;
  }

  // fallback
  claimed.push({ y: desiredY, toId });
  claimedByGap.set(gapKey, claimed);
  return desiredY;
}

/**
 * Allocate a vertical lane X in the gap so vertical legs don’t overlap,
 * and don’t pass through boxes (X-aware).
 *
 * IMPORTANT: called AFTER laneY is final.
 */
function allocateVerticalLaneX(
  baseX: number,
  y1: number,
  y2: number,
  used: VerticalLane[],
  boxes: Box[],
  excludeIds: Set<string>
): number {
  for (let lane = 0; lane < MAX_VERTICAL_LANES; lane++) {
    const x = baseX + lane * VERTICAL_LANE_SPACING;

    if (verticalHitsAnyBox(x, y1, y2, boxes, excludeIds)) continue;
    if (verticalCollides(x, y1, y2, used)) continue;

    used.push({ x, y1: Math.min(y1, y2), y2: Math.max(y1, y2) });
    return x;
  }

  // fallback
  used.push({ x: baseX, y1: Math.min(y1, y2), y2: Math.max(y1, y2) });
  return baseX;
}

/* ──────────────────────────────────────────────
   PATH BUILDERS
────────────────────────────────────────────── */
function buildDirectPath(fromCenter: Point, outJ: Point, inJ: Point, toCenter: Point): string {
  // Straight across gap at same Y (no lane, no elbows)
  return `
    M ${fromCenter.x} ${fromCenter.y}
    L ${outJ.x} ${outJ.y}
    L ${inJ.x} ${inJ.y}
    L ${toCenter.x} ${toCenter.y}
  `;
}

function buildElbowPath(
  fromCenter: Point,
  outJ: Point,
  laneY: number,
  inJ: Point,
  toCenter: Point
): string {
  // Suppress micro elbows: only step when there’s a meaningful Y move
  const dy = laneY - outJ.y;
  const needsStep =
    Math.abs(dy) >= MIN_ELBOW_DELTA &&
    Math.abs(outJ.x - inJ.x) > STROKE_WIDTH;

  const stepY = needsStep
    ? outJ.y + Math.sign(dy || 1) * STEP_OFFSET
    : laneY;

  return needsStep
    ? `
      M ${fromCenter.x} ${fromCenter.y}
      L ${outJ.x} ${outJ.y}
      L ${outJ.x} ${stepY}
      L ${inJ.x} ${stepY}
      L ${inJ.x} ${laneY}
      L ${inJ.x} ${inJ.y}
      L ${toCenter.x} ${toCenter.y}
    `
    : `
      M ${fromCenter.x} ${fromCenter.y}
      L ${outJ.x} ${outJ.y}
      L ${outJ.x} ${laneY}
      L ${inJ.x} ${laneY}
      L ${inJ.x} ${inJ.y}
      L ${toCenter.x} ${toCenter.y}
    `;
}

/* ────────────────────────────────────────────── */
function connectionIsDown(from?: RawDevice, to?: RawDevice) {
  return from?.status === "down" || to?.status === "down";
}

/* ──────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────── */
export default function LeaderLinesOverlay({
  devices,
  containerId = "diagram-canvas",
}: {
  devices: RawDevice[];
  containerId?: string;
}) {
  const [rects, setRects] = useState<Map<string, Rect>>(new Map());
  const [size, setSize] = useState({ w: 0, h: 0 });

  const layers = useMemo(() => computeLayers(devices), [devices]);

  const deviceById = useMemo(() => {
    const m = new Map<string, RawDevice>();
    devices.forEach(d => m.set(d.id, d));
    return m;
  }, [devices]);

  const links = useMemo(() => {
    const out: { fromId: string; toId: string }[] = [];
    devices.forEach(d =>
      d.links?.forEach(toId => {
        if (deviceById.has(toId)) out.push({ fromId: d.id, toId });
      })
    );
    return out;
  }, [devices, deviceById]);

  const measure = () => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const box = container.getBoundingClientRect();
    const next = new Map<string, Rect>();

    devices.forEach(d => {
      const el = document.getElementById(`node-${d.id}`);
      if (!el) return;
      const r = el.getBoundingClientRect();
      next.set(d.id, {
        left: r.left - box.left,
        top: r.top - box.top,
        width: r.width,
        height: r.height,
      });
    });

    setRects(next);
    setSize({ w: box.width, h: box.height });
  };

  useLayoutEffect(measure, [devices]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, []);

  const renderedEdges: Edge[] = useMemo(() => {
    const boxes = buildBoxes(rects);

    const claimedByGap = new Map<string, { y: number; toId: string }[]>();
    const usedHorizontals: HorizontalSeg[] = [];
    const usedVerticals: VerticalLane[] = [];

    const out: Edge[] = [];

    for (const { fromId, toId } of links) {
      const fr = rects.get(fromId);
      const tr = rects.get(toId);
      if (!fr || !tr) continue;

      const fromCenter = getCenter(fr);
      const toCenter = getCenter(tr);

      const rawOutJ = getOutJunction(fr, tr);
      const rawInJ = getInJunction(fr, tr);

      const fromCol = layers.get(fromId) ?? 0;
      const toCol = layers.get(toId) ?? 0;
      const gapKey = getGapKey(fromCol, toCol);

      const excludeIds = new Set<string>([fromId, toId]);

      const isDown = connectionIsDown(deviceById.get(fromId), deviceById.get(toId));

      // ─────────────────────────────────────────
      // (A) DIRECT PATH FAST-PATH
      // Only if near-same Y and straight segment across gap is clear.
      // This is what removes plcc/plcm pointless elbows.
      // ─────────────────────────────────────────
      const sameRow = Math.abs(fromCenter.y - toCenter.y) <= DIRECT_Y_EPS;
      if (sameRow) {
        const y = (fromCenter.y + toCenter.y) / 2;
        const outJ = { ...rawOutJ, y };
        const inJ = { ...rawInJ, y };

        const crossesBox = horizontalHitsAnyBox(y, outJ.x, inJ.x, boxes, excludeIds);
        const crossesLine = horizontalCollides(y, outJ.x, inJ.x, usedHorizontals);

        if (!crossesBox && !crossesLine) {
          // reserve the horizontal so later edges don’t stack on it
          usedHorizontals.push({
            y,
            x1: Math.min(outJ.x, inJ.x),
            x2: Math.max(outJ.x, inJ.x),
          });

          out.push({
            fromId,
            toId,
            isDown,
            path: buildDirectPath(fromCenter, outJ, inJ, toCenter),
            icon1: isDown ? outJ : undefined,
            icon2: isDown ? inJ : undefined,
          });

          continue; // done for this edge
        }
      }

      // ─────────────────────────────────────────
      // (B) FALLBACK: LANE ROUTING (ONLY WHEN NEEDED)
      // 1) pick laneY that avoids boxes + other horizontals
      // 2) allocate vertical lane Xs using FINAL laneY
      // 3) register segments
      // ─────────────────────────────────────────
      const desiredY = (fromCenter.y + toCenter.y) / 2;

      let laneY = allocateSafeLaneY(
        desiredY,
        gapKey,
        toId,
        claimedByGap,
        boxes,
        excludeIds,
        rawOutJ.x,
        rawInJ.x,
        usedHorizontals
      );

      // Allocate vertical lanes AFTER final laneY (and X-aware box avoidance)
      const outX = allocateVerticalLaneX(
        rawOutJ.x,
        rawOutJ.y,
        laneY,
        usedVerticals,
        boxes,
        excludeIds
      );

      const inX = allocateVerticalLaneX(
        rawInJ.x,
        rawInJ.y,
        laneY,
        usedVerticals,
        boxes,
        excludeIds
      );

      const outJ = { ...rawOutJ, x: outX };
      const inJ = { ...rawInJ, x: inX };

      // If the horizontal at laneY is blocked by a box at the newly shifted Xs,
      // nudge laneY until clear (this is rare, but fixes “lane through box” cases).
      let guard = 0;
      while (
        guard < 200 &&
        horizontalHitsAnyBox(laneY, outJ.x, inJ.x, boxes, excludeIds)
      ) {
        laneY += LANE_SPACING;
        guard++;
      }

      // Reserve the horizontal segment at final laneY + X span
      usedHorizontals.push({
        y: laneY,
        x1: Math.min(outJ.x, inJ.x),
        x2: Math.max(outJ.x, inJ.x),
      });

      out.push({
        fromId,
        toId,
        isDown,
        path: buildElbowPath(fromCenter, outJ, laneY, inJ, toCenter),
        icon1: isDown ? outJ : undefined,
        icon2: isDown ? { x: inJ.x, y: laneY } : undefined,
      });
    }

    return out;
  }, [links, rects, layers, deviceById]);

  return (
    <div id={containerId} style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        width={size.w}
        height={size.h}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        {renderedEdges.map((e, i) => (
          <path
            key={i}
            d={e.path}
            fill="none"
            stroke={e.isDown ? "var(--fruit-punch)" : "var(--color-borders)"}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {renderedEdges.map(
        (e, i) =>
          e.isDown && (
            <React.Fragment key={`icons-${i}`}>
              {e.icon1 && <DownIcon x={e.icon1.x} y={e.icon1.y} />}
              {e.icon2 && <DownIcon x={e.icon2.x} y={e.icon2.y} />}
            </React.Fragment>
          )
      )}
    </div>
  );
}
