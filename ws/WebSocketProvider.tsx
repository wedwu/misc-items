// src/ws/WebSocketProvider.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";

import type { ProtocolRouter, WSMessage } from "./wsTypes";
import { CreatePreamble } from "./CreatePreamble";

type WebSocketContextValue = {
  send: <T>(type: string, payload: T) => void;
  protocol: string | null;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

type WebSocketProviderProps = {
  url: string;
  protocols: string[];
  router: ProtocolRouter;
  clientId?: string;
  version?: number;
  children: React.ReactNode;
};

export function WebSocketProvider({
  url,
  protocols,
  router,
  clientId,
  version = 1,
  children,
}: WebSocketProviderProps) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket(url, protocols);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connected:", ws.protocol);
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        // basic validation
        if (!msg.preamble || !msg.type) {
          console.warn("Invalid WS message:", msg);
          return;
        }

        // protocol guard
        if (msg.preamble.protocol !== ws.protocol) {
          console.warn(
            "Protocol mismatch:",
            msg.preamble.protocol,
            "!=",
            ws.protocol
          );
          return;
        }

        router[msg.type]?.(msg.payload, msg.preamble);
      } catch (err) {
        console.error("WS message parse error:", err);
      }
    };

    ws.onerror = (e) => {
      console.error("WS error:", e);
    };

    ws.onclose = () => {
      console.log("WebSocket closed");
    };

    return () => {
      ws.close();
    };
  }, [url, protocols, router]);

  const send = useCallback(
    <T,>(type: string, payload: T) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      const message: WSMessage<T> = {
        preamble: CreatePreamble(ws.protocol, {
          clientId,
          version,
        }),
        type,
        payload,
      };

      ws.send(JSON.stringify(message));
    },
    [clientId, version]
  );

  return (
    <WebSocketContext.Provider
      value={{
        send,
        protocol: wsRef.current?.protocol ?? null,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error("useWebSocket must be used within WebSocketProvider");
  }
  return ctx;
}
