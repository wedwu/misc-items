// Handshake Storage Utilities

import { HandshakeRecord, HandshakeStats } from '../types/handshake';

const STORAGE_KEY = 'websocket-handshake-history';
const TOKEN_KEY = 'handshake-token';
const MAX_HISTORY_SIZE = 50;

/**
 * Generate a unique ID for handshake records
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Get all handshake records from localStorage
 */
export const getHandshakeHistory = (): HandshakeRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading handshake history:', error);
    return [];
  }
};

/**
 * Add a new handshake record to localStorage
 */
export const addHandshakeRecord = (data: any): HandshakeRecord => {
  const record: HandshakeRecord = {
    id: generateId(),
    timestamp: Date.now(),
    data: data,
    token: data.token,
    system: data.system,
    archive: data.archive
  };
  
  try {
    const history = getHandshakeHistory();
    
    // Add new record at the beginning and keep only MAX_HISTORY_SIZE records
    const updatedHistory = [record, ...history].slice(0, MAX_HISTORY_SIZE);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    
    // Also store the latest token separately for easy access
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    
    return record;
  } catch (error) {
    console.error('Error adding handshake record:', error);
    throw error;
  }
};

/**
 * Get the most recent handshake record
 */
export const getLatestHandshake = (): HandshakeRecord | null => {
  const history = getHandshakeHistory();
  return history.length > 0 ? history[0] : null;
};

/**
 * Get the latest stored token
 */
export const getLatestToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Delete a specific handshake record by ID
 */
export const deleteHandshakeRecord = (id: string): boolean => {
  try {
    const history = getHandshakeHistory();
    const updatedHistory = history.filter(record => record.id !== id);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    return true;
  } catch (error) {
    console.error('Error deleting handshake record:', error);
    return false;
  }
};

/**
 * Clear all handshake history
 */
export const clearHandshakeHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error clearing handshake history:', error);
    throw error;
  }
};

/**
 * Get statistics about stored handshakes
 */
export const getHandshakeStats = (): HandshakeStats => {
  const history = getHandshakeHistory();
  
  return {
    total: history.length,
    withTokens: history.filter(h => h.token).length,
    withArchive: history.filter(h => h.archive && h.archive.length > 0).length
  };
};

/**
 * Export all handshakes as JSON string
 */
export const exportHandshakes = (): string => {
  const history = getHandshakeHistory();
  return JSON.stringify(history, null, 2);
};

/**
 * Import handshakes from JSON string
 */
export const importHandshakes = (jsonString: string): boolean => {
  try {
    const imported = JSON.parse(jsonString);
    
    if (!Array.isArray(imported)) {
      throw new Error('Invalid format: expected array');
    }
    
    // Validate that each record has required fields
    const valid = imported.every(record => 
      record.id && 
      record.timestamp && 
      record.data
    );
    
    if (!valid) {
      throw new Error('Invalid format: missing required fields');
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    return true;
  } catch (error) {
    console.error('Error importing handshakes:', error);
    return false;
  }
};

/**
 * Download handshakes as a JSON file
 */
export const downloadHandshakes = (filename: string = 'handshakes.json'): void => {
  const json = exportHandshakes();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};
