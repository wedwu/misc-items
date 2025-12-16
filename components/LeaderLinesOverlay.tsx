import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import computeLayers from "../layout/computeLayers";
import type { RawDevice } from "../types/types";
import DownJunctionIcon from "./DownJunctionIcon";

/* ---------------- constants ---------------- */

const JUNCTION_GAP = 15;
const LANE_SPACING = 15;
const STROKE_WIDTH = 2;

/* ---------------- types ---------------- */

type Rect = { left: number; top: number; width: number; height: number };
type Point = { x: number; y: number };

type EdgeRender = {
  path: string;
  isDown: boolean;
  icon1?: Point;
  icon2?: Point;
};

/* ---------------- geometry helpers ---------------- */

const center = (r: Rect): Point => ({
  x: r.left + r.width / 2,
  y: r.top + r.height / 2,
});

const outJunction = (from: Rect, to: Rect): Point => {
  const fc = center(from);
  const tc = center(to);
  return tc.x >= fc.x
    ? { x: from.left + from.width + JUNCTION_GAP, y: fc.y }
    : { x: from.left - JUNCTION_GAP, y: fc.y };
};

const inJunction = (from: Rect, to: Rect): Point => {
  const fc = center(from);
  const tc = center(to);
  return tc.x >= fc.x
    ? { x: to.left - JUNCTION_GAP, y: tc.y }
    : { x: to.left + to.width + JUNCTION_GAP, y: tc.y };
};

/* ---------------- lane allocator ---------------- */

function allocateLaneY(desired: number, claimed: number[]): number {
  let y = desired;
  while (claimed.some(c => Math.abs(c - y) < LANE_SPACING)) {
    y += LANE_SPACING;
  }
  claimed.push(y);
  return y;
}

/* ---------------- column gap Xs ---------------- */

function buildColumnXs(rects: Map<string, Rect>, layers: Map<string, number>): number[] {
  const cols = new Map<number, number[]>();

  for (const [id, r] of rects) {
    const c = layers.get(id);
    if (c == null) continue;
    if (!cols.has(c)) cols.set(c, []);
    cols.get(c)!.push(r.left);
  }

  const xs: number[] = [];
  [...cols.keys()]
    .sort((a, b) => a - b)
    .forEach(c => {
      const list = cols.get(c)!;
      xs[c] = Math.min(...list);
    });

  return xs;
}

function gapXs(fromCol: number, toCol: number, columnX: number[]): number[] {
  const dir = toCol > fromCol ? 1 : -1;
  const gaps: number[] = [];
  for (let c = fromCol; c !== toCol; c += dir) {
    const a = columnX[c];
    const b = columnX[c + dir];
    if (a != null && b != null) gaps.push((a + b) / 2);
  }
  return gaps;
}

/* ---------------- path builders ---------------- */

function build2Elbow(
  fromC: Point,
  outJ: Point,
  laneY: number,
  inJ: Point,
  toC: Point
) {
  return `
    M ${fromC.x} ${fromC.y}
    L ${outJ.x} ${outJ.y}
    L ${outJ.x} ${laneY}
    L ${inJ.x} ${laneY}
    L ${inJ.x} ${inJ.y}
    L ${toC.x} ${toC.y}
  `;
}

function build4Elbow(
  fromC: Point,
  outJ: Point,
  laneY: number,
  gapXs: number[],
  inJ: Point,
  toC: Point
) {
  const pts: Point[] = [
    fromC,
    outJ,
    { x: outJ.x, y: laneY },
    ...gapXs.map(x => ({ x, y: laneY })),
    { x: inJ.x, y: laneY },
    inJ,
    toC,
  ];

  return pts.reduce(
    (d, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${d} L ${p.x} ${p.y}`),
    ""
  );
}

/* ---------------- main component ---------------- */

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
    devices.forEach(d => m.set(d.id, d));
    return m;
  }, [devices]);

  /* -------- measure DOM -------- */

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

  useLayoutEffect(measure, [devices]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* -------- render edges -------- */

  const edges: EdgeRender[] = useMemo(() => {
    const claimedY: number[] = [];
    const fanIndex = new Map<string, number>();
    const columnX = buildColumnXs(rects, layers);
    const out: EdgeRender[] = [];

    for (const d of devices) {
      for (const toId of d.links || []) {
        const fromRect = rects.get(d.id);
        const toRect = rects.get(toId);
        if (!fromRect || !toRect) continue;

        const fromCol = layers.get(d.id) ?? 0;
        const toCol = layers.get(toId) ?? 0;
        const span = Math.abs(toCol - fromCol);

        const fromC = center(fromRect);
        const toC = center(toRect);
        const outJ = outJunction(fromRect, toRect);
        const inJ = inJunction(fromRect, toRect);

        const idx = fanIndex.get(d.id) ?? 0;
        fanIndex.set(d.id, idx + 1);

        const laneY = allocateLaneY(fromC.y + idx * LANE_SPACING, claimedY);

        const isDown = d.status === "down" || byId.get(toId)?.status === "down";

        const path =
          span <= 1
            ? build2Elbow(fromC, outJ, laneY, inJ, toC)
            : build4Elbow(
                fromC,
                outJ,
                laneY,
                gapXs(fromCol, toCol, columnX),
                inJ,
                toC
              );

        out.push({
          path,
          isDown,
          icon1: isDown ? outJ : undefined,
          icon2: isDown ? { x: inJ.x, y: laneY } : undefined,
        });
      }
    }

    return out;
  }, [devices, rects, layers, byId]);

  /* -------- render -------- */

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

      {edges.map(
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
