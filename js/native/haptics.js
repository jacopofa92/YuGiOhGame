/**
 * haptics.js — feedback tattile (vibrazione) tramite @capacitor/haptics,
 * SOLO dentro l'APK nativo — su web ogni funzione qui sotto è un no-op
 * silenzioso, stesso pattern di ensureCapacitorAppIntegration() in
 * js/audio/audio-manager.js e di js/native/app-back-button.js: mai un
 * requisito, un piccolo tocco "app vera" quando disponibile.
 *
 * Le stringhe passate a impact()/notification() ('LIGHT'/'MEDIUM'/
 * 'HEAVY', 'SUCCESS'/'ERROR') sono i valori REALI usati a runtime dal
 * plugin (ImpactStyle/NotificationType in @capacitor/haptics) — scritte
 * qui a mano invece di importarle perché questo progetto non ha
 * bundler/moduli ES, stesso motivo per cui altrove si scrive
 * orientation:'landscape' invece di un import da
 * @capacitor/screen-orientation.
 */
(function () {
    'use strict';

    function getPlugin() {
        if (!window.Capacitor || !Capacitor.isNativePlatform || !Capacitor.isNativePlatform()) return null;
        return (Capacitor.Plugins && Capacitor.Plugins.Haptics) || null;
    }

    function impact(style) {
        const plugin = getPlugin();
        if (plugin && typeof plugin.impact === 'function') plugin.impact({ style: style }).catch(() => {});
    }

    function notification(type) {
        const plugin = getPlugin();
        if (plugin && typeof plugin.notification === 'function') plugin.notification({ type: type }).catch(() => {});
    }

    window.NativeHaptics = {
        light: () => impact('LIGHT'),
        medium: () => impact('MEDIUM'),
        heavy: () => impact('HEAVY'),
        success: () => notification('SUCCESS'),
        error: () => notification('ERROR')
    };
})();
