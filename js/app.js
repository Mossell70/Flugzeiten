// Verbindung von Oberfläche und Logik.
import { utcTime, buildFlights, isAirborne, toText } from './log.js';
import { loadState, saveState } from './storage.js';
import { FILE_NAME, TAP_GUARD_MS } from './config.js';

const LABELS = { start: 'Start', tg: 'T&G', landing: 'Landung' };

const $ = (sel) => document.querySelector(sel);
const els = {
  clock: $('#clock'),
  clockSec: $('#clock-sec'),
  status: $('#status'),
  recorder: $('#recorder'),
  ended: $('#ended'),
  fileName: $('#file-name'),
  fileText: $('#file-text'),
  body: $('#log-body'),
  empty: $('#log-empty'),
  undo: $('[data-action="undo"]'),
  toast: $('#toast'),
};

let state = loadState();
let lastTap = 0;
let toastTimer = 0;

function persist() {
  if (!saveState(state)) showToast('Achtung: Speichern im Browser nicht möglich.');
}

function record(type) {
  if (state.ended) return;
  const now = Date.now();
  if (now - lastTap < TAP_GUARD_MS) return; // Doppeltippen ignorieren
  lastTap = now;
  const time = utcTime(new Date(now));
  state.events.push({ type, time });
  persist();
  render(true);
  navigator.vibrate?.(40);
  showToast(`${LABELS[type]} ${time} UTC`);
}

function undo() {
  if (state.ended || state.events.length === 0) return;
  const e = state.events.pop();
  persist();
  render();
  showToast(`${LABELS[e.type]} ${e.time} entfernt`);
}

function textFile() {
  return new Blob([toText(state.events) + '\n'], { type: 'text/plain;charset=utf-8' });
}

/** Öffnet oder speichert die Textdatei über einen temporären Link. */
function useFile(download) {
  const url = URL.createObjectURL(textFile());
  const a = document.createElement('a');
  a.href = url;
  if (download) a.download = FILE_NAME;
  else a.target = '_blank';
  a.rel = 'noopener';
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function end() {
  if (state.events.length === 0) {
    showToast('Noch keine Zeiten erfasst.');
    return;
  }
  if (isAirborne(state.events) &&
      !window.confirm('Der letzte Flug hat noch keine Landung. Trotzdem beenden?')) {
    return;
  }
  state.ended = true;
  persist();
  render();
  els.ended.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resume() {
  state.ended = false;
  persist();
  render();
}

function reset() {
  if (!window.confirm('Alle erfassten Zeiten löschen und neu beginnen? Bitte vorher die Textdatei speichern.')) return;
  state = { events: [], ended: false };
  persist();
  render();
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text; // nie innerHTML für Daten
  return td;
}

function render(flash = false) {
  const flights = buildFlights(state.events);
  const airborne = isAirborne(state.events);

  els.body.replaceChildren(...flights.map((f, i) => {
    const tr = document.createElement('tr');
    tr.append(cell(f.start), cell(f.tg.join(', ')), cell(f.landing));
    if (i === flights.length - 1 && airborne) tr.classList.add('is-open');
    if (flash && i === flights.length - 1) tr.classList.add('is-new');
    return tr;
  }));
  els.empty.hidden = flights.length > 0;

  els.recorder.hidden = state.ended;
  els.ended.hidden = !state.ended;
  if (state.ended) {
    els.fileName.textContent = FILE_NAME;
    els.fileText.textContent = toText(state.events);
  }
  els.undo.disabled = state.ended || state.events.length === 0;

  const open = flights[flights.length - 1];
  if (state.ended) {
    els.status.dataset.state = 'ended';
    els.status.textContent = 'Beendet';
  } else if (airborne) {
    els.status.dataset.state = 'air';
    els.status.textContent = open.start ? `In der Luft seit ${open.start}` : 'In der Luft';
  } else {
    els.status.dataset.state = 'ground';
    els.status.textContent = 'Am Boden';
  }
  document.body.dataset.phase = airborne ? 'air' : 'ground';
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2500);
}

function tick() {
  const now = new Date();
  els.clock.textContent = utcTime(now);
  els.clockSec.textContent = `:${String(now.getUTCSeconds()).padStart(2, '0')}`;
  setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
}

const actions = {
  end,
  undo,
  resume,
  reset,
  'open-file': () => useFile(false),
  'save-file': () => useFile(true),
};

document.addEventListener('click', (ev) => {
  const btn = ev.target.closest('button');
  if (!btn || btn.disabled) return;
  if (btn.dataset.record) record(btn.dataset.record);
  else actions[btn.dataset.action]?.();
});

// Änderungen aus einem anderen Tab übernehmen
window.addEventListener('storage', () => { state = loadState(); render(); });

tick();
render();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
