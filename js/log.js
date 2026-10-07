// Reine Logik: Ereignisse (Start, T&G, Landung) in Flüge und Textzeilen übersetzen.
// Keine Abhängigkeit vom Browser – dadurch mit node:test prüfbar.

export const TYPES = Object.freeze(['start', 'tg', 'landing']);
export const SEPARATOR = ' - ';
export const HEADER = 'Start - T&G - Landung - Dauer (UTC)';
export const TOTAL_LABEL = 'Zeit in der Luft';
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

const DAY = 24 * 60;

function minutesOf(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Minuten zwischen zwei Uhrzeiten (HH:MM). Liegt das Ende vor dem Anfang,
 * wurde Mitternacht (UTC) überflogen. Fehlt eine Zeit: null.
 */
export function minutesBetween(from, to) {
  if (!isValidTime(from) || !isValidTime(to)) return null;
  return (minutesOf(to) - minutesOf(from) + DAY) % DAY;
}

/** Flugdauer Start bis Landung in Minuten, null wenn Start oder Landung fehlt. */
export function flightMinutes(flight) {
  return minutesBetween(flight.start, flight.landing);
}

/** Summe aller vollständigen Flüge (Start und Landung erfasst) in Minuten. */
export function totalMinutes(flights) {
  return flights.reduce((sum, f) => sum + (flightMinutes(f) ?? 0), 0);
}

/** Dauer als HH:MM (Stunden auch über 24 möglich). */
export function formatDuration(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatLine(flight) {
  const min = flightMinutes(flight);
  return [flight.start, flight.tg.join(', '), flight.landing, min === null ? '' : formatDuration(min)].join(SEPARATOR);
}

/** Inhalt der Textdatei: Kopfzeile, eine Zeile pro Flug, Gesamtzeit in der Luft. */
export function toText(events) {
  const flights = buildFlights(events);
  return [
    HEADER,
    ...flights.map(formatLine),
    '',
    `${TOTAL_LABEL}: ${formatDuration(totalMinutes(flights))}`,
  ].join('\n');
}
