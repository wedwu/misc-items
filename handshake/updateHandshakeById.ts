/**
 * Update or replace an existing handshake record by ID
 * If the ID exists, the entire object is replaced with the new data
 * If the ID doesn't exist, optionally add it as a new record
 * 
 * @param id - The ID of the handshake to update
 * @param data - The new handshake data
 * @param addIfNotExists - If true, adds as new record if ID not found (default: false)
 * @returns The updated record if successful, null if not found and addIfNotExists is false
 */
export const updateHandshakeById = (
  id: string, 
  data: any, 
  addIfNotExists: boolean = false
): HandshakeRecord | null => {
  try {
    const history = getHandshakeHistory();
    const existingIndex = history.findIndex(record => record.id === id);
    
    if (existingIndex === -1) {
      // ID not found
      if (addIfNotExists) {
        // Add as new record
        return addHandshakeRecord(data);
      }
      return null;
    }
    
    // Replace the existing record
    const updatedRecord: HandshakeRecord = {
      id: id,
      timestamp: Date.now(), // Update timestamp
      data: data,
      token: data.token,
      system: data.system,
      archive: data.archive
    };
    
    history[existingIndex] = updatedRecord;
    
    // Save back to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
    // Update the latest token if present
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
    }
    
    return updatedRecord;
  } catch (error) {
    console.error('Error updating handshake record:', error);
    return null;
  }
};