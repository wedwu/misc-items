import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import computeLayers from "../layout/computeLayers";
import type { RawDevice } from "../types/types";
import DownJunctionIcon from "./DownJunctionIcon";

/* ──────────────────────────────────────────────
   TYPES
────────────────────────────────────────────── */
type Rect = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };
type Interval = { top: number; bottom: number };

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
const STROKE_WIDTH = 2;
const MIN_ELBOW_DELTA = 18;
const STEP_OFFSET = 20;

/* ──────────────────────────────────────────────
   GEOMETRY
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
   PATH BUILDER
────────────────────────────────────────────── */
function buildElbowPath(
  fromCenter: Point,
  outJ: Point,
  laneY: number,
  inJ: Point,
  toCenter: Point
): string {
  const dy = laneY - outJ.y;
  const needsStep = Math.abs(dy) < MIN_ELBOW_DELTA;

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
   NO-GO ZONE LOGIC (NEW)
────────────────────────────────────────────── */
function getGapKey(a: number, b: number) {
  return `${Math.min(a, b)}->${Math.max(a, b)}`;
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

function allocateSafeLaneY(
  desiredY: number,
  gapKey: string,
  claimedByGap: Map<string, number[]>,
  noGo: Interval[]
): number {
  const claimed = claimedByGap.get(gapKey) ?? [];

  // Try reuse first
  for (const y of claimed) {
    if (!intersects(y, noGo)) return y;
  }

  // Search outward
  let offset = 0;
  while (offset < 2000) {
    const up = desiredY - offset;
    const down = desiredY + offset;

    if (!intersects(up, noGo)) {
      claimed.push(up);
      claimedByGap.set(gapKey, claimed);
      return up;
    }

    if (!intersects(down, noGo)) {
      claimed.push(down);
      claimedByGap.set(gapKey, claimed);
      return down;
    }

    offset += LANE_SPACING;
  }

  claimed.push(desiredY);
  claimedByGap.set(gapKey, claimed);
  return desiredY;
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
    const claimedByGap = new Map<string, number[]>();
    const out: Edge[] = [];

    for (const { fromId, toId } of links) {
      const fr = rects.get(fromId);
      const tr = rects.get(toId);
      if (!fr || !tr) continue;

      const fromCenter = getCenter(fr);
      const toCenter = getCenter(tr);
      const outJ = getOutJunction(fr, tr);
      const inJ = getInJunction(fr, tr);

      const desiredY = (fromCenter.y + toCenter.y) / 2;
      const fromCol = layers.get(fromId) ?? 0;
      const toCol = layers.get(toId) ?? 0;
      const gapKey = getGapKey(fromCol, toCol);

      const noGo = getNoGoIntervals(rects, layers, fromCol, toCol);

      const laneY = allocateSafeLaneY(
        desiredY,
        gapKey,
        claimedByGap,
        noGo
      );

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
    <div
      id={containerId}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
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
              {e.icon1 && <DownJunctionIcon x={e.icon1.x} y={e.icon1.y} />}
              {e.icon2 && <DownJunctionIcon x={e.icon2.x} y={e.icon2.y} />}
            </React.Fragment>
          )
      )}
    </div>
  );
}
