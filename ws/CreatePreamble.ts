// src/ws/CreatePreamble.ts

export type Preamble = {
  protocol: string;
  version: number;
  timestamp: number;
  clientId?: string;
};

export function CreatePreamble(
  protocol: string,
  options?: {
    version?: number;
    clientId?: string;
  }
): Preamble {
  return {
    protocol,
    version: options?.version ?? 1,
    timestamp: Date.now(),
    clientId: options?.clientId,
  };
}
