/* Portly – Table rendering & UI helpers */

(function () {
    'use strict';
    window.Portly = window.Portly || {};

    // DOM references
    var loadingSection      = document.getElementById('loading-section');
    var containersSection   = document.getElementById('containers-section');
    var noContainersSection = document.getElementById('no-containers-section');
    var errorSection        = document.getElementById('error-section');
    var errorMessage        = document.getElementById('error-message');
    var containersTbody     = document.getElementById('containers-tbody');
    var containerCount      = document.getElementById('container-count');
    var refreshBtn          = document.getElementById('refresh-btn');

    var allSections = [loadingSection, containersSection, noContainersSection, errorSection];

    // ── Section toggling ───────────────────────────────────────────────────────

    function showSection(section) {
        allSections.forEach(function (s) {
            if (s === section) {
                s.classList.remove('pf-v6-u-display-none');
                s.classList.add('pf-v6-u-display-block');
            } else {
                s.classList.add('pf-v6-u-display-none');
                s.classList.remove('pf-v6-u-display-block');
            }
        });
    }

    function showError(msg) {
        errorMessage.textContent = msg;
        showSection(errorSection);
    }

    function showLoading() {
        showSection(loadingSection);
    }

    // ── Status helpers ─────────────────────────────────────────────────────────

    function getStatusBadgeClass(state) {
        switch (state) {
            case 'running': return 'status-badge status-badge-running';
            case 'stopped': return 'status-badge status-badge-stopped';
            case 'paused':  return 'status-badge status-badge-paused';
            default:        return 'status-badge';
        }
    }

    function formatUptime(status) {
        if (status.startsWith('Up'))         return status;
        if (status.startsWith('Exited'))     return 'Stopped';
        if (status === 'Created')            return 'Never started';
        if (status.startsWith('Restarting')) return 'Restarting\u2026';
        if (status.startsWith('Removing'))   return 'Removing\u2026';
        if (status.startsWith('Dead'))       return 'Dead';
        return status;
    }

    // ── Button state ───────────────────────────────────────────────────────────

    function setAllButtonsDisabled(disabled) {
        containersTbody.querySelectorAll('button').forEach(function (btn) {
            btn.disabled = disabled;
        });
        refreshBtn.disabled = disabled;
    }

    // ── Row builder ────────────────────────────────────────────────────────────

    function buildRow(container, actions) {
        var row = document.createElement('tr');
        row.setAttribute('role', 'row');

        // Name
        var nameCell = document.createElement('td');
        nameCell.setAttribute('role', 'cell');
        nameCell.setAttribute('data-label', 'Name');
        var nameSpan = document.createElement('span');
        nameSpan.className = 'container-name';
        nameSpan.textContent = container.name;
        nameCell.appendChild(nameSpan);
        row.appendChild(nameCell);

        // Status
        var statusCell = document.createElement('td');
        statusCell.setAttribute('role', 'cell');
        statusCell.setAttribute('data-label', 'Status');
        var statusSpan = document.createElement('span');
        statusSpan.className = getStatusBadgeClass(container.state);
        statusSpan.textContent = container.state.charAt(0).toUpperCase() + container.state.slice(1);
        statusCell.appendChild(statusSpan);
        row.appendChild(statusCell);

        // Image
        var imageCell = document.createElement('td');
        imageCell.setAttribute('role', 'cell');
        imageCell.setAttribute('data-label', 'Image');
        var imageSpan = document.createElement('span');
        imageSpan.className = 'image-name';
        imageSpan.textContent = container.image;
        imageSpan.title = container.image;
        imageCell.appendChild(imageSpan);
        row.appendChild(imageCell);

        // Ports
        var portsCell = document.createElement('td');
        portsCell.setAttribute('role', 'cell');
        portsCell.setAttribute('data-label', 'Ports');
        portsCell.appendChild(Portly.ports.buildPortsCell(container.ports, container.name));
        row.appendChild(portsCell);

        // Uptime
        var uptimeCell = document.createElement('td');
        uptimeCell.setAttribute('role', 'cell');
        uptimeCell.setAttribute('data-label', 'Uptime');
        uptimeCell.textContent = formatUptime(container.status);
        row.appendChild(uptimeCell);

        // Actions (kebab)
        var actionsCell = document.createElement('td');
        actionsCell.setAttribute('role', 'cell');
        actionsCell.setAttribute('data-label', 'Actions');
        actionsCell.className = 'pf-v6-c-table__action';
        actionsCell.appendChild(Portly.kebab.createButton(container, row, actions));
        row.appendChild(actionsCell);

        return row;
    }

    // ── Group accordion ────────────────────────────────────────────────────────

    function findMainPort(containers) {
        var running = containers.filter(function (c) { return c.state === 'running'; });
        for (var i = 0; i < running.length; i++) {
            var mappings = Portly.ports.parsePortMappings(running[i].ports);
            for (var j = 0; j < mappings.length; j++) {
                if (Portly.ports.getDefaultProtocol(mappings[j].port) !== 'none') {
                    return mappings[j];
                }
            }
        }
        return null;
    }

    function buildGroupHeader(project, containers, actions) {
        var running = containers.filter(function (c) { return c.state === 'running'; }).length;
        var total   = containers.length;
        var summary = total + ' container' + (total !== 1 ? 's' : '') + ' \u00B7 ' + running + ' running';

        var row = document.createElement('tr');
        row.className = 'portly-group-header';

        var cell = document.createElement('td');
        cell.setAttribute('colspan', '6');

        var arrow = document.createElement('span');
        arrow.className = 'portly-group-arrow';
        arrow.textContent = '\u25B6'; // ▶

        var nameSpan = document.createElement('span');
        nameSpan.className = 'portly-group-name';
        nameSpan.textContent = project;

        var summarySpan = document.createElement('span');
        summarySpan.className = 'portly-group-summary';
        summarySpan.textContent = summary;

        // Inner div fills the cell width reliably for flex layout
        var inner = document.createElement('div');
        inner.className = 'portly-group-inner';

        inner.appendChild(arrow);
        inner.appendChild(nameSpan);
        inner.appendChild(summarySpan);

        // Main port link (first web port from any running container)
        var mainPort = findMainPort(containers);
        if (mainPort) {
            var proto    = Portly.ports.getDefaultProtocol(mainPort.port);
            var portLink = document.createElement('a');
            portLink.className   = 'portly-group-port-link';
            portLink.href        = proto + '://' + mainPort.host + ':' + mainPort.port;
            portLink.target      = '_blank';
            portLink.rel         = 'noopener noreferrer';
            portLink.textContent = mainPort.host + ':' + mainPort.port;
            portLink.addEventListener('click', function (e) { e.stopPropagation(); });
            inner.appendChild(portLink);
        }

        // Group kebab (stop all / delete all) — right-aligned
        var kebabWrapper = document.createElement('span');
        kebabWrapper.className = 'portly-group-actions';
        kebabWrapper.appendChild(Portly.kebab.createGroupButton(project, containers, {
            stopAll:   actions.stopAll,
            deleteAll: actions.deleteAll
        }));
        inner.appendChild(kebabWrapper);

        cell.appendChild(inner);
        row.appendChild(cell);
        return row;
    }

    function buildDivider() {
        var row = document.createElement('tr');
        row.className = 'portly-group-divider';
        var cell = document.createElement('td');
        cell.setAttribute('colspan', '6');
        row.appendChild(cell);
        return row;
    }

    function setupGroupToggle(headerRow, memberRows) {
        headerRow.addEventListener('click', function () {
            var isOpen = headerRow.classList.contains('portly-group-open');
            var arrow  = headerRow.querySelector('.portly-group-arrow');

            if (isOpen) {
                headerRow.classList.remove('portly-group-open');
                arrow.textContent = '\u25B6'; // ▶
                memberRows.forEach(function (r) { r.style.display = 'none'; });
            } else {
                headerRow.classList.add('portly-group-open');
                arrow.textContent = '\u25BC'; // ▼
                memberRows.forEach(function (r) { r.style.display = ''; });
            }
        });
    }

    function renderGrouped(containers, actions) {
        var groups     = {};
        var standalone = [];

        containers.forEach(function (c) {
            if (c.compose) {
                if (!groups[c.compose]) groups[c.compose] = [];
                groups[c.compose].push(c);
            } else {
                standalone.push(c);
            }
        });

        var projectNames = Object.keys(groups).sort();
        var isFirst = true;

        projectNames.forEach(function (project) {
            if (!isFirst) containersTbody.appendChild(buildDivider());
            isFirst = false;

            var headerRow  = buildGroupHeader(project, groups[project], actions);
            containersTbody.appendChild(headerRow);

            var memberRows = [];
            groups[project].forEach(function (container) {
                var row = buildRow(container, actions);
                row.style.display = 'none'; // collapsed by default
                memberRows.push(row);
                containersTbody.appendChild(row);
            });

            setupGroupToggle(headerRow, memberRows);
        });

        // Standalone containers — always visible, no toggle
        if (standalone.length > 0) {
            if (!isFirst) containersTbody.appendChild(buildDivider());
            standalone.forEach(function (container) {
                containersTbody.appendChild(buildRow(container, actions));
            });
        }
    }

    // ── Container table ────────────────────────────────────────────────────────

    function renderContainers(containers, actions) {
        containersTbody.innerHTML = '';

        if (containerCount) {
            var running = containers.filter(function (c) { return c.state === 'running'; }).length;
            var total   = containers.length;
            containerCount.textContent = total > 0
                ? running + ' running, ' + (total - running) + ' stopped'
                : '';
        }

        if (containers.length === 0) {
            showSection(noContainersSection);
            return;
        }

        var hasGroups = containers.some(function (c) { return c.compose; });

        if (hasGroups) {
            renderGrouped(containers, actions);
        } else {
            containers.forEach(function (container) {
                containersTbody.appendChild(buildRow(container, actions));
            });
        }

        showSection(containersSection);
    }

    // ── Export ──────────────────────────────────────────────────────────────────

    Portly.render = {
        showSection:           showSection,
        showError:             showError,
        showLoading:           showLoading,
        renderContainers:      renderContainers,
        setAllButtonsDisabled: setAllButtonsDisabled
    };
})();
