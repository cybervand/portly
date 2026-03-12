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

    // ── Container table ────────────────────────────────────────────────────────

    /** Render the full container table.
     *  @param {Array}  containers - parsed container list
     *  @param {Object} actions    - handler map passed through to kebab menu
     */
    function renderContainers(containers, actions) {
        containersTbody.innerHTML = '';

        // Update header count
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

        containers.forEach(function (container) {
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

            containersTbody.appendChild(row);
        });

        showSection(containersSection);
    }

    // ── Export ──────────────────────────────────────────────────────────────────

    Portly.render = {
        showSection:          showSection,
        showError:            showError,
        showLoading:          showLoading,
        renderContainers:     renderContainers,
        setAllButtonsDisabled: setAllButtonsDisabled
    };
})();
