#!/usr/bin/env bash

set -euo pipefail

echo "Optional Homebrew pathway for NavaFit prototype"
echo "This is optional. Current app build does not require Homebrew."
echo

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This pathway is for macOS only."
  exit 0
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew: not installed"
  echo
  echo "Manual install command:"
  echo '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
  echo
  if [[ "${AUTO_INSTALL_BREW:-0}" == "1" ]]; then
    if sudo -n true 2>/dev/null; then
      echo "Attempting non-interactive Homebrew install..."
      NONINTERACTIVE=1 /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    else
      echo "Auto install skipped: sudo password is required in an interactive terminal."
      exit 0
    fi
  else
    echo "Skipping automatic install. Set AUTO_INSTALL_BREW=1 to attempt auto-install."
    exit 0
  fi
fi

echo "Homebrew: installed"
brew --version | head -n 1
echo

if ! command -v watchman >/dev/null 2>&1; then
  echo "Installing watchman (optional)..."
  brew install watchman
else
  echo "watchman: already installed"
fi

if [[ "${INSTALL_COCOAPODS:-0}" == "1" ]]; then
  if ! command -v pod >/dev/null 2>&1; then
    echo "Installing cocoapods (optional for this Capacitor SwiftPM project)..."
    brew install cocoapods
  else
    echo "cocoapods: already installed"
  fi
else
  echo "Skipping cocoapods install. Set INSTALL_COCOAPODS=1 to include it."
fi

echo
echo "Optional Homebrew pathway completed."
