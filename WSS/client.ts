// client.ts
import type { UUID } from "crypto";

export function getClientId(): UUID {
  // Initial read
  let clientId = localStorage.getItem("client-id") as UUID | null;
  if (clientId) return clientId;
  
  // Generation attempt
  const newId = crypto.randomUUID();
  localStorage.setItem("client-id", newId);
  
  // Final read
  clientId = localStorage.getItem("client-id") as UUID | null;
  return clientId ?? newId;
}