/* Portly – Container operations
   Higher-level logic that composes multiple Docker CLI calls.
   Depends on Portly.docker for all CLI access. */

(function () {
    'use strict';
    window.Portly = window.Portly || {};

    var docker = null;  // resolved lazily so load order doesn't matter

    function cli() {
        if (!docker) docker = Portly.docker;
        return docker;
    }

    // ── Parsing ────────────────────────────────────────────────────────────────

    function extractComposeProject(labelsStr) {
        if (!labelsStr) return '';
        var match = labelsStr.match(/(?:^|,)com\.docker\.compose\.project=([^,]+)/);
        return match ? match[1].trim() : '';
    }

    function parseDockerPs(output) {
        var lines = output.trim().split('\n');
        if (lines.length === 0 || lines[0] === '') return [];

        var containers = [];

        for (var i = 0; i < lines.length; i++) {
            var parts = lines[i].split('|');
            if (parts.length >= 7) {
                var status = parts[4].trim();
                var state  = 'stopped';
                if (status.includes('Paused'))    state = 'paused';
                else if (status.startsWith('Up')) state = 'running';

                containers.push({
                    id:      parts[0].trim(),
                    image:   parts[1].trim(),
                    created: parts[3].trim(),
                    status:  status,
                    ports:   parts[5].trim(),
                    name:    parts[6].trim(),
                    state:   state,
                    compose: extractComposeProject(parts[7] || '')
                });
            }
        }

        return containers;
    }

    // ── Container list ─────────────────────────────────────────────────────────

    function loadContainers(callbacks) {
        if (callbacks.onStart) callbacks.onStart();

        var proc = cli().ps();

        proc.done(function (output) {
            callbacks.onSuccess(parseDockerPs(output));
        });

        proc.fail(function (error) {
            console.error('Failed to list containers:', error);
            callbacks.onError('Failed to load containers. Is Docker installed and running?');
        });

        return proc;
    }

    // ── Simple lifecycle (thin callback wrappers) ──────────────────────────────

    function stopContainer(name, callbacks) {
        cli().stop(name)
            .done(function () { if (callbacks.onSuccess) callbacks.onSuccess(); })
            .fail(function (error) {
                console.error('Failed to stop container:', error);
                if (callbacks.onError) callbacks.onError('Failed to stop container: ' + name);
            });
    }

    function startContainer(name, callbacks) {
        cli().start(name)
            .done(function () { if (callbacks.onSuccess) callbacks.onSuccess(); })
            .fail(function (error) {
                console.error('Failed to start container:', error);
                if (callbacks.onError) callbacks.onError('Failed to start container: ' + name);
            });
    }

    function restartContainer(name, callbacks) {
        cli().restart(name)
            .done(function () { if (callbacks.onSuccess) callbacks.onSuccess(); })
            .fail(function (error) {
                console.error('Failed to restart container:', error);
                if (callbacks.onError) callbacks.onError('Failed to restart container: ' + name);
            });
    }

    function deleteContainer(name, callbacks) {
        cli().rm(name)
            .done(function () { if (callbacks.onSuccess) callbacks.onSuccess(); })
            .fail(function (error) {
                console.error('Failed to delete container:', error);
                if (callbacks.onError) callbacks.onError('Failed to delete container: ' + name);
            });
    }

    // ── Update container (pull → backup → recreate → cleanup) ──────────────────

    function updateContainer(name, image, callbacks) {
        if (callbacks.onStart) callbacks.onStart();

        var backupName = name + '_portly_backup';

        // Step 1: Inspect — get current config
        cli().inspect(name)
            .done(function (output) {
                try {
                    var info = JSON.parse(output)[0];
                    var wasRunning = info.State && info.State.Running;
                    pullAndRecreate(name, image, info, wasRunning, backupName, callbacks);
                } catch (e) {
                    console.error('Failed to parse container info:', e);
                    if (callbacks.onError) callbacks.onError('Failed to parse container configuration');
                    if (callbacks.onComplete) callbacks.onComplete();
                }
            })
            .fail(function (error) {
                console.error('Failed to inspect container:', error);
                if (callbacks.onError) callbacks.onError('Failed to get container details: ' + name);
                if (callbacks.onComplete) callbacks.onComplete();
            });
    }

    /** Step 2-5 of the update flow. */
    function pullAndRecreate(name, image, info, wasRunning, backupName, callbacks) {
        // Step 2: Pull latest image (container untouched at this point)
        cli().pull(image)
            .done(function () {

                // Step 3: Stop (if running) then rename as backup
                var afterStop = function () {
                    cli().rename(name, backupName)
                        .done(function () {
                            recreateFromBackup(name, image, info, wasRunning, backupName, callbacks);
                        })
                        .fail(function (error) {
                            console.error('Failed to rename container:', error);
                            if (callbacks.onError) callbacks.onError('Failed to prepare update for container: ' + name);
                            if (callbacks.onComplete) callbacks.onComplete();
                        });
                };

                if (wasRunning) {
                    cli().stop(name)
                        .done(afterStop)
                        .fail(function (error) {
                            console.error('Failed to stop container before update:', error);
                            if (callbacks.onError) callbacks.onError('Failed to stop container for update: ' + name);
                            if (callbacks.onComplete) callbacks.onComplete();
                        });
                } else {
                    afterStop();
                }
            })
            .fail(function (error) {
                // Pull failed before we touched anything — container is untouched
                console.error('Failed to pull image:', error);
                if (callbacks.onError) callbacks.onError('Failed to pull latest image: ' + image + '. Container was not modified.');
                if (callbacks.onComplete) callbacks.onComplete();
            });
    }

    /** Step 4-5: create new container, clean up or rollback. */
    function recreateFromBackup(name, image, info, wasRunning, backupName, callbacks) {
        var args = buildRunArgs(name, image, info);

        cli().run(args)
            .done(function () {
                // Step 5: New container confirmed — remove backup
                cli().rm(backupName);
                if (callbacks.onSuccess) callbacks.onSuccess();
            })
            .fail(function (error) {
                console.error('Failed to recreate container:', error);
                rollback(backupName, name, wasRunning, callbacks);
            });
    }

    /** Build a `docker run -d …` argument array from inspect data. */
    function buildRunArgs(name, image, info) {
        var args = ['docker', 'run', '-d', '--name', name];

        // Port mappings
        if (info.HostConfig && info.HostConfig.PortBindings) {
            var bindings = info.HostConfig.PortBindings;
            for (var containerPort in bindings) {
                if (!bindings.hasOwnProperty(containerPort)) continue;
                var hostBindings = bindings[containerPort];
                if (hostBindings) {
                    hostBindings.forEach(function (binding) {
                        var hostIp   = binding.HostIp || '';
                        var hostPort = binding.HostPort;
                        var spec = hostIp
                            ? hostIp + ':' + hostPort + ':' + containerPort
                            : hostPort + ':' + containerPort;
                        args.push('-p', spec);
                    });
                }
            }
        }

        // Volumes
        if (info.Mounts) {
            info.Mounts.forEach(function (mount) {
                if (mount.Type === 'bind')        args.push('-v', mount.Source + ':' + mount.Destination);
                else if (mount.Type === 'volume') args.push('-v', mount.Name   + ':' + mount.Destination);
            });
        }

        // Environment
        if (info.Config && info.Config.Env) {
            info.Config.Env.forEach(function (env) { args.push('-e', env); });
        }

        // Restart policy
        if (info.HostConfig && info.HostConfig.RestartPolicy) {
            var policy   = info.HostConfig.RestartPolicy.Name;
            var maxRetry = info.HostConfig.RestartPolicy.MaximumRetryCount;
            if (policy && policy !== 'no') {
                var policyArg = (policy === 'on-failure' && maxRetry) ? 'on-failure:' + maxRetry : policy;
                args.push('--restart', policyArg);
            }
        }

        args.push(image);
        return args;
    }

    /** Restore the backup container after a failed update. */
    function rollback(backupName, originalName, wasRunning, callbacks) {
        cli().rename(backupName, originalName)
            .done(function () {
                if (wasRunning) cli().start(originalName);
                if (callbacks.onError) callbacks.onError('Update failed \u2014 original container \u201C' + originalName + '\u201D has been restored.');
                if (callbacks.onComplete) callbacks.onComplete();
            })
            .fail(function () {
                if (callbacks.onError) callbacks.onError('Update failed and restore also failed. Backup container is named \u201C' + backupName + '\u201D.');
                if (callbacks.onComplete) callbacks.onComplete();
            });
    }

    // ── Bulk operations ────────────────────────────────────────────────────────

    function stopAll(names, callbacks) {
        var remaining = names.length;
        var failed    = 0;

        if (remaining === 0) {
            if (callbacks.onSuccess) callbacks.onSuccess();
            return;
        }

        names.forEach(function (name) {
            cli().stop(name)
                .done(function () {
                    remaining--;
                    if (remaining === 0) {
                        if (failed > 0) {
                            if (callbacks.onError) callbacks.onError('Some containers failed to stop');
                        } else {
                            if (callbacks.onSuccess) callbacks.onSuccess();
                        }
                    }
                })
                .fail(function (error) {
                    console.error('Failed to stop container:', name, error);
                    failed++;
                    remaining--;
                    if (remaining === 0) {
                        if (callbacks.onError) callbacks.onError('Some containers failed to stop');
                    }
                });
        });
    }

    function deleteAll(names, callbacks) {
        var remaining = names.length;
        var failed    = 0;

        if (remaining === 0) {
            if (callbacks.onSuccess) callbacks.onSuccess();
            return;
        }

        names.forEach(function (name) {
            cli().rm(name)
                .done(function () {
                    remaining--;
                    if (remaining === 0) {
                        if (failed > 0) {
                            if (callbacks.onError) callbacks.onError('Some containers failed to delete');
                        } else {
                            if (callbacks.onSuccess) callbacks.onSuccess();
                        }
                    }
                })
                .fail(function (error) {
                    console.error('Failed to delete container:', name, error);
                    failed++;
                    remaining--;
                    if (remaining === 0) {
                        if (callbacks.onError) callbacks.onError('Some containers failed to delete');
                    }
                });
        });
    }

    // ── Data fetching (for text viewer) ────────────────────────────────────────

    function fetchLogs(name, callbacks) {
        cli().logs(name)
            .done(function (output) { if (callbacks.onSuccess) callbacks.onSuccess(output); })
            .fail(function (error) {
                console.error('Failed to get logs:', error);
                if (callbacks.onError) callbacks.onError('Failed to load logs: ' + error);
            });
    }

    function fetchComposeFile(name, callbacks) {
        cli().inspect(name)
            .done(function (output) {
                try {
                    var info   = JSON.parse(output)[0];
                    var labels = (info.Config && info.Config.Labels) ? info.Config.Labels : {};

                    var configFiles = labels['com.docker.compose.project.config_files'];
                    var workingDir  = labels['com.docker.compose.project.working_dir'];
                    var projectName = labels['com.docker.compose.project'];

                    if (!configFiles && !workingDir) {
                        callbacks.onSuccess(null, null, 'This container was not started by Docker Compose\n(no compose labels found).');
                        return;
                    }

                    var composePath = configFiles
                        ? configFiles.split(',')[0].trim()
                        : workingDir + '/docker-compose.yml';

                    cli().readFile(composePath)
                        .done(function (fileContent) {
                            callbacks.onSuccess(projectName, composePath, fileContent || '(empty file)');
                        })
                        .fail(function (error) {
                            callbacks.onError('Could not read compose file at:\n' + composePath + '\n\n' + error);
                        });

                } catch (e) {
                    callbacks.onError('Failed to parse container info: ' + e.message);
                }
            })
            .fail(function (error) {
                callbacks.onError('Failed to inspect container: ' + error);
            });
    }

    // ── Export ──────────────────────────────────────────────────────────────────

    Portly.containers = {
        loadContainers:   loadContainers,
        stopContainer:    stopContainer,
        startContainer:   startContainer,
        restartContainer: restartContainer,
        updateContainer:  updateContainer,
        deleteContainer:  deleteContainer,
        stopAll:          stopAll,
        deleteAll:        deleteAll,
        fetchLogs:        fetchLogs,
        fetchComposeFile: fetchComposeFile
    };
})();
