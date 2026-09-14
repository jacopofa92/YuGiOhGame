/**
 * video-quality.js — Livello di DETTAGLI VIDEO scelto dal giocatore.
 * ------------------------------------------------------------------
 * Due soli livelli, deliberatamente:
 *   'normali' (default) — il gioco come è sempre stato;
 *   'alti'              — effetti aggiuntivi sul Terreno di gioco.
 *
 * Questo file NON disegna e NON anima nulla: si limita a ricordare la
 * scelta e a scriverla sul documento come `data-dettagli` sull'elemento
 * <html>. È l'unica cosa che serve perché un effetto futuro possa
 * accendersi da solo:
 *
 *     html[data-dettagli="alti"] .field-slot::after { ... }
 *
 * — nessuna modifica a questo file, nessun controllo JS sparso nel
 * motore. Un effetto che ha invece bisogno di vero JavaScript chiede
 * `VideoQuality.isAlti()` al momento giusto, e si spegne da sé quando è
 * falso. La scelta viene applicata SUBITO al caricamento (vedi in fondo),
 * quindi il primo frame dipinto è già quello giusto: se fosse applicata
 * dopo, una pagina di duello mostrerebbe per un istante gli effetti del
 * livello sbagliato.
 *
 * La preferenza vive in localStorage e NON nel salvataggio unificato: è
 * una scelta del DISPOSITIVO (un telefono lento e un PC possono volere
 * livelli diversi con lo stesso account), esattamente come la vibrazione
 * in js/native/haptics.js — stesso schema, stessa motivazione.
 */
(function () {
    'use strict';

    const CHIAVE = 'ygoVideoDetail';
    const NORMALI = 'normali';
    const ALTI = 'alti';
    /** Il livello di partenza per chi non ha mai scelto: il gioco di sempre. */
    const DEFAULT = NORMALI;

    const LIVELLI = [
        { valore: NORMALI, nome: 'Normali', descrizione: 'Il gioco come sempre: massima fluidità, consigliato su telefono.' },
        { valore: ALTI, nome: 'Alti', descrizione: 'Effetti aggiuntivi sul Terreno di gioco. Può pesare sui dispositivi meno potenti.' }
    ];

    function leggi() {
        try {
            const salvato = localStorage.getItem(CHIAVE);
            // Un valore sconosciuto (salvataggio di una versione futura,
            // o manomesso) non deve lasciare il gioco in uno stato che
            // nessun CSS conosce: si ricade sul default.
            return (salvato === ALTI || salvato === NORMALI) ? salvato : DEFAULT;
        } catch (e) {
            // localStorage può lanciare (navigazione privata, permessi):
            // la preferenza si perde, il gioco no.
            return DEFAULT;
        }
    }

    function applica() {
        const livello = leggi();
        if (document.documentElement) document.documentElement.dataset.dettagli = livello;
        return livello;
    }

    function imposta(livello) {
        const valido = (livello === ALTI) ? ALTI : NORMALI;
        try {
            localStorage.setItem(CHIAVE, valido);
        } catch (e) { /* come sopra: la scelta non si salva, ma vale per questa sessione */ }
        if (document.documentElement) document.documentElement.dataset.dettagli = valido;
        return valido;
    }

    window.VideoQuality = {
        NORMALI: NORMALI,
        ALTI: ALTI,
        LIVELLI: LIVELLI,
        get: leggi,
        set: imposta,
        isAlti: () => leggi() === ALTI,
        applica: applica
    };

    // Applicata subito, non al DOMContentLoaded: questo script è caricato
    // nell'<head>/in cima al <body> delle pagine che ne hanno bisogno, e
    // <html> esiste già mentre lo si sta eseguendo.
    applica();
})();
