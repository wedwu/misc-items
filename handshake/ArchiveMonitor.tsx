import React, { useState, useEffect } from 'react';
import { getHandshakeHistory } from '../utils/handshakeStorage';

/**
 * Example 2: Archive Monitor
 * This component demonstrates how to monitor and display archive data from handshakes
 */
const ArchiveMonitor: React.FC = () => {
  const [archives, setArchives] = useState<Array<{ timestamp: number; data: number[] }>>([]);

  useEffect(() => {
    const loadArchives = () => {
      const history = getHandshakeHistory();
      
      // Extract archives with their timestamps
      const archiveData = history
        .filter(h => h.archive && h.archive.length > 0)
        .map(h => ({
          timestamp: h.timestamp,
          data: h.archive!
        }));
      
      setArchives(archiveData);
    };

    loadArchives();

    // Refresh every 2 seconds
    const interval = setInterval(loadArchives, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getArchiveStats = (data: number[]) => {
    return {
      count: data.length,
      min: Math.min(...data),
      max: Math.max(...data),
      avg: (data.reduce((a, b) => a + b, 0) / data.length).toFixed(2)
    };
  };

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>📊 Archive Monitor</h3>
      <p style={{ fontSize: '14px', color: '#666', margin: '0 0 15px 0' }}>
        Tracking {archives.length} archive{archives.length !== 1 ? 's' : ''} from handshakes
      </p>
      
      {archives.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          background: '#f9f9f9',
          borderRadius: '4px'
        }}>
          No archives recorded yet. Waiting for handshakes with archive data...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {archives.map((archive, idx) => {
            const stats = getArchiveStats(archive.data);
            
            return (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: '#f9f9f9',
                  borderRadius: '6px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>
                    Archive #{archives.length - idx}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666' }}>
                    {formatTime(archive.timestamp)}
                  </span>
                </div>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  marginBottom: '8px'
                }}>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ color: '#666' }}>Count</div>
                    <div style={{ fontWeight: 600 }}>{stats.count}</div>
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ color: '#666' }}>Min</div>
                    <div style={{ fontWeight: 600 }}>{stats.min}</div>
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ color: '#666' }}>Max</div>
                    <div style={{ fontWeight: 600 }}>{stats.max}</div>
                  </div>
                  <div style={{ fontSize: '11px' }}>
                    <div style={{ color: '#666' }}>Avg</div>
                    <div style={{ fontWeight: 600 }}>{stats.avg}</div>
                  </div>
                </div>
                
                <div style={{
                  padding: '8px',
                  background: 'white',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  maxHeight: '60px',
                  overflow: 'auto'
                }}>
                  [{archive.data.join(', ')}]
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ArchiveMonitor;
