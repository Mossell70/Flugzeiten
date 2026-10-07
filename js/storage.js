// Laufende Aufzeichnung im Browser sichern, damit ein Neuladen oder Absturz nichts verliert.
import { isValidEvent } from './log.js';

const KEY = 'flugzeiten.v1';
export const MAX_EVENTS = 1000;

export function emptyState() {
  return { events: [], ended: false };
}

export function sanitizeState(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.events)) return emptyState();
  return {
    events: data.events
      .filter(isValidEvent)
      .slice(-MAX_EVENTS)
      .map(({ type, time }) => ({ type, time })),
    ended: data.ended === true,
  };
}

export function loadState(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? sanitizeState(JSON.parse(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage.setItem(KEY, JSON.stringify(sanitizeState(state)));
    return true;
  } catch {
    return false;
  }
}
