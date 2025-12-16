import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { RawDevice } from "../types/types";
import computeLayers from "../layout/computeLayers";
import DownJunctionIcon from "./DownJunctionIcon";

type Rect = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };

type EdgeRender = {
  d: string;
  isDown: boolean;
  icon1?: Point; // source junction
  icon2?: Point; // 2nd elbow / trunk merge
};

// --- tune these to match the mock ---
const JUNCTION = 15;          // “junction point” from box edge
const LANE_SPACING = 15;      // lane spacing for non-overlap
const SAME_ROW_EPS = 6;       // if centers within this, treat as “same row”
const STROKE_WIDTH = 2;

const center = (r: Rect): Point => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function outJunction(from: Rect, to: Rect): Point {
  const fc = center(from);
  const tc = center(to);
  const right = tc.x >= fc.x;
  return right
    ? { x: from.left + from.width + JUNCTION, y: fc.y }
    : { x: from.left - JUNCTION, y: fc.y };
}

function inJunction(from: Rect, to: Rect): Point {
  const fc = center(from);
  const tc = center(to);
  const right = tc.x >= fc.x;
  return right
    ? { x: to.left - JUNCTION, y: tc.y }
    : { x: to.left + to.width + JUNCTION, y: tc.y };
}

function pathFromPoints(pts: Point[]): string {
  return pts.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), "");
}

// Global lane allocator (simple + deterministic)
function allocLaneY(desired: number, claimed: number[]): number {
  let y = desired;
  while (claimed.some((c) => Math.abs(c - y) < LANE_SPACING)) y += LANE_SPACING;
  claimed.push(y);
  return y;
}

function isDownEdge(from?: RawDevice, to?: RawDevice) {
  return from?.status === "down" || to?.status === "down";
}

// Compute per-column left X, then compute gutter centers between columns
function buildColumnLeftXs(rects: Map<string, Rect>, layers: Map<string, number>): number[] {
  const cols = new Map<number, number[]>();
  for (const [id, r] of rects) {
    const c = layers.get(id);
    if (c == null) continue;
    if (!cols.has(c)) cols.set(c, []);
    cols.get(c)!.push(r.left);
  }
  const xs: number[] = [];
  [...cols.keys()].sort((a, b) => a - b).forEach((c) => {
    xs[c] = Math.min(...cols.get(c)!);
  });
  return xs;
}

function gutterCenterX(col: number, colLeftX: number[]): number | null {
  // gutter between col-1 and col
  const a = colLeftX[col - 1];
  const b = colLeftX[col];
  if (a == null || b == null) return null;
  return a + (b - a) / 2;
}

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

  const byId = useMemo(() => {
    const m = new Map<string, RawDevice>();
    devices.forEach((d) => m.set(d.id, d));
    return m;
  }, [devices]);

  const measure = () => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const cb = container.getBoundingClientRect();
    const next = new Map<string, Rect>();

    for (const d of devices) {
      const el = document.getElementById(`node-${d.id}`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next.set(d.id, {
        left: r.left - cb.left,
        top: r.top - cb.top,
        width: r.width,
        height: r.height,
      });
    }

    setRects(next);
    setSize({ w: cb.width, h: cb.height });
  };

  useLayoutEffect(() => {
    measure();
    requestAnimationFrame(measure); // important
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices]);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(container);

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, devices]);

  const edges: EdgeRender[] = useMemo(() => {
    // --- Global lane reservations (keeps long spans from overlapping) ---
    const claimedGlobalY: number[] = [];

    // source fan-out index
    const sourceFan = new Map<string, number>();

    // target “combine” trunk: one trunkX per target (in its left gutter), and one busY per target
    const targetTrunk = new Map<string, { trunkX: number; busY: number; entryYs: number[] }>();

    const colLeftX = buildColumnLeftXs(rects, layers);

    // Build target trunks up-front (stable, matches mock)
    for (const d of devices) {
      const toRect = rects.get(d.id);
      if (!toRect) continue;

      const toCol = layers.get(d.id) ?? 0;

      // trunk is in LEFT gutter of target column (where mock merges inbound)
      const gx = gutterCenterX(toCol, colLeftX);
      const trunkX = gx ?? (toRect.left - JUNCTION);

      // busY is near the target center (shared combine lane)
      const busY = allocLaneY(center(toRect).y, claimedGlobalY);

      targetTrunk.set(d.id, { trunkX, busY, entryYs: [] });
    }

    // Group edges by target so inbound ordering is clean (top-to-bottom)
    const incoming = new Map<string, string[]>();
    for (const from of devices) {
      for (const toId of from.links || []) {
        if (!incoming.has(toId)) incoming.set(toId, []);
        incoming.get(toId)!.push(from.id);
      }
    }

    const out: EdgeRender[] = [];

    for (const [toId, fromIds] of incoming) {
      const toRect = rects.get(toId);
      const t = targetTrunk.get(toId);
      if (!toRect || !t) continue;

      const toC = center(toRect);

      // order inbound by source center Y so they “stack” nicely like the mock
      const ordered = fromIds
        .map((id) => ({ id, r: rects.get(id) }))
        .filter((x) => !!x.r)
        .sort((a, b) => center(a.r!).y - center(b.r!).y)
        .map((x) => x.id);

      for (const fromId of ordered) {
        const fromDev = byId.get(fromId);
        const fromRect = rects.get(fromId);
        if (!fromDev || !fromRect) continue;

        const toDev = byId.get(toId);

        const fromC = center(fromRect);
        const outJ = outJunction(fromRect, toRect);
        const inJ = inJunction(fromRect, toRect);

        const fromCol = layers.get(fromId) ?? 0;
        const toCol = layers.get(toId) ?? 0;
        const span = Math.abs(toCol - fromCol);

        const down = isDownEdge(fromDev, toDev);

        // SOURCE fan-out lane (first elbow fan)
        const sIdx = sourceFan.get(fromId) ?? 0;
        sourceFan.set(fromId, sIdx + 1);
        const sourceLaneY = allocLaneY(outJ.y + sIdx * LANE_SPACING, claimedGlobalY);

        // TARGET entry slot (final approach into device)
        const entryY = allocLaneY(inJ.y, t.entryYs);

        const sameRow = Math.abs(fromC.y - toC.y) <= SAME_ROW_EPS;

        let pts: Point[];

        // Straight-ish only if adjacent-ish and aligned (as requested)
        if (sameRow && span <= 1) {
          pts = [
            fromC,
            outJ,
            { x: inJ.x, y: outJ.y },
            inJ,
            toC,
          ];
        } else {
          // This is the “mock” route:
          // 1) center → source junction
          // 2) source junction → fan-out lane (elbow #1)
          // 3) go horizontally to TARGET trunk X (early combine) (elbow #2)
          // 4) go vertically to TARGET busY (shared) (elbow #3)
          // 5) go vertically to entryY (fan-in slot) (elbow #4)
          // 6) short horizontal to target junction, then into center
          pts = [
            fromC,
            outJ,
            { x: outJ.x, y: sourceLaneY },     // elbow 1 (fan-out)
            { x: t.trunkX, y: sourceLaneY },   // elbow 2 (early combine at target trunk)
            { x: t.trunkX, y: t.busY },        // elbow 3 (shared bus lane)
            { x: t.trunkX, y: entryY },        // elbow 4 (fan-in slot)
            { x: inJ.x, y: entryY },
            inJ,
            toC,
          ];
        }

        out.push({
          d: pathFromPoints(pts),
          isDown: down,
          icon1: down ? outJ : undefined,
          icon2: down ? { x: t.trunkX, y: t.busY } : undefined,
        });
      }
    }

    return out;
  }, [devices, rects, layers, byId]);

  return (
    <>
      <svg
        width={size.w}
        height={size.h}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "visible",
          zIndex: 5,
        }}
      >
        {edges.map((e, i) => (
          <path
            key={i}
            d={e.d}
            fill="none"
            stroke={e.isDown ? "var(--fruit-punch)" : "var(--color-borders)"}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {edges.map((e, i) =>
        e.isDown ? (
          <React.Fragment key={`icons-${i}`}>
            {e.icon1 && <DownJunctionIcon x={e.icon1.x} y={e.icon1.y} />}
            {e.icon2 && <DownJunctionIcon x={e.icon2.x} y={e.icon2.y} />}
          </React.Fragment>
        ) : null
      )}
    </>
  );
}
