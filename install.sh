#!/bin/bash

set -e

DOTFILES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Brew packages ────────────────────────────────────────────────────────────
install_brew_packages() {
  echo ">>> Installing Homebrew packages..."
  bash "$DOTFILES_DIR/mac-tools/brew-setup.sh"
}

# ── VSCode extensions ────────────────────────────────────────────────────────
install_vscode_extensions() {
  echo ">>> Installing VSCode extensions..."

  if ! command -v code &>/dev/null; then
    echo "  [skip] 'code' CLI not found — install VSCode and add it to PATH first."
    return
  fi

  # Strip comments and blank lines, extract quoted extension IDs
  grep -oE '"[a-zA-Z0-9_.-]+\.[a-zA-Z0-9_.-]+"' \
    "$DOTFILES_DIR/vscode/extensions.json" | tr -d '"' | while read -r ext; do
    echo "  installing $ext"
    code --install-extension "$ext" --force 2>/dev/null
  done
}

# ── zshrc ────────────────────────────────────────────────────────────────────
setup_zshrc() {
  echo ">>> Setting up .zshrc..."

  local src="$DOTFILES_DIR/zsh-setup/.zshrc"
  local dst="$HOME/.zshrc"

  if [ -f "$dst" ] && [ ! -L "$dst" ]; then
    echo "  backing up existing ~/.zshrc to ~/.zshrc.bak"
    mv "$dst" "$dst.bak"
  fi

  ln -sf "$src" "$dst"
  echo "  symlinked $src → $dst"
}

# ── VSCode settings ──────────────────────────────────────────────────────────
setup_vscode_settings() {
  echo ">>> Setting up VSCode settings..."

  local vscode_user_dir="$HOME/Library/Application Support/Code/User"

  if [ ! -d "$vscode_user_dir" ]; then
    echo "  [skip] VSCode user directory not found."
    return
  fi

  for file in settings.json keybindings.json; do
    local src="$DOTFILES_DIR/vscode/$file"
    local dst="$vscode_user_dir/$file"
    ln -sf "$src" "$dst"
    echo "  symlinked $src → $dst"
  done
}

# ── Main ─────────────────────────────────────────────────────────────────────
main() {
  echo "=============================="
  echo "   Dotfiles Install Script    "
  echo "=============================="

  install_brew_packages
  install_vscode_extensions
  setup_zshrc
  setup_vscode_settings

  echo ""
  echo "=============================="
  echo "   All done!                  "
  echo "=============================="
}

main
