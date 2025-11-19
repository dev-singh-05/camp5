import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
export const STORAGE_KEYS = {
  DISMISSED_NEWS: 'dismissedNews',
  READ_UPDATES: 'readUpdates',
  READ_NEWS: 'readNews',
  NOTIFICATIONS_PAUSED: 'prefs_notifications_paused',
  RATINGS_MSG_ENABLED: 'prefs_ratings_messages',
  DATING_MSG_ENABLED: 'prefs_dating_messages',
  CLUBS_MSG_ENABLED: 'prefs_clubs_messages',
  CAMPUS_NEWS_ENABLED: 'prefs_campus_news',
} as const;

/**
 * Get a string array from AsyncStorage
 */
export async function getStorageArray(key: string): Promise<string[]> {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return [];
  }
}

/**
 * Set a string array in AsyncStorage
 */
export async function setStorageArray(key: string, value: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
  }
}

/**
 * Get a boolean preference from AsyncStorage
 */
export async function getStorageBoolean(key: string, defaultValue: boolean = false): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return defaultValue;
    return value === '1' || value === 'true';
  } catch (error) {
    console.error(`Error reading ${key} from storage:`, error);
    return defaultValue;
  }
}

/**
 * Set a boolean preference in AsyncStorage
 */
export async function setStorageBoolean(key: string, value: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value ? '1' : '0');
  } catch (error) {
    console.error(`Error writing ${key} to storage:`, error);
  }
}

/**
 * Add an item to a stored array (for dismissed/read items)
 */
export async function addToStorageArray(key: string, itemId: string): Promise<void> {
  try {
    const existing = await getStorageArray(key);
    if (!existing.includes(itemId)) {
      await setStorageArray(key, [...existing, itemId]);
    }
  } catch (error) {
    console.error(`Error adding to ${key}:`, error);
  }
}

/**
 * Remove an item from a stored array
 */
export async function removeFromStorageArray(key: string, itemId: string): Promise<void> {
  try {
    const existing = await getStorageArray(key);
    await setStorageArray(key, existing.filter(id => id !== itemId));
  } catch (error) {
    console.error(`Error removing from ${key}:`, error);
  }
}

/**
 * Check if an item exists in a stored array
 */
export async function isInStorageArray(key: string, itemId: string): Promise<boolean> {
  try {
    const existing = await getStorageArray(key);
    return existing.includes(itemId);
  } catch (error) {
    console.error(`Error checking ${key}:`, error);
    return false;
  }
}
