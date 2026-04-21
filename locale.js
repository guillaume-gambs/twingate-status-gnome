// Système de traduction simple pour l'extension Twingate Status
import GLib from 'gi://GLib';

const TRANSLATIONS = {
    'fr': {
        'Connected': 'Connecté',
        'Disconnected': 'Déconnecté',
        'Authenticating': 'Authentification en cours',
        'Connect': 'Se connecter',
        'Disconnect': 'Se déconnecter',
        'Version': 'Version',
        'Available Resources': 'Ressources disponibles',
        'Connect to see resources': 'Connectez-vous pour voir les ressources',
        'Loading error': 'Erreur lors du chargement',
        'No resources available': 'Aucune ressource disponible',
        'Authenticated': 'Authentifié',
        'Requires Authentication': 'Authentification requise',
        'Settings': 'Paramètres',
        'Name': 'Nom',
        'Address': 'Adresse',
        'Authentication': 'Authentification',
        // Préférences
        'Extension Settings': 'Paramètres de l\'extension',
        'Interface and behavior configuration': 'Configuration de l\'interface et du comportement',
        'Language': 'Langue',
        'Interface language': 'Langue de l\'interface',
        'Auto (System)': 'Auto (Système)',
        'Resource Refresh Interval': 'Intervalle de rafraîchissement des ressources',
        'Time between each list update (in seconds)': 'Temps entre chaque mise à jour de la liste (en secondes)',
        'ℹ️ Note': 'ℹ️ Note',
        'Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)': 'Redémarrez GNOME Shell pour appliquer les changements de langue\n(Alt+F2, tapez \'r\' sur X11 ou déconnexion/reconnexion sur Wayland)',
        'Twingate Configuration': 'Configuration Twingate',
        'Twingate configuration management': 'Gestion de la configuration Twingate',
        'Error': 'Erreur',
        'Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config': 'Impossible de charger la configuration Twingate.\nAssurez-vous que Twingate est installé.\nEssayez: sudo twingate config',
        'Network': 'Réseau',
        'Controller URL': 'URL du contrôleur',
        'Not configured': 'Non configuré',
        'Parameters': 'Paramètres',
        'Twingate behavior configuration': 'Configuration du comportement de Twingate',
        'Autostart': 'Démarrage automatique',
        'Start Twingate automatically at startup': 'Démarrer Twingate automatiquement au démarrage',
        'Save Auth Data': 'Sauvegarder les données d\'authentification',
        'Save authentication data': 'Sauvegarder les données d\'authentification',
        'Sentry User Consent': 'Consentement Sentry',
        'Consent to send error reports': 'Consentement pour l\'envoi de rapports d\'erreur',
        'Log Level': 'Niveau de log',
        'Log verbosity level': 'Niveau de verbosité des logs',
        'Select log level': 'Sélectionnez le niveau de log',
        'Refresh Configuration': 'Actualiser la configuration',
        'Reload settings from Twingate': 'Recharger les paramètres depuis Twingate',
        'Refresh': 'Actualiser'
    },
    'en': {
        'Connected': 'Connected',
        'Disconnected': 'Disconnected',
        'Authenticating': 'Authenticating',
        'Connect': 'Connect',
        'Disconnect': 'Disconnect',
        'Version': 'Version',
        'Available Resources': 'Available Resources',
        'Connect to see resources': 'Connect to see resources',
        'Loading error': 'Loading error',
        'No resources available': 'No resources available',
        'Authenticated': 'Authenticated',
        'Requires Authentication': 'Requires Authentication',
        'Settings': 'Settings',
        'Name': 'Name',
        'Address': 'Address',
        'Authentication': 'Authentication',
        // Preferences
        'Extension Settings': 'Extension Settings',
        'Interface and behavior configuration': 'Interface and behavior configuration',
        'Language': 'Language',
        'Interface language': 'Interface language',
        'Auto (System)': 'Auto (System)',
        'Resource Refresh Interval': 'Resource Refresh Interval',
        'Time between each list update (in seconds)': 'Time between each list update (in seconds)',
        'ℹ️ Note': 'ℹ️ Note',
        'Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)': 'Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)',
        'Twingate Configuration': 'Twingate Configuration',
        'Twingate configuration management': 'Twingate configuration management',
        'Error': 'Error',
        'Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config': 'Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config',
        'Network': 'Network',
        'Controller URL': 'Controller URL',
        'Not configured': 'Not configured',
        'Parameters': 'Parameters',
        'Twingate behavior configuration': 'Twingate behavior configuration',
        'Autostart': 'Autostart',
        'Start Twingate automatically at startup': 'Start Twingate automatically at startup',
        'Save Auth Data': 'Save Auth Data',
        'Save authentication data': 'Save authentication data',
        'Sentry User Consent': 'Sentry User Consent',
        'Consent to send error reports': 'Consent to send error reports',
        'Log Level': 'Log Level',
        'Log verbosity level': 'Log verbosity level',
        'Select log level': 'Select log level',
        'Refresh Configuration': 'Refresh Configuration',
        'Reload settings from Twingate': 'Reload settings from Twingate',
        'Refresh': 'Refresh'
    },
    'es': {
        'Connected': 'Conectado',
        'Disconnected': 'Desconectado',
        'Authenticating': 'Autenticando',
        'Connect': 'Conectar',
        'Disconnect': 'Desconectar',
        'Version': 'Versión',
        'Available Resources': 'Recursos disponibles',
        'Connect to see resources': 'Conéctate para ver los recursos',
        'Loading error': 'Error de carga',
        'No resources available': 'No hay recursos disponibles',
        'Authenticated': 'Autenticado',
        'Requires Authentication': 'Requiere autenticación',
        'Settings': 'Configuración',
        'Name': 'Nombre',
        'Address': 'Dirección',
        'Authentication': 'Autenticación',
        'Extension Settings': 'Configuración de la extensión',
        'Interface and behavior configuration': 'Configuración de la interfaz y el comportamiento',
        'Language': 'Idioma',
        'Interface language': 'Idioma de la interfaz',
        'Auto (System)': 'Auto (Sistema)',
        'Resource Refresh Interval': 'Intervalo de actualización de recursos',
        'Time between each list update (in seconds)': 'Tiempo entre cada actualización de la lista (en segundos)',
        'ℹ️ Note': 'ℹ️ Nota',
        'Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)': 'Reinicie GNOME Shell para aplicar los cambios de idioma\n(Alt+F2, escriba \'r\' en X11 o cierre sesión/inicie sesión en Wayland)',
        'Twingate Configuration': 'Configuración de Twingate',
        'Twingate configuration management': 'Gestión de la configuración de Twingate',
        'Error': 'Error',
        'Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config': 'No se pudo cargar la configuración de Twingate.\nAsegúrese de que Twingate esté instalado.\nIntente: sudo twingate config',
        'Network': 'Red',
        'Controller URL': 'URL del controlador',
        'Not configured': 'No configurado',
        'Parameters': 'Parámetros',
        'Twingate behavior configuration': 'Configuración del comportamiento de Twingate',
        'Autostart': 'Inicio automático',
        'Start Twingate automatically at startup': 'Iniciar Twingate automáticamente al inicio',
        'Save Auth Data': 'Guardar datos de autenticación',
        'Save authentication data': 'Guardar datos de autenticación',
        'Sentry User Consent': 'Consentimiento de usuario de Sentry',
        'Consent to send error reports': 'Consentimiento para enviar informes de errores',
        'Log Level': 'Nivel de registro',
        'Log verbosity level': 'Nivel de verbosidad del registro',
        'Select log level': 'Seleccione el nivel de registro',
        'Refresh Configuration': 'Actualizar configuración',
        'Reload settings from Twingate': 'Recargar configuración desde Twingate',
        'Refresh': 'Actualizar'
    },
    'de': {
        'Connected': 'Verbunden',
        'Disconnected': 'Getrennt',
        'Authenticating': 'Authentifizierung',
        'Connect': 'Verbinden',
        'Disconnect': 'Trennen',
        'Version': 'Version',
        'Available Resources': 'Verfügbare Ressourcen',
        'Connect to see resources': 'Verbinden Sie sich, um Ressourcen zu sehen',
        'Loading error': 'Ladefehler',
        'No resources available': 'Keine Ressourcen verfügbar',
        'Authenticated': 'Authentifiziert',
        'Requires Authentication': 'Authentifizierung erforderlich',
        'Settings': 'Einstellungen',
        'Name': 'Name',
        'Address': 'Adresse',
        'Authentication': 'Authentifizierung',
        'Extension Settings': 'Erweiterungseinstellungen',
        'Interface and behavior configuration': 'Oberflächen- und Verhaltenskonfiguration',
        'Language': 'Sprache',
        'Interface language': 'Oberflächensprache',
        'Auto (System)': 'Auto (System)',
        'Resource Refresh Interval': 'Ressourcen-Aktualisierungsintervall',
        'Time between each list update (in seconds)': 'Zeit zwischen jeder Listenaktualisierung (in Sekunden)',
        'ℹ️ Note': 'ℹ️ Hinweis',
        'Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)': 'Starten Sie GNOME Shell neu, um Sprachänderungen anzuwenden\n(Alt+F2, geben Sie \'r\' auf X11 ein oder melden Sie sich auf Wayland ab/an)',
        'Twingate Configuration': 'Twingate-Konfiguration',
        'Twingate configuration management': 'Twingate-Konfigurationsverwaltung',
        'Error': 'Fehler',
        'Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config': 'Twingate-Konfiguration kann nicht geladen werden.\nStellen Sie sicher, dass Twingate installiert ist.\nVersuchen Sie: sudo twingate config',
        'Network': 'Netzwerk',
        'Controller URL': 'Controller-URL',
        'Not configured': 'Nicht konfiguriert',
        'Parameters': 'Parameter',
        'Twingate behavior configuration': 'Twingate-Verhaltenskonfiguration',
        'Autostart': 'Autostart',
        'Start Twingate automatically at startup': 'Twingate beim Start automatisch starten',
        'Save Auth Data': 'Authentifizierungsdaten speichern',
        'Save authentication data': 'Authentifizierungsdaten speichern',
        'Sentry User Consent': 'Sentry-Benutzerzustimmung',
        'Consent to send error reports': 'Zustimmung zum Senden von Fehlerberichten',
        'Log Level': 'Protokollstufe',
        'Log verbosity level': 'Protokoll-Ausführlichkeitsstufe',
        'Select log level': 'Protokollstufe auswählen',
        'Refresh Configuration': 'Konfiguration aktualisieren',
        'Reload settings from Twingate': 'Einstellungen von Twingate neu laden',
        'Refresh': 'Aktualisieren'
    },
    'it': {
        'Connected': 'Connesso',
        'Disconnected': 'Disconnesso',
        'Authenticating': 'Autenticazione',
        'Connect': 'Connetti',
        'Disconnect': 'Disconnetti',
        'Version': 'Versione',
        'Available Resources': 'Risorse disponibili',
        'Connect to see resources': 'Connettiti per vedere le risorse',
        'Loading error': 'Errore di caricamento',
        'No resources available': 'Nessuna risorsa disponibile',
        'Authenticated': 'Autenticato',
        'Requires Authentication': 'Richiede autenticazione',
        'Settings': 'Impostazioni',
        'Name': 'Nome',
        'Address': 'Indirizzo',
        'Authentication': 'Autenticazione',
        'Extension Settings': 'Impostazioni estensione',
        'Interface and behavior configuration': 'Configurazione interfaccia e comportamento',
        'Language': 'Lingua',
        'Interface language': 'Lingua dell\'interfaccia',
        'Auto (System)': 'Auto (Sistema)',
        'Resource Refresh Interval': 'Intervallo di aggiornamento risorse',
        'Time between each list update (in seconds)': 'Tempo tra ogni aggiornamento della lista (in secondi)',
        'ℹ️ Note': 'ℹ️ Nota',
        'Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)': 'Riavvia GNOME Shell per applicare le modifiche alla lingua\n(Alt+F2, digita \'r\' su X11 o esci/accedi su Wayland)',
        'Twingate Configuration': 'Configurazione Twingate',
        'Twingate configuration management': 'Gestione configurazione Twingate',
        'Error': 'Errore',
        'Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config': 'Impossibile caricare la configurazione Twingate.\nAssicurati che Twingate sia installato.\nProva: sudo twingate config',
        'Network': 'Rete',
        'Controller URL': 'URL del controller',
        'Not configured': 'Non configurato',
        'Parameters': 'Parametri',
        'Twingate behavior configuration': 'Configurazione comportamento Twingate',
        'Autostart': 'Avvio automatico',
        'Start Twingate automatically at startup': 'Avvia Twingate automaticamente all\'avvio',
        'Save Auth Data': 'Salva dati di autenticazione',
        'Save authentication data': 'Salva dati di autenticazione',
        'Sentry User Consent': 'Consenso utente Sentry',
        'Consent to send error reports': 'Consenso per inviare rapporti di errore',
        'Log Level': 'Livello di log',
        'Log verbosity level': 'Livello di verbosità del log',
        'Select log level': 'Seleziona livello di log',
        'Refresh Configuration': 'Aggiorna configurazione',
        'Reload settings from Twingate': 'Ricarica impostazioni da Twingate',
        'Refresh': 'Aggiorna'

    },
    'pt': {
        'Connected': 'Conectado',
        'Disconnected': 'Desconectado',
        'Authenticating': 'Autenticando',
        'Connect': 'Conectar',
        'Disconnect': 'Desconectar',
        'Version': 'Versão',
        'Available Resources': 'Recursos disponíveis',
        'Connect to see resources': 'Conecte-se para ver os recursos',
        'Loading error': 'Erro de carregamento',
        'No resources available': 'Nenhum recurso disponível',
        'Authenticated': 'Autenticado',
        'Requires Authentication': 'Requer autenticação',
        'Settings': 'Configurações',
        'Name': 'Nome',
        'Address': 'Endereço',
        'Authentication': 'Autenticação',
        'Extension Settings': 'Configurações da extensão',
        'Interface and behavior configuration': 'Configuração de interface e comportamento',
        'Language': 'Idioma',
        'Interface language': 'Idioma da interface',
        'Auto (System)': 'Auto (Sistema)',
        'Resource Refresh Interval': 'Intervalo de atualização de recursos',
        'Time between each list update (in seconds)': 'Tempo entre cada atualização da lista (em segundos)',
        'ℹ️ Note': 'ℹ️ Nota',
        'Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)': 'Reinicie o GNOME Shell para aplicar as alterações de idioma\n(Alt+F2, digite \'r\' no X11 ou faça logout/login no Wayland)',
        'Twingate Configuration': 'Configuração do Twingate',
        'Twingate configuration management': 'Gerenciamento de configuração do Twingate',
        'Error': 'Erro',
        'Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config': 'Não foi possível carregar a configuração do Twingate.\nCertifique-se de que o Twingate está instalado.\nTente: sudo twingate config',
        'Network': 'Rede',
        'Controller URL': 'URL do controlador',
        'Not configured': 'Não configurado',
        'Parameters': 'Parâmetros',
        'Twingate behavior configuration': 'Configuração de comportamento do Twingate',
        'Autostart': 'Início automático',
        'Start Twingate automatically at startup': 'Iniciar Twingate automaticamente na inicialização',
        'Save Auth Data': 'Salvar dados de autenticação',
        'Save authentication data': 'Salvar dados de autenticação',
        'Sentry User Consent': 'Consentimento do usuário Sentry',
        'Consent to send error reports': 'Consentimento para enviar relatórios de erro',
        'Log Level': 'Nível de log',
        'Log verbosity level': 'Nível de verbosidade do log',
        'Select log level': 'Selecione o nível de log',
        'Refresh Configuration': 'Atualizar configuração',
        'Reload settings from Twingate': 'Recarregar configurações do Twingate',
        'Refresh': 'Atualizar'

    },
    'nl': {
        'Connected': 'Verbonden',
        'Disconnected': 'Niet verbonden',
        'Authenticating': 'Authenticeren',
        'Connect': 'Verbinden',
        'Disconnect': 'Verbinding verbreken',
        'Version': 'Versie',
        'Available Resources': 'Beschikbare bronnen',
        'Connect to see resources': 'Maak verbinding om bronnen te zien',
        'Loading error': 'Laadfout',
        'No resources available': 'Geen bronnen beschikbaar',
        'Authenticated': 'Geauthenticeerd',
        'Requires Authentication': 'Vereist authenticatie',
        'Settings': 'Instellingen',
        'Name': 'Naam',
        'Address': 'Adres',
        'Authentication': 'Authenticatie',
        'Extension Settings': 'Extensie-instellingen',
        'Interface and behavior configuration': 'Interface- en gedragsconfiguratie',
        'Language': 'Taal',
        'Interface language': 'Interfacetaal',
        'Auto (System)': 'Auto (Systeem)',
        'Resource Refresh Interval': 'Verversingsinterval voor bronnen',
        'Time between each list update (in seconds)': 'Tijd tussen elke lijstupdate (in seconden)',
        'ℹ️ Note': 'ℹ️ Opmerking',
        'Restart GNOME Shell to apply language changes\n(Alt+F2, type \'r\' on X11 or logout/login on Wayland)': 'Herstart GNOME Shell om taalwijzigingen toe te passen\n(Alt+F2, typ \'r\' op X11 of log uit/in op Wayland)',
        'Twingate Configuration': 'Twingate-configuratie',
        'Twingate configuration management': 'Twingate-configuratiebeheer',
        'Error': 'Fout',
        'Unable to load Twingate configuration.\nMake sure Twingate is installed.\nTry: sudo twingate config': 'Kan Twingate-configuratie niet laden.\nZorg ervoor dat Twingate is geïnstalleerd.\nProbeer: sudo twingate config',
        'Network': 'Netwerk',
        'Controller URL': 'Controller-URL',
        'Not configured': 'Niet geconfigureerd',
        'Parameters': 'Parameters',
        'Twingate behavior configuration': 'Twingate-gedragsconfiguratie',
        'Autostart': 'Automatisch starten',
        'Start Twingate automatically at startup': 'Twingate automatisch starten bij opstarten',
        'Save Auth Data': 'Authenticatiegegevens opslaan',
        'Save authentication data': 'Authenticatiegegevens opslaan',
        'Sentry User Consent': 'Sentry gebruikerstoestemming',
        'Consent to send error reports': 'Toestemming om foutrapporten te verzenden',
        'Log Level': 'Logniveau',
        'Log verbosity level': 'Log verbositeitsniveau',
        'Select log level': 'Selecteer logniveau',
        'Refresh Configuration': 'Configuratie vernieuwen',
        'Reload settings from Twingate': 'Instellingen opnieuw laden van Twingate',
        'Refresh': 'Vernieuwen'

    }
};

export class Translator {
    constructor(settings) {
        this._settings = settings;
        this._locale = this._detectLocale();
    }

    _detectLocale() {
        // Si des préférences sont fournies, utiliser la langue configurée
        if (this._settings) {
            const savedLocale = this._settings.get_string('language');
            if (savedLocale && savedLocale !== 'auto') {
                return savedLocale;
            }
        }

        // Sinon, détecter automatiquement
        const langEnv = GLib.getenv('LANG') || GLib.getenv('LANGUAGE') || 'en_US.UTF-8';
        const lang = langEnv.split('_')[0].toLowerCase();

        // Supporter les langues disponibles
        const supportedLanguages = ['fr', 'en', 'es', 'de', 'it', 'pt', 'nl'];
        return supportedLanguages.includes(lang) ? lang : 'en';
    }

    setLocale(locale) {
        this._locale = locale === 'auto' ? this._detectLocale() : locale;
    }

    gettext(text) {
        if (this._locale === 'en') {
            return text;
        }

        return TRANSLATIONS[this._locale]?.[text] || text;
    }

    getAvailableLanguages() {
        return [
            { code: 'auto', name: 'Auto (System)' },
            { code: 'en', name: 'English' },
            { code: 'fr', name: 'Français' },
            { code: 'es', name: 'Español' },
            { code: 'de', name: 'Deutsch' },
            { code: 'it', name: 'Italiano' },
            { code: 'pt', name: 'Português' },
            { code: 'nl', name: 'Nederlands' }
        ];
    }
}

let _translator = null;

export function _(text) {
    if (!_translator) {
        _translator = new Translator(null);
    }
    return _translator.gettext(text);
}

export function setTranslatorSettings(settings) {
    _translator = new Translator(settings);
}

export function updateTranslatorLocale(locale) {
    if (_translator) {
        _translator.setLocale(locale);
    }
}
