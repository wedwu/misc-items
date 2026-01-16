// Handshake Types

export interface HandshakeRecord {
  id: string;
  timestamp: number;
  data: any;
  token?: string;
  system?: {
    id?: string;
    version?: string;
    [key: string]: any;
  };
  archive?: number[];
}

export interface HandshakeStats {
  total: number;
  withTokens: number;
  withArchive: number;
}
