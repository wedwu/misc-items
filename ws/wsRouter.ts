// src/ws/wsRouter.ts
import type { ProtocolRouter } from "./wsTypes";

export const wsRouter: ProtocolRouter = {
  DEVICE_STATUS: (payload, preamble) => {
    console.log("DEVICE_STATUS:", payload);
    console.log("From:", preamble.clientId);
  },

  DEVICE_METRICS: (payload) => {
    console.log("DEVICE_METRICS:", payload);
  },

  ALERT: (payload, preamble) => {
    console.warn(
      `[${preamble.protocol} v${preamble.version}] ALERT`,
      payload
    );
  },
};
