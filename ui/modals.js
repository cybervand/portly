/* Portly – Confirm dialog modal */

(function () {
    'use strict';
    window.Portly = window.Portly || {};

    var backdrop  = document.getElementById('confirm-backdrop');
    var titleEl   = document.getElementById('confirm-title');
    var messageEl = document.getElementById('confirm-message');
    var okBtn     = document.getElementById('confirm-ok-btn');
    var cancelBtn = document.getElementById('confirm-cancel-btn');

    var callback = null;

    /** Show a confirmation dialog.
     *  @param {string}   title
     *  @param {string}   message
     *  @param {string}   okLabel   - text for the confirm button
     *  @param {boolean}  isDanger  - style the button as danger
     *  @param {Function} cb        - called when the user confirms
     */
    function show(title, message, okLabel, isDanger, cb) {
        titleEl.textContent  = title;
        messageEl.textContent = message;
        okBtn.textContent    = okLabel;
        okBtn.className      = 'pf-v6-c-button pf-m-small ' + (isDanger ? 'pf-m-danger' : 'pf-m-primary');
        callback = cb;
        backdrop.classList.add('show');
        backdrop.setAttribute('aria-hidden', 'false');
        okBtn.focus();
    }

    function close() {
        backdrop.classList.remove('show');
        backdrop.setAttribute('aria-hidden', 'true');
        callback = null;
    }

    function isOpen() {
        return backdrop.classList.contains('show');
    }

    // Event listeners
    okBtn.addEventListener('click', function () { if (callback) callback(); });
    cancelBtn.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });

    Portly.confirm = {
        show:   show,
        close:  close,
        isOpen: isOpen
    };
})();
