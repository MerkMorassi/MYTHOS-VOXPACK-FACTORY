/**
 * Utility to export chat history as a JSON file.
 */

export interface ExportMessage {
  role: string;
  content: string;
  timestamp: string;
  moodTag?: string;
}

export function exportHistoryToJson(messages: ExportMessage[]) {
  const dataStr = JSON.stringify(messages, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  
  const exportFileDefaultName = `lila-session-${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  linkElement.remove();
}
