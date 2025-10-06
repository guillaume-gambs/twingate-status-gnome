import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import { Translator } from './locale.js';

export default class TwingatePreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        log('Twingate Prefs: [DEBUG] fillPreferencesWindow called');

        // Définir la taille de la fenêtre
        window.set_default_size(640, 1000);

        const page = new Adw.PreferencesPage();
        window.add(page);

        const settings = this.getSettings();
        log('Twingate Prefs: [DEBUG] Settings object retrieved');

        // Initialiser le système de traduction
        this._ = new Translator(settings);

        // Groupe des paramètres de l'extension
        const extensionGroup = new Adw.PreferencesGroup({
            title: this._.gettext('Extension Settings'),
            description: this._.gettext('Interface and behavior configuration')
        });
        page.add(extensionGroup);

        // Langue
        const languageRow = new Adw.ComboRow({
            title: this._.gettext('Language'),
            subtitle: this._.gettext('Interface language')
        });

        const languages = new Gtk.StringList();
        const availableLanguages = this._.getAvailableLanguages();
        const langCodes = availableLanguages.map(lang => lang.code);
        const langNames = availableLanguages.map(lang => lang.name);

        langNames.forEach(name => languages.append(name));

        languageRow.set_model(languages);

        const currentLang = settings.get_string('language');
        log(`Twingate Prefs: [DEBUG] Current language setting: ${currentLang}`);

        const currentLangIndex = langCodes.indexOf(currentLang);
        if (currentLangIndex >= 0) {
            languageRow.set_selected(currentLangIndex);
        }

        languageRow.connect('notify::selected', (widget) => {
            const selectedIndex = widget.get_selected();
            if (selectedIndex >= 0 && selectedIndex < langCodes.length) {
                settings.set_string('language', langCodes[selectedIndex]);
            }
        });

        extensionGroup.add(languageRow);

        // Intervalle de rafraîchissement des ressources
        const refreshIntervalRow = new Adw.ActionRow({
            title: this._.gettext('Resource Refresh Interval'),
            subtitle: this._.gettext('Time between each list update (in seconds)')
        });

        const currentInterval = settings.get_int('resource-refresh-interval');
        log(`Twingate Prefs: [DEBUG] Current refresh interval: ${currentInterval} seconds`);

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
            log(`Twingate Prefs: [DEBUG] Refresh interval changed to: ${newValue} seconds`);
            settings.set_int('resource-refresh-interval', newValue);
        });

        refreshIntervalRow.add_suffix(refreshIntervalSpinButton);
        extensionGroup.add(refreshIntervalRow);

        // Note d'information
        const noteRow = new Adw.ActionRow({
            title: this._.gettext('ℹ️ Note'),
            subtitle: this._.gettext('Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)')
        });
        extensionGroup.add(noteRow);

        // Groupe d'informations Twingate
        const infoGroup = new Adw.PreferencesGroup({
            title: this._.gettext('Twingate Configuration'),
            description: this._.gettext('Twingate configuration management')
        });
        page.add(infoGroup);

        // Charger la configuration
        log('Twingate Prefs: [DEBUG] Loading Twingate configuration...');
        const config = this._loadTwingateConfig();

        if (!config) {
            log('Twingate Prefs: [ERROR] Failed to load Twingate configuration');
            const errorRow = new Adw.ActionRow({
                title: this._.gettext('Error'),
                subtitle: this._.gettext('Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config')
            });
            infoGroup.add(errorRow);
            return;
        }

        log(`Twingate Prefs: [DEBUG] Configuration loaded successfully with ${Object.keys(config).length} keys`);

        // Network
        const networkValue = config.network || this._.gettext('Not configured');
        log(`Twingate Prefs: [DEBUG] Network: ${networkValue}`);

        const networkRow = new Adw.ActionRow({
            title: this._.gettext('Network'),
            subtitle: networkValue
        });
        infoGroup.add(networkRow);

        // Controller URL
        const controllerValue = config['controller-url'] || this._.gettext('Not configured');
        log(`Twingate Prefs: [DEBUG] Controller URL: ${controllerValue}`);

        const controllerRow = new Adw.ActionRow({
            title: this._.gettext('Controller URL'),
            subtitle: controllerValue
        });
        infoGroup.add(controllerRow);

        // Groupe des paramètres modifiables
        const settingsGroup = new Adw.PreferencesGroup({
            title: this._.gettext('Parameters'),
            description: this._.gettext('Twingate behavior configuration')
        });
        page.add(settingsGroup);

        // Autostart
        const autostartValue = config.autostart || 'false';
        log(`Twingate Prefs: [DEBUG] Autostart current value: ${autostartValue}`);

        const autostartRow = new Adw.ActionRow({
            title: this._.gettext('Autostart'),
            subtitle: this._.gettext('Start Twingate automatically at startup')
        });
        const autostartSwitch = new Gtk.Switch({
            active: autostartValue === 'true',
            valign: Gtk.Align.CENTER
        });
        autostartSwitch.connect('notify::active', (widget) => {
            const newValue = widget.active ? 'true' : 'false';
            log(`Twingate Prefs: [DEBUG] Changing autostart from ${autostartValue} to ${newValue}`);
            this._setTwingateConfig('autostart', newValue);
        });
        autostartRow.add_suffix(autostartSwitch);
        autostartRow.activatable_widget = autostartSwitch;
        settingsGroup.add(autostartRow);

        // Save Auth Data
        const saveAuthValue = config['save-auth-data'] || 'false';
        log(`Twingate Prefs: [DEBUG] Save Auth Data current value: ${saveAuthValue}`);

        const saveAuthRow = new Adw.ActionRow({
            title: this._.gettext('Save Auth Data'),
            subtitle: this._.gettext('Save authentication data')
        });
        const saveAuthSwitch = new Gtk.Switch({
            active: saveAuthValue === 'true',
            valign: Gtk.Align.CENTER
        });
        saveAuthSwitch.connect('notify::active', (widget) => {
            const newValue = widget.active ? 'true' : 'false';
            log(`Twingate Prefs: [DEBUG] Changing save-auth-data from ${saveAuthValue} to ${newValue}`);
            this._setTwingateConfig('save-auth-data', newValue);
        });
        saveAuthRow.add_suffix(saveAuthSwitch);
        saveAuthRow.activatable_widget = saveAuthSwitch;
        settingsGroup.add(saveAuthRow);

        // Sentry User Consent
        const sentryValue = config['sentry-user-consent'] || 'false';
        log(`Twingate Prefs: [DEBUG] Sentry User Consent current value: ${sentryValue}`);

        const sentryRow = new Adw.ActionRow({
            title: this._.gettext('Sentry User Consent'),
            subtitle: this._.gettext('Consent to send error reports')
        });
        const sentrySwitch = new Gtk.Switch({
            active: sentryValue === 'true',
            valign: Gtk.Align.CENTER
        });
        sentrySwitch.connect('notify::active', (widget) => {
            const newValue = widget.active ? 'true' : 'false';
            log(`Twingate Prefs: [DEBUG] Changing sentry-user-consent from ${sentryValue} to ${newValue}`);
            this._setTwingateConfig('sentry-user-consent', newValue);
        });
        sentryRow.add_suffix(sentrySwitch);
        sentryRow.activatable_widget = sentrySwitch;
        settingsGroup.add(sentryRow);

        // Log Level
        const logLevelGroup = new Adw.PreferencesGroup({
            title: this._.gettext('Log Level'),
            description: this._.gettext('Log verbosity level')
        });
        page.add(logLevelGroup);

        const logLevelRow = new Adw.ComboRow({
            title: this._.gettext('Log Level'),
            subtitle: this._.gettext('Select log level')
        });

        const logLevels = new Gtk.StringList();
        const levels = ['debug', 'info', 'warn', 'error'];
        levels.forEach(level => logLevels.append(level));

        logLevelRow.set_model(logLevels);

        const currentLevel = config['log-level'] || 'info';
        const currentIndex = levels.indexOf(currentLevel);
        log(`Twingate Prefs: [DEBUG] Log Level current value: ${currentLevel}, index: ${currentIndex}`);

        if (currentIndex >= 0) {
            logLevelRow.set_selected(currentIndex);
        }

        logLevelRow.connect('notify::selected', (widget) => {
            const newIndex = widget.get_selected();
            const newLevel = levels[newIndex];
            log(`Twingate Prefs: [DEBUG] Changing log-level from ${currentLevel} to ${newLevel} (index ${newIndex})`);
            this._setTwingateConfig('log-level', newLevel);
        });

        logLevelGroup.add(logLevelRow);

        // Bouton de rafraîchissement
        const refreshGroup = new Adw.PreferencesGroup();
        page.add(refreshGroup);

        const refreshRow = new Adw.ActionRow({
            title: 'Actualiser la configuration',
            subtitle: 'Recharger les paramètres depuis Twingate'
        });

        const refreshButton = new Gtk.Button({
            label: 'Actualiser',
            valign: Gtk.Align.CENTER
        });
        refreshButton.add_css_class('suggested-action');
        refreshButton.connect('clicked', () => {
            // Recharger la fenêtre de préférences
            window.close();
            this.fillPreferencesWindow(window);
        });

        refreshRow.add_suffix(refreshButton);
        refreshGroup.add(refreshRow);
    }

    _loadTwingateConfig() {
        log('Twingate Prefs: [DEBUG] _loadTwingateConfig called');

        try {
            // Utiliser pkexec pour obtenir les privilèges root
            log('Twingate Prefs: [DEBUG] Using pkexec to run: twingate config');
            const [success, stdout, stderr] = GLib.spawn_command_line_sync('pkexec twingate config');

            log(`Twingate Prefs: [DEBUG] pkexec attempt - success: ${success}`);
            log(`Twingate Prefs: [DEBUG] stdout length: ${stdout ? stdout.length : 0}`);
            log(`Twingate Prefs: [DEBUG] stderr length: ${stderr ? stderr.length : 0}`);

            if (!success || !stdout) {
                const errorMsg = stderr ? new TextDecoder().decode(stderr) : 'Unknown error';
                log(`Twingate Prefs: [ERROR] pkexec failed. Error: ${errorMsg}`);
                return null;
            }

            const output = new TextDecoder().decode(stdout);
            log(`Twingate Prefs: [DEBUG] Raw output:\n${output}`);

            const lines = output.split('\n');
            log(`Twingate Prefs: [DEBUG] Number of lines: ${lines.length}`);

            const config = {};

            for (const line of lines) {
                const trimmed = line.trim();
                log(`Twingate Prefs: [DEBUG] Processing line: "${trimmed}"`);

                if (trimmed && trimmed.includes(':')) {
                    const [key, ...valueParts] = trimmed.split(':');
                    const value = valueParts.join(':').trim();

                    config[key.trim()] = value;
                    log(`Twingate Prefs: [DEBUG] Parsed: ${key.trim()} = ${value}`);
                }
            }

            log(`Twingate Prefs: [DEBUG] Final config object: ${JSON.stringify(config)}`);
            log(`Twingate Prefs: [DEBUG] Config keys: ${Object.keys(config).join(', ')}`);

            return config;
        } catch (e) {
            log(`Twingate Prefs: [EXCEPTION] Error loading Twingate config: ${e}`);
            log(`Twingate Prefs: [EXCEPTION] Stack: ${e.stack}`);
            return null;
        }
    }

    _setTwingateConfig(key, value) {
        log(`Twingate Prefs: [DEBUG] _setTwingateConfig called with key=${key}, value=${value}`);

        try {
            // Utiliser pkexec pour exécuter la commande avec les privilèges root
            const command = `pkexec twingate config ${key} ${value}`;
            log(`Twingate Prefs: [DEBUG] Executing command: ${command}`);

            GLib.spawn_command_line_async(command);

            log(`Twingate Prefs: [INFO] Twingate config updated: ${key} = ${value}`);
        } catch (e) {
            log(`Twingate Prefs: [ERROR] Error setting Twingate config: ${e}`);
            log(`Twingate Prefs: [ERROR] Stack: ${e.stack}`);
        }
    }
}
