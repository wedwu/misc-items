export interface StatusInfoItem {
  name: string;
  value: string;
}

export interface DeviceWithStatusInfo {
  statusInfo?: StatusInfoItem[];
}

export interface FindStatusOptions {
  fallback?: string;
  partial?: boolean;
}

export const PRIORITY_KEYS = ["Relay Mode", "Kafka", "Health"] as const;

export type PriorityKey = typeof PRIORITY_KEYS[number];


function normalize(label: string): string {
  return label.toLowerCase().trim();
}

export function findStatusValue(
  statusInfo: StatusInfoItem[] | undefined,
  key: string,
  options?: FindStatusOptions
): string {
  const fallback = options?.fallback ?? "--";
  const partial = options?.partial ?? false;

  if (!statusInfo?.length) return fallback;

  const target = normalize(key);

  const found = statusInfo.find(item => {
    const name = normalize(item.name);
    return partial ? name.includes(target) : name === target;
  });

  return found?.value ?? fallback;
}

export function getPriorityStatuses(
  device: DeviceWithStatusInfo,
  options?: FindStatusOptions
): { name: PriorityKey; value: string }[] {
  return PRIORITY_KEYS.map(name => ({
    name,
    value: findStatusValue(
      device.statusInfo,
      name,
      options
    ),
  }));
}

export function getPrimaryPriorityValue(
  device: DeviceWithStatusInfo,
  options?: FindStatusOptions
): string {
  for (const key of PRIORITY_KEYS) {
    const value = findStatusValue(device.statusInfo, key, options);
    if (value !== (options?.fallback ?? "--")) {
      return value;
    }
  }
  return options?.fallback ?? "--";
}

const outputs = findStatusValue(device.statusInfo, "outputs");
const itemsSent = findStatusValue(
  device.statusInfo,
  "items sent",
  { partial: true }
);
const priorities = getPriorityStatuses(device);

const primary = getPrimaryPriorityValue(device);


