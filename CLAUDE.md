# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A GNOME Shell extension (GJS, ES modules, GNOME 46-51) that shows Twingate connection status in the top bar. UUID: `twingate-status@guillaume-gambs.github.io`. There is no test suite. The only build step is `build.sh`, which compiles `po/*.po` into `locale/` and zips the result.

## Commands

```bash
npm ci                      # dev deps only (eslint)
npx eslint .                # lint
./build.sh                  # build/ + <uuid>.zip (the file uploaded to EGO)
./install.sh                # build.sh, then replace ~/.local/share/gnome-shell/extensions/<uuid>/ and compile schemas
gnome-extensions enable twingate-status@guillaume-gambs.github.io
gnome-extensions prefs twingate-status@guillaume-gambs.github.io   # open prefs window
journalctl -f -o cat /usr/bin/gnome-shell | grep -i twingate        # runtime logs
```

After reinstalling, `extension.js` changes need a shell restart (logout/login on Wayland, Alt+F2 `r` on X11). `prefs.js` runs in a separate process and only needs the prefs window reopened.

Smoke test without touching the running session: copy `build/` into a scratch `XDG_DATA_HOME`, then run `dbus-run-session` with scratch `XDG_CONFIG_HOME`/`XDG_CACHE_HOME`. Inside it, set `org.gnome.shell enabled-extensions` with `gsettings` and start `gnome-shell --headless --unsafe-mode --virtual-monitor 1280x800 --wayland-display=<unique>`. `org.gnome.Shell.Eval` can then inspect `Main.panel.statusArea['<uuid>']`, and `org.gnome.Shell.Extensions.GetExtensionErrors` reports load errors. Put stub `twingate`/`pkexec` scripts first in `PATH` to avoid touching the real Twingate or popping a polkit prompt on the host.

To test a GNOME release newer than the host, run the same thing in a Fedora container that ships it (`fedora:45` = GNOME 51). The container needs: a user matching your uid (dbus-daemon refuses unknown uids), `/etc/machine-id`, a system bus (`dbus-daemon --system --fork` as root), and `rm -rf /run/systemd/seats` so the shell uses its dummy login manager instead of requiring logind.

`build.sh` holds the only list of shipped files. `install.sh` and `.github/workflows/zip-to-publish.yml` (runs on GitHub release creation) both call it. A new source file only needs adding there.

CI: `.github/workflows/lint.yml` runs `npm ci`, `npx eslint .` and `./build.sh` on every PR and push to `main`. Renovate (`renovate.json`) groups devDependency minor/patch updates weekly and automerges them and GitHub Actions bumps once that check passes. Major npm updates stay manual.

## Architecture

Two JS modules, two processes:

- `extension.js` runs inside gnome-shell. `TwingateStatusIndicatorExtension` creates a `TwingateIndicator` (`PanelMenu.Button`) on `enable()` and calls only `indicator.destroy()` in `disable()`. The indicator overrides `destroy()` to cancel its `Gio.Cancellable`, remove timers and signal handlers, then call `super.destroy()`.
- `prefs.js` runs in the separate prefs process (GTK4 + libadwaita). It cannot import shell modules (`resource:///org/gnome/shell/...`) and the shell cannot import GTK.

### Translations

Native gettext. `metadata.json` sets `gettext-domain` (= UUID). `ExtensionBase` calls `initTranslations()` itself and binds `locale/` from the extension dir, so both files just import `gettext as _` from the shell's `extension.js` / `prefs.js` modules. Sources are `po/<lang>.po` plus the template `po/<uuid>.pot` (regeneration commands are in README "Localization"). The language follows the system locale. There is no per-extension language override, and none should come back (EGO asked for gettext, and a module-level translator singleton was flagged as leaking past `disable()`).

### Twingate interaction

All state comes from shelling out to the `twingate` CLI via `Gio.Subprocess`:

- `twingate status` -> output substring match (`online` / `authenticating` / else `not-running`) drives `_setStatus()`, which swaps the icon CSS class (`twingate_on` / `twingate_authenticating` / `twingate_off`, icons are CSS `background-image` in `stylesheet.css`) and menu labels.
- `twingate resources` -> parsed by column offsets from the header line (`ADDRESS`, `ALIAS`, `AUTH STATUS`), with a fallback split on 2+ spaces. Auth state is inferred from the auth column text (`auth expires` / `pending`).
- `twingate version` -> regex `twingate X | Y`.
- Start/stop: `pkexec twingate service-start|stop` + unprivileged `twingate desktop-start|stop`. Prefs read/write config via `pkexec twingate config [key value]`.

All reads go through `_run()`, which uses promisified `communicate_utf8_async` with the indicator's cancellable. Never use sync `communicate_utf8()` in `extension.js`: it blocks the whole shell while the CLI runs. After any `await`, code must expect a CANCELLED error (indicator destroyed, see `isCancelled()`) and re-check `this._status`, since it may have changed while the command ran. `prefs.js` still uses sync calls, which only block the prefs window.

### Polling and timers

- Status poll: `_addStatusWatch(interval)` ticks `_pollStatus()` every 10s. `_statusPending` skips a tick while a previous `twingate status` is still running. Any status change goes through `_onStatusChanged()`, which refreshes resources.
- Clicking Connect/Disconnect sets `_fastPollTicks = 0` and polls at 1s until the status changes, or for at most `MAX_FAST_POLL_TICKS`, e.g. when the polkit prompt is dismissed. It then drops back to 10s.
- Resource refresh: a one-shot `GLib.timeout_add` re-armed by `_scheduleResourceUpdate()` after each fetch, interval from GSettings `resource-refresh-interval` (seconds, 30-600).
- Every timeout source id and signal handler id must be removed in `destroy()`. Timer leaks were a past bug (commit c6e77d5).

### GSettings

Schema `org.gnome.shell.extensions.twingate-status` in `schemas/` (single key: `resource-refresh-interval`). Only the `.xml` is shipped in the release zip. Compiled schemas must not be committed or zipped (EGO-P-006); `install.sh` compiles locally.

## extensions.gnome.org (EGO) review constraints

The extension is published on EGO and recent commits address reviewer feedback. Keep to these:

- No `log()`. Use `console.error()` for failures of user-triggered actions and `console.debug()` for everything else (recurring CLI failures, diagnostics). Logs must stay silent outside debug mode.
- No `Extension.lookupByUUID()`; pass the extension instance down (done for `openPreferences()`).
- Every `pkexec` call needs a justification comment explaining why root is required.
- `metadata.json` has no `version` field (EGO manages it). Update `shell-version` when supporting a new GNOME release.
- St API differences across the supported range go through small helpers. `createVerticalBox()` exists because `St.BoxLayout:vertical` was removed in 51 while its replacement `orientation` only exists since 48.
- Create objects in `enable()`, not at module load. Nothing may stay alive in module scope after `disable()`. The module-level `Gio._promisify` call is the standard accepted exception.

All code, comments, and docs in English.
