// Generates and persists an anonymous session ID for conversation tracking
const SESSION_KEY = 'health_guide_session_id';

export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
