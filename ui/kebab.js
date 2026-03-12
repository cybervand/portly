/* Portly – Kebab context menu
   The menu receives an actions object from the caller so it has zero
   direct dependencies on the backend module. */

(function () {
    'use strict';
    window.Portly = window.Portly || {};

    var activeMenu = null;

    function closeActive() {
        if (activeMenu) {
            activeMenu.remove();
            activeMenu = null;
        }
    }

    // ── Menu builder ───────────────────────────────────────────────────────────

    function makeItem(icon, label, danger, handler) {
        var item = document.createElement('button');
        item.className = 'portly-menu__item' + (danger ? ' portly-menu__item--danger' : '');
        item.setAttribute('role', 'menuitem');
        item.innerHTML = '<i class="fa ' + icon + '" aria-hidden="true"></i> ' + label;
        item.addEventListener('click', function () {
            closeActive();
            handler();
        });
        return item;
    }

    function makeDivider() {
        var d = document.createElement('div');
        d.className = 'portly-menu__divider';
        return d;
    }

    /** Open a kebab menu for a container.
     *  @param {Object}      container   - parsed container object
     *  @param {number}      x           - CSS left position
     *  @param {number}      y           - CSS top position
     *  @param {HTMLElement}  triggerBtn  - button to refocus on close
     *  @param {Object}      actions     - handler map: stop, start, restart,
     *                                     update, logs, compose, delete
     */
    function open(container, x, y, triggerBtn, actions) {
        closeActive();

        var menu = document.createElement('div');
        menu.className = 'portly-menu';
        menu.setAttribute('role', 'menu');

        if (container.state === 'running' || container.state === 'paused') {
            menu.appendChild(makeItem('fa-stop',    'Stop',    false, function () { actions.stop(container.name); }));
            menu.appendChild(makeItem('fa-refresh', 'Restart', false, function () { actions.restart(container.name); }));
        } else {
            menu.appendChild(makeItem('fa-play', 'Start', false, function () { actions.start(container.name); }));
        }

        menu.appendChild(makeItem('fa-arrow-up',    'Update',  false, function () { actions.update(container.name, container.image); }));
        menu.appendChild(makeItem('fa-file-text',    'Logs',    false, function () { actions.logs(container.name, triggerBtn); }));
        menu.appendChild(makeItem('fa-file-code-o',  'Compose', false, function () { actions.compose(container.name, triggerBtn); }));
        menu.appendChild(makeDivider());
        menu.appendChild(makeItem('fa-trash', 'Delete', true, function () { actions.delete(container.name, container.state === 'running'); }));

        document.body.appendChild(menu);
        activeMenu = menu;

        // Position: prefer below the trigger, flip if not enough room
        var menuH = menu.offsetHeight;
        var menuW = menu.offsetWidth;
        var spaceBelow = window.innerHeight - y;
        var top  = spaceBelow >= menuH + 8 ? y + 4 : y - menuH - 4;
        var left = Math.min(x, window.innerWidth - menuW - 8);

        menu.style.top  = top  + 'px';
        menu.style.left = left + 'px';

        var first = menu.querySelector('.portly-menu__item');
        if (first) first.focus();
    }

    /** Create a kebab ⋮ button for a table row.
     *  Also wires the row's contextmenu event. */
    function createButton(container, row, actions) {
        var btn = document.createElement('button');
        btn.className = 'pf-v6-c-button pf-m-plain portly-kebab';
        btn.setAttribute('aria-label', 'Actions for ' + container.name);
        btn.setAttribute('aria-haspopup', 'true');
        btn.textContent = '\u22EE';  // ⋮

        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (activeMenu) { closeActive(); return; }
            var r = btn.getBoundingClientRect();
            open(container, r.left, r.bottom, btn, actions);
        });

        row.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();
            open(container, e.clientX, e.clientY, btn, actions);
        });

        return btn;
    }

    // Close on outside click
    document.addEventListener('click', function (e) {
        if (activeMenu && !activeMenu.contains(e.target)) closeActive();
    });

    Portly.kebab = {
        open:         open,
        closeActive:  closeActive,
        createButton: createButton,
        isOpen:       function () { return !!activeMenu; }
    };
})();
