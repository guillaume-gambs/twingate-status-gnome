import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {_, setTranslatorSettings} from './locale.js';

export default class TwingateStatusIndicatorExtension extends Extension {
    enable() {
        this._settings = this.getSettings();

        // Configurer le traducteur avec les settings
        setTranslatorSettings(this._settings);

        this._indicator = new TwingateIndicator(this._settings);
        Main.panel.addToStatusArea(this.uuid, this._indicator);
    }

    disable() {
        if (this._indicator) {
            this._indicator.stop();
            this._indicator.destroy();
            this._indicator = null;
        }
        this._settings = null;
    }
}

const TwingateIndicator = GObject.registerClass(
    class TwingateIndicator extends PanelMenu.Button {
        constructor(settings) {
            super(0.0, 'Twingate Status Indicator');

            this._settings = settings;
            this._iconNameOnline = 'twingate_on';
            this._iconNameAuthenticating = 'twingate_authenticating';
            this._iconNameOffline = 'twingate_off';
            this._fastPollInterval = 1000;
            this._slowPollInterval = 10000;

            // Lire l'intervalle depuis les settings (en secondes, converti en ms)
            this._resourceRefreshInterval = this._settings.get_int('resource-refresh-interval') * 1000;

            // Écouter les changements de l'intervalle
            this._settingsChangedId = this._settings.connect('changed::resource-refresh-interval', () => {
                this._resourceRefreshInterval = this._settings.get_int('resource-refresh-interval') * 1000;
                // Redémarrer le timer avec le nouveau délai
                if (this._status === 'online') {
                    this._updateResourcesList();
                }
            });

            // États possibles : 'online', 'authenticating', 'not-running'
            this._status = 'not-running';
            this._resources = [];
            this._version = this._getTwingateVersion();

            // Icône dans le panneau
            this.icon = new St.Icon({
                style_class: this._iconNameOffline,
                y_align: Clutter.ActorAlign.CENTER
            });
            this.add_child(this.icon);

            // Section statut
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

            // Version Twingate
            if (this._version) {
                this._versionLabel = new St.Label({
                    text: `${_('Version')}: ${this._version}`,
                    style_class: 'twingate-version-label'
                });

                this._versionItem = new PopupMenu.PopupBaseMenuItem({
                    reactive: false,
                    can_focus: false
                });
                this._versionItem.add_child(this._versionLabel);
                this._statusSection.addMenuItem(this._versionItem);
            }

            // Bouton d'action
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            this._actionItem = new PopupMenu.PopupMenuItem(_('Connect'));
            this._actionItem.connect('activate', () => this._handleAction());
            this.menu.addMenuItem(this._actionItem);

            // Bouton Paramètres
            this._settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            this._settingsItem.connect('activate', () => this.openPreferences());
            this.menu.addMenuItem(this._settingsItem);

            // Section ressources
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

            this._resourcesSection = new PopupMenu.PopupMenuSection();
            this.menu.addMenuItem(this._resourcesSection);

            this._resourcesLabel = new PopupMenu.PopupMenuItem(_('Available Resources'), {
                reactive: false,
                can_focus: false
            });
            this._resourcesLabel.label.style_class = 'twingate-resources-title';
            this._resourcesSection.addMenuItem(this._resourcesLabel);

            // Créer un conteneur scrollable pour les ressources
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

            // Démarrage
            this._updateStatus();
            this._addStatusWatch(this._slowPollInterval);
            this._updateResourcesList();
        }

        openPreferences() {
            // Ouvrir les préférences de l'extension
            try {
                const extension = Extension.lookupByUUID('twingate-status@eudes.es');
                if (extension && extension.openPreferences) {
                    extension.openPreferences();
                }
            } catch (e) {
                log(`Error opening preferences: ${e}`);
            }
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

        _updateStatus() {
            try {
                const proc = Gio.Subprocess.new(
                    ['twingate', 'status'],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
                );
                const [, stdout] = proc.communicate_utf8(null, null);
                const output = (stdout || '').trim().toLowerCase();

                if (output.includes('online')) {
                    this._setStatus('online');
                } else if (output.includes('authenticating')) {
                    this._setStatus('authenticating');
                } else {
                    this._setStatus('not-running');
                }
            } catch (e) {
                this._setStatus('not-running');
            }
        }

        _getTwingateVersion() {
            try {
                const proc = Gio.Subprocess.new(
                    ['twingate', 'version'],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_SILENCE
                );
                const [, stdout] = proc.communicate_utf8(null, null);
                const lines = (stdout || '').split('\n');

                if (lines.length > 0) {
                    const match = lines[0].trim().match(/twingate\s+([\d.]+)\s*\|\s*([\d.]+)/);
                    if (match)
                        return `${match[1]} (${match[2]})`;
                }
            } catch (e) {
                // ignore
            }
            return null;
        }

        _handleAction() {
            this._removeStatusWatch();
            this._addStatusWatch(this._fastPollInterval, () => {
                this._removeStatusWatch();
                this._addStatusWatch(this._slowPollInterval);
                this._updateResourcesList();
            });

            try {
                if (this._status === 'online' || this._status === 'authenticating') {
                    Gio.Subprocess.new(['pkexec', 'twingate', 'service-stop'], Gio.SubprocessFlags.NONE);
                    Gio.Subprocess.new(['twingate', 'desktop-stop'], Gio.SubprocessFlags.NONE);
                } else {
                    Gio.Subprocess.new(['pkexec', 'twingate', 'service-start'], Gio.SubprocessFlags.NONE);
                    Gio.Subprocess.new(['twingate', 'desktop-start'], Gio.SubprocessFlags.NONE);
                }
            } catch (e) {
                log(`Twingate: [ERROR] Failed to control twingate service: ${e}`);
            }
        }

        _updateResourcesList() {
            log('Twingate: [DEBUG] _updateResourcesList called');
            log(`Twingate: [DEBUG] Current status: ${this._status}`);

            // Nettoyer les ressources existantes
            this._resourcesBox.destroy_all_children();

            if (this._status !== 'online') {
                const noResourceLabel = new St.Label({
                    text: _('Connect to see resources'),
                    style_class: 'twingate-resource-empty'
                });
                this._resourcesBox.add_child(noResourceLabel);
                return;
            }

            log('Twingate: [DEBUG] Executing twingate resources command...');

            try {
                const proc = Gio.Subprocess.new(
                    ['twingate', 'resources'],
                    Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
                );
                const [, stdout, stderr] = proc.communicate_utf8(null, null);

                if (proc.get_successful() && stdout) {
                    const output = stdout;
                    log(`Twingate: [DEBUG] Output: ${output}`);

                    const lines = output.split('\n').filter(line => line.trim());
                    log(`Twingate: [DEBUG] Number of lines: ${lines.length}`);

                    if (lines.length > 1) {
                        log('Twingate: [DEBUG] Processing resources...');

                        // Déterminer les positions de colonnes depuis l'en-tête
                        const header = lines[0];
                        const colAddress = header.indexOf('ADDRESS');
                        const colAlias = header.indexOf('ALIAS');
                        const colAuth = header.indexOf('AUTH STATUS');

                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i];
                            if (!line.trim()) continue;

                            log(`Twingate: [DEBUG] Line ${i}: ${line}`);

                            // Parser par position de colonnes si disponibles, sinon fallback sur split
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

                            log(`Twingate: [DEBUG] name=${name} address=${address} auth=${authStatus}`);

                            if (name) {
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

                                // Nom de la ressource avec icône + badge auth
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

                                // Adresse de la ressource (si disponible)
                                if (address) {
                                    const addressLabel = new St.Label({
                                        text: address,
                                        style_class: 'twingate-resource-address'
                                    });
                                    resourceBox.add_child(addressLabel);
                                }

                                // Statut d'authentification (si présent)
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

                                this._resourcesBox.add_child(resourceBox);
                            }
                        }
                        log('Twingate: [DEBUG] Resources processed successfully');
                    } else {
                        log('Twingate: [DEBUG] No resources found (only header line)');
                        const noResourceLabel = new St.Label({
                            text: _('No resources available'),
                            style_class: 'twingate-resource-empty'
                        });
                        this._resourcesBox.add_child(noResourceLabel);
                    }
                } else {
                    const errorMsg = (stderr || 'Command failed').trim();
                    log(`Twingate: [ERROR] resources command failed: ${errorMsg}`);

                    const errorLabel = new St.Label({
                        text: `${_('Loading error')}: ${errorMsg}`,
                        style_class: 'twingate-resource-error'
                    });
                    this._resourcesBox.add_child(errorLabel);
                }
            } catch (e) {
                log(`Twingate: [EXCEPTION] in _updateResourcesList: ${e}`);

                const errorLabel = new St.Label({
                    text: `${_('Loading error')}: ${e.message}`,
                    style_class: 'twingate-resource-error'
                });
                this._resourcesBox.add_child(errorLabel);
            }

            // Planifier la prochaine mise à jour
            if (this._resourceUpdateTimeout) {
                GLib.Source.remove(this._resourceUpdateTimeout);
            }
            this._resourceUpdateTimeout = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                this._resourceRefreshInterval,
                () => {
                    if (this._status === 'online') {
                        this._updateResourcesList();
                    }
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        _addStatusWatch(pollInterval, onChange) {
            this._pollerTimeoutHandle = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                pollInterval,
                () => {
                    const oldStatus = this._status;
                    this._updateStatus();

                    if (oldStatus !== this._status) {
                        if (onChange) {
                            onChange();
                        }
                    }

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

        stop() {
            this._removeStatusWatch();

            if (this._resourceUpdateTimeout) {
                GLib.Source.remove(this._resourceUpdateTimeout);
                this._resourceUpdateTimeout = null;
            }

            if (this._settingsChangedId) {
                this._settings.disconnect(this._settingsChangedId);
                this._settingsChangedId = null;
            }

            this.icon?.destroy();
            this.icon = null;
        }
    }
);