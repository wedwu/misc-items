# WebSocket Handshake History Manager

A complete React + TypeScript solution for tracking, storing, and analyzing WebSocket handshake data with persistent localStorage storage.

## 🎯 Features

- **Automatic Handshake Capture**: Captures all WebSocket handshakes automatically
- **Persistent Storage**: Stores up to 50 handshakes in browser localStorage
- **Beautiful UI**: Dark mode support and responsive design
- **Statistics Dashboard**: Real-time stats on tokens and archives
- **Management Tools**: Export, delete, clear all functionality
- **Usage Examples**: Token display, archive monitoring, data processing
- **Type-Safe**: Full TypeScript support

## 📦 Installation

### Using npm/yarn

```bash
# Clone the repository
git clone <your-repo-url>
cd handshake-history

# Install dependencies
npm install
# or
yarn install

# Start development server
npm run dev
# or
yarn dev
```

## 📁 Project Structure

```
├── App.tsx                          # Main application component
├── components/
│   └── HandshakeHistory.tsx         # Main handshake history UI
├── examples/
│   ├── TokenDisplay.tsx             # Example: Display and use tokens
│   ├── ArchiveMonitor.tsx           # Example: Monitor archive data
│   └── HandshakeProcessor.tsx       # Example: Process handshake data
├── services/
│   └── WebSocketManager.ts          # WebSocket connection manager
├── utils/
│   └── handshakeStorage.ts          # localStorage utilities
└── types/
    └── handshake.ts                 # TypeScript type definitions
```

## 🚀 Quick Start

### 1. Basic Usage

```typescript
import { addHandshakeRecord, getHandshakeHistory } from './utils/handshakeStorage';

// Automatically store a handshake
const handshakeData = {
  token: 'your-token',
  system: { id: 'server-1', version: '1.0.0' },
  archive: [1, 2, 3, 4, 5]
};

addHandshakeRecord(handshakeData);

// Retrieve all handshakes
const history = getHandshakeHistory();
console.log(`Total handshakes: ${history.length}`);
```

### 2. WebSocket Integration

```typescript
import WebSocketManager from './services/WebSocketManager';

const wsManager = new WebSocketManager('ws://your-server.com');
wsManager.connect();

// Handshakes are automatically captured and stored
// when the server sends messages with type: 'handshake'
```

### 3. Using Stored Tokens

```typescript
import { getLatestHandshake, getLatestToken } from './utils/handshakeStorage';

// Get the latest token
const token = getLatestToken();

// Make authenticated API calls
const response = await fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 🎨 Components

### HandshakeHistory

Main component displaying all handshake data with full management capabilities.

```typescript
import HandshakeHistory from './components/HandshakeHistory';

function App() {
  return <HandshakeHistory />;
}
```

### TokenDisplay

Example component showing how to display and use stored tokens.

```typescript
import TokenDisplay from './examples/TokenDisplay';

function App() {
  return <TokenDisplay />;
}
```

### ArchiveMonitor

Example component for monitoring archive data from handshakes.

```typescript
import ArchiveMonitor from './examples/ArchiveMonitor';

function App() {
  return <ArchiveMonitor />;
}
```

### HandshakeProcessor

Example component demonstrating custom data processing and analysis.

```typescript
import HandshakeProcessor from './examples/HandshakeProcessor';

function App() {
  return <HandshakeProcessor />;
}
```

## 🔧 API Reference

### Storage Utilities

#### `addHandshakeRecord(data: any): HandshakeRecord`
Stores a new handshake record in localStorage.

```typescript
const record = addHandshakeRecord({
  token: 'abc123',
  system: { id: 'server-1' },
  archive: [1, 2, 3]
});
```

#### `getHandshakeHistory(): HandshakeRecord[]`
Retrieves all stored handshake records.

```typescript
const history = getHandshakeHistory();
```

#### `getLatestHandshake(): HandshakeRecord | null`
Gets the most recent handshake record.

```typescript
const latest = getLatestHandshake();
if (latest) {
  console.log('Latest token:', latest.token);
}
```

#### `getLatestToken(): string | null`
Gets the most recently stored token.

```typescript
const token = getLatestToken();
```

#### `deleteHandshakeRecord(id: string): boolean`
Deletes a specific handshake record by ID.

```typescript
deleteHandshakeRecord('record-id');
```

#### `clearHandshakeHistory(): void`
Clears all stored handshake records.

```typescript
clearHandshakeHistory();
```

#### `getHandshakeStats(): HandshakeStats`
Returns statistics about stored handshakes.

```typescript
const stats = getHandshakeStats();
console.log(`Total: ${stats.total}`);
console.log(`With tokens: ${stats.withTokens}`);
console.log(`With archive: ${stats.withArchive}`);
```

#### `exportHandshakes(): string`
Exports all handshakes as a JSON string.

```typescript
const json = exportHandshakes();
```

#### `importHandshakes(jsonString: string): boolean`
Imports handshakes from a JSON string.

```typescript
const success = importHandshakes(jsonData);
```

#### `downloadHandshakes(filename?: string): void`
Downloads handshakes as a JSON file.

```typescript
downloadHandshakes('my-handshakes.json');
```

## 🎯 Usage Patterns

### Pattern 1: Token Management

```typescript
// Store token automatically when handshake occurs
// (handled by WebSocketManager)

// Retrieve and use in API calls
const makeRequest = async () => {
  const handshake = getLatestHandshake();
  
  if (!handshake?.token) {
    throw new Error('No token available');
  }
  
  return fetch('/api/endpoint', {
    headers: { 'Authorization': `Bearer ${handshake.token}` }
  });
};
```

### Pattern 2: Archive Monitoring

```typescript
// Monitor archive changes
const monitorArchives = () => {
  const history = getHandshakeHistory();
  
  const archives = history
    .filter(h => h.archive && h.archive.length > 0)
    .map(h => ({
      timestamp: h.timestamp,
      data: h.archive!
    }));
  
  return archives;
};
```

### Pattern 3: Data Processing

```typescript
// Process handshakes for analysis
const analyzeHandshakes = () => {
  const history = getHandshakeHistory();
  
  return {
    total: history.length,
    tokenRate: history.filter(h => h.token).length / history.length,
    avgArchiveSize: history.reduce((sum, h) => 
      sum + (h.archive?.length || 0), 0) / history.length
  };
};
```

## 🔒 Security Considerations

⚠️ **Important**: Tokens stored in localStorage are accessible to JavaScript and vulnerable to XSS attacks.

**Best Practices**:
- Only store tokens if necessary for your use case
- Use short-lived tokens
- Clear tokens on logout
- Consider using httpOnly cookies for production
- Implement proper XSS protection

## ⚙️ Configuration

### Storage Limits

Edit `MAX_HISTORY_SIZE` in `handshakeStorage.ts`:

```typescript
const MAX_HISTORY_SIZE = 50; // Default: 50 records
```

### Auto-Refresh Interval

Edit the interval in `HandshakeHistory.tsx`:

```typescript
const interval = setInterval(loadHistory, 2000); // Default: 2 seconds
```

## 🎨 Styling

The components use inline styles with CSS custom properties for dark mode support:

```css
--text-primary: Main text color
--text-secondary: Secondary text color
--card-bg: Card background color
--border-color: Border color
--code-bg: Code block background
```

## 🧪 Testing

To test the handshake capture without a WebSocket server:

```typescript
// Click "Simulate Handshake" button in the UI
// or call directly:
import { addHandshakeRecord } from './utils/handshakeStorage';

addHandshakeRecord({
  token: 'test-token',
  system: { id: 'test-server' },
  archive: [1, 2, 3]
});
```

## 📊 Data Format

### HandshakeRecord

```typescript
interface HandshakeRecord {
  id: string;              // Unique identifier
  timestamp: number;       // Unix timestamp
  data: any;               // Complete handshake data
  token?: string;          // Auth token (if present)
  system?: {               // System info (if present)
    id?: string;
    version?: string;
    [key: string]: any;
  };
  archive?: number[];      // Archive data (if present)
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this in your projects!

## 🐛 Troubleshooting

### Handshakes not appearing?
1. Check browser console for errors
2. Verify WebSocket is actually connected
3. Ensure server sends messages with `type: 'handshake'`
4. Check localStorage: `localStorage.getItem('websocket-handshake-history')`

### Storage quota exceeded?
1. Click "Clear All" to remove old handshakes
2. Export important data first
3. Reduce `MAX_HISTORY_SIZE`

### UI not updating?
1. Wait for 2-second auto-refresh
2. Check for JavaScript errors
3. Reload the page

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

Made with ❤️ using React + TypeScript
