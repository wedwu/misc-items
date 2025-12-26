import { useEffect, useState } from "react";
import { wsService } from "../services/WebSocketService";

export function useWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    wsService.connect(url);

    const unsubscribe = wsService.subscribe(setLastMessage);

    const interval = setInterval(() => {
      setConnected(wsService.isConnected());
    }, 250);

    return () => {
      unsubscribe();
      clearInterval(interval);
      // ❗ DO NOT close socket here — StrictMode safe
    };
  }, [url]);

  return {
    connected,
    lastMessage,
    send: wsService.send.bind(wsService),
  };
}
