# Portly

A clean, modern Docker container manager for Cockpit that properly handles Content Security Policy (CSP) and follows PatternFly design guidelines.

**"Portly"** - because it manages your container ports and keeps your Docker environment shipshape! ⚓🐳

## Features

- ✅ **CSP Compliant**: No inline styles or scripts
- ✅ **PatternFly 6**: Modern, consistent UI
- ✅ **Real-time Updates**: Auto-refresh every 30 seconds
- ✅ **Container Management**: Start, stop, restart, update, delete containers
- ✅ **Log Viewing**: View container logs with ANSI colour rendering
- ✅ **Compose Viewer**: View docker-compose files for compose-managed containers
- ✅ **Smart Port Links**: Auto-detect HTTP/HTTPS with manual override
- ✅ **Dark Mode**: Matches Cockpit's dark theme
- ✅ **Responsive**: Works on all screen sizes

## Installation

### Option 1: Using the installer (recommended)

```bash
sudo bash install.sh
```

### Option 2: Manual system-wide installation

```bash
sudo mkdir -p /usr/share/cockpit/portly/ui /usr/share/cockpit/portly/backend
sudo cp manifest.json index.html po.js po.manifest.js icon.svg /usr/share/cockpit/portly/
sudo cp ui/* /usr/share/cockpit/portly/ui/
sudo cp backend/* /usr/share/cockpit/portly/backend/
sudo systemctl restart cockpit
```

### Option 3: User-specific installation

```bash
mkdir -p ~/.local/share/cockpit/portly/ui ~/.local/share/cockpit/portly/backend
cp manifest.json index.html po.js po.manifest.js icon.svg ~/.local/share/cockpit/portly/
cp ui/* ~/.local/share/cockpit/portly/ui/
cp backend/* ~/.local/share/cockpit/portly/backend/
```

Then restart Cockpit or just refresh your browser.

## Requirements

- Cockpit 276 or newer
- Docker installed and running
- User must have permissions to run Docker commands (or sudo access)

## File Structure

```
portly/
├── index.html             # Main UI structure & script loading
├── manifest.json          # Cockpit plugin metadata
├── install.sh             # Installation script
├── icon.svg               # Sidebar icon
├── po.js                  # Cockpit i18n stub
├── po.manifest.js         # Cockpit i18n manifest stub
├── ui/                    # Presentation layer
│   ├── base.css           # Body, layout, toolbar, title, utilities
│   ├── components.css     # Buttons, table, badges, alerts, spinner
│   ├── ports.css          # Port links & protocol toggle
│   ├── modals.css         # Backdrop, modal box, close button, text viewer
│   ├── kebab.css          # Kebab button & context menu
│   ├── darkmode.js        # Cockpit theme synchronisation
│   ├── ports.js           # Port parsing & protocol toggle
│   ├── textviewer.js      # Generic text viewer modal (logs, compose)
│   ├── modals.js          # Confirm dialog
│   ├── kebab.js           # Context menu component
│   └── render.js          # Table rendering & section toggling
├── backend/               # Logic layer
│   ├── docker.js          # Thin Docker CLI wrapper (one function per command)
│   ├── containers.js      # Container orchestration (update, rollback, compose)
│   └── main.js            # Controller — wires UI to backend
└── README.md
```

## Architecture

The plugin is split into two layers with a clean boundary:

- **`ui/`** handles everything visual: CSS, DOM rendering, dark mode, modals, menus. UI modules expose their API on `window.Portly` (e.g. `Portly.render`, `Portly.textViewer`).

- **`backend/`** has two layers: `docker.js` is a thin CLI wrapper (one function per Docker command, returns the cockpit proc), while `containers.js` composes those calls into higher-level operations like update-with-rollback, compose file resolution, and output parsing.

- **`backend/main.js`** is the controller that ties everything together: it defines the action map, sets up event listeners, and manages the refresh cycle.

## Key Improvements Over Default Docker Module

1. **No CSP Violations**: All styles are in external CSS files
2. **No Terminal.js Issues**: Uses native Cockpit spawn API
3. **Proper MIME Types**: All resources served correctly
4. **Better Error Handling**: Clear error messages
5. **Modern UI**: PatternFly 6 components
6. **Modular Code**: Clean separation of UI and backend logic

## Usage

After installation:

1. Navigate to your Cockpit interface (usually https://your-server:9090)
2. Look for "Portly" in the sidebar
3. View all containers with their status
4. Use the kebab menu (⋮) or right-click to:
   - Start / Stop / Restart containers
   - Update containers (pull + recreate)
   - View logs (with ANSI colour support)
   - View compose files
   - Delete containers

## Troubleshooting

### Docker command not found
Ensure Docker is installed:
```bash
sudo apt install docker.io  # Debian/Ubuntu
sudo dnf install docker     # Fedora/RHEL
```

### Permission denied
Add your user to the docker group:
```bash
sudo usermod -aG docker $USER
```

### Plugin not showing
Check Cockpit logs:
```bash
sudo journalctl -u cockpit -f
```

## Development

To modify the plugin:

1. Edit files in the plugin directory
2. Refresh your browser (Ctrl+Shift+R)
3. Check browser console for errors

## License

This is a custom Cockpit plugin. Cockpit itself is licensed under LGPL 2.1+.
