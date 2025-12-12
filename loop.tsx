import { useMemo } from "react";

// --------------------------------------------------
// CONFIG
// --------------------------------------------------

const PRIORITY = ["Relay Mode", "Kafka", "Health"];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function normalize(label: string) {
  return label.toLowerCase().trim();
}

// --------------------------------------------------
// HOOK / LOGIC
// --------------------------------------------------

export function usePriorityStatus(device: {
  statusInfo?: { name: string; value: string }[];
}) {
  return useMemo(() => {
    if (!device.statusInfo?.length) {
      return PRIORITY.map(name => ({
        name,
        value: "--",
      }));
    }

    const normalizedMap = new Map(
      device.statusInfo.map(item => [
        normalize(item.name),
        item.value,
      ])
    );

    return PRIORITY.map(name => {
      const key = normalize(name);
      return {
        name,
        value: normalizedMap.get(key) ?? "--",
      };
    });
  }, [device.statusInfo]);
}

const priorityStatuses = usePriorityStatus(device);

{priorityStatuses.map(p => (
  <div key={p.name}>
    <strong>{p.name}:</strong> {p.value}
  </div>
))}