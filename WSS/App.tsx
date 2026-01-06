// App.tsx or any component
import { useWebSocket } from './WebSocketContext';

function App() {
  const { isConnected, send } = useWebSocket();

  const handleSendMessage = () => {
    send({
      type: 'test',
      payload: 'Hello from React'
    });
  };

  return (
    <div>
      <h1>WebSocket Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</h1>
      <button onClick={handleSendMessage} disabled={!isConnected}>
        Send Message
      </button>
    </div>
  );
}

export default App;