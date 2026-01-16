# Handshake History - Complete Guide

## Overview

The Handshake History feature automatically captures, stores, and displays all WebSocket handshake data in a beautiful UI with full dark mode support.

## What is a Handshake?

When a WebSocket connection is established, the server typically sends a "handshake" message containing:
- **Token**: Authentication or session token
- **System Info**: Server configuration or metadata
- **Archive**: Historical data or cached information

This feature captures all of these automatically!

## Features

### 📊 Statistics Dashboard
- **Total Handshakes**: Count of all recorded handshakes
- **With Tokens**: How many include authentication tokens
- **With Archive**: How many include archive data

### 📜 History List
- **Chronological order**: Newest first
- **Quick preview**: See timestamps and tokens at a glance
- **Visual badges**: TOKEN and ARCHIVE indicators
- **Relative timestamps**: "2m ago", "1h ago", "3d ago"

### 🔍 Detail View
Click any handshake to see:
- Full timestamp
- Complete token value
- System information (JSON formatted)
- Archive array (if present)
- Complete raw JSON data

### 🛠️ Management Tools
- **📋 Copy**: Copy handshake data to clipboard
- **🗑️ Delete**: Remove specific handshake
- **🗑️ Clear All**: Remove all handshakes
- **📥 Export**: Download all handshakes as JSON file

### 🌙 Dark Mode Support
All components fully support light and dark themes!

## How It Works

### 1. Automatic Capture

When a WebSocket handshake occurs:

```typescript
// In WebSocketManager.ts
private handleHandshake(data: any): void {
  // Automatically stores in localStorage
  addHandshakeRecord(data);
  
  // Also stores latest token separately
  if (data.token) {
    localStorage.setItem('handshake-token', data.token);
  }
}
```

### 2. localStorage Structure

Data is stored as an array in localStorage:

```json
{
  "websocket-handshake-history": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "timestamp": 1705516800000,
      "data": { /* full handshake data */ },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "system": { "id": "server-1", "version": "1.0.0" },
      "archive": [1, 2, 3, 4, 5]
    },
    // ... more records
  ]
}
```

### 3. UI Updates

The component refreshes every 2 seconds to show new handshakes:

```typescript
useEffect(() => {
  loadHistory();
  const interval = setInterval(loadHistory, 2000);
  return () => clearInterval(interval);
}, []);
```

## Storage Utilities

### Add Handshake
```typescript
import { addHandshakeRecord } from '../utils/handshakeStorage';

addHandshakeRecord({
  token: 'abc123',
  system: { id: 'server-1' },
  archive: [1, 2, 3]
});
```

### Get All Handshakes
```typescript
import { getHandshakeHistory } from '../utils/handshakeStorage';

const history = getHandshakeHistory();
console.log(`Found ${history.length} handshakes`);
```

### Get Latest Handshake
```typescript
import { getLatestHandshake } from '../utils/handshakeStorage';

const latest = getLatestHandshake();
if (latest) {
  console.log('Latest token:', latest.token);
}
```

### Clear History
```typescript
import { clearHandshakeHistory } from '../utils/handshakeStorage';

clearHandshakeHistory();
```

### Delete Specific Record
```typescript
import { deleteHandshakeRecord } from '../utils/handshakeStorage';

deleteHandshakeRecord('record-id-here');
```

### Get Statistics
```typescript
import { getHandshakeStats } from '../utils/handshakeStorage';

const stats = getHandshakeStats();
console.log(`Total: ${stats.total}`);
console.log(`With tokens: ${stats.withTokens}`);
console.log(`With archive: ${stats.withArchive}`);
```

### Export/Import
```typescript
import { exportHandshakes, importHandshakes } from '../utils/handshakeStorage';

// Export
const json = exportHandshakes();
// Save to file...

// Import
const success = importHandshakes(jsonString);
if (success) {
  console.log('Import successful!');
}
```

## Usage Examples

### Example 1: Use Latest Token for API Calls

```typescript
import { getLatestHandshake } from '../utils/handshakeStorage';

const makeAuthenticatedRequest = async () => {
  const handshake = getLatestHandshake();
  
  if (!handshake?.token) {
    console.error('No token available');
    return;
  }
  
  const response = await fetch('/api/data', {
    headers: {
      'Authorization': `Bearer ${handshake.token}`
    }
  });
  
  return response.json();
};
```

### Example 2: Display Token in UI

```typescript
import { getLatestHandshake } from '../utils/handshakeStorage';

function TokenDisplay() {
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const handshake = getLatestHandshake();
    setToken(handshake?.token || null);
  }, []);
  
  return (
    <div>
      {token ? (
        <div>Current Token: {token}</div>
      ) : (
        <div>No token available</div>
      )}
    </div>
  );
}
```

### Example 3: Monitor Archive Changes

```typescript
import { getHandshakeHistory } from '../utils/handshakeStorage';

function ArchiveMonitor() {
  const [archives, setArchives] = useState<number[][]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const history = getHandshakeHistory();
      const newArchives = history
        .filter(h => h.archive && h.archive.length > 0)
        .map(h => h.archive!);
      
      setArchives(newArchives);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div>
      {archives.map((archive, idx) => (
        <div key={idx}>
          Archive {idx}: {archive.join(', ')}
        </div>
      ))}
    </div>
  );
}
```

### Example 4: Custom Handshake Processor

```typescript
import { getHandshakeHistory } from '../utils/handshakeStorage';

// Process handshakes to extract specific data
const processHandshakes = () => {
  const history = getHandshakeHistory();
  
  return history.map(h => ({
    timestamp: new Date(h.timestamp),
    hasToken: !!h.token,
    systemVersion: h.system?.version || 'unknown',
    archiveSize: h.archive?.length || 0,
    raw: h.data
  }));
};

// Use processed data
const processed = processHandshakes();
console.table(processed);
```

## Data Persistence

### Storage Limits
- **Maximum records**: 50 (automatically prunes oldest)
- **Storage location**: localStorage (browser-specific)
- **Persistence**: Until browser cache is cleared
- **Size**: Varies by handshake content (typically < 1MB total)

### Automatic Pruning
When the 51st handshake is added:
```typescript
// Keeps only the 50 most recent
const updatedHistory = [newRecord, ...history].slice(0, 50);
```

### Cross-Tab Synchronization
⚠️ Changes in one tab won't automatically reflect in another tab unless you:
1. Reload the page
2. Click between tabs (triggers refresh)
3. Wait for the 2-second auto-refresh

## Best Practices

### ✅ DO

1. **Use for debugging**
   ```typescript
   // Check what data the server sent
   const latest = getLatestHandshake();
   console.log('Server response:', latest.data);
   ```

2. **Store important tokens**
   ```typescript
   // Tokens are automatically stored separately
   const token = localStorage.getItem('handshake-token');
   ```

3. **Export before clearing**
   ```typescript
   // Save your data first!
   const backup = exportHandshakes();
   // Then clear
   clearHandshakeHistory();
   ```

4. **Check statistics regularly**
   ```typescript
   const stats = getHandshakeStats();
   if (stats.total > 40) {
     console.warn('Getting close to limit');
   }
   ```

### ❌ DON'T

1. **Don't store sensitive data manually**
   - Use the automatic capture feature
   - It already handles everything properly

2. **Don't exceed storage limits**
   - The system auto-prunes at 50 records
   - But be aware of overall localStorage limits

3. **Don't rely on cross-tab sync**
   - Refresh or wait for auto-refresh
   - Or implement custom storage events

4. **Don't modify localStorage directly**
   - Always use the utility functions
   - They handle validation and structure

## Troubleshooting

### Handshakes Not Appearing

**Problem**: Connected but no handshakes show up

**Solutions**:
1. Check if server is actually sending handshake messages
2. Look in browser console for "Handshake completed:" logs
3. Verify the message has `type: 'handshake'`
4. Check localStorage manually: `localStorage.getItem('websocket-handshake-history')`

### Storage Quota Exceeded

**Problem**: "QuotaExceededError" in console

**Solutions**:
1. Clear old handshakes: Click "Clear All"
2. Export and save important data
3. Reduce MAX_HISTORY_SIZE in handshakeStorage.ts
4. Clear other localStorage data from your domain

### UI Not Updating

**Problem**: New handshakes don't appear immediately

**Solutions**:
1. Wait for the 2-second auto-refresh
2. Click away and back to the tab
3. Check browser console for errors
4. Reload the page

### Missing Fields

**Problem**: Token or archive not showing

**Solutions**:
1. Verify server is actually sending those fields
2. Check the "Full Data (JSON)" section in detail view
3. Look at raw handshake data in console
4. Server might not be including those fields

## Security Considerations

### Tokens in localStorage
⚠️ **Security Warning**: Storing tokens in localStorage makes them accessible to:
- JavaScript running on the same domain
- XSS (Cross-Site Scripting) attacks
- Browser extensions

**Best Practices**:
1. Only store tokens if necessary for your use case
2. Use short-lived tokens
3. Clear tokens when logging out
4. Consider using httpOnly cookies for production

### Data Privacy
- Handshake data persists in browser until cleared
- Visible to anyone with physical access to the device
- Not encrypted in localStorage
- Consider implementing encryption for sensitive data

## Advanced Features

### Custom Storage Backend

Replace localStorage with your own backend:

```typescript
// Create custom storage adapter
export const addHandshakeRecord = async (data: any) => {
  // Send to your API instead
  await fetch('/api/handshakes', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const getHandshakeHistory = async () => {
  const response = await fetch('/api/handshakes');
  return response.json();
};
```

### Real-time Notifications

Show toast when new handshake received:

```typescript
// In HandshakeHistory component
useEffect(() => {
  const prevCount = history.length;
  
  return () => {
    const newCount = getHandshakeHistory().length;
    if (newCount > prevCount) {
      alert('New handshake received!');
      // Or use a toast library
    }
  };
}, [history.length]);
```

### Filtering and Search

Add search functionality:

```typescript
const [searchTerm, setSearchTerm] = useState('');

const filteredHistory = history.filter(h =>
  h.token?.includes(searchTerm) ||
  JSON.stringify(h.system).includes(searchTerm)
);
```

## Summary

The Handshake History feature provides:
- ✅ **Automatic capture** of all WebSocket handshakes
- ✅ **Persistent storage** in localStorage
- ✅ **Beautiful UI** with dark mode support
- ✅ **Management tools** (export, delete, clear)
- ✅ **Statistics dashboard** for quick overview
- ✅ **Detail view** for in-depth inspection
- ✅ **Type-safe utilities** for programmatic access

Perfect for debugging, monitoring, and understanding your WebSocket connections! 🤝✨