// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

import { WebSocketProvider } from "./ws/WebSocketProvider";
import { wsRouter } from "./ws/wsRouter";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <WebSocketProvider
    url="ws://localhost:8080"
    protocols={["telemetry-v1", "json"]}
    router={wsRouter}
    clientId="diagram-ui"
    version={1}
  >
    <App />
  </WebSocketProvider>
);
