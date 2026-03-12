/* Portly – Text viewer modal
   A single reusable viewer for any text content (container logs, compose
   files, etc.).  Supports ANSI SGR colour rendering for terminal output. */

(function () {
    'use strict';
    window.Portly = window.Portly || {};

    // DOM references
    var backdrop  = document.getElementById('textviewer-backdrop');
    var closeBtn  = document.getElementById('textviewer-close-btn');
    var titleEl   = document.getElementById('textviewer-title');
    var contentEl = document.getElementById('textviewer-content');

    var lastTriggerBtn = null;

    // ── ANSI escape code renderer ──────────────────────────────────────────────

    var ANSI_COLORS = {
        // Standard
        30: '#4d4d4d', 31: '#cd3131', 32: '#0dbc79', 33: '#e5e510',
        34: '#2472c8', 35: '#bc3fbc', 36: '#11a8cd', 37: '#e5e5e5',
        // Bright
        90: '#666666', 91: '#f14c4c', 92: '#23d18b', 93: '#f5f543',
        94: '#3b8eea', 95: '#d670d6', 96: '#29b8db', 97: '#e5e5e5'
    };

    function ansi256ToHex(n) {
        // Standard 16 colours
        if (n < 16) {
            var c16 = [
                '#000000','#800000','#008000','#808000','#000080','#800080',
                '#008080','#c0c0c0','#808080','#ff0000','#00ff00','#ffff00',
                '#0000ff','#ff00ff','#00ffff','#ffffff'
            ];
            return c16[n];
        }
        // 216-colour cube
        if (n < 232) {
            var idx = n - 16;
            var b = idx % 6, g = Math.floor(idx / 6) % 6, r = Math.floor(idx / 36);
            var v = function (x) { return x === 0 ? 0 : 55 + x * 40; };
            return 'rgb(' + v(r) + ',' + v(g) + ',' + v(b) + ')';
        }
        // Greyscale ramp
        var grey = 8 + (n - 232) * 10;
        return 'rgb(' + grey + ',' + grey + ',' + grey + ')';
    }

    function renderAnsi(text) {
        var fragment = document.createDocumentFragment();
        var bold  = false;
        var color = null;

        function flushSpan(txt) {
            if (!txt) return;
            var span = document.createElement('span');
            if (bold)  span.style.fontWeight = 'bold';
            if (color) span.style.color = color;
            span.textContent = txt;
            fragment.appendChild(span);
        }

        var re = /\x1b\[([0-9;]*)m/g;
        var last = 0;
        var match;

        while ((match = re.exec(text)) !== null) {
            flushSpan(text.slice(last, match.index));
            last = re.lastIndex;

            var codes = match[1] === '' ? [0] : match[1].split(';').map(Number);
            var i = 0;
            while (i < codes.length) {
                var code = codes[i];
                if (code === 0)       { bold = false; color = null; }
                else if (code === 1)  { bold = true; }
                else if (code === 2 || code === 22) { bold = false; }
                else if (ANSI_COLORS[code] !== undefined) { color = ANSI_COLORS[code]; }
                else if (code === 39) { color = null; }
                else if (code === 38) {
                    // 256-color: 38;5;n
                    if (codes[i + 1] === 5 && codes[i + 2] !== undefined) {
                        color = ansi256ToHex(codes[i + 2]);
                        i += 2;
                    // True-color: 38;2;r;g;b
                    } else if (codes[i + 1] === 2 && codes[i + 4] !== undefined) {
                        color = 'rgb(' + codes[i + 2] + ',' + codes[i + 3] + ',' + codes[i + 4] + ')';
                        i += 4;
                    }
                }
                i++;
            }
        }

        flushSpan(text.slice(last));
        return fragment;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    /** Show the viewer with content already available.
     *  @param {string} title
     *  @param {string} text
     *  @param {Object} [options]
     *  @param {boolean}      [options.ansi]        - render ANSI escape codes
     *  @param {boolean}      [options.scrollToEnd]  - scroll to bottom after load
     *  @param {HTMLElement}  [options.triggerBtn]   - button to refocus on close
     */
    function show(title, text, options) {
        options = options || {};
        lastTriggerBtn = options.triggerBtn || null;

        titleEl.textContent = title;
        contentEl.innerHTML = '';

        if (options.ansi && text) {
            contentEl.appendChild(renderAnsi(text));
        } else {
            contentEl.textContent = text || '(empty)';
        }

        if (options.scrollToEnd) {
            contentEl.scrollTop = contentEl.scrollHeight;
        } else {
            contentEl.scrollTop = 0;
        }

        backdrop.classList.add('show');
        backdrop.setAttribute('aria-hidden', 'false');
        closeBtn.focus();
    }

    /** Open the viewer in a "loading…" state.  Follow up with setContent(). */
    function showLoading(title, triggerBtn) {
        lastTriggerBtn = triggerBtn || null;
        titleEl.textContent = title;
        contentEl.textContent = 'Loading\u2026';
        backdrop.classList.add('show');
        backdrop.setAttribute('aria-hidden', 'false');
        closeBtn.focus();
    }

    /** Replace the content of an already-open viewer. */
    function setContent(text, options) {
        options = options || {};
        contentEl.innerHTML = '';

        if (options.ansi && text) {
            contentEl.appendChild(renderAnsi(text));
        } else {
            contentEl.textContent = text || '(empty)';
        }

        if (options.scrollToEnd) {
            contentEl.scrollTop = contentEl.scrollHeight;
        } else {
            contentEl.scrollTop = 0;
        }
    }

    /** Update just the title of an already-open viewer. */
    function setTitle(title) {
        titleEl.textContent = title;
    }

    function close() {
        backdrop.classList.remove('show');
        backdrop.setAttribute('aria-hidden', 'true');
        if (lastTriggerBtn) {
            lastTriggerBtn.focus();
            lastTriggerBtn = null;
        }
    }

    function isOpen() {
        return backdrop.classList.contains('show');
    }

    // ── Event listeners ────────────────────────────────────────────────────────

    closeBtn.addEventListener('click', close);

    backdrop.addEventListener('click', function (e) {
        if (e.target === backdrop) close();
    });

    // ── Export ──────────────────────────────────────────────────────────────────

    Portly.textViewer = {
        show:        show,
        showLoading: showLoading,
        setContent:  setContent,
        setTitle:    setTitle,
        close:       close,
        isOpen:      isOpen
    };
})();
