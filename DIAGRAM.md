# diagram

┌───────────────────────────────────────────────────────────────────────────────┐
│                               RAW DEVICE GRAPH                                │
│                                                                               │
│   plc-* → message-server → kafka → config-server → cribl → dgn → clients      │
│                     ↘───────────────────────────────────────────────↗         │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                       STEP 1 — FIND ROOTS (Column 0)                          │
│                                                                               │
│   Roots = devices with NO incoming links                                      │
│                                                                               │
│   Column 0:  plc-1-c, plc-1-m, plc-2-c, plc-2-m, gpc, stamp                   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│               STEP 2 — BUILD GRAPH & DETECT SCCs (Cycles)                     │
│                          Strongly Connected Components                        │
│                                                                               │
│   Cycles found:                                                               │
│       • config-server ↔ kafka   →  SCC A                                      │
│       • cribl → dgn (dgn terminal) →  SCC B & SCC C (not grouped together)    │
│                                                                               │
│   Collapsed representation (SCC DAG Nodes):                                   │
│                                                                               │
│       [PLC-root SCCs] → [MSG-SERVER SCC] → [A: Kafka+Config] → [Cribl] → [DGN]│
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                STEP 3 — CONDENSED DAG (NO CYCLES — READY TO LAYER)            │
│                                                                               │
│ [PLC] ─→ [Message Server] ─→ [Kafka+Config] ─→ [Cribl] ─→ [DGN]               │
│                                                           └─→ [Clients]       │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                      STEP 4 — FORWARD LAYERING (Base Columns)                 │
│                                                                               │
│   Column = 1 + max(column of parents)                                         │
│                                                                               │
│       Column 0:    PLCs                                                       │
│       Column 1:    message-server                                             │
│       Column 2:    kafka, config-server                                       │
│       Column 3:    cribl                                                      │
│       Column 4:    dgn                                                        │
│       Column 5:    clients                                                    │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│             STEP 5 — TERMINAL & CRIBL ADJUSTMENT (INTEGRATED LOGIC)           │
│                                                                               │
│   Terminal SCCs (no outgoing):                                                │
│       → dgn + all clients → LAST COLUMN                                       │
│                                                                               │
│   Cribl’s children are ALL terminal:                                          │
│       → Cribl = parentMaxColumn + 1 = under Kafka/Config                      │
│                                                                               │
│       (NOT placed in penultimate column — follows your intended flow)         │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                         FINAL COLUMN LAYOUT (STRUCTURAL)                      │
│                                                                               │
│   COLUMN 0:   plc-1-c, plc-1-m, plc-2-c, plc-2-m, gpc, stamp                  │
│                                                                               │
│   COLUMN 1:   message-server                                                  │
│                                                                               │
│   COLUMN 2:   kafka, config-server                                            │
│                                                                               │
│   COLUMN 3:   cribl                                                           │
│                                                                               │
│   COLUMN 4:   message-relay (if present), trackmap-server, log-server         │
│                                                                               │
│   COLUMN 5:   dgn, message-client, trackmap-client, config-client,            │
│               system-map-client                                               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘


┌───────────────────────────────────────────────────────────────────────────────┐
│                       COMPLETE END-TO-END VISUAL FLOW                         │
│                                                                               │
│   ┌─────────┐      ┌───────────────┐      ┌──────────────────┐                │
│   │  PLCs   │ ───→ │ Msg-Server(s) │ ───→ │ Kafka+Config-SCC │                │
│   └─────────┘      └───────────────┘      └──────────────────┘                │
│                                               │                               │
│                                               ▼                               │
│                                        ┌───────────┐                          │
│                                        │   Cribl   │                          │
│                                        └───────────┘                          │
│                                               │                               │
│                                               ▼                               │
│                                        ┌───────────┐                          │
│                                        │    DGN    │──────────┐               │
│                                        └───────────┘          │               │
│                                                               ▼               │
│                                                        ┌─────────────┐        │
│                                                        │  Clients    │        │
│                                                        └─────────────┘        │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘



