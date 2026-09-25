/**
 * auto-sync.js — il salvataggio arriva sul cloud mentre giochi, non solo
 * quando esci.
 * =====================================================================
 * IL DIFETTO CHE CHIUDE, segnalato dall'utente dopo aver perso il
 * salvataggio più recente: il caricamento sul cloud partiva SOLO da
 * "Esci" e "Cambia account". Chiunque chiuda il gioco in un altro modo —
 * l'APK ucciso dal sistema per fare spazio, la batteria finita, la scheda
 * chiusa, o semplicemente chi non fa mai logout perché non ne ha motivo —
 * lasciava ore di gioco nel solo localStorage di quel dispositivo. Poi
 * bastava rientrare da un altro telefono per trovare il cloud fermo a
 * giorni prima, e sceglierlo cancellava tutto.
 *
 * COME: si ascolta il gancio `SaveManager.onSaved` — cioè OGNI scrittura
 * del salvataggio, da qualunque punto del gioco (fine duello, acquisto,
 * sblocco, mazzo modificato) — e si carica sul cloud poco dopo. Il
 * ritardo serve: una partita scrive più volte di fila, e senza si
 * manderebbe una richiesta per ognuna.
 *
 * DUE MOMENTI IN CUI SI FORZA SUBITO, senza aspettare il ritardo:
 *   - la pagina diventa NASCOSTA (`visibilitychange`): su un telefono è
 *     l'istante in cui si passa a un'altra app, ed è l'ultimo momento in
 *     cui la pagina è ancora viva e può fare una richiesta per bene. È il
 *     segnale che conta davvero su mobile;
 *   - `pagehide`, come seconda rete. Qui la pagina può morire a richiesta
 *     ancora in volo: non è affidabile da solo, e infatti non si conta
 *     su di lui.
 * (`beforeunload` non è nell'elenco apposta: su mobile non scatta.)
 *
 * SE LA RICHIESTA NON RIESCE (offline, rete che va e viene) resta un
 * segno in localStorage, e al prossimo avvio si riprova appena la
 * sessione è nota. È il pezzo che rende il meccanismo affidabile invece
 * che *quasi* affidabile: senza, una giornata giocata in metropolitana
 * non arriverebbe mai sul cloud.
 */
(function () {
    'use strict';

    /**
     * Quanto si aspetta prima di caricare. Abbastanza da raccogliere in
     * una sola richiesta la raffica di scritture di fine duello (premi,
     * record, sfide, sblocchi arrivano uno dopo l'altro), abbastanza poco
     * da non perdere una partita se l'app viene chiusa di colpo.
     */
    const RITARDO_MS = 15000;

    /** Segno "c'è qualcosa da caricare che non è ancora arrivato". Sopravvive alla chiusura dell'app, quindi localStorage e non sessionStorage. */
    const CHIAVE_IN_SOSPESO = 'ygoSyncInSospeso';

    let timer = null;
    let inCorso = false;

    function segna(inSospeso) {
        try {
            if (inSospeso) localStorage.setItem(CHIAVE_IN_SOSPESO, '1');
            else localStorage.removeItem(CHIAVE_IN_SOSPESO);
        } catch (e) { /* senza il segno si perde solo il recupero differito */ }
    }
    function inSospeso() {
        try { return localStorage.getItem(CHIAVE_IN_SOSPESO) === '1'; } catch (e) { return false; }
    }

    function pronto() {
        return !!(window.CloudSync && CloudSync.available && CloudSync.getUser && CloudSync.getUser()
            && window.SaveManager && SaveManager.hasSave());
    }

    /**
     * Carica adesso. `inCorso` evita che due richieste si accavallino —
     * la seconda sovrascriverebbe la prima con dati che potrebbero essere
     * più VECCHI, se arrivasse dopo per un ritardo di rete.
     */
    function caricaOra() {
        if (timer) { clearTimeout(timer); timer = null; }
        if (inCorso || !pronto()) return Promise.resolve(false);
        inCorso = true;
        segna(true);
        return CloudSync.pushSave()
            .then(() => { segna(false); return true; })
            // Silenzioso di proposito: questo gira mentre si gioca, e un
            // avviso a ogni sbalzo di rete sarebbe rumore su qualcosa che
            // si sistema da sé al tentativo successivo. Il segno resta, ed
            // è quello che conta.
            .catch(() => false)
            .then((esito) => { inCorso = false; return esito; });
    }

    function programma() {
        if (!pronto()) return;
        segna(true);
        if (timer) clearTimeout(timer);
        timer = setTimeout(caricaOra, RITARDO_MS);
    }

    /**
     * L'aggancio a SaveManager NON deve dipendere dall'ordine dei tag
     * <script>. Questo file sta in cima alla pagina insieme agli altri di
     * js/cloud/, mentre js/save-manager.js viene caricato molto più in
     * basso: agganciarsi solo al primo tentativo vorrebbe dire non
     * agganciarsi mai. E la lista degli script è duplicata a mano in
     * diciannove pagine, quindi un ordine "giusto" sarebbe una cosa in più
     * da tenere allineata a mano — cioè una deriva che aspetta di
     * succedere, in un progetto dove è già successa.
     */
    let agganciato = false;
    function collega() {
        if (agganciato || !window.SaveManager || typeof SaveManager.onSaved !== 'function') return false;
        SaveManager.onSaved(programma);
        agganciato = true;
        return true;
    }
    if (!collega()) {
        document.addEventListener('DOMContentLoaded', collega);
        window.addEventListener('load', collega);
    }

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && (timer || inSospeso())) caricaOra();
    });
    window.addEventListener('pagehide', () => {
        if (timer || inSospeso()) caricaOra();
    });

    // Recupero di ciò che era rimasto indietro: si aspetta di sapere CHI è
    // l'utente (waitForUser, non il primo giro di onAuthChange — vedi il
    // commento su initialSessionPromise in cloud-sync.js) perché senza
    // sessione non c'è niente da caricare e si concluderebbe subito un
    // "non pronto" che nessuno riproverebbe.
    if (window.CloudSync && typeof CloudSync.waitForUser === 'function') {
        CloudSync.waitForUser().then(() => {
            if (inSospeso()) caricaOra();
        }).catch(() => { /* nessuna sessione: si riproverà al prossimo avvio */ });
    }

    window.AutoSync = {
        /** Forza il caricamento adesso. Torna una Promise: usarla quando si DEVE sapere se è arrivato (es. prima di uscire). */
        caricaOra: caricaOra,
        inSospeso: inSospeso
    };
})();
