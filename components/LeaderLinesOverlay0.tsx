import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import computeLayers from "../layout/computeLayers";
import type { RawDevice } from "../types/types";
import DownJunctionIcon from "./DownJunctionIcon";

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

const JUNCTION_GAP = 15;
const LANE_SPACING = 15;
const STROKE_WIDTH = 2;

/* ──────────────────────────────────────────────
   MERGE 1 — Elbow de-confliction constants
────────────────────────────────────────────── */
const MIN_ELBOW_DELTA = 18;
const STEP_OFFSET = 20;

/* ────────────────────────────────────────────── */

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
  const fc = getCenter(from);
  const tc = getCenter(to);
  return tc.x >= fc.x
    ? { x: to.left - JUNCTION_GAP, y: tc.y }
    : { x: to.left + to.width + JUNCTION_GAP, y: tc.y };
}

/* ──────────────────────────────────────────────
   MERGE 1 — stepped elbow path builder
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

  if (!needsStep) {
    return `
      M ${fromCenter.x} ${fromCenter.y}
      L ${outJ.x} ${outJ.y}
      L ${outJ.x} ${laneY}
      L ${inJ.x} ${laneY}
      L ${inJ.x} ${inJ.y}
      L ${toCenter.x} ${toCenter.y}
    `;
  }

  return `
    M ${fromCenter.x} ${fromCenter.y}
    L ${outJ.x} ${outJ.y}
    L ${outJ.x} ${stepY}
    L ${inJ.x} ${stepY}
    L ${inJ.x} ${laneY}
    L ${inJ.x} ${inJ.y}
    L ${toCenter.x} ${toCenter.y}
  `;
}

/* ──────────────────────────────────────────────
   MERGE 2 — per-column-gap lane reservation
────────────────────────────────────────────── */
function getGapKey(a: number, b: number) {
  const x = Math.min(a, b);
  const y = Math.max(a, b);
  return `${x}->${y}`;
}

function allocateLaneYForGap(
  desiredY: number,
  gapKey: string,
  claimedByGap: Map<string, number[]>
): number {
  if (!claimedByGap.has(gapKey)) {
    claimedByGap.set(gapKey, []);
  }

  const claimed = claimedByGap.get(gapKey)!;

  const isSafe = (y: number) =>
    claimed.every(c => Math.abs(c - y) >= LANE_SPACING);

  let y = desiredY;
  while (!isSafe(y)) y += LANE_SPACING;

  claimed.push(y);
  return y;
}

function connectionIsDown(from?: RawDevice, to?: RawDevice) {
  return from?.status === "down" || to?.status === "down";
}

/* ────────────────────────────────────────────── */

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
      const spanBias = Math.max(1, Math.abs(toCol - fromCol));
      const biasedY = desiredY + (spanBias - 1) * (LANE_SPACING / 2);

      const laneY = allocateLaneYForGap(biasedY, gapKey, claimedByGap);

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
