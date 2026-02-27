# Contributing to Tunet

Thank you for your interest in contributing to Tunet!

## How to Contribute

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally.
3.  **Create a new branch** for your feature or bugfix.
4.  **Make your changes**.
5.  **Run the app** locally to test: `npm run dev`.
6.  **Commit your changes** with a clear message.
7.  **Push to your fork** and submit a **Pull Request**.

## Guidelines

- Follow the existing code style.
- Keep pull requests focused on a single feature or fix.
- Update documentation if necessary.
- For translations, add/update keys in `src/i18n/en.json` first, then keep all maintained locale files in sync: `src/i18n/nb.json`, `src/i18n/nn.json`, `src/i18n/sv.json`, and `src/i18n/de.json`.
- Run `npm run i18n:check` before opening a PR.

## Releases (short checklist)

- Keep app and addon versions in lockstep (same version in `package.json` and `hassio-addon/config.yaml`).
- Use release scripts from repo root:
  - `npm run release:prep -- --version X.Y.Z --date YYYY-MM-DD`
  - `npm run release:check`
  - `npm test`
  - `npm run build`
  - `npm run release:publish`
- If release check fails, fix sync/changelog mismatches before tagging.
- Update static Settings fallback version in `src/modals/ConfigModal.jsx` (`SETTINGS_STATIC_VERSION`) for each release.

## Reporting Issues

If you find a bug or have a suggestion, please open an issue on the GitHub repository.
