import React from "react";

/**
 * Replace the inner content with your actual AOT-UI icon component, e.g.
 *   <aot-ui-icon name="warning" />
 * or your React wrapper around it.
 */
export default function DownJunctionIcon({
  x,
  y,
  title,
}: {
  x: number;
  y: number;
  title?: string;
}) {
  const size = 16;

  return (
    <div
      title={title}
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: 4,
        background: "var(--fruit-punch)",
        display: "grid",
        placeItems: "center",
        pointerEvents: "none",
        boxShadow: "0 1px 2px rgba(0,0,0,0.25)",
      }}
    >
      {/* Placeholder icon; replace with AOT-UI icon */}
      <span style={{ color: "white", fontSize: 12, lineHeight: 1 }}>!</span>
    </div>
  );
}
