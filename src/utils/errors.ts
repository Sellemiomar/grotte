/**
 * Error handling helper to safely extract error messages from unknown caught values.
 */
export function getErrorMessage(err: unknown, fallback = 'Une erreur inconnue est survenue'): string {
  if (err instanceof Error) {
    return err.message || fallback;
  }
  if (typeof err === 'string' && err.trim().length > 0) {
    return err;
  }
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    const msg = (err as { message: string }).message;
    return msg || fallback;
  }
  return fallback;
}
