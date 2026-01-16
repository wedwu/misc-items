import React, { useState, useEffect } from 'react';
import { HandshakeRecord, HandshakeStats } from '../types/handshake';
import {
  getHandshakeHistory,
  getHandshakeStats,
  deleteHandshakeRecord,
  clearHandshakeHistory,
  downloadHandshakes
} from '../utils/handshakeStorage';

const HandshakeHistory: React.FC = () => {
  const [history, setHistory] = useState<HandshakeRecord[]>([]);
  const [stats, setStats] = useState<HandshakeStats>({ total: 0, withTokens: 0, withArchive: 0 });
  const [selectedHandshake, setSelectedHandshake] = useState<HandshakeRecord | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Load history and stats
  const loadHistory = () => {
    const loadedHistory = getHandshakeHistory();
    const loadedStats = getHandshakeStats();
    setHistory(loadedHistory);
    setStats(loadedStats);
  };

  // Auto-refresh every 2 seconds
  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 2000);
    return () => clearInterval(interval);
  }, []);

  // Format relative time
  const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return `${seconds}s ago`;
  };

  // Format full timestamp
  const formatFullTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  // Handle view details
  const handleViewDetails = (handshake: HandshakeRecord) => {
    setSelectedHandshake(handshake);
    setShowDetail(true);
  };

  // Handle copy to clipboard
  const handleCopy = (handshake: HandshakeRecord) => {
    navigator.clipboard.writeText(JSON.stringify(handshake, null, 2));
    alert('Copied to clipboard!');
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this handshake?')) {
      deleteHandshakeRecord(id);
      loadHistory();
      if (selectedHandshake?.id === id) {
        setShowDetail(false);
        setSelectedHandshake(null);
      }
    }
  };

  // Handle clear all
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all handshakes? This cannot be undone.')) {
      clearHandshakeHistory();
      loadHistory();
      setShowDetail(false);
      setSelectedHandshake(null);
    }
  };

  // Handle export
  const handleExport = () => {
    downloadHandshakes(`handshakes-${Date.now()}.json`);
  };

  return (
    <div className="handshake-history">
      <style>{`
        .handshake-history {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          margin-bottom: 30px;
        }

        .header h1 {
          margin: 0 0 10px 0;
          font-size: 28px;
          color: var(--text-primary, #1a1a1a);
        }

        .header p {
          margin: 0;
          color: var(--text-secondary, #666);
        }

        /* Statistics Dashboard */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: var(--card-bg, #fff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .stat-label {
          font-size: 14px;
          color: var(--text-secondary, #666);
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: bold;
          color: var(--text-primary, #1a1a1a);
        }

        /* Actions Bar */
        .actions-bar {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        /* History List */
        .history-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .history-item {
          background: var(--card-bg, #fff);
          border: 1px solid var(--border-color, #e0e0e0);
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .history-item:hover {
          border-color: #007bff;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
        }

        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .item-time {
          font-size: 12px;
          color: var(--text-secondary, #666);
        }

        .badges {
          display: flex;
          gap: 6px;
        }

        .badge {
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .badge-token {
          background: #e3f2fd;
          color: #1976d2;
        }

        .badge-archive {
          background: #f3e5f5;
          color: #7b1fa2;
        }

        .item-token {
          font-family: monospace;
          font-size: 12px;
          color: var(--text-secondary, #666);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Detail Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: var(--card-bg, #fff);
          border-radius: 12px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color, #e0e0e0);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          color: var(--text-primary, #1a1a1a);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary, #666);
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          color: var(--text-primary, #1a1a1a);
        }

        .modal-body {
          padding: 20px;
        }

        .detail-section {
          margin-bottom: 20px;
        }

        .detail-section h3 {
          margin: 0 0 10px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary, #666);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-value {
          padding: 12px;
          background: var(--code-bg, #f5f5f5);
          border-radius: 6px;
          font-family: monospace;
          font-size: 13px;
          color: var(--text-primary, #1a1a1a);
          word-break: break-all;
        }

        .detail-json {
          padding: 12px;
          background: var(--code-bg, #f5f5f5);
          border-radius: 6px;
          font-family: monospace;
          font-size: 12px;
          color: var(--text-primary, #1a1a1a);
          overflow-x: auto;
          max-height: 300px;
          overflow-y: auto;
        }

        .detail-json pre {
          margin: 0;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid var(--border-color, #e0e0e0);
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: var(--text-secondary, #666);
        }

        .empty-state-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .empty-state-text {
          font-size: 16px;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .handshake-history {
            --text-primary: #ffffff;
            --text-secondary: #a0a0a0;
            --card-bg: #1e1e1e;
            --border-color: #404040;
            --code-bg: #2d2d2d;
          }

          .badge-token {
            background: #1e3a5f;
            color: #64b5f6;
          }

          .badge-archive {
            background: #3a1e48;
            color: #ba68c8;
          }
        }
      `}</style>

      <div className="header">
        <h1>🤝 Handshake History</h1>
        <p>Complete WebSocket handshake tracking and management</p>
      </div>

      {/* Statistics Dashboard */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total Handshakes</div>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">With Tokens</div>
          <div className="stat-value">{stats.withTokens}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">With Archive</div>
          <div className="stat-value">{stats.withArchive}</div>
        </div>
      </div>

      {/* Actions Bar */}
      {history.length > 0 && (
        <div className="actions-bar">
          <button className="btn btn-primary" onClick={handleExport}>
            📥 Export All
          </button>
          <button className="btn btn-danger" onClick={handleClearAll}>
            🗑️ Clear All
          </button>
        </div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <div className="empty-state-text">
            No handshakes recorded yet. Connect to WebSocket to see handshakes appear here.
          </div>
        </div>
      ) : (
        <div className="history-list">
          {history.map((handshake) => (
            <div
              key={handshake.id}
              className="history-item"
              onClick={() => handleViewDetails(handshake)}
            >
              <div className="item-header">
                <span className="item-time">
                  {formatRelativeTime(handshake.timestamp)}
                </span>
                <div className="badges">
                  {handshake.token && (
                    <span className="badge badge-token">TOKEN</span>
                  )}
                  {handshake.archive && handshake.archive.length > 0 && (
                    <span className="badge badge-archive">ARCHIVE</span>
                  )}
                </div>
              </div>
              {handshake.token && (
                <div className="item-token">
                  Token: {handshake.token.substring(0, 40)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && selectedHandshake && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Handshake Details</h2>
              <button className="close-btn" onClick={() => setShowDetail(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <h3>Timestamp</h3>
                <div className="detail-value">
                  {formatFullTimestamp(selectedHandshake.timestamp)}
                </div>
              </div>

              {selectedHandshake.token && (
                <div className="detail-section">
                  <h3>Token</h3>
                  <div className="detail-value">{selectedHandshake.token}</div>
                </div>
              )}

              {selectedHandshake.system && (
                <div className="detail-section">
                  <h3>System Information</h3>
                  <div className="detail-json">
                    <pre>{JSON.stringify(selectedHandshake.system, null, 2)}</pre>
                  </div>
                </div>
              )}

              {selectedHandshake.archive && selectedHandshake.archive.length > 0 && (
                <div className="detail-section">
                  <h3>Archive</h3>
                  <div className="detail-value">
                    [{selectedHandshake.archive.join(', ')}]
                  </div>
                </div>
              )}

              <div className="detail-section">
                <h3>Full Data (JSON)</h3>
                <div className="detail-json">
                  <pre>{JSON.stringify(selectedHandshake.data, null, 2)}</pre>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-primary"
                onClick={() => handleCopy(selectedHandshake)}
              >
                📋 Copy
              </button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(selectedHandshake.id)}
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandshakeHistory;
