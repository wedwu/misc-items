// Example component using your WebSocket
import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/context/WebSocketContext';

interface DeviceData {
  id: string;
  // Add other properties based on your actual data structure
  name?: string;
  status?: string;
  // ... etc
}

export const WebSocketComponent: React.FC = () => {
  const { wsManager, isConnected, hasError } = useWebSocket();
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [latestMessage, setLatestMessage] = useState<any>(null);

  useEffect(() => {
    // Register a message handler
    const unsubscribe = wsManager.addMessageHandler((data) => {
      console.log('Received WebSocket data:', data);
      
      // Update latest message
      setLatestMessage(data);
      
      // Handle different message types
      if (data.type === 'handshake') {
        // Handle handshake
        console.log('Handshake received:', data);
      } else if (data.type === 'device') {
        // Add or update device in state
        setDevices((prev) => {
          const existingIndex = prev.findIndex((d) => d.id === data.id);
          if (existingIndex >= 0) {
            // Update existing device
            const updated = [...prev];
            updated[existingIndex] = data;
            return updated;
          } else {
            // Add new device
            return [...prev, data];
          }
        });
      }
    });

    // Cleanup: unsubscribe when component unmounts
    return () => {
      unsubscribe();
    };
  }, [wsManager]);

  // Render connection status and data
  return (
    <div className="p-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold">WebSocket Status</h2>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        {hasError && (
          <p className="text-red-500 mt-2">Connection error occurred</p>
        )}
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-semibold">Devices ({devices.length})</h3>
        <div className="grid gap-2 mt-2">
          {devices.map((device) => (
            <div key={device.id} className="border p-3 rounded">
              <p><strong>ID:</strong> {device.id}</p>
              <p><strong>Name:</strong> {device.name || 'Unknown'}</p>
              <p><strong>Status:</strong> {device.status || 'N/A'}</p>
            </div>
          ))}
        </div>
      </div>

      {latestMessage && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Latest Message</h3>
          <pre className="bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(latestMessage, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};



// In your App.tsx or main component
import { WebSocketProvider } from '@/context/WebSocketContext';
import { WebSocketComponent } from '@/components/WebSocketComponent';

function App() {
  return (
    <WebSocketProvider>
      <WebSocketComponent />
      {/* Other components */}
    </WebSocketProvider>
  );
}