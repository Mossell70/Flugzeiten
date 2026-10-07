import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  utcTime, buildFlights, isAirborne, toText, formatLine, HEADER,
  minutesBetween, flightMinutes, totalMinutes, formatDuration,
} from '../js/log.js';

const ev = (type, time) => ({ type, time });

test('UTC-Zeit wird als HH:MM ohne Datum geschrieben', () => {
  assert.equal(utcTime(new Date('2026-10-07T07:05:59Z')), '07:05');
  assert.equal(utcTime(new Date('2026-10-07T23:59:00Z')), '23:59');
  assert.equal(utcTime(new Date('2026-10-08T00:00:30Z')), '00:00');
});

test('UTC-Zeit hängt nicht von der lokalen Zeitzone ab', () => {
  // 19:32 Uhr MESZ = 17:32 UTC
  assert.equal(utcTime(new Date('2026-10-07T19:32:00+02:00')), '17:32');
});

test('Start, T&G, Landung ergeben eine Zeile', () => {
  const flights = buildFlights([ev('start', '09:12'), ev('tg', '09:20'), ev('landing', '09:35')]);
  assert.equal(flights.length, 1);
  assert.equal(formatLine(flights[0]), '09:12 - 09:20 - 09:35 - 00:23');
});

test('ohne T&G bleibt das Feld leer', () => {
  const [f] = buildFlights([ev('start', '10:01'), ev('landing', '10:40')]);
  assert.equal(formatLine(f), '10:01 -  - 10:40 - 00:39');
});

test('mehrere T&G stehen in derselben Zeile', () => {
  const [f] = buildFlights([ev('start', '09:12'), ev('tg', '09:20'), ev('tg', '09:27'), ev('landing', '09:35')]);
  assert.equal(formatLine(f), '09:12 - 09:20, 09:27 - 09:35 - 00:23');
});

test('jeder Start beginnt eine neue Zeile', () => {
  const events = [
    ev('start', '09:00'), ev('landing', '09:30'),
    ev('start', '10:00'), ev('tg', '10:08'), ev('landing', '10:20'),
  ];
  assert.equal(toText(events), [HEADER, '09:00 -  - 09:30 - 00:30', '10:00 - 10:08 - 10:20 - 00:20', '', 'Zeit in der Luft: 00:50'].join('\n'));
});

test('Start ohne vorherige Landung schließt den offenen Flug mit leerer Landung ab', () => {
  const flights = buildFlights([ev('start', '09:00'), ev('start', '10:00'), ev('landing', '10:30')]);
  assert.deepEqual(flights.map(formatLine), ['09:00 -  -  - ', '10:00 -  - 10:30 - 00:30']);
});

test('Landung oder T&G ohne Start beginnt einen Flug mit leerem Startfeld', () => {
  assert.deepEqual(buildFlights([ev('landing', '11:00')]).map(formatLine), [' -  - 11:00 - ']);
  assert.deepEqual(buildFlights([ev('tg', '11:00'), ev('landing', '11:10')]).map(formatLine), [' - 11:00 - 11:10 - ']);
});

test('Status in der Luft / am Boden', () => {
  assert.equal(isAirborne([]), false);
  assert.equal(isAirborne([ev('start', '09:00')]), true);
  assert.equal(isAirborne([ev('start', '09:00'), ev('tg', '09:10')]), true);
  assert.equal(isAirborne([ev('start', '09:00'), ev('landing', '09:30')]), false);
});

test('ungültige Ereignisse werden ignoriert', () => {
  const flights = buildFlights([ev('start', '9:00'), ev('foo', '09:00'), null, ev('start', '25:00'), ev('start', '08:00')]);
  assert.deepEqual(flights.map(formatLine), ['08:00 -  -  - ']);
});

test('leere Aufzeichnung enthält Kopfzeile und Gesamtzeit 00:00', () => {
  assert.equal(toText([]), `${HEADER}\n\nZeit in der Luft: 00:00`);
});

test('Dauer zwischen zwei Uhrzeiten, auch über Mitternacht UTC', () => {
  assert.equal(minutesBetween('09:12', '09:35'), 23);
  assert.equal(minutesBetween('09:12', '09:12'), 0);
  assert.equal(minutesBetween('23:50', '00:15'), 25);
  assert.equal(minutesBetween('', '09:35'), null);
  assert.equal(minutesBetween('09:12', ''), null);
});

test('Dauer wird als HH:MM formatiert, auch über 24 Stunden', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(23), '00:23');
  assert.equal(formatDuration(125), '02:05');
  assert.equal(formatDuration(25 * 60 + 1), '25:01');
});

test('Gesamtzeit zählt nur Flüge mit Start und Landung', () => {
  const flights = buildFlights([
    ev('start', '09:00'), ev('landing', '09:45'),   // 45
    ev('start', '23:40'), ev('landing', '00:20'),   // 40 über Mitternacht
    ev('landing', '01:00'),                         // ohne Start: zählt nicht
    ev('start', '02:00'),                           // ohne Landung: zählt nicht
  ]);
  assert.equal(flightMinutes(flights[0]), 45);
  assert.equal(flightMinutes(flights[2]), null);
  assert.equal(totalMinutes(flights), 85);
});
