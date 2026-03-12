/* Portly – Docker CLI wrapper
   One function per Docker command.  Returns the cockpit proc so callers
   can attach .done() / .fail() or cancel with .close(). */

(function () {
    'use strict';
    window.Portly = window.Portly || {};

    var cockpit = window.cockpit;

    /** docker ps -a  (custom format, pipe-delimited) */
    function ps() {
        return cockpit.spawn([
            'docker', 'ps', '-a',
            '--format', '{{.ID}}|{{.Image}}|{{.Command}}|{{.CreatedAt}}|{{.Status}}|{{.Ports}}|{{.Names}}'
        ], { superuser: 'try' });
    }

    /** docker start <name> */
    function start(name) {
        return cockpit.spawn(['docker', 'start', name], { superuser: 'try' });
    }

    /** docker stop <name> */
    function stop(name) {
        return cockpit.spawn(['docker', 'stop', name], { superuser: 'try' });
    }

    /** docker restart <name> */
    function restart(name) {
        return cockpit.spawn(['docker', 'restart', name], { superuser: 'try' });
    }

    /** docker rm -f <name> */
    function rm(name) {
        return cockpit.spawn(['docker', 'rm', '-f', name], { superuser: 'try' });
    }

    /** docker rename <from> <to> */
    function rename(from, to) {
        return cockpit.spawn(['docker', 'rename', from, to], { superuser: 'try' });
    }

    /** docker inspect <name>  — returns raw JSON string */
    function inspect(name) {
        return cockpit.spawn(['docker', 'inspect', name], { superuser: 'try' });
    }

    /** docker pull <image> */
    function pull(image) {
        return cockpit.spawn(['docker', 'pull', image], { superuser: 'try', err: 'message' });
    }

    /** docker run -d [args...] <image> */
    function run(args) {
        return cockpit.spawn(args, { superuser: 'try' });
    }

    /** docker logs --tail <n> <name>  (stderr merged into stdout) */
    function logs(name, tail) {
        tail = tail || 500;
        return cockpit.spawn(
            ['docker', 'logs', '--tail', String(tail), name],
            { superuser: 'try', err: 'out' }
        );
    }

    /** Read a file via cat (used for compose files, etc.) */
    function readFile(path) {
        return cockpit.spawn(['cat', path], { superuser: 'try', err: 'out' });
    }

    // ── Export ──────────────────────────────────────────────────────────────────

    Portly.docker = {
        ps:       ps,
        start:    start,
        stop:     stop,
        restart:  restart,
        rm:       rm,
        rename:   rename,
        inspect:  inspect,
        pull:     pull,
        run:      run,
        logs:     logs,
        readFile: readFile
    };
})();
