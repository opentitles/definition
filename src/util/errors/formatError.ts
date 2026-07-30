/**
 * Turn anything that was thrown into a loggable string.
 *
 * Clog stringifies objects with JSON.stringify, which renders an Error as `{}` because its message
 * and stack aren't enumerable - that's how failures used to disappear from the CI log. Always pass
 * errors through this function before logging them.
 *
 * @param error Value from a catch block, a rejected promise or a process-level error event
 */
export const formatError = (error: unknown): string => {
  if (error instanceof Error) {
    const cause = error.cause ? `\nCaused by: ${formatError(error.cause)}` : '';
    return `${error.stack ?? `${error.name}: ${error.message}`}${cause}`;
  }

  if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  return String(error);
}
