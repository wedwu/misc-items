// websocket.ts
import { Preamble } from './types';
import { getClientId } from './client';

export const sockets = {
  config: 'wss://message.apex6-aot-d04.wdw.disney.com/api/apex/v1/',
  protocol: '#message'
};

function CreatePreamble(): Preamble {
  const preamble: Preamble = {
    flags: "Default",
    system: {
      id: getClientId(),
    }
    // TODO: Implement auth here when required
    // auth: {
    //   token: "your-token-here"
    // }
  };
  return preamble;
}

// Usage
const preamble = CreatePreamble();
const newSocket = new WebSocket(sockets.config, sockets.protocol);

// You'll likely want to send the preamble after connection opens
newSocket.addEventListener('open', () => {
  newSocket.send(JSON.stringify(preamble));
});