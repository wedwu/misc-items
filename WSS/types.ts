// types.ts
import type { UUID } from "crypto";

export interface SystemInfo {
  id: string;
}

export interface UnifiedSocketConfig {}

export interface HandshakeResult {
  archive: number[];
  token: string;
  system: object;
}

export const WebSocketIOFlags = {
  Default: 0x0,
  NoObjects: 0x1,
  NoMessages: 0x2,
  NoMetaData: 0x4,
} as const;

// This creates a union type of the keys: "Default" | "NoObjects" | "NoMessages" | "NoMetaData"
export type WebSocketIOFlags = keyof typeof WebSocketIOFlags;

// OR if you want the numeric values: 0x0 | 0x1 | 0x2 | 0x4
// export type WebSocketIOFlagsValue = typeof WebSocketIOFlags[keyof typeof WebSocketIOFlags];

export interface Preamble {
  flags: WebSocketIOFlags; // This now accepts "Default" | "NoObjects" | "NoMessages" | "NoMetaData"
  password?: string;
  system: SystemInfo;
  username?: string;
  // TODO: Add auth block here
  // auth?: AuthBlock;
}

// Placeholder for future auth implementation
export interface AuthBlock {
  token?: string;
  apiKey?: string;
  // Add other auth fields as needed
}