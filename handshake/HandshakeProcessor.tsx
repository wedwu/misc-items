import React, { useState, useEffect } from 'react';
import { getHandshakeHistory } from '../utils/handshakeStorage';

interface ProcessedHandshake {
  timestamp: Date;
  hasToken: boolean;
  systemVersion: string;
  archiveSize: number;
}

/**
 * Example 3: Custom Handshake Processor
 * This component demonstrates how to process and analyze handshake data
 */
const HandshakeProcessor: React.FC = () => {
  const [processed, setProcessed] = useState<ProcessedHandshake[]>([]);
  const [filter, setFilter] = useState<'all' | 'with-token' | 'with-archive'>('all');

  useEffect(() => {
    const processHandshakes = () => {
      const history = getHandshakeHistory();
      
      const processedData = history.map(h => ({
        timestamp: new Date(h.timestamp),
        hasToken: !!h.token,
        systemVersion: h.system?.version || 'unknown',
        archiveSize: h.archive?.length || 0
      }));
      
      setProcessed(processedData);
    };

    processHandshakes();

    // Refresh every 2 seconds
    const interval = setInterval(processHandshakes, 2000);
    return () => clearInterval(interval);
  }, []);

  const filteredData = processed.filter(h => {
    if (filter === 'with-token') return h.hasToken;
    if (filter === 'with-archive') return h.archiveSize > 0;
    return true;
  });

  const stats = {
    total: processed.length,
    withToken: processed.filter(h => h.hasToken).length,
    withArchive: processed.filter(h => h.archiveSize > 0).length,
    avgArchiveSize: processed.reduce((sum, h) => sum + h.archiveSize, 0) / processed.length || 0
  };

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>⚙️ Handshake Processor</h3>
      
      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px',
        marginBottom: '15px',
        padding: '15px',
        background: '#f9f9f9',
        borderRadius: '6px'
      }}>
        <div>
          <div style={{ fontSize: '11px', color: '#666' }}>Total Processed</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.total}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#666' }}>With Tokens</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.withToken}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#666' }}>With Archives</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{stats.withArchive}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: '#666' }}>Avg Archive Size</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
            {stats.avgArchiveSize.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            background: filter === 'all' ? '#007bff' : 'white',
            color: filter === 'all' ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          All ({processed.length})
        </button>
        <button
          onClick={() => setFilter('with-token')}
          style={{
            padding: '6px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            background: filter === 'with-token' ? '#007bff' : 'white',
            color: filter === 'with-token' ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          With Token ({stats.withToken})
        </button>
        <button
          onClick={() => setFilter('with-archive')}
          style={{
            padding: '6px 12px',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            background: filter === 'with-archive' ? '#007bff' : 'white',
            color: filter === 'with-archive' ? 'white' : '#333',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          With Archive ({stats.withArchive})
        </button>
      </div>

      {/* Data Table */}
      {filteredData.length === 0 ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666',
          background: '#f9f9f9',
          borderRadius: '4px'
        }}>
          No handshakes match the current filter
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '12px'
          }}>
            <thead>
              <tr style={{ background: '#f9f9f9' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>
                  Timestamp
                </th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '2px solid #e0e0e0' }}>
                  Token
                </th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>
                  System Version
                </th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #e0e0e0' }}>
                  Archive Size
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px' }}>
                    {item.timestamp.toLocaleString()}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    {item.hasToken ? (
                      <span style={{
                        padding: '2px 6px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        borderRadius: '3px',
                        fontSize: '10px',
                        fontWeight: 600
                      }}>
                        ✓
                      </span>
                    ) : (
                      <span style={{ color: '#ccc' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '8px', fontFamily: 'monospace' }}>
                    {item.systemVersion}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                    {item.archiveSize > 0 ? item.archiveSize : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HandshakeProcessor;
