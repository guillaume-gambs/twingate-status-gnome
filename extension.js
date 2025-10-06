import GObject from 'gi://GObject';
import St from 'gi://St';
import GLib from 'gi://GLib';
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
                this._statusLabel.style = 'color: #4ade80; font-weight: bold;';
                this._actionItem.label.text = _('Disconnect');
            } else if (status === 'authenticating') {
                this.icon.style_class = this._iconNameAuthenticating;
                this._statusLabel.text = '⟳ ' + _('Authenticating');
                this._statusLabel.style = 'color: #fbbf24; font-weight: bold;';
                this._actionItem.label.text = _('Disconnect');
            } else {
                this.icon.style_class = this._iconNameOffline;
                this._statusLabel.text = '✕ ' + _('Disconnected');
                this._statusLabel.style = 'color: #ef4444; font-weight: bold;';
                this._actionItem.label.text = _('Connect');
            }
        }

        _updateStatus() {
            try {
                const [success, stdout] = GLib.spawn_command_line_sync('twingate status');

                if (success && stdout) {
                    const output = new TextDecoder().decode(stdout).trim().toLowerCase();

                    if (output.includes('online')) {
                        this._setStatus('online');
                    } else if (output.includes('authenticating')) {
                        this._setStatus('authenticating');
                    } else {
                        this._setStatus('not-running');
                    }
                } else {
                    this._setStatus('not-running');
                }
            } catch (e) {
                this._setStatus('not-running');
            }
        }

        _getTwingateVersion() {
            try {
                const [success, stdout] = GLib.spawn_command_line_sync('twingate version');

                if (success && stdout) {
                    const output = new TextDecoder().decode(stdout);
                    const lines = output.split('\n');

                    // La première ligne contient : "twingate 2025.72.142645 | 0.167.1"
                    if (lines.length > 0) {
                        const versionLine = lines[0].trim();
                        const match = versionLine.match(/twingate\s+([\d.]+)\s*\|\s*([\d.]+)/);
                        if (match) {
                            return `${match[1]} (${match[2]})`;
                        }
                    }
                }
            } catch (e) {
                // Si la commande échoue, retourner null
                return null;
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

            if (this._status === 'online' || this._status === 'authenticating') {
                GLib.spawn_command_line_async('systemctl stop twingate');
                GLib.spawn_command_line_async('systemctl stop --user twingate-desktop-notifier');
            } else {
                GLib.spawn_command_line_async('systemctl start twingate');
                GLib.spawn_command_line_async('systemctl start --user twingate-desktop-notifier');
            }
        }

        _updateResourcesList() {
            log('Twingate: [DEBUG] _updateResourcesList called');
            log(`Twingate: [DEBUG] Current status: ${this._status}`);

            // Nettoyer les ressources existantes
            this._resourcesBox.destroy_all_children();

            if (this._status !== 'online') {
                log('Twingate: [DEBUG] Not online, showing connect message');
                const noResourceLabel = new St.Label({
                    text: _('Connect to see resources'),
                    style_class: 'twingate-resource-empty',
                    style: 'font-style: italic; color: #9ca3af; padding: 12px;'
                });
                this._resourcesBox.add_child(noResourceLabel);
                return;
            }

            log('Twingate: [DEBUG] Executing twingate resources command...');

            try {
                // Exécuter la commande twingate resources
                const [success, stdout, stderr] = GLib.spawn_command_line_sync('twingate resources');

                log(`Twingate: [DEBUG] Command execution - success: ${success}`);
                log(`Twingate: [DEBUG] stdout length: ${stdout ? stdout.length : 0}`);
                log(`Twingate: [DEBUG] stderr length: ${stderr ? stderr.length : 0}`);

                if (success && stdout) {
                    const output = new TextDecoder().decode(stdout);
                    log(`Twingate: [DEBUG] Output: ${output}`);

                    const lines = output.split('\n').filter(line => line.trim());
                    log(`Twingate: [DEBUG] Number of lines: ${lines.length}`);

                    if (lines.length > 1) {
                        log('Twingate: [DEBUG] Processing resources...');
                        // Ignorer la ligne d'en-tête (RESOURCE NAME    ADDRESS    ALIAS    AUTH STATUS)
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i].trim();
                            if (!line) continue;

                            log(`Twingate: [DEBUG] Line ${i}: ${line}`);

                            // Parser la ligne en utilisant des espaces multiples comme séparateurs
                            const parts = line.split(/\s{2,}/);
                            log(`Twingate: [DEBUG] Parts: ${JSON.stringify(parts)}`);

                            if (parts.length >= 1) {
                                const resourceBox = new St.BoxLayout({
                                    vertical: true,
                                    style_class: 'twingate-resource-item'
                                });

                                // Nom de la ressource avec icône
                                const nameBox = new St.BoxLayout({
                                    style_class: 'twingate-resource-name-box',
                                    style: 'spacing: 6px;'
                                });

                                const iconLabel = new St.Label({
                                    text: '🔗',
                                    style_class: 'twingate-resource-icon'
                                });
                                nameBox.add_child(iconLabel);

                                const nameLabel = new St.Label({
                                    text: parts[0].trim(),
                                    style_class: 'twingate-resource-name'
                                });
                                nameBox.add_child(nameLabel);
                                resourceBox.add_child(nameBox);

                                // Adresse de la ressource (si disponible)
                                if (parts.length >= 2 && parts[1].trim()) {
                                    const addressLabel = new St.Label({
                                        text: parts[1].trim(),
                                        style_class: 'twingate-resource-address'
                                    });
                                    resourceBox.add_child(addressLabel);
                                }

                                this._resourcesBox.add_child(resourceBox);
                                log(`Twingate: [DEBUG] Added resource: ${parts[0].trim()}`);
                            }
                        }
                        log('Twingate: [DEBUG] Resources processed successfully');
                    } else {
                        log('Twingate: [DEBUG] No resources found (only header line)');
                        const noResourceLabel = new St.Label({
                            text: _('No resources available'),
                            style_class: 'twingate-resource-empty',
                            style: 'font-style: italic; color: #9ca3af; padding: 12px;'
                        });
                        this._resourcesBox.add_child(noResourceLabel);
                    }
                } else {
                    // Commande échouée
                    const errorMsg = stderr ? new TextDecoder().decode(stderr) : 'Command failed';
                    log(`Twingate: [ERROR] resources command failed: ${errorMsg}`);
                    log(`Twingate: [ERROR] success=${success}`);

                    const errorLabel = new St.Label({
                        text: `${_('Loading error')}: ${errorMsg}`,
                        style_class: 'twingate-resource-error',
                        style: 'color: #ef4444; padding: 12px; font-size: 9pt;'
                    });
                    this._resourcesBox.add_child(errorLabel);
                }
            } catch (e) {
                log(`Twingate: [EXCEPTION] in _updateResourcesList: ${e}`);
                log(`Twingate: [EXCEPTION] Stack: ${e.stack}`);

                const errorLabel = new St.Label({
                    text: `${_('Loading error')}: ${e.message}`,
                    style_class: 'twingate-resource-error',
                    style: 'color: #ef4444; padding: 12px; font-size: 9pt;'
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