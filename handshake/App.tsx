import React, { useState, useEffect } from 'react';
import HandshakeHistory from './components/HandshakeHistory';
import TokenDisplay from './examples/TokenDisplay';
import ArchiveMonitor from './examples/ArchiveMonitor';
import HandshakeProcessor from './examples/HandshakeProcessor';
import WebSocketManager from './services/WebSocketManager';
import { addHandshakeRecord } from './utils/handshakeStorage';

const App: React.FC = () => {
  const [wsManager] = useState(() => new WebSocketManager('ws://localhost:8080'));
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'examples'>('history');

  useEffect(() => {
    // For demo purposes, we'll simulate handshakes
    // In real usage, this would come from actual WebSocket connection
    
    // Uncomment to connect to real WebSocket:
    // wsManager.connect();
    // wsManager.on('handshake', (data) => {
    //   console.log('Received handshake:', data);
    // });

    return () => {
      wsManager.disconnect();
    };
  }, [wsManager]);

  // Simulate a handshake for testing (remove in production)
  const simulateHandshake = () => {
    const mockHandshake = {
      type: 'handshake',
      token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Math.random().toString(36).substring(7)}`,
      system: {
        id: `server-${Math.floor(Math.random() * 100)}`,
        version: '1.0.0',
        timestamp: Date.now()
      },
      archive: Array.from({ length: 5 }, () => Math.floor(Math.random() * 100))
    };

    addHandshakeRecord(mockHandshake);
    console.log('Simulated handshake:', mockHandshake);
  };

  const handleConnect = () => {
    wsManager.connect();
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    wsManager.disconnect();
    setIsConnected(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-color, #f5f5f5)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          :root {
            --bg-color: #121212;
            --card-bg: #1e1e1e;
            --text-primary: #ffffff;
            --text-secondary: #a0a0a0;
            --border-color: #404040;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'var(--card-bg, white)',
        borderBottom: '1px solid var(--border-color, #e0e0e0)',
        padding: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1 style={{
            margin: '0 0 10px 0',
            fontSize: '24px',
            color: 'var(--text-primary, #1a1a1a)'
          }}>
            🤝 WebSocket Handshake Manager
          </h1>
          <p style={{
            margin: '0 0 15px 0',
            color: 'var(--text-secondary, #666)',
            fontSize: '14px'
          }}>
            Complete handshake tracking, storage, and analysis toolkit
          </p>

          {/* Connection Controls */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={handleConnect}
              disabled={isConnected}
              style={{
                padding: '8px 16px',
                background: isConnected ? '#28a745' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isConnected ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                opacity: isConnected ? 0.6 : 1
              }}
            >
              {isConnected ? '✓ Connected' : 'Connect WebSocket'}
            </button>
            
            {isConnected && (
              <button
                onClick={handleDisconnect}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                Disconnect
              </button>
            )}

            <button
              onClick={simulateHandshake}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              🧪 Simulate Handshake (Test)
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'var(--card-bg, white)',
        borderBottom: '1px solid var(--border-color, #e0e0e0)',
        padding: '0 20px'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '20px' }}>
          <button
            onClick={() => setActiveTab('history')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'history' ? '3px solid #007bff' : '3px solid transparent',
              color: activeTab === 'history' ? 'var(--text-primary, #1a1a1a)' : 'var(--text-secondary, #666)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            📊 Handshake History
          </button>
          <button
            onClick={() => setActiveTab('examples')}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'examples' ? '3px solid #007bff' : '3px solid transparent',
              color: activeTab === 'examples' ? 'var(--text-primary, #1a1a1a)' : 'var(--text-secondary, #666)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            💡 Usage Examples
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ padding: '20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {activeTab === 'history' ? (
            <HandshakeHistory />
          ) : (
            <div>
              <h2 style={{
                fontSize: '20px',
                marginBottom: '20px',
                color: 'var(--text-primary, #1a1a1a)'
              }}>
                Usage Examples
              </h2>
              <TokenDisplay />
              <ArchiveMonitor />
              <HandshakeProcessor />
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--card-bg, white)',
        borderTop: '1px solid var(--border-color, #e0e0e0)',
        padding: '20px',
        marginTop: '40px',
        textAlign: 'center',
        color: 'var(--text-secondary, #666)',
        fontSize: '13px'
      }}>
        <p style={{ margin: 0 }}>
          WebSocket Handshake Manager • Built with React & TypeScript • Auto-saves to localStorage
        </p>
      </div>
    </div>
  );
};

export default App;
