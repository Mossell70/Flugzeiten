import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadState, saveState, sanitizeState, MAX_EVENTS } from '../js/storage.js';

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) };
}

test('ohne gespeicherte Daten ist die Aufzeichnung leer', () => {
  assert.deepEqual(loadState(memoryStorage()), { events: [], ended: false });
});

test('speichern und laden ergibt denselben Zustand', () => {
  const store = memoryStorage();
  const state = { events: [{ type: 'start', time: '09:12' }, { type: 'tg', time: '09:20' }], ended: true };
  assert.equal(saveState(state, store), true);
  assert.deepEqual(loadState(store), state);
});

test('kaputte Daten im Speicher führen nicht zum Absturz', () => {
  const store = memoryStorage();
  store.setItem('flugzeiten.v1', '{kaputt');
  assert.deepEqual(loadState(store), { events: [], ended: false });
});

test('ungültige Einträge und Zusatzfelder werden verworfen', () => {
  const s = sanitizeState({
    events: [{ type: 'start', time: '09:12', x: '<script>' }, { type: 'evil', time: '09:13' }, { type: 'landing', time: 'abc' }],
    ended: 'ja',
  });
  assert.deepEqual(s, { events: [{ type: 'start', time: '09:12' }], ended: false });
});

test('Anzahl der Einträge ist begrenzt', () => {
  const events = Array.from({ length: MAX_EVENTS + 5 }, () => ({ type: 'tg', time: '10:00' }));
  assert.equal(sanitizeState({ events }).events.length, MAX_EVENTS);
});

test('Speicherfehler wird gemeldet statt geworfen', () => {
  const broken = { getItem: () => null, setItem: () => { throw new Error('voll'); } };
  assert.equal(saveState({ events: [], ended: false }, broken), false);
});
