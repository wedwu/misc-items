import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import computeLayers from "../layout/computeLayers"; // your integrated computeLayers
import type { RawDevice } from "../types/types";
import DownJunctionIcon from "./DownJunctionIcon";

// <div id={`node-${device.id}`}>...</div>
{/*<LeaderLinesOverlay devices={devices} containerId="diagram-canvas" />*/}
// 

type Rect = { left: number; top: number; width: number; height: number };

type Point = { x: number; y: number };

type Edge = {
  fromId: string;
  toId: string;
  isDown: boolean;
  path: string;
  // icon placement (absolute inside container)
  icon1?: Point; // source junction
  icon2?: Point; // 2nd elbow (near target side)
};

const JUNCTION_GAP = 15;      // “junction point” distance from box edge
const LANE_SPACING = 15;      // lane claim spacing (rule #7)
const STROKE_WIDTH = 2;

function getCenter(r: Rect): Point {
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

function getOutJunction(from: Rect, to: Rect): Point {
  const fromC = getCenter(from);
  const toC = getCenter(to);

  // decide direction based on relative X
  if (toC.x >= fromC.x) {
    // going right
    return { x: from.left + from.width + JUNCTION_GAP, y: fromC.y };
  }
  // going left
  return { x: from.left - JUNCTION_GAP, y: fromC.y };
}

function getInJunction(from: Rect, to: Rect): Point {
  const fromC = getCenter(from);
  const toC = getCenter(to);

  if (toC.x >= fromC.x) {
    // entering target from left
    return { x: to.left - JUNCTION_GAP, y: toC.y };
  }
  // entering from right
  return { x: to.left + to.width + JUNCTION_GAP, y: toC.y };
}

function buildElbowPath(fromCenter: Point, outJ: Point, laneY: number, inJ: Point, toCenter: Point): string {
  // Rule mapping:
  // 2. start at center (fromCenter)
  // 3. go to junction 15px off edge (outJ)
  // 4. from junction move vertically to laneY
  // 5. move horizontally across to target side (inJ.x) at laneY
  // 6. move vertically to target junction (inJ.y)
  // then move into target center
  const p1 = fromCenter;
  const p2 = outJ;
  const p3 = { x: outJ.x, y: laneY };
  const p4 = { x: inJ.x, y: laneY };
  const p5 = inJ;
  const p6 = toCenter;

  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} L ${p5.x} ${p5.y} L ${p6.x} ${p6.y}`;
}

// lane allocator that “claims” a Y coordinate (with 15px spacing if occupied)
function allocateLaneY(desiredY: number, claimed: number[]): number {
  let y = desiredY;
  // if too close to an existing lane, bump down by LANE_SPACING until safe
  // (simple but effective)
  const isSafe = (yy: number) => claimed.every((c) => Math.abs(c - yy) >= LANE_SPACING);
  while (!isSafe(y)) y += LANE_SPACING;
  claimed.push(y);
  return y;
}

function connectionIsDown(from?: RawDevice, to?: RawDevice): boolean {
  // adjust if you later add per-link status
  return (from?.status === "down") || (to?.status === "down");
}

export default function LeaderLinesOverlay({
  devices,
  containerId = "diagram-canvas",
}: {
  devices: RawDevice[];
  containerId?: string; // id of the relative-positioned parent container
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [rects, setRects] = useState<Map<string, Rect>>(new Map());
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // columns are not required for drawing, but we compute them so you can use them
  // for future “lane groups” per column gap if needed.
  const layers = useMemo(() => computeLayers(devices), [devices]);

  const deviceById = useMemo(() => {
    const m = new Map<string, RawDevice>();
    devices.forEach((d) => m.set(d.id, d));
    return m;
  }, [devices]);

  // collect all edges from links
  const links = useMemo(() => {
    const edges: Array<{ fromId: string; toId: string }> = [];
    devices.forEach((d) => {
      (d.links || []).forEach((toId) => {
        // only draw if target exists in list
        if (deviceById.has(toId)) edges.push({ fromId: d.id, toId });
      });
    });
    return edges;
  }, [devices, deviceById]);

  // measure DOM nodes
  const measure = () => {
    const container = document.getElementById(containerId) as HTMLElement | null;
    if (!container) return;

    containerRef.current = container;

    const containerBox = container.getBoundingClientRect();
    const next = new Map<string, Rect>();

    for (const d of devices) {
      const el = document.getElementById(`node-${d.id}`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      next.set(d.id, {
        left: r.left - containerBox.left,
        top: r.top - containerBox.top,
        width: r.width,
        height: r.height,
      });
    }

    setRects(next);
    setSize({ w: containerBox.width, h: containerBox.height });
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

    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId, devices]);

  const renderedEdges: Edge[] = useMemo(() => {
    const claimedY: number[] = []; // lane claims (global). You can make per-gap if you want.
    const out: Edge[] = [];

    for (const { fromId, toId } of links) {
      const fromRect = rects.get(fromId);
      const toRect = rects.get(toId);
      if (!fromRect || !toRect) continue;

      const fromCenter = getCenter(fromRect);
      const toCenter = getCenter(toRect);

      const outJ = getOutJunction(fromRect, toRect);
      const inJ = getInJunction(fromRect, toRect);

      // choose a desired lane near the midpoint between nodes
      const desiredY = (fromCenter.y + toCenter.y) / 2;

      // Optionally bias by columns (so links crossing many columns get more room)
      // This keeps overall flow, but is still lightweight:
      const fromCol = layers.get(fromId) ?? 0;
      const toCol = layers.get(toId) ?? 0;
      const span = Math.max(1, Math.abs(toCol - fromCol));
      const biasedDesiredY = desiredY + (span - 1) * (LANE_SPACING / 2);

      const laneY = allocateLaneY(biasedDesiredY, claimedY);

      const path = buildElbowPath(fromCenter, outJ, laneY, inJ, toCenter);

      const isDown = connectionIsDown(deviceById.get(fromId), deviceById.get(toId));

      // Icon placements:
      // - icon1 at source junction (rule #8)
      // - icon2 at 2nd elbow (the bend at target-side lane intersection) (rule #9)
      const icon1 = isDown ? { x: outJ.x, y: outJ.y } : undefined;
      const icon2 = isDown ? { x: inJ.x, y: laneY } : undefined;

      out.push({ fromId, toId, isDown, path, icon1, icon2 });
    }

    return out;
  }, [links, rects, deviceById, layers]);

  // SVG sits above boxes; icons are separate DOM so you can use your AOT UI component
  return (
    <div
      id={containerId}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
      }}
    >
      {/* Your grid/boxes should already be inside this same container in your app.
          If they are not, move this overlay into the same wrapper that contains node-* elements. */}

      <svg
        width={size.w}
        height={size.h}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {renderedEdges.map((e, idx) => (
          <path
            key={`${e.fromId}->${e.toId}-${idx}`}
            d={e.path}
            fill="none"
            stroke={e.isDown ? "var(--fruit-punch)" : "var(--color-borders)"}
            strokeWidth={STROKE_WIDTH}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Down icons (DOM components, not SVG) */}
      {renderedEdges.map((e, idx) => {
        if (!e.isDown) return null;

        return (
          <React.Fragment key={`icons-${e.fromId}->${e.toId}-${idx}`}>
            {e.icon1 && (
              <DownJunctionIcon
                x={e.icon1.x}
                y={e.icon1.y}
                title="Down connection"
              />
            )}
            {e.icon2 && (
              <DownJunctionIcon
                x={e.icon2.x}
                y={e.icon2.y}
                title="Down connection (2nd elbow)"
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
