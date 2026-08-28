/**
 * Firebase & Network Error Handler and Formatter
 * Translates low-level Firebase/network exceptions into clear, actionable, user-friendly messages.
 */

export function formatFirebaseError(error: any): string {
  if (!error) {
    return 'An unexpected error occurred. Please try again.';
  }

  const msg = typeof error === 'string' ? error : error.message || error.code || '';
  const lowerMsg = msg.toLowerCase();

  // Network & Connectivity issues
  if (
    lowerMsg.includes('network-request-failed') ||
    lowerMsg.includes('unavailable') ||
    lowerMsg.includes('failed to fetch') ||
    lowerMsg.includes('client is offline') ||
    lowerMsg.includes('could not reach') ||
    lowerMsg.includes('offline')
  ) {
    return 'Network connection lost. Please check your internet connection and try again.';
  }

  // Timeout issues
  if (lowerMsg.includes('timeout') || lowerMsg.includes('deadline-exceeded')) {
    return 'Database request timed out. The server took too long to respond. Please try again.';
  }

  // Permission & Security Rules
  if (
    lowerMsg.includes('permission-denied') ||
    lowerMsg.includes('unauthorized') ||
    lowerMsg.includes('missing or insufficient permissions')
  ) {
    return 'Permission denied. Your account does not have authorization for this database operation.';
  }

  // Document not found
  if (lowerMsg.includes('not-found') || lowerMsg.includes('verification failed')) {
    return 'Database verification failed: The record could not be confirmed in Firestore.';
  }

  // Quota & Rate Limit
  if (lowerMsg.includes('resource-exhausted') || lowerMsg.includes('quota')) {
    return 'Database request limit reached. Please wait a few moments and try again.';
  }

  // User Auth issues
  if (lowerMsg.includes('user-not-found') || lowerMsg.includes('wrong-password') || lowerMsg.includes('invalid-credential')) {
    return 'Invalid email or password. Please verify your credentials.';
  }

  if (lowerMsg.includes('email-already-in-use')) {
    return 'An account with this email address already exists.';
  }

  // Fallback to error message if reasonable, or standard fallback
  if (msg.length > 5 && msg.length < 180 && !msg.startsWith('FirebaseError:')) {
    return msg;
  }

  return 'Database operation failed. Please check your connection and retry.';
}

/**
 * Timeout wrapper for async promises to prevent indefinite hangs
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, operationName: string = 'Operation'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operationName} timed out after ${ms / 1000}s. Please check your network.`)), ms)
    ),
  ]);
}
