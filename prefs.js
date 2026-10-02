import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class TwingatePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {

        window.set_default_size(640, 1000);

        const page = new Adw.PreferencesPage();
        window.add(page);

        const settings = this.getSettings();

        const extensionGroup = new Adw.PreferencesGroup({
            title: _('Extension Settings'),
            description: _('Interface and behavior configuration')
        });
        page.add(extensionGroup);

        // Resource refresh interval
        const refreshIntervalRow = new Adw.ActionRow({
            title: _('Resource Refresh Interval'),
            subtitle: _('Time between each list update (in seconds)')
        });

        const currentInterval = settings.get_int('resource-refresh-interval');

        const refreshIntervalSpinButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 30,
                upper: 600,
                step_increment: 10,
                page_increment: 60
            }),
            value: currentInterval,
            valign: Gtk.Align.CENTER
        });

        refreshIntervalSpinButton.connect('value-changed', (widget) => {
            const newValue = widget.get_value();
            settings.set_int('resource-refresh-interval', newValue);
        });

        refreshIntervalRow.add_suffix(refreshIntervalSpinButton);
        extensionGroup.add(refreshIntervalRow);

        // Twingate information
        const infoGroup = new Adw.PreferencesGroup({
            title: _('Twingate Configuration'),
            description: _('Twingate configuration management')
        });
        page.add(infoGroup);

        const config = this._loadTwingateConfig();

        if (!config) {
            const errorRow = new Adw.ActionRow({
                title: _('Error'),
                subtitle: _('Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config')
            });
            infoGroup.add(errorRow);
            return;
        }


        // Network
        const networkValue = config.network || _('Not configured');

        const networkRow = new Adw.ActionRow({
            title: _('Network'),
            subtitle: networkValue
        });
        infoGroup.add(networkRow);

        // Controller URL
        const controllerValue = config['controller-url'] || _('Not configured');

        const controllerRow = new Adw.ActionRow({
            title: _('Controller URL'),
            subtitle: controllerValue
        });
        infoGroup.add(controllerRow);

        // Editable Twingate settings
        const settingsGroup = new Adw.PreferencesGroup({
            title: _('Parameters'),
            description: _('Twingate behavior configuration')
        });
        page.add(settingsGroup);

        // Autostart
        const autostartValue = config.autostart || 'false';

        const autostartRow = new Adw.ActionRow({
            title: _('Autostart'),
            subtitle: _('Start Twingate automatically at startup')
        });
        const autostartSwitch = new Gtk.Switch({
            active: autostartValue === 'true',
            valign: Gtk.Align.CENTER
        });
        autostartSwitch.connect('notify::active', (widget) => {
            const newValue = widget.active ? 'true' : 'false';
            this._setTwingateConfig('autostart', newValue);
        });
        autostartRow.add_suffix(autostartSwitch);
        autostartRow.activatable_widget = autostartSwitch;
        settingsGroup.add(autostartRow);

        // Save Auth Data
        const saveAuthValue = config['save-auth-data'] || 'false';

        const saveAuthRow = new Adw.ActionRow({
            title: _('Save Auth Data'),
            subtitle: _('Save authentication data')
        });
        const saveAuthSwitch = new Gtk.Switch({
            active: saveAuthValue === 'true',
            valign: Gtk.Align.CENTER
        });
        saveAuthSwitch.connect('notify::active', (widget) => {
            const newValue = widget.active ? 'true' : 'false';
            this._setTwingateConfig('save-auth-data', newValue);
        });
        saveAuthRow.add_suffix(saveAuthSwitch);
        saveAuthRow.activatable_widget = saveAuthSwitch;
        settingsGroup.add(saveAuthRow);

        // Sentry User Consent
        const sentryValue = config['sentry-user-consent'] || 'false';

        const sentryRow = new Adw.ActionRow({
            title: _('Sentry User Consent'),
            subtitle: _('Consent to send error reports')
        });
        const sentrySwitch = new Gtk.Switch({
            active: sentryValue === 'true',
            valign: Gtk.Align.CENTER
        });
        sentrySwitch.connect('notify::active', (widget) => {
            const newValue = widget.active ? 'true' : 'false';
            this._setTwingateConfig('sentry-user-consent', newValue);
        });
        sentryRow.add_suffix(sentrySwitch);
        sentryRow.activatable_widget = sentrySwitch;
        settingsGroup.add(sentryRow);

        // Log Level
        const logLevelGroup = new Adw.PreferencesGroup({
            title: _('Log Level'),
            description: _('Log verbosity level')
        });
        page.add(logLevelGroup);

        const logLevelRow = new Adw.ComboRow({
            title: _('Log Level'),
            subtitle: _('Select log level')
        });

        const logLevels = new Gtk.StringList();
        const levels = ['debug', 'info', 'warn', 'error'];
        levels.forEach(level => logLevels.append(level));

        logLevelRow.set_model(logLevels);

        const currentLevel = config['log-level'] || 'info';
        const currentIndex = levels.indexOf(currentLevel);

        if (currentIndex >= 0) {
            logLevelRow.set_selected(currentIndex);
        }

        logLevelRow.connect('notify::selected', (widget) => {
            const newIndex = widget.get_selected();
            const newLevel = levels[newIndex];
            this._setTwingateConfig('log-level', newLevel);
        });

        logLevelGroup.add(logLevelRow);

        // Refresh button
        const refreshGroup = new Adw.PreferencesGroup();
        page.add(refreshGroup);

        const refreshRow = new Adw.ActionRow({
            title: _('Refresh Configuration'),
            subtitle: _('Reload settings from Twingate')
        });

        const refreshButton = new Gtk.Button({
            label: _('Refresh'),
            valign: Gtk.Align.CENTER
        });
        refreshButton.add_css_class('suggested-action');
        refreshButton.connect('clicked', () => {
            // Reopen the preferences window to reload the configuration
            try {
                const app = window.get_application();
                if (app) {
                    window.close();
                    app.activate();
                }
            } catch (e) {
                console.error(`Twingate Prefs: Error refreshing: ${e}`);
            }
        });

        refreshRow.add_suffix(refreshButton);
        refreshGroup.add(refreshRow);
    }

    // pkexec is required because 'twingate config' needs root privileges.
    // twingate is a system binary installed via package manager, not user-writable.
    _loadTwingateConfig() {
        try {
            const proc = Gio.Subprocess.new(
                ['pkexec', 'twingate', 'config'],
                Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            );
            const [, stdout, stderr] = proc.communicate_utf8(null, null);

            if (!proc.get_successful() || !stdout) {
                const errorMsg = (stderr || 'Unknown error').trim();
                console.debug(`Twingate Prefs: pkexec config failed: ${errorMsg}`);
                return null;
            }

            const config = {};
            for (const line of stdout.split('\n')) {
                const trimmed = line.trim();
                if (trimmed && trimmed.includes(':')) {
                    const [key, ...valueParts] = trimmed.split(':');
                    config[key.trim()] = valueParts.join(':').trim();
                }
            }

            return config;
        } catch (e) {
            console.debug(`Twingate Prefs: Error loading config: ${e}`);
            return null;
        }
    }

    _setTwingateConfig(key, value) {
        try {
            Gio.Subprocess.new(
                ['pkexec', 'twingate', 'config', key, value],
                Gio.SubprocessFlags.NONE
            );
        } catch (e) {
            console.error(`Twingate Prefs: Error setting config: ${e}`);
        }
    }
}
