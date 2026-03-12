/* Portly – Main controller
   Loaded last.  Wires UI modules to backend operations and bootstraps
   the application. */

(function () {
    'use strict';

    var VERSION = 'v0.1.0';

    // Null guard — fail gracefully if loaded outside Cockpit
    if (!window.cockpit) {
        document.body.textContent = 'Portly must be run inside Cockpit.';
        return;
    }

    var Portly     = window.Portly;
    var refreshBtn = document.getElementById('refresh-btn');
    var versionLabel = document.getElementById('portly-version');

    var activeLoadProc = null;   // tracks in-flight loadContainers proc

    // ── Refresh ────────────────────────────────────────────────────────────────

    function refresh() {
        // Cancel any in-flight load to prevent race conditions
        if (activeLoadProc) {
            activeLoadProc.close();
            activeLoadProc = null;
        }

        refreshBtn.disabled = true;

        activeLoadProc = Portly.containers.loadContainers({
            onStart: function () {
                Portly.render.showLoading();
            },
            onSuccess: function (containers) {
                activeLoadProc = null;
                refreshBtn.disabled = false;
                Portly.render.renderContainers(containers, actions);
            },
            onError: function (msg) {
                activeLoadProc = null;
                refreshBtn.disabled = false;
                Portly.render.showError(msg);
            }
        });
    }

    // ── Action map (passed to render → kebab) ──────────────────────────────────

    var actions = {
        stop: function (name) {
            Portly.render.setAllButtonsDisabled(true);
            Portly.containers.stopContainer(name, {
                onSuccess: refresh,
                onError: function (msg) {
                    Portly.render.setAllButtonsDisabled(false);
                    Portly.render.showError(msg);
                }
            });
        },

        start: function (name) {
            Portly.render.setAllButtonsDisabled(true);
            Portly.containers.startContainer(name, {
                onSuccess: refresh,
                onError: function (msg) {
                    Portly.render.setAllButtonsDisabled(false);
                    Portly.render.showError(msg);
                }
            });
        },

        restart: function (name) {
            Portly.render.setAllButtonsDisabled(true);
            Portly.containers.restartContainer(name, {
                onSuccess: refresh,
                onError: function (msg) {
                    Portly.render.setAllButtonsDisabled(false);
                    Portly.render.showError(msg);
                }
            });
        },

        update: function (name, image) {
            Portly.containers.updateContainer(name, image, {
                onStart:    function () { Portly.render.showLoading(); },
                onSuccess:  refresh,
                onError:    function (msg) { Portly.render.showError(msg); },
                onComplete: refresh
            });
        },

        logs: function (name, triggerBtn) {
            Portly.textViewer.showLoading('Logs: ' + name, triggerBtn);
            Portly.containers.fetchLogs(name, {
                onSuccess: function (output) {
                    Portly.textViewer.setContent(
                        output || 'No logs available',
                        { ansi: true, scrollToEnd: true }
                    );
                },
                onError: function (msg) {
                    Portly.textViewer.setContent(msg);
                }
            });
        },

        compose: function (name, triggerBtn) {
            Portly.textViewer.showLoading('Compose: ' + name, triggerBtn);
            Portly.containers.fetchComposeFile(name, {
                onSuccess: function (projectName, path, content) {
                    if (projectName) {
                        Portly.textViewer.setTitle('Compose: ' + projectName + ' (' + name + ')');
                    }
                    Portly.textViewer.setContent(content);
                },
                onError: function (msg) {
                    Portly.textViewer.setContent(msg);
                }
            });
        },

        delete: function (name, isRunning) {
            var message = isRunning
                ? 'Container \u201C' + name + '\u201D is currently running. It will be stopped and permanently deleted.'
                : 'Container \u201C' + name + '\u201D will be permanently deleted. This cannot be undone.';

            Portly.confirm.show('Delete Container', message, 'Delete', true, function () {
                Portly.confirm.close();
                Portly.render.setAllButtonsDisabled(true);
                Portly.containers.deleteContainer(name, {
                    onSuccess: refresh,
                    onError: function (msg) {
                        Portly.render.setAllButtonsDisabled(false);
                        Portly.render.showError(msg);
                    }
                });
            });
        }
    };

    // ── Global keyboard handler ────────────────────────────────────────────────

    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (Portly.kebab.isOpen())      { Portly.kebab.closeActive(); return; }
        if (Portly.textViewer.isOpen())    Portly.textViewer.close();
        else if (Portly.confirm.isOpen())  Portly.confirm.close();
    });

    // ── Event listeners ────────────────────────────────────────────────────────

    refreshBtn.addEventListener('click', refresh);

    // ── Initialize ─────────────────────────────────────────────────────────────

    if (versionLabel) versionLabel.textContent = VERSION;
    refresh();

    // Auto-refresh every 30 seconds
    var refreshInterval = setInterval(refresh, 30000);

    // Clean up when Cockpit navigates away
    window.addEventListener('unload', function () {
        clearInterval(refreshInterval);
        if (Portly.darkmode) Portly.darkmode.destroy();
    });

})();
