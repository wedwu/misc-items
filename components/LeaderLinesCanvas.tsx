import React, { useEffect, useMemo, useRef } from "react";

type Id = string;
type Link = [Id, Id];

type Props = {
  columns: Id[][];
  links: Link[];

  enablePhase4A?: boolean;
  enablePhase5Fanin?: boolean;
  enablePhase6Terminals?: boolean;

  startX?: number;
  startY?: number;
  colGap?: number;
  rowGap?: number;
  boxW?: number;
  boxH?: number;

  elbowGap?: number;
  mergeOffsetX?: number;
  terminalGap?: number;

  stroke?: string;
  strokeWidth?: number;
};

export default function LeaderLinesCanvas({
  columns,
  links,

  enablePhase4A = true,
  enablePhase5Fanin = true,
  enablePhase6Terminals = true,

  startX = 40,
  startY = 40,
  colGap = 220,
  rowGap = 70,
  boxW = 180,
  boxH = 42,

  elbowGap = 18,
  mergeOffsetX = 28,
  terminalGap = 14,

  stroke = "#ff3b30",
  strokeWidth = 2,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // -------------------------
  // Compute layout + paths
  // -------------------------
  const computed = useMemo(() => {
    type Rect = { id: Id; x: number; y: number; w: number; h: number };
    type Trunk = { x: number; y1: number; y2: number };
    type Stub = {
      from: Id;
      to: Id;
      ax: number;
      ay: number;
      bx: number;
      by: number;
      trunkX: number;
      _fanin?: { mergeX: number; entryX: number; entryY: number; offsetY?: number };
    };

    const devices = new Map<Id, Rect>();
    const trunks: Trunk[] = [];
    const stubs: Stub[] = [];
    const fanins: { x: number; entryX: number; entryY: number; to: Id }[] = [];

    const getCol = (id: Id) => columns.findIndex(c => c.includes(id));

    // Phase 1 — device layout
    columns.forEach((col, ci) => {
      col.forEach((id, ri) => {
        devices.set(id, {
          id,
          x: startX + ci * colGap,
          y: startY + ri * rowGap,
          w: boxW,
          h: boxH,
        });
      });
    });

    // Phase 2 — trunks
    for (let i = 0; i < columns.length - 1; i++) {
      const left = columns[i];
      const right = columns[i + 1];

      const involved = links.filter(([a, b]) => left.includes(a) && right.includes(b));
      if (!involved.length) continue;

      const xs = left.map(id => devices.get(id)!.x + boxW);
      const ys = involved.map(([a]) => devices.get(a)!.y + boxH / 2);

      trunks.push({
        x: Math.max(...xs) + 20,
        y1: Math.min(...ys),
        y2: Math.max(...ys),
      });
    }

    // Phase 3 — stubs
    links.forEach(([from, to]) => {
      const a = devices.get(from);
      const b = devices.get(to);
      if (!a || !b) return;

      const trunk = trunks.find(
        (_, i) => i === getCol(from)
      );
      if (!trunk) return;

      stubs.push({
        from,
        to,
        ax: a.x + a.w,
        ay: a.y + a.h / 2,
        bx: b.x,
        by: b.y + b.h / 2,
        trunkX: trunk.x,
      });
    });

    // Phase 5 — fan-in
    if (enablePhase5Fanin) {
      const grouped = new Map<Id, Stub[]>();
      stubs.forEach(s => {
        const arr = grouped.get(s.to) ?? [];
        arr.push(s);
        grouped.set(s.to, arr);
      });

      grouped.forEach((group, to) => {
        if (group.length < 2) return;
        const target = devices.get(to)!;

        const mergeX = target.x - mergeOffsetX;
        const entryX = target.x;
        const entryY = target.y + target.h / 2;

        group.forEach(s => {
          s._fanin = { mergeX, entryX, entryY };
        });

        fanins.push({ x: mergeX, entryX, entryY, to });
      });
    }

    // Phase 6 — terminal spacing
    if (enablePhase6Terminals) {
      const grouped = new Map<Id, Stub[]>();
      stubs.forEach(s => {
        if (!s._fanin) return;
        const arr = grouped.get(s.to) ?? [];
        arr.push(s);
        grouped.set(s.to, arr);
      });

      grouped.forEach(arr => {
        const mid = (arr.length - 1) / 2;
        arr.forEach((s, i) => {
          s._fanin!.offsetY = (i - mid) * terminalGap;
        });
      });
    }

    const width =
      startX + columns.length * colGap + boxW + 60;
    const height =
      startY + Math.max(...columns.map(c => c.length)) * rowGap + boxH + 60;

    return { trunks, stubs, fanins, width, height };
  }, [
    columns,
    links,
    startX,
    startY,
    colGap,
    rowGap,
    boxW,
    boxH,
    elbowGap,
    mergeOffsetX,
    terminalGap,
    enablePhase5Fanin,
    enablePhase6Terminals,
  ]);

  // -------------------------
  // Draw
  // -------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = computed.width;
    canvas.height = computed.height;

    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Trunks
    computed.trunks.forEach(t => {
      ctx.beginPath();
      ctx.moveTo(t.x, t.y1);
      ctx.lineTo(t.x, t.y2);
      ctx.stroke();
    });

    // Stubs
    computed.stubs.forEach(s => {
      const ex1 = s.ax + elbowGap;
      const tx = s._fanin?.mergeX ?? s.trunkX;
      const ex2 = tx - elbowGap;
      const ty = s.by + (s._fanin?.offsetY ?? 0);

      ctx.beginPath();
      ctx.moveTo(s.ax, s.ay);
      ctx.lineTo(ex1, s.ay);
      ctx.lineTo(ex1, s.by);
      ctx.lineTo(ex2, s.by);
      ctx.lineTo(tx, ty);
      if (!s._fanin) ctx.lineTo(s.bx, s.by);
      ctx.stroke();
    });

    // Fan-in trunks
    computed.fanins.forEach(f => {
      const ys = computed.stubs
        .filter(s => s.to === f.to && s._fanin)
        .map(s => s.by + (s._fanin!.offsetY ?? 0));
      if (!ys.length) return;

      ctx.beginPath();
      ctx.moveTo(f.x, Math.min(...ys));
      ctx.lineTo(f.x, Math.max(...ys));
      ctx.lineTo(f.entryX, f.entryY);
      ctx.stroke();
    });
  }, [computed, stroke, strokeWidth]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    />
  );
}
