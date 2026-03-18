# Optional Homebrew Pathway

This project can build and run without Homebrew.
Homebrew is optional for extra tools like Watchman and CocoaPods.

## Why optional?

- Current stack: React + Capacitor + SwiftPM.
- iOS prototype build already works with Xcode and Node.
- CocoaPods is not required for the current plugin setup.

## Run the optional setup script

From project root:

```bash
npm run setup:optional:brew
```

## What the script does

1. Checks if Homebrew is installed.
2. If missing, prints the official install command.
3. Optionally auto-installs Homebrew if:
   - `AUTO_INSTALL_BREW=1`, and
   - your terminal already has sudo access.
4. Installs Watchman if Homebrew exists.
5. Installs CocoaPods only if `INSTALL_COCOAPODS=1`.

## Optional environment flags

```bash
AUTO_INSTALL_BREW=1 npm run setup:optional:brew
INSTALL_COCOAPODS=1 npm run setup:optional:brew
AUTO_INSTALL_BREW=1 INSTALL_COCOAPODS=1 npm run setup:optional:brew
```

## Manual fallback (if auto install is blocked)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install watchman
brew install cocoapods
```
