const API_KEY_STORAGE_KEY = 'gemini_user_api_key';

/**
 * Retrieve user-provided Gemini API Key from localStorage
 */
export function getStoredApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch (err) {
    console.error('Failed to read API key from localStorage:', err);
    return '';
  }
}

/**
 * Save user-provided Gemini API Key into localStorage
 */
export function saveStoredApiKey(apiKey: string): void {
  try {
    const trimmed = (apiKey || '').trim();
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to save API key to localStorage:', err);
  }
}

/**
 * Remove stored API Key from localStorage
 */
export function clearStoredApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear API key from localStorage:', err);
  }
}

/**
 * Check if a custom user API Key is present in localStorage
 */
export function hasStoredApiKey(): boolean {
  return !!getStoredApiKey();
}

/**
 * Construct request headers with the stored Gemini API key
 */
export function getApiAuthHeaders(): Record<string, string> {
  const key = getStoredApiKey();
  if (key) {
    return { 'x-gemini-api-key': key };
  }
  return {};
}
