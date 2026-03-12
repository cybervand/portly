#!/bin/bash

# Portly - Docker Container Manager Installation Script

set -e

PLUGIN_NAME="portly"
INSTALL_DIR="/usr/share/cockpit/$PLUGIN_NAME"

echo "======================================"
echo "Portly Installer"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Check if Cockpit is installed
if ! command -v cockpit-bridge &> /dev/null; then
    echo "❌ Cockpit is not installed. Please install Cockpit first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. The plugin will not work without Docker."
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "📦 Installing Portly to $INSTALL_DIR..."

# Create directories
mkdir -p "$INSTALL_DIR/ui"
mkdir -p "$INSTALL_DIR/backend"

# Copy root files
cp manifest.json "$INSTALL_DIR/"
cp index.html "$INSTALL_DIR/"
cp po.js "$INSTALL_DIR/"
cp po.manifest.js "$INSTALL_DIR/"
cp icon.svg "$INSTALL_DIR/"

# Copy UI files
cp ui/base.css "$INSTALL_DIR/ui/"
cp ui/components.css "$INSTALL_DIR/ui/"
cp ui/ports.css "$INSTALL_DIR/ui/"
cp ui/modals.css "$INSTALL_DIR/ui/"
cp ui/kebab.css "$INSTALL_DIR/ui/"
cp ui/darkmode.js "$INSTALL_DIR/ui/"
cp ui/ports.js "$INSTALL_DIR/ui/"
cp ui/textviewer.js "$INSTALL_DIR/ui/"
cp ui/modals.js "$INSTALL_DIR/ui/"
cp ui/kebab.js "$INSTALL_DIR/ui/"
cp ui/render.js "$INSTALL_DIR/ui/"

# Copy backend files
cp backend/docker.js "$INSTALL_DIR/backend/"
cp backend/containers.js "$INSTALL_DIR/backend/"
cp backend/main.js "$INSTALL_DIR/backend/"

# Set permissions
chmod -R 644 "$INSTALL_DIR"
chmod 755 "$INSTALL_DIR" "$INSTALL_DIR/ui" "$INSTALL_DIR/backend"

echo "✅ Installation complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Restart Cockpit: systemctl restart cockpit"
echo "   2. Open Cockpit in your browser"
echo "   3. Look for 'Portly' in the sidebar"
echo ""
echo "🔧 If you don't see the plugin:"
echo "   - Check: journalctl -u cockpit -f"
echo "   - Clear browser cache and refresh"
echo ""
