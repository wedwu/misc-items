import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import computeLayers from "../layout/computeLayers";
import type { RawDevice } from "../types/types";
import DownJunctionIcon from "./DownJunctionIcon";

type Rect = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };

type EdgeRender = {
  path: string;
  isDown: boolean;
  icon1?: Point; // source junction
  icon2?: Point; // 2nd elbow (near target side)
};

const JUNCTION_GAP = 15;
const LANE_SPACING = 15;
const STROKE_WIDTH = 2;

// If two boxes are “same row” (within this px), we try a straight-ish line
const SAME_ROW_EPS = 6;

const center = (r: Rect): Point => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });

function outJunction(from: Rect, to: Rect): Point {
  const fc = center(from);
  const tc = center(to);
  return tc.x >= fc.x
    ? { x: from.left + from.width + JUNCTION_GAP, y: fc.y }
    : { x: from.left - JUNCTION_GAP, y: fc.y };
}

function inJunction(from: Rect, to: Rect): Point {
  const fc = center(from);
  const tc = center(to);
  return tc.x >= fc.x
    ? { x: to.left - JUNCTION_GAP, y: tc.y }
    : { x: to.left + to.width + JUNCTION_GAP, y: tc.y };
}

function allocateLaneY(desired: number, claimed: number[]): number {
  let y = desired;
  while (claimed.some((c) => Math.abs(c - y) < LANE_SPACING)) y += LANE_SPACING;
  claimed.push(y);
  return y;
}

// Column left Xs (from rect positions) → used to compute “gap X” between columns
function buildColumnLeftXs(rects: Map<string, Rect>, layers: Map<string, number>): number[] {
  const byCol = new Map<number, number[]>();
  for (const [id, r] of rects) {
    const c = layers.get(id);
    if (c == null) continue;
    if (!byCol.has(c)) byCol.set(c, []);
    byCol.get(c)!.push(r.left);
  }

  const xs: number[] = [];
  const cols = [...byCol.keys()].sort((a, b) => a - b);
  for (const c of cols) xs[c] = Math.min(...byCol.get(c)!);
  return xs;
}

// Gap X positions between columns along the span (safe “empty space”)
function gapXs(fromCol: number, toCol: number, colLeftX: number[]): number[] {
  const dir = toCol > fromCol ? 1 : -1;
  const gaps: number[] = [];
  for (let c = fromCol; c !== toCol; c += dir) {
    const a = colLeftX[c];
    const b = colLeftX[c + dir];
    if (a != null && b != null) gaps.push((a + b) / 2);
  }
  return gaps;
}

function pathFromPoints(pts: Point[]): string {
  return pts.reduce((d, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${d} L ${p.x} ${p.y}`), "");
}

function isDownEdge(from?: RawDevice, to?: RawDevice): boolean {
  return (from?.status === "down") || (to?.status === "down");
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

  // Measure rects relative to the diagram container
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

  // const edges: EdgeRender[] = useMemo(() => {
  //   // Global lane claims for horizontal bus Ys
  //   const claimedY: number[] = [];

  //   // Fan-out index per SOURCE device
  //   const sourceFan = new Map<string, number>();

  //   // Fan-in index per TARGET device (for distinct entry Ys)
  //   const targetFan = new Map<string, number>();

  //   // Precompute column gap X positions
  //   const colLeftX = buildColumnLeftXs(rects, layers);

  //   const out: EdgeRender[] = [];

  //   for (const fromDev of devices) {
  //     for (const toId of fromDev.links || []) {
  //       const fromRect = rects.get(fromDev.id);
  //       const toRect = rects.get(toId);
  //       if (!fromRect || !toRect) continue;

  //       const fromC = center(fromRect);
  //       const toC = center(toRect);

  //       const fromCol = layers.get(fromDev.id) ?? 0;
  //       const toCol = layers.get(toId) ?? 0;

  //       const outJ = outJunction(fromRect, toRect);
  //       const inJ = inJunction(fromRect, toRect);

  //       const down = isDownEdge(fromDev, byId.get(toId));

  //       // ---------------------------
  //       // SAME ROW: keep it straight if possible
  //       // ---------------------------
  //       const sameRow = Math.abs(fromC.y - toC.y) <= SAME_ROW_EPS;

  //       // ---------------------------
  //       // SOURCE FAN-OUT (unique lane per outgoing edge)
  //       // ---------------------------
  //       const sIdx = sourceFan.get(fromDev.id) ?? 0;
  //       sourceFan.set(fromDev.id, sIdx + 1);

  //       // ---------------------------
  //       // TARGET FAN-IN (unique entry Y per incoming edge to avoid touching)
  //       // NOTE: bundling happens naturally because all edges share the same inJ.x “trunk”
  //       // ---------------------------
  //       const tIdx = targetFan.get(toId) ?? 0;
  //       targetFan.set(toId, tIdx + 1);

  //       // Entry Y near target junction, spread so multiple inbound lines don’t touch
  //       const targetEntryYDesired = inJ.y + tIdx * LANE_SPACING;
  //       const entryY = allocateLaneY(targetEntryYDesired, claimedY);

  //       // Main bus lane Y near source, fanned out immediately
  //       const sourceLaneDesired = outJ.y + sIdx * LANE_SPACING;
  //       const laneY = allocateLaneY(sourceLaneDesired, claimedY);

  //       // Safe gap Xs between columns (for long spans)
  //       const gaps = gapXs(fromCol, toCol, colLeftX);

  //       // Choose two “bus Xs” for 4-elbow routing:
  //       // - x1: first gap after source column (or outJ.x if adjacent)
  //       // - x2: last gap before target column (or inJ.x if adjacent)
  //       const x1 = gaps.length >= 1 ? gaps[0] : outJ.x;
  //       const x2 = gaps.length >= 1 ? gaps[gaps.length - 1] : inJ.x;

  //       // ---------------------------
  //       // ROUTING SHAPES
  //       // ---------------------------
  //       // We will always allow 4 elbows:
  //       // center → outJ → (laneY) → x1 → x2 → (entryY) → inJ → center
  //       //
  //       // But we simplify when possible:
  //       // - sameRow and adjacent span: try straight-ish (still respects junction gap)
  //       // - adjacent cols: fewer points (no need for x1/x2 split)
  //       //
  //       const span = Math.abs(toCol - fromCol);

  //       let pts: Point[] = [];

  //       if (sameRow && span <= 1) {
  //         // Straight-ish: outJ to inJ horizontally, then into target
  //         pts = [
  //           fromC,
  //           outJ,
  //           { x: inJ.x, y: outJ.y },
  //           inJ,
  //           toC,
  //         ];
  //       } else if (span <= 1) {
  //         // 2-gap or adjacent: still do a 4-elbow capable shape but compact
  //         pts = [
  //           fromC,
  //           outJ,
  //           { x: outJ.x, y: laneY },     // elbow 1
  //           { x: inJ.x, y: laneY },      // elbow 2 (horizontal in safe gap)
  //           { x: inJ.x, y: entryY },     // elbow 3 (fan-in)
  //           inJ,                         // elbow 4
  //           toC,
  //         ];
  //       } else {
  //         // Long span: true 4+ elbows using column gap X positions (bus routing)
  //         pts = [
  //           fromC,
  //           outJ,
  //           { x: outJ.x, y: laneY },     // elbow 1 (fan-out)
  //           { x: x1, y: laneY },         // elbow 2 (get into first gap)
  //           { x: x2, y: laneY },         // elbow 3 (travel across gaps)
  //           { x: x2, y: entryY },        // elbow 4 (fan-in near target)
  //           { x: inJ.x, y: entryY },     // align to target trunk x
  //           inJ,
  //           toC,
  //         ];
  //       }

  //       const path = pathFromPoints(pts);

  //       // Icons:
  //       // - icon1 at source junction
  //       // - icon2 at “second elbow near target side” (we use x2/laneY or inJ.x/entryY)
  //       const icon1 = down ? outJ : undefined;
  //       const icon2 = down ? (span <= 1 ? { x: inJ.x, y: laneY } : { x: x2, y: entryY }) : undefined;

  //       out.push({ path, isDown: down, icon1, icon2 });
  //     }
  //   }

  //   return out;
  // }, [devices, rects, layers, byId]);
const edges: EdgeRender[] = useMemo(() => {
  const claimedGlobalY: number[] = [];
  const sourceFan = new Map<string, number>();

  // Build column lefts so we can route in gaps
  const colLeftX = buildColumnLeftXs(rects, layers);

  // Group edges by target first (so we can order fan-in cleanly)
  const incomingByTarget = new Map<string, Array<{ fromId: string; toId: string }>>();
  for (const fromDev of devices) {
    for (const toId of fromDev.links || []) {
      if (!incomingByTarget.has(toId)) incomingByTarget.set(toId, []);
      incomingByTarget.get(toId)!.push({ fromId: fromDev.id, toId });
    }
  }

  // Target trunk registry:
  // trunkX is in the LAST GAP before target column (not at inJ.x)
  const targetTrunks = new Map<
    string,
    { trunkX: number; busY: number; entrySlots: number[] }
  >();

  function getTrunkX(fromCol: number, toCol: number, inJx: number) {
    const gaps = gapXs(fromCol, toCol, colLeftX);
    // If we have gaps, trunk lives in the LAST gap before target column.
    // Otherwise fallback to inJ.x (adjacent or missing info).
    return gaps.length ? gaps[gaps.length - 1] : inJx;
  }

  // Pass 1: allocate each target's trunk/bus once (busY near the *target* area)
  for (const [toId, inc] of incomingByTarget) {
    const toRect = rects.get(toId);
    if (!toRect) continue;

    // Use target center as the "bus gravity" so bus sits near the target, not midpoint of random sources
    const tc = center(toRect);

    // Claim one shared busY for this target (slight upward bias keeps things tighter)
    const desiredBusY = tc.y - 20;
    const busY = allocateLaneY(desiredBusY, claimedGlobalY);

    // trunkX will be computed per-edge (depends on fromCol), but we store bus + entrySlots here
    targetTrunks.set(toId, { trunkX: 0, busY, entrySlots: [] });
  }

  const out: EdgeRender[] = [];

  // Now build paths; order inbound edges per target by source Y for cleaner bundling
  for (const [toId, inc] of incomingByTarget) {
    const toRect = rects.get(toId);
    if (!toRect) continue;

    const toC = center(toRect);

    // Sort incoming by source Y so lanes don't criss-cross
    const sorted = inc
      .map(e => ({ ...e, fromRect: rects.get(e.fromId) }))
      .filter(e => !!e.fromRect)
      .sort((a, b) => center(a.fromRect!).y - center(b.fromRect!).y);

    for (const { fromId } of sorted) {
      const fromDev = devices.find(d => d.id === fromId);
      if (!fromDev) continue;

      const fromRect = rects.get(fromId);
      if (!fromRect) continue;

      const fromC = center(fromRect);

      const fromCol = layers.get(fromId) ?? 0;
      const toCol = layers.get(toId) ?? 0;
      const span = Math.abs(toCol - fromCol);

      const outJ = outJunction(fromRect, toRect);
      const inJ = inJunction(fromRect, toRect);

      // SOURCE fan-out
      const sIdx = sourceFan.get(fromId) ?? 0;
      sourceFan.set(fromId, sIdx + 1);
      const sourceLaneY = allocateLaneY(outJ.y + sIdx * LANE_SPACING, claimedGlobalY);

      // TARGET trunk/bus
      const trunk = targetTrunks.get(toId)!;
      const trunkX = getTrunkX(fromCol, toCol, inJ.x);

      // store last computed trunkX (not strictly needed but nice to inspect)
      trunk.trunkX = trunkX;

      // Fan-in slots near target junction Y (per-target local slots, not global)
      let entryY = inJ.y;
      while (trunk.entrySlots.some(y => Math.abs(y - entryY) < LANE_SPACING)) entryY += LANE_SPACING;
      trunk.entrySlots.push(entryY);

      const down = isDownEdge(fromDev, byId.get(toId));
      const sameRow = Math.abs(fromC.y - toC.y) <= SAME_ROW_EPS;

      let pts: Point[];

      // Same row + adjacent: keep straight-ish
      if (sameRow && span <= 1) {
        pts = [fromC, outJ, { x: inJ.x, y: outJ.y }, inJ, toC];
      } else {
        // Core shape (matches mock):
        // center → outJ → fan-out → go to trunkX in gap → go to target busY → drop to entryY → short hop into target junction → center
        //
        // This keeps the “bundle” in the gap (not inside the target column), and reduces weird frames.
        pts = [
          fromC,
          outJ,
          { x: outJ.x, y: sourceLaneY },        // elbow 1 (fan-out)
          { x: trunkX, y: sourceLaneY },        // elbow 2 (into last gap)
          { x: trunkX, y: trunk.busY },         // elbow 3 (merge to target bus)
          { x: trunkX, y: entryY },             // elbow 4 (fan-in slot)
          { x: inJ.x, y: entryY },              // short horizontal into target junction line
          inJ,
          toC,
        ];
      }

      const path = pathFromPoints(pts);

      // Icons: source junction + merge point on bus (your “2nd elbow icon”)
      const icon1 = down ? outJ : undefined;
      const icon2 = down ? { x: trunkX, y: trunk.busY } : undefined;

      out.push({ path, isDown: down, icon1, icon2 });
    }
  }

  return out;
}, [devices, rects, layers, byId]);






  // IMPORTANT: Render inside existing diagram container (which must be position:relative)
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
            d={e.path}
            fill="none"
            stroke={e.isDown ? "var(--fruit-punch)" : "var(--color-borders)"}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>

      {/* DOM icons (separate component as requested) */}
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
