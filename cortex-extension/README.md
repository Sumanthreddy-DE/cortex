# Cortex Chrome Extension

Saves the current tab to Cortex with one keystroke. Items land in the **Inbox** column instantly.

## Load in Chrome

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this `cortex-extension/` folder
5. Done — the Cortex icon appears in your toolbar

## Usage

| Action | How |
|---|---|
| Save current tab | `Ctrl+Shift+S` (or click the extension icon) |
| Close without saving | `Escape` |
| Save | `Enter` |

## Auto-detected tags

The extension auto-suggests tags based on the URL:

| URL pattern | Tag |
|---|---|
| github.com | GitHub |
| youtube.com | YouTube |
| linkedin.com/jobs | Full-time |
| linkedin.com | LinkedIn |
| twitter.com / x.com | Twitter |
| reddit.com | Reddit |
| medium.com / substack.com | Reading |
| arxiv.org | Research |
| stackoverflow.com | Dev |
| figma.com | Design |
| npmjs.com | NPM |

You can remove or add tags before saving.

## Requirements

- Cortex desktop app must be running (check system tray)
- If not running: popup shows "Cortex isn't running — launch it from the system tray."

## Customize keyboard shortcut

Chrome → `chrome://extensions/shortcuts` → find Cortex → change the shortcut.
