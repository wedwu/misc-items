import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import computeLayers from "../layout/computeLayers";
import type { RawDevice } from "../types/types";
import DownJunctionIcon from "./DownJunctionIcon";

/* ──────────────────────────────────────────────
   TYPES
────────────────────────────────────────────── */
type Rect = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };
type Interval = { top: number; bottom: number };

type VerticalLane = { x: number; y1: number; y2: number };
type HorizontalSeg = { y: number; x1: number; x2: number };

type Edge = {
  fromId: string;
  toId: string;
  isDown: boolean;
  path: string;
  icon1?: Point;
  icon2?: Point;
};

/* ──────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────── */
const JUNCTION_GAP = 15;
const LANE_SPACING = 15;
const TARGET_SEPARATION = 20;
const VERTICAL_LANE_SPACING = 12;
const STROKE_WIDTH = 2;
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

/* ──────────────────────────────────────────────
   VERTICAL LANE ALLOCATION (NEW)
────────────────────────────────────────────── */
function allocateVerticalLaneX(
  baseX: number,
  y1: number,
  y2: number,
  used: VerticalLane[]
): number {
  let lane = 0;

  while (lane < 30) {
    const x = baseX + lane * VERTICAL_LANE_SPACING;

    const collides = used.some(v =>
      Math.abs(v.x - x) < STROKE_WIDTH * 2 &&
      Math.max(v.y1, y1) <= Math.min(v.y2, y2)
    );

    if (!collides) {
      used.push({ x, y1, y2 });
      return x;
    }

    lane++;
  }

  return baseX;
}

/* ──────────────────────────────────────────────
   PATH BUILDER (ELBOW SUPPRESSED)
────────────────────────────────────────────── */
function buildElbowPath(
  fromCenter: Point,
  outJ: Point,
  laneY: number,
  inJ: Point,
  toCenter: Point
): string {
  const dy = laneY - outJ.y;

  const needsStep =
    Math.abs(dy) < MIN_ELBOW_DELTA &&
    Math.abs(outJ.x - inJ.x) > STROKE_WIDTH * 2;

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

/* ──────────────────────────────────────────────
   NO-GO + COLLISION HELPERS
────────────────────────────────────────────── */
function overlaps(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(a1, b1) <= Math.min(a2, b2);
}

function getNoGoIntervals(
  rects: Map<string, Rect>,
  layers: Map<string, number>,
  fromCol: number,
  toCol: number
): Interval[] {
  const minCol = Math.min(fromCol, toCol);
  const maxCol = Math.max(fromCol, toCol);
  const intervals: Interval[] = [];

  rects.forEach((r, id) => {
    const col = layers.get(id);
    if (col == null || col < minCol || col > maxCol) return;

    intervals.push({
      top: r.top - LANE_SPACING,
      bottom: r.top + r.height + LANE_SPACING,
    });
  });

  return intervals;
}

function intersects(y: number, intervals: Interval[]) {
  return intervals.some(i => y >= i.top && y <= i.bottom);
}

function horizontalCollides(
  y: number,
  x1: number,
  x2: number,
  used: HorizontalSeg[]
) {
  return used.some(h =>
    Math.abs(h.y - y) < STROKE_WIDTH * 2 &&
    overlaps(x1, x2, h.x1, h.x2)
  );
}

/* ──────────────────────────────────────────────
   LANE ALLOCATOR (Y-LANES)
────────────────────────────────────────────── */
function allocateSafeLaneY(
  desiredY: number,
  gapKey: string,
  toId: string,
  claimedByGap: Map<string, { y: number; toId: string }[]>,
  noGo: Interval[],
  outX: number,
  inX: number,
  usedHorizontals: HorizontalSeg[]
): number {
  const claimed = claimedByGap.get(gapKey) ?? [];

  const blocked = (y: number) =>
    intersects(y, noGo) ||
    horizontalCollides(y, outX, inX, usedHorizontals);

  for (const lane of claimed) {
    if (lane.toId === toId && !blocked(lane.y)) return lane.y;
  }

  let offset = 0;
  while (offset < 2000) {
    for (const y of [desiredY - offset, desiredY + offset]) {
      if (blocked(y)) continue;

      const tooClose = claimed.some(
        l => l.toId !== toId && Math.abs(l.y - y) < TARGET_SEPARATION
      );
      if (tooClose) continue;

      claimed.push({ y, toId });
      claimedByGap.set(gapKey, claimed);
      return y;
    }
    offset += LANE_SPACING;
  }

  claimed.push({ y: desiredY, toId });
  claimedByGap.set(gapKey, claimed);
  return desiredY;
}

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
    const claimedByGap = new Map<string, { y: number; toId: string }[]>();
    const usedVerticals: VerticalLane[] = [];
    const usedHorizontals: HorizontalSeg[] = [];
    const out: Edge[] = [];

    for (const { fromId, toId } of links) {
      const fr = rects.get(fromId);
      const tr = rects.get(toId);
      if (!fr || !tr) continue;

      const fromCenter = getCenter(fr);
      const toCenter = getCenter(tr);

      const rawOutJ = getOutJunction(fr, tr);
      const rawInJ = getInJunction(fr, tr);

      const desiredY = (fromCenter.y + toCenter.y) / 2;

      const outX = allocateVerticalLaneX(
        rawOutJ.x,
        Math.min(rawOutJ.y, desiredY),
        Math.max(rawOutJ.y, desiredY),
        usedVerticals
      );

      const inX = allocateVerticalLaneX(
        rawInJ.x,
        Math.min(rawInJ.y, desiredY),
        Math.max(rawInJ.y, desiredY),
        usedVerticals
      );

      const outJ = { ...rawOutJ, x: outX };
      const inJ = { ...rawInJ, x: inX };

      const fromCol = layers.get(fromId) ?? 0;
      const toCol = layers.get(toId) ?? 0;
      const gapKey = `${Math.min(fromCol, toCol)}->${Math.max(fromCol, toCol)}`;

      const noGo = getNoGoIntervals(rects, layers, fromCol, toCol);

      const laneY = allocateSafeLaneY(
        desiredY,
        gapKey,
        toId,
        claimedByGap,
        noGo,
        outJ.x,
        inJ.x,
        usedHorizontals
      );

      usedHorizontals.push({
        y: laneY,
        x1: Math.min(outJ.x, inJ.x),
        x2: Math.max(outJ.x, inJ.x),
      });

      const isDown = connectionIsDown(
        deviceById.get(fromId),
        deviceById.get(toId)
      );

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
      <svg width={size.w} height={size.h} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
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
              {e.icon1 && <DownJunctionIcon x={e.icon1.x} y={e.icon1.y} />}
              {e.icon2 && <DownJunctionIcon x={e.icon2.x} y={e.icon2.y} />}
            </React.Fragment>
          )
      )}
    </div>
  );
}
