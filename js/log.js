// Reine Logik: Ereignisse (Start, T&G, Landung) in Flüge und Textzeilen übersetzen.
// Keine Abhängigkeit vom Browser – dadurch mit node:test prüfbar.

export const TYPES = Object.freeze(['start', 'tg', 'landing']);
export const SEPARATOR = ' - ';
export const HEADER = 'Start - T&G - Landung (UTC)';
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** UTC-Uhrzeit im Format HH:MM, ohne Datum. */
export function utcTime(date = new Date()) {
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function isValidTime(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function isValidEvent(e) {
  return !!e && typeof e === 'object' && TYPES.includes(e.type) && isValidTime(e.time);
}

/**
 * Baut aus der Ereignisliste die Flüge.
 * - Start beginnt immer einen neuen Flug; ein noch offener Flug wird ohne Landung abgeschlossen.
 * - T&G und Landung ohne vorherigen Start beginnen einen Flug mit leerem Startfeld.
 * - Mehrere T&G landen im selben Feld.
 */
export function buildFlights(events) {
  const flights = [];
  let open = null;
  for (const e of events) {
    if (!isValidEvent(e)) continue;
    if (e.type === 'start' || !open) {
      open = { start: '', tg: [], landing: '' };
      flights.push(open);
    }
    if (e.type === 'start') open.start = e.time;
    else if (e.type === 'tg') open.tg.push(e.time);
    else {
      open.landing = e.time;
      open = null;
    }
  }
  return flights;
}

/** true, solange der letzte Flug noch keine Landung hat. */
export function isAirborne(events) {
  const flights = buildFlights(events);
  const last = flights[flights.length - 1];
  return !!last && last.landing === '';
}

export function formatLine(flight) {
  return [flight.start, flight.tg.join(', '), flight.landing].join(SEPARATOR);
}

/** Inhalt der „Textdatei“: Kopfzeile plus eine Zeile pro Flug. */
export function toText(events) {
  return [HEADER, ...buildFlights(events).map(formatLine)].join('\n');
}
