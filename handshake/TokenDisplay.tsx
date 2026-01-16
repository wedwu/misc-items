import React, { useState, useEffect } from 'react';
import { getLatestHandshake, getLatestToken } from '../utils/handshakeStorage';

/**
 * Example 1: Use Latest Token for API Calls
 * This component demonstrates how to retrieve and use the stored token
 */
const TokenDisplay: React.FC = () => {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);

  useEffect(() => {
    // Load token on mount
    const loadToken = () => {
      const latestToken = getLatestToken();
      setToken(latestToken);
    };

    loadToken();

    // Refresh token every 2 seconds
    const interval = setInterval(loadToken, 2000);
    return () => clearInterval(interval);
  }, []);

  // Example API call using the stored token
  const makeAuthenticatedRequest = async () => {
    const handshake = getLatestHandshake();
    
    if (!handshake?.token) {
      alert('No token available. Please connect to WebSocket first.');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/data', {
        headers: {
          'Authorization': `Bearer ${handshake.token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      setApiResponse(data);
    } catch (error) {
      console.error('API call failed:', error);
      setApiResponse({ error: 'Failed to fetch data' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      marginBottom: '20px'
    }}>
      <h3>🔐 Token Display</h3>
      
      {token ? (
        <div>
          <p style={{ fontSize: '12px', color: '#666' }}>Current Token:</p>
          <div style={{
            padding: '10px',
            background: '#f5f5f5',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '11px',
            wordBreak: 'break-all',
            marginBottom: '10px'
          }}>
            {token}
          </div>
          
          <button
            onClick={makeAuthenticatedRequest}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            {isLoading ? 'Loading...' : 'Make API Call'}
          </button>

          {apiResponse && (
            <div style={{
              marginTop: '10px',
              padding: '10px',
              background: '#f5f5f5',
              borderRadius: '4px'
            }}>
              <p style={{ fontSize: '12px', color: '#666', margin: '0 0 5px 0' }}>
                API Response:
              </p>
              <pre style={{ margin: 0, fontSize: '11px' }}>
                {JSON.stringify(apiResponse, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: '#666'
        }}>
          No token available. Connect to WebSocket to receive a token.
        </div>
      )}
    </div>
  );
};

export default TokenDisplay;
