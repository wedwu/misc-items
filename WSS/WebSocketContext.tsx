// WebSocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Preamble } from './types';
import { getClientId } from './client';
import { sockets } from './websocket';

class WebSocketManager {
  // ... (same implementation as before)
}

interface WebSocketContextType {
  wsManager: WebSocketManager | null;
  isConnected: boolean;
  send: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wsManager] = useState(() => new WebSocketManager());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    wsManager.connect();

    // Poll connection state
    const interval = setInterval(() => {
      setIsConnected(wsManager.getConnectionState() === WebSocket.OPEN);
    }, 1000);

    return () => {
      clearInterval(interval);
      wsManager.disconnect();
    };
  }, [wsManager]);

  const send = (message: any) => {
    wsManager.send(message);
  };

  return (
    <WebSocketContext.Provider value={{ wsManager, isConnected, send }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
};