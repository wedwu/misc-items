import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import computeLayers from "../../utilities/graph-layers-utilities";
import type { RawDevice } from "../../types/types";
import DownJunctionIcon from "./DownJunctionIcon";

/* ──────────────────────────────────────────────
   DEBUG TOGGLE
────────────────────────────────────────────── */
const DEBUG_ROUTING = false;

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
type LaneData = { y: number; toId: string; outX: number; inX: number };

/* ──────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────── */
const JUNCTION_GAP = 25;
const LANE_SPACING = 15;
const TARGET_SEPARATION = 20;

const STROKE_WIDTH = 2;
const HIT_PAD = 2 + STROKE_WIDTH * 2;

const VERTICAL_LANE_SPACING = 18;
const MAX_VERTICAL_LANES = 30;
const MAX_LANE_SEARCH = 2500;

const DIRECT_Y_EPS = 15;

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
   BOX GEOMETRY (X-AWARE NO-GO)
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
  exclude: Set<string>
) {
  const a1 = Math.min(x1, x2);
  const a2 = Math.max(x1, x2);
  return boxes.some(
    b =>
      !exclude.has(b.id) &&
      y >= b.y1 &&
      y <= b.y2 &&
      overlaps(a1, a2, b.x1, b.x2)
  );
}

function verticalHitsAnyBox(
  x: number,
  y1: number,
  y2: number,
  boxes: Box[],
  exclude: Set<string>
) {
  const a1 = Math.min(y1, y2);
  const a2 = Math.max(y1, y2);
  return boxes.some(
    b =>
      !exclude.has(b.id) &&
      x >= b.x1 &&
      x <= b.x2 &&
      overlaps(a1, a2, b.y1, b.y2)
  );
}

/* ──────────────────────────────────────────────
   LINE COLLISIONS
────────────────────────────────────────────── */
function horizontalCollides(y: number, x1: number, x2: number, used: HorizontalSeg[]) {
  const a1 = Math.min(x1, x2);
  const a2 = Math.max(x1, x2);
  return used.some(
    h => Math.abs(h.y - y) < STROKE_WIDTH * 2 && overlaps(a1, a2, h.x1, h.x2)
  );
}

function verticalCollides(x: number, y1: number, y2: number, used: VerticalLane[]) {
  const a1 = Math.min(y1, y2);
  const a2 = Math.max(y1, y2);
  return used.some(
    v => Math.abs(v.x - x) < STROKE_WIDTH * 2 && overlaps(a1, a2, v.y1, v.y2)
  );
}

/* ──────────────────────────────────────────────
   LANE HELPERS
────────────────────────────────────────────── */
function getGapKey(a: number, b: number) {
  return `${Math.min(a, b)}->${Math.max(a, b)}`;
}

function allocateSafeLaneY(
  desiredY: number,
  gapKey: string,
  toId: string,
  claimed: Map<string, LaneData[]>,
  boxes: Box[],
  exclude: Set<string>,
  outX: number,
  inX: number,
  usedHoriz: HorizontalSeg[]
): LaneData {
  const lanes = claimed.get(gapKey) ?? [];

  // Add safety margin to ensure visual clearance
  const VISUAL_CLEARANCE = 30;

  const blocked = (y: number) => {
    // Check if line collides with existing horizontal lines
    if (horizontalCollides(y, outX, inX, usedHoriz)) return true;
    
    // Check if line hits or is too close to any box
    const minX = Math.min(outX, inX);
    const maxX = Math.max(outX, inX);
    return boxes.some(
      b =>
        !exclude.has(b.id) &&
        overlaps(minX, maxX, b.x1, b.x2) &&
        y >= b.y1 &&
        y <= b.y2 + VISUAL_CLEARANCE
    );
  };

  // First, check if there's an existing lane to the same target that we can reuse
  for (const l of lanes) {
    if (l.toId === toId && !blocked(l.y)) {
      return l; // Return the entire lane data including X coordinates
    }
  }

  // Second, check if there's ANY existing lane (to any target) that's clear
  // This allows connections to the same destination to share lanes
  for (const l of lanes) {
    if (!blocked(l.y)) {
      // Don't add a new entry, just reuse this Y coordinate
      return l; // Return the entire lane data including X coordinates
    }
  }

  // Find all boxes that are between outX and inX
  const minX = Math.min(outX, inX);
  const maxX = Math.max(outX, inX);
  const relevantBoxes = boxes.filter(
    b => !exclude.has(b.id) && overlaps(minX, maxX, b.x1, b.x2)
  );

  console.log(`      Allocating lane for ${toId}:`);
  console.log(`      desiredY: ${desiredY.toFixed(1)}, outX: ${outX.toFixed(1)}, inX: ${inX.toFixed(1)}`);
  console.log(`      minX: ${minX.toFixed(1)}, maxX: ${maxX.toFixed(1)}`);
  console.log(`      relevantBoxes:`, relevantBoxes.length);
  relevantBoxes.forEach(b => {
    console.log(`         box ${b.id}: x[${b.x1.toFixed(1)}, ${b.x2.toFixed(1)}] y[${b.y1.toFixed(1)}, ${b.y2.toFixed(1)}]`);
  });

  // Find the maximum y2 (bottom) of all relevant boxes
  const maxBoxBottom = relevantBoxes.length > 0
    ? Math.max(...relevantBoxes.map(b => b.y2))
    : -Infinity;

  console.log(`      maxBoxBottom: ${maxBoxBottom === -Infinity ? 'none' : maxBoxBottom.toFixed(1)}`);

  // If desired lane would intersect boxes OR is too close to them, start searching from below
  let startY = desiredY;
  if (relevantBoxes.some(b => desiredY >= b.y1 && desiredY <= b.y2 + VISUAL_CLEARANCE)) {
    startY = maxBoxBottom + VISUAL_CLEARANCE;
    console.log(`       desiredY intersects or too close to boxes, moving to startY: ${startY.toFixed(1)}`);
    
    // If we moved startY below boxes, just use it directly if not blocked
    if (!blocked(startY)) {
      const newLane = { y: startY, toId, outX, inX };
      lanes.push(newLane);
      claimed.set(gapKey, lanes);
      console.log(`       Using startY directly: ${startY.toFixed(1)}`);
      return newLane;
    }
  } else {
    console.log(`      ✓ desiredY is clear of boxes`);
  }

  let offset = 0;
  while (offset < MAX_LANE_SEARCH) {
    for (const y of offset === 0 ? [startY] : [startY - offset, startY + offset]) {
      if (blocked(y)) continue;

      const tooClose = lanes.some(
        l => l.toId !== toId && Math.abs(l.y - y) < TARGET_SEPARATION
      );
      if (tooClose) continue;

      const newLane = { y, toId, outX, inX };
      lanes.push(newLane);
      claimed.set(gapKey, lanes);
      return newLane;
    }
    offset += LANE_SPACING;
  }

  const newLane = { y: startY, toId, outX, inX };
  lanes.push(newLane);
  claimed.set(gapKey, lanes);
  return newLane;
}

function allocateVerticalLaneX(
  baseX: number,
  y1: number,
  y2: number,
  used: VerticalLane[],
  boxes: Box[],
  exclude: Set<string>
) {
  for (let i = 0; i < MAX_VERTICAL_LANES; i++) {
    const x = baseX + i * VERTICAL_LANE_SPACING;
    if (verticalHitsAnyBox(x, y1, y2, boxes, exclude)) continue;
    if (verticalCollides(x, y1, y2, used)) continue;
    used.push({ x, y1: Math.min(y1, y2), y2: Math.max(y1, y2) });
    return x;
  }
  used.push({ x: baseX, y1: Math.min(y1, y2), y2: Math.max(y1, y2) });
  return baseX;
}

/* ──────────────────────────────────────────────
   PATH BUILDERS
────────────────────────────────────────────── */
function buildDirectPath(fc: Point, outJ: Point, inJ: Point, tc: Point) {
  fc.x = fc.x + 220
  tc.x = tc.x - 220
  return `M ${fc.x} ${fc.y} L ${outJ.x} ${outJ.y} L ${inJ.x} ${inJ.y} L ${tc.x} ${tc.y}`;
}

function buildElbowPath(fc: Point, outJ: Point, laneY: number, inJ: Point, tc: Point) {
  fc.x = fc.x + 220
  tc.x = tc.x - 220

  // Simple orthogonal routing: vertical to laneY, horizontal across, vertical to destination
  return `M ${fc.x} ${fc.y}
       L ${outJ.x} ${outJ.y}
       L ${outJ.x} ${laneY}
       L ${inJ.x} ${laneY}
       L ${inJ.x} ${inJ.y}
       L ${tc.x} ${tc.y}`;
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
      d.links?.forEach(toId => deviceById.has(toId) && out.push({ fromId: d.id, toId }))
    );
    return out;
  }, [devices, deviceById]);

  const measure = () => {
    const container = document.getElementById(containerId);
    if (!container) {
      console.log('X Container not found:', containerId);
      return;
    }
    const box = container.getBoundingClientRect();
    console.log(' Container found:', containerId, box);
    
    const next = new Map<string, Rect>();
    devices.forEach(d => {
      const el = document.getElementById(`node-${d.id}`);
      if (!el) {
        console.log('X Node element not found:', `node-${d.id}`);
        return;
      }
      const r = el.getBoundingClientRect();
      console.log(' Found node:', d.id, r);
      next.set(d.id, {
        left: r.left - box.left,
        top: r.top - box.top,
        width: r.width,
        height: r.height,
      });
    });
    console.log(' Total rects measured:', next.size);
    setRects(next);
    setSize({ w: box.width, h: box.height });
  };

  useLayoutEffect(() => {
    // Small delay to ensure DOM is fully rendered
    const timer = setTimeout(measure, 0);
    return () => clearTimeout(timer);
  }, [devices, containerId]);
  
  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, []);

  const renderedEdges = useMemo(() => {
    const boxes = buildBoxes(rects);

    const claimed = new Map<string, LaneData[]>();
    const usedHoriz: HorizontalSeg[] = [];
    const usedVert: VerticalLane[] = [];

    // DEBUG collectors
    const debugBoxes: Box[] = [];
    const debugLaneYs: number[] = [];
    const debugVerticals: VerticalLane[] = [];
    const debugBlockedDirects: { y: number; x1: number; x2: number }[] = [];

    if (DEBUG_ROUTING) debugBoxes.push(...boxes);

    const out: Edge[] = [];

    // Sort links: group by toId, then prioritize those that would naturally
    // route below obstacles (higher Y coordinates first within same target)
    const sortedLinks = [...links].sort((a, b) => {
      if (a.toId !== b.toId) return a.toId.localeCompare(b.toId);
      
      const aFrom = rects.get(a.fromId);
      const bFrom = rects.get(b.fromId);
      const aTo = rects.get(a.toId);
      const bTo = rects.get(b.toId);
      if (!aFrom || !bFrom || !aTo || !bTo) return 0;
      
      // Calculate the midpoint Y for each connection
      const aMidY = (getCenter(aFrom).y + getCenter(aTo).y) / 2;
      const bMidY = (getCenter(bFrom).y + getCenter(bTo).y) / 2;
      
      // Higher Y first (routes below obstacles will be processed first)
      return bMidY - aMidY;
    });

    for (const { fromId, toId } of sortedLinks) {
      const fr = rects.get(fromId);
      const tr = rects.get(toId);
      if (!fr || !tr) continue;

      const fc = getCenter(fr);
      const tc = getCenter(tr);

      const rawOut = getOutJunction(fr, tr);
      const rawIn = getInJunction(fr, tr);

      const fromCol = layers.get(fromId) ?? 0;
      const toCol = layers.get(toId) ?? 0;
      const gapKey = getGapKey(fromCol, toCol);

      const exclude = new Set<string>([fromId, toId]);

      const isDown = connectionIsDown(deviceById.get(fromId), deviceById.get(toId));

      // ── DIRECT PATH FAST-PATH
      if (Math.abs(fc.y - tc.y) <= DIRECT_Y_EPS) {
        const y = (fc.y + tc.y) / 2;
        const outJ = { ...rawOut, y };
        const inJ = { ...rawIn, y };

        const blockedBox = horizontalHitsAnyBox(y, outJ.x, inJ.x, boxes, exclude);
        const blockedLine = horizontalCollides(y, outJ.x, inJ.x, usedHoriz);

        if (!blockedBox && !blockedLine) {
          usedHoriz.push({ y, x1: Math.min(outJ.x, inJ.x), x2: Math.max(outJ.x, inJ.x) });
          out.push({
            fromId,
            toId,
            isDown,
            path: buildDirectPath(fc, outJ, inJ, tc),
            icon1: isDown ? outJ : undefined,
            icon2: isDown ? inJ : undefined,
          });
          continue;
        }

        if (DEBUG_ROUTING) {
          debugBlockedDirects.push({ y, x1: outJ.x, x2: inJ.x });
        }
      }

      // ── LANE ROUTING FALLBACK
      const desiredY = (fc.y + tc.y) / 2;

      // Check if we can reuse an existing lane to the same target
      const existingLane = (claimed.get(gapKey) ?? []).find(l => l.toId === toId);
      const canReuseExisting = existingLane && 
        !horizontalHitsAnyBox(existingLane.y, rawOut.x, rawIn.x, boxes, exclude);

      console.log(`   Routing ${fromId} → ${toId}:`);
      console.log(`   gapKey: ${gapKey}`);
      console.log(`   desiredY: ${desiredY.toFixed(1)}`);
      console.log(`   existingLane:`, existingLane);
      console.log(`   rawOut.x: ${rawOut.x.toFixed(1)}, rawIn.x: ${rawIn.x.toFixed(1)}`);
      if (existingLane) {
        const blocked = horizontalHitsAnyBox(existingLane.y, rawOut.x, rawIn.x, boxes, exclude);
        console.log(`   existingLane.y: ${existingLane.y.toFixed(1)}, blocked: ${blocked}`);
      }
      console.log(`   canReuseExisting: ${canReuseExisting}`);

      let laneData: LaneData;
      let outX: number;
      let inX: number;
      
      if (canReuseExisting) {
        // Reuse existing lane - use the SAME Y and X coordinates
        laneData = existingLane;
        outX = existingLane.outX;
        inX = existingLane.inX;
        console.log(`    REUSING lane at y=${laneData.y.toFixed(1)}, outX=${outX.toFixed(1)}, inX=${inX.toFixed(1)}`);
      } else {
        // Allocate new lane with vertical segments
        const newOutX = allocateVerticalLaneX(
          rawOut.x,
          rawOut.y,
          desiredY, // Use desiredY as placeholder for now
          usedVert,
          boxes,
          exclude
        );
        const newInX = allocateVerticalLaneX(
          rawIn.x,
          rawIn.y,
          desiredY,
          usedVert,
          boxes,
          exclude
        );
        
        laneData = allocateSafeLaneY(
          desiredY,
          gapKey,
          toId,
          claimed,
          boxes,
          exclude,
          newOutX,
          newInX,
          usedHoriz
        );
        
        outX = laneData.outX;
        inX = laneData.inX;
        
        console.log(`    NEW lane at y=${laneData.y.toFixed(1)}, outX=${outX.toFixed(1)}, inX=${inX.toFixed(1)}`);
      }

      const laneY = laneData.y;

      if (DEBUG_ROUTING) debugLaneYs.push(laneY);

      const outJ = { ...rawOut, x: outX };
      const inJ = { ...rawIn, x: inX };

      console.log(`     Final coordinates for ${fromId} → ${toId}:`);
      console.log(`      laneY: ${laneY.toFixed(1)}`);
      console.log(`      outJ: x=${outJ.x.toFixed(1)}, y=${outJ.y.toFixed(1)}`);
      console.log(`      inJ: x=${inJ.x.toFixed(1)}, y=${inJ.y.toFixed(1)}`);

      // Only add to usedHoriz if this is a new lane segment
      if (!canReuseExisting) {
        usedHoriz.push({
          y: laneY,
          x1: Math.min(outJ.x, inJ.x),
          x2: Math.max(outJ.x, inJ.x),
        });
      }

      if (DEBUG_ROUTING) {
        debugVerticals.push(
          { x: outJ.x, y1: rawOut.y, y2: laneY },
          { x: inJ.x, y1: rawIn.y, y2: laneY }
        );
      }

      out.push({
        fromId,
        toId,
        isDown,
        path: buildElbowPath(fc, outJ, laneY, inJ, tc),
        icon1: isDown ? outJ : undefined,
        icon2: isDown ? { x: inJ.x, y: laneY } : undefined,
      });
    }

    return {
      edges: out,
      debug: {
        boxes: debugBoxes,
        laneYs: debugLaneYs,
        verticals: debugVerticals,
        blocked: debugBlockedDirects,
      },
    };
  }, [links, rects, layers, deviceById]);

  return (
    <div id={containerId} style={{width: "1280px", height: "780px", position: "relative" }}>
      {/* Main lines */}
      <svg width={size.w || "1280px"} height={size.h || "780px"} style={{overflow: "visible", width: "1280px", height: "780px", position: "absolute", inset: 0, pointerEvents: "none", zIndex: "-1" }}>
        {renderedEdges.edges.map((e, i) => (
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

      {/* Debug overlay */}
      {DEBUG_ROUTING && (
        <svg
          width={size.w || "1280px"} height={size.h || "780px"}
          style={{overflow: "visible", width: "1280px", height: "780px", position: "absolute", inset: 0, pointerEvents: "none", zIndex: "10" }}
        >
          {renderedEdges.debug.boxes.map((b, i) => (
            <rect
              key={`box-${i}`}
              x={b.x1}
              y={b.y1}
              width={b.x2 - b.x1}
              height={b.y2 - b.y1}
              fill="rgba(0,150,255,0.08)"
              stroke="rgba(0,150,255,0.3)"
              strokeDasharray="4 2"
            />
          ))}

          {renderedEdges.debug.laneYs.map((y, i) => (
            <line
              key={`lane-${i}`}
              x1={0}
              x2={size.w}
              y1={y}
              y2={y}
              stroke="rgba(255,200,0,0.6)"
              strokeDasharray="6 4"
            />
          ))}

          {renderedEdges.debug.verticals.map((v, i) => (
            <line
              key={`vert-${i}`}
              x1={v.x}
              x2={v.x}
              y1={v.y1}
              y2={v.y2}
              stroke="rgba(200,0,255,0.6)"
              strokeDasharray="2 2"
            />
          ))}

          {renderedEdges.debug.blocked.map((d, i) => (
            <line
              key={`blocked-${i}`}
              x1={d.x1}
              x2={d.x2}
              y1={d.y}
              y2={d.y}
              stroke="rgba(255,0,0,0.8)"
              strokeDasharray="4 4"
            />
          ))}
        </svg>
      )}

      {/* Down icons */}
      {renderedEdges.edges.map(
        (e, i) =>
          e.isDown && (
            <React.Fragment key={`icons-${i}`}>
              {e.icon2 && <DownJunctionIcon x={e.icon2.x} y={e.icon2.y} />}
            </React.Fragment>
          )
      )}
    </div>
  );
}