/**
 * tilt-setting.js — "Campo inclinato" acceso o spento.
 * ------------------------------------------------------------------
 * Gemello di js/ui/hologram-setting.js, e per le stesse ragioni: è una
 * scelta del DISPOSITIVO (lo stesso account su un telefono e su un PC può
 * volerla diversa), quindi vive in localStorage e NON nel salvataggio
 * unificato — come la vibrazione in js/native/haptics.js.
 *
 * Questo file non disegna nulla: ricorda la scelta e la scrive su <html>
 * come `data-campo-inclinato`. L'inclinazione vera la applica la CSS di
 * duelMonstersCore.html, che con quell'attributo dà un valore alla
 * variabile `--campo-tilt`.
 *
 * PERCHÉ UNA VARIABILE E NON UN `transform` DIRETTO: il Terreno ha già
 * un'animazione d'ingresso (cameraIntroZoomOut) con fill-mode `both`, che
 * continua a imporre il proprio transform finale anche a animazione
 * conclusa — e i valori di un'animazione battono una dichiarazione
 * normale. Un `transform` scritto qui non avrebbe alcun effetto: è lo
 * stesso inciampo già documentato in js/ui/monster-hologram.css per
 * `.mh-nascosto`. Mettendo invece la variabile DENTRO l'ultimo keyframe,
 * la telecamera atterra già inclinata — niente campo che si appiattisce
 * per poi ri-inclinarsi un istante dopo.
 *
 * DEFAULT SPENTO, al contrario dell'ologramma: l'inclinazione cambia
 * come si legge l'intero Terreno, e un cambiamento del genere va scelto,
 * non subito riaprendo il gioco.
 *
 * La scelta si applica SUBITO al caricamento (in fondo), non al
 * DOMContentLoaded: così il primo frame dipinto è già quello giusto, e
 * l'intro non parte con un'inclinazione per finire con un'altra.
 */
(function () {
    'use strict';

    const CHIAVE = 'ygoCampoInclinato';
    const ACCESO = 'on';
    const SPENTO = 'off';
    const DEFAULT = SPENTO;

    function leggi() {
        try {
            const salvato = localStorage.getItem(CHIAVE);
            // Un valore sconosciuto (salvataggio di una versione futura, o
            // manomesso) non deve lasciare la pagina in uno stato che
            // nessun CSS conosce: si ricade sul default.
            return (salvato === ACCESO || salvato === SPENTO) ? salvato : DEFAULT;
        } catch (e) {
            // localStorage può lanciare (navigazione privata, permessi):
            // la preferenza si perde, il gioco no.
            return DEFAULT;
        }
    }

    function applica() {
        const valore = leggi();
        if (document.documentElement) document.documentElement.dataset.campoInclinato = valore;
        return valore;
    }

    function imposta(attivo) {
        const valore = attivo ? ACCESO : SPENTO;
        try {
            localStorage.setItem(CHIAVE, valore);
        } catch (e) { /* come sopra: non si salva, ma vale per questa sessione */ }
        if (document.documentElement) document.documentElement.dataset.campoInclinato = valore;
        return valore;
    }

    window.TiltSetting = {
        get: leggi,
        set: imposta,
        isAttivo: () => leggi() === ACCESO,
        applica: applica
    };

    applica();
})();
