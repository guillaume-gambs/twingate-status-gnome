#!/usr/bin/env bash

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

EXTENSION_DIR=~/.local/share/gnome-shell/extensions/twingate-status@guillaume-gambs.github.io

echo -e "${YELLOW}Installing Twingate Status extension...${NC}\n"

for tool in glib-compile-schemas msgfmt zip; do
    if ! command -v "$tool" &> /dev/null; then
        echo -e "${RED}Error: $tool is not installed${NC}"
        echo "Install it with:"
        echo "  Ubuntu/Debian: sudo apt install libglib2.0-dev-bin gettext zip"
        echo "  Arch/Manjaro: sudo pacman -S glib2 gettext zip"
        echo "  Fedora: sudo dnf install glib2-devel gettext zip"
        exit 1
    fi
done

echo -e "${GREEN}Building extension...${NC}"
"$(dirname "$0")/build.sh"

# Replace any previous install so removed files do not linger
echo -e "${GREEN}Copying files...${NC}"
rm -rf "$EXTENSION_DIR"
mkdir -p "$EXTENSION_DIR"
cp -r "$(dirname "$0")/build/." "$EXTENSION_DIR/"

echo -e "${GREEN}Compiling GSettings schemas...${NC}"
glib-compile-schemas "$EXTENSION_DIR/schemas/"

if [ -f "$EXTENSION_DIR/schemas/gschemas.compiled" ]; then
    echo -e "${GREEN}✓ gschemas.compiled created${NC}"
else
    echo -e "${RED}✗ gschemas.compiled was not created${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Installation complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Restart GNOME Shell:"
if [ "$XDG_SESSION_TYPE" = "x11" ]; then
    echo -e "   ${GREEN}Alt+F2, type 'r', press Enter${NC}"
else
    echo -e "   ${YELLOW}Log out and log back in (Wayland)${NC}"
fi
echo ""
echo "2. Enable the extension:"
echo -e "   ${GREEN}gnome-extensions enable twingate-status@guillaume-gambs.github.io${NC}"
echo ""
echo "3. Check logs if needed:"
echo -e "   ${GREEN}journalctl -f -o cat /usr/bin/gnome-shell | grep -i twingate${NC}"
echo ""