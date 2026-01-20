// DeviceLoader.tsx
// npm create vite@latest WebSocket -- --template react-ts

import React, { useState, useEffect, useRef } from 'react';

const DeviceLoader = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const wsRef = useRef(null);

  useEffect(() => {
    // Simulate WebSocket connection
    // In production, replace with: new WebSocket('wss://your-websocket-url')
    /*
    const simulateWebSocket = () => {
      let messageCount = 0;
      const totalMessages = 5;
      
      // Simulated device data
      const deviceData = [
        { id: 1, name: 'Temperature Sensor A1', type: 'sensor', status: 'online', location: 'Building A - Floor 1' },
        { id: 2, name: 'Smart Camera B3', type: 'camera', status: 'online', location: 'Building B - Floor 3' },
        { id: 3, name: 'Motion Detector C2', type: 'detector', status: 'offline', location: 'Building C - Floor 2' },
        { id: 4, name: 'Air Quality Monitor D1', type: 'sensor', status: 'online', location: 'Building D - Floor 1' },
        { id: 5, name: 'Access Control E4', type: 'access', status: 'maintenance', location: 'Building E - Floor 4' }
      ];

      const interval = setInterval(() => {
        if (messageCount < totalMessages) {
          // Simulate receiving a message
          const device = deviceData[messageCount];
          
          // Simulate potential errors (10% chance)
          if (Math.random() < 0.1) {
            setError(`Failed to load device ${device.name}`);
            clearInterval(interval);
            setLoading(false);
            return;
          }

          setDevices(prev => [...prev, device]);
          messageCount++;
        } else {
          setLoading(false);
          setIsComplete(true);
          clearInterval(interval);
        }
      }, 800);

      return () => clearInterval(interval);
    };

    const cleanup = simulateWebSocket();

    // Real WebSocket implementation would look like:
    */
    const ws = new WebSocket('wss://echo.websocket.org');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setLoading(true);
    };

    ws.onmessage = (event) => {
      try {
        const device = JSON.parse(event.data);
        setDevices(prev => [...prev, device]);
      } catch (err) {
        setError('Failed to parse device data');
      }
    };

    ws.onerror = (err) => {
      setError('WebSocket connection error');
      setLoading(false);
    };

    ws.onclose = () => {
      setLoading(false);
      setIsComplete(true);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
    /**/

    return cleanup;
  }, []);

  const getStatusColor = (status) => {
    switch(status) {
      case 'online': return 'var(--status-online)';
      case 'offline': return 'var(--status-offline)';
      case 'maintenance': return 'var(--status-maintenance)';
      default: return 'var(--gray-400)';
    }
  };

  const getDeviceIcon = (type) => {
    switch(type) {
      case 'sensor': return '📡';
      case 'camera': return '📹';
      case 'detector': return '🔍';
      case 'access': return '🔐';
      default: return '📱';
    }
  };

  return (
    <div className="container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700&display=swap');

        :root {
          --bg-primary: #0a0e1a;
          --bg-secondary: #151923;
          --bg-card: #1a1f2e;
          --text-primary: #e4e8f0;
          --text-secondary: #8b92a8;
          --accent: #00d9ff;
          --accent-dim: rgba(0, 217, 255, 0.1);
          --status-online: #00ff88;
          --status-offline: #ff4444;
          --status-maintenance: #ffaa00;
          --border: rgba(255, 255, 255, 0.08);
          --glow: rgba(0, 217, 255, 0.3);
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Space Mono', monospace;
          background: var(--bg-primary);
          color: var(--text-primary);
          min-height: 100vh;
        }

        .container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 60px 20px;
        }

        .header {
          margin-bottom: 48px;
          text-align: center;
        }

        .title {
          font-family: 'Syne', sans-serif;
          font-size: 48px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent) 0%, #00ff88 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 12px;
          letter-spacing: -0.02em;
          animation: titleSlide 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes titleSlide {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .subtitle {
          color: var(--text-secondary);
          font-size: 14px;
          text-transform: uppercase;
          letter-spacing: 2px;
          animation: fadeIn 1s ease-out 0.3s both;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .loading-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          gap: 24px;
        }

        .spinner {
          width: 60px;
          height: 60px;
          border: 3px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .loading-text {
          color: var(--text-secondary);
          font-size: 14px;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .error-container {
          background: rgba(255, 68, 68, 0.1);
          border: 1px solid var(--status-offline);
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .error-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .error-text {
          color: var(--status-offline);
          font-size: 16px;
          font-weight: 600;
        }

        .devices-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        }

        .device-card {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .device-card:hover {
          transform: translateY(-4px);
          border-color: var(--accent);
          box-shadow: 0 8px 32px var(--glow);
        }

        .device-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--accent), #00ff88);
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .device-card:hover::before {
          opacity: 1;
        }

        .device-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .device-icon {
          font-size: 32px;
          filter: grayscale(20%);
        }

        .status-indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          animation: statusPulse 2s ease-in-out infinite;
          box-shadow: 0 0 12px currentColor;
        }

        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .device-name {
          font-family: 'Syne', sans-serif;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .device-type {
          font-size: 12px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
        }

        .device-location {
          font-size: 13px;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .device-status {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 16px;
          padding: 8px 12px;
          background: var(--accent-dim);
          border-radius: 8px;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        .complete-message {
          text-align: center;
          padding: 32px;
          margin-top: 32px;
          background: rgba(0, 255, 136, 0.05);
          border: 1px solid rgba(0, 255, 136, 0.2);
          border-radius: 12px;
          animation: fadeIn 0.5s ease-out;
        }

        .complete-icon {
          font-size: 48px;
          margin-bottom: 12px;
        }

        .complete-text {
          color: var(--status-online);
          font-size: 16px;
          font-weight: 600;
        }

        .device-count {
          font-size: 14px;
          color: var(--text-secondary);
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .title {
            font-size: 36px;
          }
          
          .devices-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="header">
        <h1 className="title">Device Monitor</h1>
        <p className="subtitle">Real-time WebSocket Feed</p>
      </div>

      {error && (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-text">{error}</div>
        </div>
      )}

      {loading && devices.length === 0 && !error && (
        <div className="loading-container">
          <div className="spinner"></div>
          <div className="loading-text">Establishing WebSocket connection...</div>
        </div>
      )}

      {devices.length > 0 && (
        <div className="devices-grid">
          {devices.map((device, index) => (
            <div 
              key={device.id} 
              className="device-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="device-header">
                <div className="device-icon">{getDeviceIcon(device.type)}</div>
                <div 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(device.status) }}
                ></div>
              </div>
              
              <h3 className="device-name">{device.name}</h3>
              <div className="device-type">{device.type}</div>
              <div className="device-location">
                <span>📍</span>
                <span>{device.location}</span>
              </div>
              
              <div 
                className="device-status"
                style={{ color: getStatusColor(device.status) }}
              >
                <div 
                  className="status-indicator"
                  style={{ backgroundColor: getStatusColor(device.status) }}
                ></div>
                {device.status}
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && devices.length > 0 && (
        <div className="loading-container" style={{ padding: '40px 20px' }}>
          <div className="spinner"></div>
          <div className="loading-text">Loading more devices...</div>
        </div>
      )}

      {isComplete && !error && (
        <div className="complete-message">
          <div className="complete-icon">✓</div>
          <div className="complete-text">All Devices Loaded</div>
          <div className="device-count">{devices.length} devices connected</div>
        </div>
      )}
    </div>
  );
};

export default DeviceLoader;