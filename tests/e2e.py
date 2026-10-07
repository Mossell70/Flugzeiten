"""Browser-Test (Playwright, Chromium headless).

Aufruf: python3 tests/e2e.py http://localhost:8080/ [screenshot.png]
Steuert die Uhr des Browsers, tippt Start/T&G/Landung/Beenden und prüft Tabelle,
Dateivorschau, Öffnen und Speichern der Textdatei.
"""
import sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1]
SHOT = sys.argv[2] if len(sys.argv) > 2 else 'e2e.png'
EXPECTED_TEXT = ('Start - T&G - Landung - Dauer (UTC)\n09:12 - 09:20, 09:27 - 09:35 - 00:23\n'
                 '10:00 -  - 10:39 - 00:39\n\nZeit in der Luft: 01:02')


def rows(page):
    return page.eval_on_selector_all('#log-body tr', 'trs => trs.map(tr => [...tr.cells].map(td => td.textContent))')


def tap(page, sel, advance_s=60):
    page.click(sel)
    page.clock.run_for(advance_s * 1000)


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, timezone_id='Europe/Berlin', accept_downloads=True)
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
    # 11:12 MESZ = 09:12 UTC – prüft, dass UTC und nicht Ortszeit geschrieben wird
    page.clock.install(time='2026-10-07T11:12:05+02:00')
    page.goto(URL)

    assert page.text_content('#clock') == '09:12', page.text_content('#clock')
    assert page.is_visible('#log-empty')

    # Beenden ohne Einträge beendet nicht
    page.click('[data-action="end"]')
    assert page.is_visible('#recorder') and not page.is_visible('#ended')

    tap(page, '[data-record="start"]', 8 * 60)            # 09:12 Start
    assert page.text_content('#status') == 'In der Luft seit 09:12'
    # laufende Flugzeit nach 8 Minuten
    assert page.is_visible('#airtime') and page.text_content('#airtime-value') == '00:08', page.text_content('#airtime-value')
    assert rows(page) == [['09:12', '', '', '00:08']], rows(page)
    assert page.text_content('#log-total') == '00:08'
    page.click('[data-record="tg"]')                       # Doppeltipp direkt danach …
    page.click('[data-record="tg"]')                       # … wird ignoriert
    page.clock.run_for(7 * 60 * 1000)
    tap(page, '[data-record="tg"]', 8 * 60)                # 09:27 zweites T&G
    tap(page, '[data-record="landing"]', 25 * 60)          # 09:35 Landung
    assert page.text_content('#status') == 'Am Boden'
    assert not page.is_visible('#airtime')
    tap(page, '[data-record="start"]', 39 * 60)            # 10:00 Start (ohne T&G)
    tap(page, '[data-record="landing"]', 60)               # 10:39 Landung
    tap(page, '[data-record="tg"]', 60)                    # 10:40 Fehltipp …
    page.click('[data-action="undo"]')                     # … rückgängig

    expected = [['09:12', '09:20, 09:27', '09:35', '00:23'], ['10:00', '', '10:39', '00:39']]
    assert rows(page) == expected, rows(page)
    assert page.text_content('#log-total') == '01:02'

    # Neu laden: Aufzeichnung bleibt erhalten
    page.reload()
    assert rows(page) == expected, rows(page)

    # Beenden: Datei wird erstellt und angezeigt
    page.click('[data-action="end"]')
    assert page.is_visible('#ended') and not page.is_visible('#recorder')
    assert page.text_content('#file-name') == 'Flugzeiten.txt'
    assert page.text_content('#file-text') == EXPECTED_TEXT, repr(page.text_content('#file-text'))
    page.screenshot(path=SHOT, full_page=True)

    # Datei speichern (Download)
    with page.expect_download() as dl:
        page.click('[data-action="save-file"]')
    d = dl.value
    assert d.suggested_filename == 'Flugzeiten.txt', d.suggested_filename
    saved = open(d.path(), encoding='utf-8').read()
    assert saved == EXPECTED_TEXT + '\n', repr(saved)
    assert '2026' not in saved and '07.10' not in saved and '@' not in saved  # kein Datum, keine Adresse

    # Datei öffnen (neuer Tab mit Textinhalt)
    with ctx.expect_page() as pg:
        page.click('[data-action="open-file"]')
    tab = pg.value
    tab.wait_for_load_state()
    assert tab.url.startswith('blob:'), tab.url
    assert tab.inner_text('body').strip() == EXPECTED_TEXT, repr(tab.inner_text('body'))
    tab.close()

    page.click('[data-action="resume"]')
    assert page.is_visible('#recorder')

    # Offener Flug: Rückfrage vor dem Beenden
    tap(page, '[data-record="start"]')
    dialogs = []
    page.once('dialog', lambda d: (dialogs.append(d.message), d.dismiss()))
    page.click('[data-action="end"]')
    assert dialogs and 'keine Landung' in dialogs[0], dialogs
    assert page.is_visible('#recorder')

    page.once('dialog', lambda d: d.accept())
    page.click('[data-action="end"]')
    page.once('dialog', lambda d: d.accept())
    page.click('[data-action="reset"]')
    assert rows(page) == [] and page.is_visible('#log-empty') and page.is_visible('#recorder')

    assert not errors, errors
    browser.close()
    print('E2E OK')
