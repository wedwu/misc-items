type DebugOptions = {
  label?: string;
  color?: string;
  collapsed?: boolean;
};

export function debug(
  value: any,
  opts: DebugOptions = {}
) {
  if (!DEBUG) return;

  const {
    label = "debug",
    color = "#4cafef",
    collapsed = true,
  } = opts;

  const title = `%c🧩 ${label}`;

  const style = `
    color: ${color};
    font-weight: bold;
  `;

  if (collapsed) {
    console.groupCollapsed(title, style);
  } else {
    console.group(title, style);
  }

  try {
    if (typeof value === "function") {
      console.log("ƒ function:", value.name || "(anonymous)");
    } else {
      console.log(value);
    }
  } catch (e) {
    console.warn("Unable to log value:", e);
  }

  console.groupEnd();
}



debug(laneData);
debug(outJ);
debug(renderedEdges);

debug(laneData, { label: "Lane Allocation" });

debug(
  { fromId, toId, laneY, outX, inX },
  { label: "Routing Result" }
);


debug(edge, { label: "DOWN EDGE", color: "#ff5252" });
debug(edge, { label: "NORMAL EDGE", color: "#66bb6a" });


debug(renderedEdges, {
  label: "Final Rendered Edges",
  collapsed: false,
});


export function debugEdge(
  edge: {
    fromId?: string;
    toId?: string;
    path?: string;
    icon1?: any;
    icon2?: any;
  },
  label = "Edge"
) {
  if (!DEBUG) return;

  console.groupCollapsed(`🔗 ${label}: ${edge.fromId} → ${edge.toId}`);
  console.log("path:", edge.path);
  console.log("icon1:", edge.icon1);
  console.log("icon2:", edge.icon2);
  console.groupEnd();
}


const DEBUG = import.meta.env.DEV;
const DEBUG = process.env.NODE_ENV !== "production";






