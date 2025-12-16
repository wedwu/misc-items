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

  // Fan-out index per SOURCE device
  const sourceFan = new Map<string, number>();

  // Each TARGET owns a trunk:
  // - trunkX: single approach x for all inbound edges (inJ.x)
  // - busY: a shared horizontal “merge lane” y for this target
  // - claimedEntryY: per-target entry slots so inbound lines don’t touch
  const targetTrunks = new Map<
    string,
    { trunkX: number; busY: number; claimedEntryY: number[] }
  >();

  const colLeftX = buildColumnLeftXs(rects, layers);

  function getTargetTrunk(targetId: string, trunkX: number, desiredBusY: number) {
    let t = targetTrunks.get(targetId);
    if (!t) {
      const busY = allocateLaneY(desiredBusY, claimedGlobalY);
      t = { trunkX, busY, claimedEntryY: [] };
      targetTrunks.set(targetId, t);
    }
    return t;
  }

  const out: EdgeRender[] = [];

  for (const fromDev of devices) {
    for (const toId of fromDev.links || []) {
      const fromRect = rects.get(fromDev.id);
      const toRect = rects.get(toId);
      if (!fromRect || !toRect) continue;

      const fromC = center(fromRect);
      const toC = center(toRect);

      const fromCol = layers.get(fromDev.id) ?? 0;
      const toCol = layers.get(toId) ?? 0;

      const outJ = outJunction(fromRect, toRect);
      const inJ = inJunction(fromRect, toRect);

      const down = isDownEdge(fromDev, byId.get(toId));

      // ---------------------------
      // SOURCE FAN-OUT (unique lane per outgoing edge)
      // ---------------------------
      const sIdx = sourceFan.get(fromDev.id) ?? 0;
      sourceFan.set(fromDev.id, sIdx + 1);

      const sourceLaneDesired = outJ.y + sIdx * LANE_SPACING;
      const sourceLaneY = allocateLaneY(sourceLaneDesired, claimedGlobalY);

      // ---------------------------
      // TARGET-OWNED TRUNK (shared for all inbound to this target)
      // ---------------------------
      // Choose a “desired bus Y” for this target (midpoint works well)
      // (You can bias this later by column/target region if you want.)
      const desiredBusY = (fromC.y + toC.y) / 2;

      const trunk = getTargetTrunk(toId, inJ.x, desiredBusY);

      // Per-edge entry slot near target so inbound lines don’t touch
      const entryY = allocateLaneY(inJ.y, trunk.claimedEntryY);

      // ---------------------------
      // COLUMN GAP Xs for long spans (keep horizontals in empty space)
      // ---------------------------
      const gaps = gapXs(fromCol, toCol, colLeftX);
      const span = Math.abs(toCol - fromCol);

      // Use first/last gap x to make multi-elbow travel across columns
      const x1 = gaps.length ? gaps[0] : trunk.trunkX;
      const x2 = gaps.length ? gaps[gaps.length - 1] : trunk.trunkX;

      // ---------------------------
      // Same-row fast path (if adjacent-ish and aligned)
      // ---------------------------
      const sameRow = Math.abs(fromC.y - toC.y) <= SAME_ROW_EPS;

      let pts: Point[];

      if (sameRow && span <= 1) {
        // Straight-ish: outJ -> inJ horizontally, then into target
        pts = [
          fromC,
          outJ,
          { x: inJ.x, y: outJ.y },
          inJ,
          toC,
        ];
      } else if (span <= 1) {
        // Adjacent columns: still use trunk bus to avoid inbound collisions
        // center -> outJ -> sourceLane -> trunkX -> busY -> entryY -> inJ -> center
        pts = [
          fromC,
          outJ,
          { x: outJ.x, y: sourceLaneY },         // elbow 1 (fan-out)
          { x: trunk.trunkX, y: sourceLaneY },   // elbow 2 (to trunk)
          { x: trunk.trunkX, y: trunk.busY },    // elbow 3 (merge to bus)
          { x: trunk.trunkX, y: entryY },        // elbow 4 (fan-in slot)
          inJ,
          toC,
        ];
      } else {
        // Long span: go to first gap, traverse to last gap, then approach trunk/bus
        // center -> outJ -> sourceLane -> x1 -> x2 -> trunkX -> busY -> entryY -> inJ -> center
        pts = [
          fromC,
          outJ,
          { x: outJ.x, y: sourceLaneY },         // elbow 1 (fan-out)
          { x: x1, y: sourceLaneY },             // elbow 2 (into safe gap)
          { x: x2, y: sourceLaneY },             // elbow 3 (across gaps)
          { x: trunk.trunkX, y: sourceLaneY },   // elbow 4 (align to trunk)
          { x: trunk.trunkX, y: trunk.busY },    // elbow 5 (merge)
          { x: trunk.trunkX, y: entryY },        // elbow 6 (fan-in slot)
          inJ,
          toC,
        ];
      }

      const path = pathFromPoints(pts);

      // Icons:
      // - icon1 at source junction
      // - icon2 at the “merge” point on the target trunk (nice visual for down)
      const icon1 = down ? outJ : undefined;
      const icon2 = down ? { x: trunk.trunkX, y: trunk.busY } : undefined;

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
