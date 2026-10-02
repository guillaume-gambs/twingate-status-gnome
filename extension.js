import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async');

const FAST_POLL_INTERVAL = 1000;
const SLOW_POLL_INTERVAL = 10000;
// Stop fast polling after this many ticks, e.g. when the polkit prompt is dismissed
const MAX_FAST_POLL_TICKS = 60;

export default class TwingateStatusIndicatorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._indicator = new TwingateIndicator(this._settings, this);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
        this._settings = null;
    }
}

function isCancelled(e) {
    return e instanceof GLib.Error && e.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED);
}

const TwingateIndicator = GObject.registerClass(
    class TwingateIndicator extends PanelMenu.Button {
        constructor(settings, extension) {
            super(0.0, 'Twingate Status Indicator');

            this._extension = extension;
            this._settings = settings;
            this._cancellable = new Gio.Cancellable();
            this._iconNameOnline = 'twingate_on';
            this._iconNameAuthenticating = 'twingate_authenticating';
            this._iconNameOffline = 'twingate_off';
            this._fastPollTicks = null;
            this._statusPending = false;

            this._resourceRefreshInterval = this._settings.get_int('resource-refresh-interval') * 1000;

            this._settingsChangedId = this._settings.connect('changed::resource-refresh-interval', () => {
                this._resourceRefreshInterval = this._settings.get_int('resource-refresh-interval') * 1000;
                if (this._status === 'online') {
                    this._updateResourcesList();
                }
            });

            this._status = 'not-running';

            this.icon = new St.Icon({
                style_class: this._iconNameOffline,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this.icon);

            this._statusSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this._statusSection);

            this._statusLabel = new St.Label({
                text: _('Disconnected'),
                style_class: 'twingate-status-label'
            });

            this._statusItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false
            });
            this._statusItem.add_child(this._statusLabel);
            this._statusSection.addMenuItem(this._statusItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            this._actionItem = new PopupMenu.PopupMenuItem(_('Connect'));
            this._actionItem.connect('activate', () => this._handleAction());
            this.menu.addMenuItem(this._actionItem);

            this._settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            this._settingsItem.connect('activate', () => this.openPreferences());
            this.menu.addMenuItem(this._settingsItem);

            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            this._resourcesSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this._resourcesSection);

            this._resourcesLabel = new PopupMenu.PopupMenuItem(_('Available Resources'), {
                reactive: false,
                can_focus: false
            });
            this._resourcesLabel.label.style_class = 'twingate-resources-title';
            this._resourcesSection.addMenuItem(this._resourcesLabel);

            this._resourcesScrollSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this._resourcesScrollSection);

            this._resourcesScrollView = new St.ScrollView({
                style_class: 'twingate-resources-scroll',
                hscrollbar_policy: St.PolicyType.NEVER,
                vscrollbar_policy: St.PolicyType.AUTOMATIC,
                overlay_scrollbars: true
            });

            this._resourcesBox = new St.BoxLayout({
                vertical: true,
                style_class: 'twingate-resources-container'
            });
            this._resourcesScrollView.add_child(this._resourcesBox);

            const scrollItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false
            });
            scrollItem.add_child(this._resourcesScrollView);
            this._resourcesScrollSection.addMenuItem(scrollItem);

            this._loadTwingateVersion();
            this._updateResourcesList();
            this._pollStatus();
            this._addStatusWatch(SLOW_POLL_INTERVAL);
        }

        openPreferences() {
            try {
                this._extension.openPreferences();
            } catch (e) {
                console.error(`Twingate: Error opening preferences: ${e}`);
            }
        }

        // Runs a command without blocking the shell main loop.
        // Throws a CANCELLED error once the indicator is destroyed.
        async _run(argv) {
            const proc = Gio.Subprocess.new(
                argv,
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            const [stdout, stderr] = await proc.communicate_utf8_async(null, this._cancellable);
            this._cancellable.set_error_if_cancelled();
            return {
                ok: proc.get_successful(),
                stdout: stdout ?? '',
                stderr: stderr ?? ''
            };
        }

        _setStatus(status) {
            this._status = status;

            if (status === 'online') {
                this.icon.style_class = this._iconNameOnline;
                this._statusLabel.text = '✓ ' + _('Connected');
                this._statusLabel.style_class = 'twingate-status-label twingate-status-online';
                this._actionItem.label.text = _('Disconnect');
            } else if (status === 'authenticating') {
                this.icon.style_class = this._iconNameAuthenticating;
                this._statusLabel.text = '⟳ ' + _('Authenticating');
                this._statusLabel.style_class = 'twingate-status-label twingate-status-authenticating';
                this._actionItem.label.text = _('Disconnect');
            } else {
                this.icon.style_class = this._iconNameOffline;
                this._statusLabel.text = '✕ ' + _('Disconnected');
                this._statusLabel.style_class = 'twingate-status-label twingate-status-offline';
                this._actionItem.label.text = _('Connect');
            }
        }

        async _updateStatus() {
            let output;
            try {
                const { stdout } = await this._run(['twingate', 'status']);
                output = stdout.trim().toLowerCase();
            } catch (e) {
                if (isCancelled(e))
                    return;
                output = '';
            }

            if (output.includes('online')) {
                this._setStatus('online');
            } else if (output.includes('authenticating')) {
                this._setStatus('authenticating');
            } else {
                this._setStatus('not-running');
            }
        }

        async _pollStatus() {
            if (this._statusPending)
                return;

            this._statusPending = true;
            const previousStatus = this._status;
            try {
                await this._updateStatus();
            } finally {
                this._statusPending = false;
            }

            if (this._cancellable.is_cancelled())
                return;

            if (this._fastPollTicks !== null)
                this._fastPollTicks++;

            if (this._status !== previousStatus) {
                this._onStatusChanged();
            } else if (this._fastPollTicks !== null && this._fastPollTicks >= MAX_FAST_POLL_TICKS) {
                this._fastPollTicks = null;
                this._addStatusWatch(SLOW_POLL_INTERVAL);
            }
        }

        _onStatusChanged() {
            if (this._fastPollTicks !== null) {
                this._fastPollTicks = null;
                this._addStatusWatch(SLOW_POLL_INTERVAL);
            }
            this._updateResourcesList();
        }

        async _loadTwingateVersion() {
            let version = null;
            try {
                const { stdout } = await this._run(['twingate', 'version']);
                const match = stdout.split('\n')[0].trim().match(/twingate\s+([\d.]+)\s*\|\s*([\d.]+)/);
                if (match)
                    version = `${match[1]} (${match[2]})`;
            } catch (e) {
                if (isCancelled(e))
                    return;
                console.debug(`Twingate: Unable to read version: ${e}`);
            }

            if (!version)
                return;

            const versionLabel = new St.Label({
                text: `${_('Version')}: ${version}`,
                style_class: 'twingate-version-label'
            });

            const versionItem = new PopupMenu.PopupBaseMenuItem({
                reactive: false,
                can_focus: false
            });
            versionItem.add_child(versionLabel);
            this._statusSection.addMenuItem(versionItem);
        }

        _handleAction() {
            this._fastPollTicks = 0;
            this._addStatusWatch(FAST_POLL_INTERVAL);

            // pkexec is required because twingate service-start/stop need root privileges.
            // twingate is a system binary installed via package manager, not user-writable.
            try {
                if (this._status === 'online' || this._status === 'authenticating') {
                    Gio.Subprocess.new(['pkexec', 'twingate', 'service-stop'], Gio.SubprocessFlags.NONE);
                    Gio.Subprocess.new(['twingate', 'desktop-stop'], Gio.SubprocessFlags.NONE);
                } else {
                    Gio.Subprocess.new(['pkexec', 'twingate', 'service-start'], Gio.SubprocessFlags.NONE);
                    Gio.Subprocess.new(['twingate', 'desktop-start'], Gio.SubprocessFlags.NONE);
                }
            } catch (e) {
                console.error(`Twingate: Failed to control service: ${e}`);
            }
        }

        _showResourceMessage(text, styleClass) {
            this._resourcesBox.destroy_all_children();
            this._resourcesBox.add_child(new St.Label({ text, style_class: styleClass }));
        }

        async _updateResourcesList() {
            this._removeResourceTimeout();

            if (this._status !== 'online') {
                this._showResourceMessage(_('Connect to see resources'), 'twingate-resource-empty');
                return;
            }

            let result;
            try {
                result = await this._run(['twingate', 'resources']);
            } catch (e) {
                if (isCancelled(e))
                    return;
                console.debug(`Twingate: Error loading resources: ${e}`);
                this._showResourceMessage(`${_('Loading error')}: ${e.message}`, 'twingate-resource-error');
                this._scheduleResourceUpdate();
                return;
            }

            // Status may have changed while the command was running
            if (this._status !== 'online')
                return;

            if (!result.ok || !result.stdout) {
                const errorMsg = (result.stderr || 'Command failed').trim();
                console.debug(`Twingate: Resources command failed: ${errorMsg}`);
                this._showResourceMessage(`${_('Loading error')}: ${errorMsg}`, 'twingate-resource-error');
            } else {
                this._renderResources(result.stdout);
            }

            this._scheduleResourceUpdate();
        }

        _renderResources(stdout) {
            const lines = stdout.split('\n').filter(line => line.trim());

            if (lines.length <= 1) {
                this._showResourceMessage(_('No resources available'), 'twingate-resource-empty');
                return;
            }

            this._resourcesBox.destroy_all_children();

            const header = lines[0];
            const colAddress = header.indexOf('ADDRESS');
            const colAlias = header.indexOf('ALIAS');
            const colAuth = header.indexOf('AUTH STATUS');

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];

                let name, address, authStatus;
                if (colAddress > 0 && colAlias > 0 && colAuth > 0 && line.length > colAddress) {
                    name = line.substring(0, colAddress).trim();
                    address = line.substring(colAddress, colAlias).trim();
                    authStatus = line.length > colAuth ? line.substring(colAuth).trim() : '';
                } else {
                    const parts = line.trim().split(/\s{2,}/);
                    name = (parts[0] || '').trim();
                    address = (parts[1] || '').trim();
                    authStatus = (parts[3] || '').trim();
                }

                if (name)
                    this._resourcesBox.add_child(this._buildResourceItem(name, address, authStatus));
            }
        }

        _buildResourceItem(name, address, authStatus) {
            const isAuthenticated = authStatus.toLowerCase().includes('auth expires');
            const isPending = authStatus.toLowerCase().includes('pending');

            let itemClass = 'twingate-resource-item';
            if (isAuthenticated)
                itemClass += ' twingate-resource-item-auth';
            else if (isPending)
                itemClass += ' twingate-resource-item-pending';
            else
                itemClass += ' twingate-resource-item-noauth';

            const resourceBox = new St.BoxLayout({
                vertical: true,
                style_class: itemClass
            });

            const nameBox = new St.BoxLayout({
                style_class: 'twingate-resource-name-box'
            });

            const iconLabel = new St.Label({
                text: isAuthenticated ? '🔓' : isPending ? '⏳' : '🔒',
                style_class: 'twingate-resource-icon'
            });
            nameBox.add_child(iconLabel);

            const nameLabel = new St.Label({
                text: name,
                style_class: 'twingate-resource-name'
            });
            nameBox.add_child(nameLabel);
            resourceBox.add_child(nameBox);

            if (address) {
                const addressLabel = new St.Label({
                    text: address,
                    style_class: 'twingate-resource-address'
                });
                resourceBox.add_child(addressLabel);
            }

            if (authStatus) {
                const authLabel = new St.Label({
                    text: authStatus,
                    style_class: isAuthenticated
                        ? 'twingate-resource-auth-ok'
                        : isPending
                            ? 'twingate-resource-auth-pending'
                            : 'twingate-resource-auth-none'
                });
                resourceBox.add_child(authLabel);
            }

            return resourceBox;
        }

        _scheduleResourceUpdate() {
            this._removeResourceTimeout();
            this._resourceUpdateTimeout = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                this._resourceRefreshInterval,
                () => {
                    this._resourceUpdateTimeout = null;
                    if (this._status === 'online') {
                        this._updateResourcesList();
                    }
                    return GLib.SOURCE_REMOVE;
                }
            );
        }

        _removeResourceTimeout() {
            if (this._resourceUpdateTimeout) {
                GLib.Source.remove(this._resourceUpdateTimeout);
                this._resourceUpdateTimeout = null;
            }
        }

        _addStatusWatch(pollInterval) {
            this._removeStatusWatch();
            this._pollerTimeoutHandle = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                pollInterval,
                () => {
                    this._pollStatus();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        _removeStatusWatch() {
            if (this._pollerTimeoutHandle) {
                GLib.Source.remove(this._pollerTimeoutHandle);
                this._pollerTimeoutHandle = null;
            }
        }

        destroy() {
            this._cancellable.cancel();
            this._removeStatusWatch();
            this._removeResourceTimeout();

            if (this._settingsChangedId) {
                this._settings.disconnect(this._settingsChangedId);
                this._settingsChangedId = null;
            }

            super.destroy();
        }
    }
);
