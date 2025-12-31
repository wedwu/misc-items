// src/App.tsx
import { useWebSocket } from "./ws/WebSocketProvider";

export default function App() {
  const { send, protocol } = useWebSocket();

  return (
    <div>
      <h1>WebSocket Dashboard</h1>
      <p>Protocol: {protocol}</p>

      <button
        onClick={() =>
          send("SUBSCRIBE", {
            topic: "devices",
          })
        }
      >
        Subscribe
      </button>
    </div>
  );
}
