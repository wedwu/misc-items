// src/ws/wsTypes.ts
import type { Preamble } from "./CreatePreamble";

export type WSMessage<T = unknown> = {
  preamble: Preamble;
  type: string;
  payload: T;
};

export type MessageHandler<T = unknown> = (
  payload: T,
  preamble: Preamble
) => void;

export type ProtocolRouter = Record<string, MessageHandler>;
