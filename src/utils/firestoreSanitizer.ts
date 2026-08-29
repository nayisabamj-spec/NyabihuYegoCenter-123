/**
 * Sanitizes JavaScript objects before writing to Firestore.
 * Strips out 'undefined' values which cause Firestore setDoc/updateDoc calls to throw.
 */
export function cleanForFirestore<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const cleaned: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      cleaned[key] = cleanForFirestore(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value
        .filter((item) => item !== undefined)
        .map((item) => (item !== null && typeof item === 'object' ? cleanForFirestore(item) : item));
    } else {
      cleaned[key] = value;
    }
  }

  return cleaned as T;
}

/**
 * Wraps a promise with a timeout to guarantee it never hangs indefinitely.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  timeoutErrorMsg: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutErrorMsg)), timeoutMs)
    ),
  ]);
};

