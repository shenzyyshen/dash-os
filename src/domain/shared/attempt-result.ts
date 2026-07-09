export type AttemptResult<E, T> =
  | { success: true; error: null; value: T }
  | { success: false; error: E; value: null }

export function ok<E, T>(value: T): AttemptResult<E, T> {
  return { success: true, error: null, value }
}

export function fail<E, T>(error: E): AttemptResult<E, T> {
  return { success: false, error, value: null }
}
