/* Portly – Port parsing & protocol logic */

(function () {
    'use strict';
    window.Portly = window.Portly || {};

    // ── Port classification ────────────────────────────────────────────────────

    var HTTPS_PORTS = new Set([443, 4443, 8443, 9443, 10443]);

    var NON_WEB_PORTS = new Set([
        // Mail
        25, 110, 143, 465, 587, 993, 995,
        // SSH / FTP
        22, 21,
        // DNS
        53,
        // Databases
        1433, 1521, 3306, 5432, 5984, 6379, 7474, 8529, 9042, 9200, 27017, 27018,
        // Message brokers
        1883, 4222, 5222, 5672, 6650, 61613, 61616,
        // Other non-web
        111, 389, 636, 3389, 5900, 9300, 11211
    ]);

    function getDefaultProtocol(hostPort) {
        var p = parseInt(hostPort, 10);
        if (HTTPS_PORTS.has(p)) return 'https';
        if (NON_WEB_PORTS.has(p)) return 'none';
        return 'http';
    }

    // ── LocalStorage overrides ─────────────────────────────────────────────────

    function storageKey(containerName, hostPort) {
        return 'portly:proto:' + containerName + ':' + hostPort;
    }

    function getStoredProtocol(containerName, hostPort) {
        try { return localStorage.getItem(storageKey(containerName, hostPort)); }
        catch (e) { return null; }
    }

    function setStoredProtocol(containerName, hostPort, proto) {
        try {
            if (proto === getDefaultProtocol(hostPort)) {
                localStorage.removeItem(storageKey(containerName, hostPort));
            } else {
                localStorage.setItem(storageKey(containerName, hostPort), proto);
            }
        } catch (e) { /* storage unavailable */ }
    }

    // ── Parsing ────────────────────────────────────────────────────────────────

    function parsePortMappings(portsString) {
        if (!portsString || portsString === '-') return [];

        var mappings = [];
        var parts = portsString.split(',').map(function (p) { return p.trim(); });

        for (var i = 0; i < parts.length; i++) {
            var match = parts[i].match(/^([\d.:]+):(\d+)->(\d+)\/(tcp|udp)$/);
            if (match) {
                var host = match[1];
                var hostPort = match[2];
                var containerPort = match[3];
                var protocol = match[4];
                // Skip IPv6 (starts with ::)
                if (!host.startsWith('::')) {
                    mappings.push({
                        host: host === '0.0.0.0' ? window.location.hostname : host,
                        port: hostPort,
                        container: containerPort,
                        protocol: protocol
                    });
                }
            }
        }

        return mappings;
    }

    // ── DOM builder ────────────────────────────────────────────────────────────

    function buildPortsCell(portsString, containerName) {
        var wrapper = document.createElement('div');
        var mappings = parsePortMappings(portsString);

        if (mappings.length === 0) {
            var none = document.createElement('span');
            none.className = 'port-none';
            none.textContent = 'No exposed ports';
            wrapper.appendChild(none);
            return wrapper;
        }

        mappings.forEach(function (m) {
            var row = document.createElement('div');
            row.className = 'port-row';

            var defaultProto = getDefaultProtocol(m.port);
            var stored = getStoredProtocol(containerName, m.port);
            var proto = stored || defaultProto;

            // Link element (visible when proto is http/https)
            var linkEl = document.createElement('a');
            linkEl.className = 'port-link';
            linkEl.target = '_blank';
            linkEl.rel = 'noopener noreferrer';

            // Plain text element (visible when proto is none)
            var plainEl = document.createElement('span');
            plainEl.className = 'port-link port-nolink';

            var suffix = document.createElement('span');
            suffix.className = 'port-suffix';
            suffix.textContent = ' \u2192 ' + m.container + '/' + m.protocol;

            // Toggle button (created before applyProto because it references toggleBtn)
            var toggleBtn = document.createElement('button');
            toggleBtn.className = 'pf-v6-c-button port-proto-toggle';

            function applyProto(p) {
                proto = p;
                toggleBtn.dataset.proto = p;
                if (p === 'none') {
                    linkEl.style.display = 'none';
                    plainEl.style.display = '';
                    plainEl.textContent = m.host + ':' + m.port;
                    toggleBtn.textContent = 'link off';
                    toggleBtn.title = 'Click to open as http://';
                } else {
                    linkEl.style.display = '';
                    plainEl.style.display = 'none';
                    linkEl.href = p + '://' + m.host + ':' + m.port;
                    linkEl.textContent = m.host + ':' + m.port;
                    toggleBtn.textContent = p;
                    toggleBtn.title = 'Toggle http / https';
                }
            }

            toggleBtn.addEventListener('click', function () {
                var next;
                if (proto === 'none') next = 'http';
                else if (proto === 'http') next = 'https';
                else next = 'http';
                setStoredProtocol(containerName, m.port, next);
                applyProto(next);
            });

            applyProto(proto);

            row.appendChild(plainEl);
            row.appendChild(linkEl);
            row.appendChild(toggleBtn);
            row.appendChild(suffix);
            wrapper.appendChild(row);
        });

        return wrapper;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    Portly.ports = {
        parsePortMappings: parsePortMappings,
        buildPortsCell: buildPortsCell,
        getDefaultProtocol: getDefaultProtocol
    };
})();
