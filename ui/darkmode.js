/* Portly – Dark mode synchronisation
   Cockpit has used different theme class names across versions:
     pf-v5-theme-dark  — Cockpit < 337
     pf-v6-theme-dark  — Cockpit 337+
   We watch the parent frame's <html> for any known dark-mode class and mirror
   it as .portly-dark on our own <html> so the CSS only needs one target. */

(function () {
    'use strict';
    window.Portly = window.Portly || {};

    var DARK_CLASSES = ['pf-v5-theme-dark', 'pf-v6-theme-dark'];

    // Cockpit applies theme classes to the parent frame, not the plugin iframe
    var themeRoot = window.parent
        ? window.parent.document.documentElement
        : document.documentElement;

    function sync() {
        var isDark = DARK_CLASSES.some(function (cls) {
            return themeRoot.classList.contains(cls);
        });
        document.documentElement.classList.toggle('portly-dark', isDark);
    }

    sync();

    var observer = new MutationObserver(sync);
    observer.observe(themeRoot, { attributes: true, attributeFilter: ['class'] });

    Portly.darkmode = {
        destroy: function () { observer.disconnect(); }
    };
})();
