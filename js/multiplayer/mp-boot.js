/**
 * mp-boot.js — Console di avvio "KaibaCorp System" del Multiplayer.
 * ---------------------------------------------------------------
 * Compare mentre la lobby si collega al server di stanze e fa da
 * schermata di caricamento: righe di terminale scritte a macchina, una
 * barra di sincronizzazione, un cronometro e un testo che CAMBIA mentre si
 * aspetta, invece di una rotella muda.
 *
 * Perché esiste. Il server pubblico sta su un piano gratuito: dorme quando
 * nessuno gioca e impiega circa un minuto a tornare su (vedi
 * js/multiplayer/network.js, `connect`). Quel minuto è un'attesa che il
 * giocatore non può accorciare; si può solo renderla leggibile e
 * piacevole. Il testo racconta cosa sta succedendo davvero (nodo in
 * standby, tentativo N) con la voce del sistema, e la barra avanza anche
 * se il server non dice niente: il suo avanzamento è una STIMA basata sul
 * tempo trascorso, non un dato vero, e si ferma al 94% finché la
 * connessione non riesce davvero.
 *
 * Interfaccia (usata da mp-lobby.js, nient'altro la conosce):
 *   MpBoot.apri(url)          — mostra la console e comincia
 *   MpBoot.risveglio(info)    — un tentativo è fallito, il server si sta svegliando
 *   MpBoot.connesso()         — Promise: finale "accesso consentito", poi chiude
 *   MpBoot.errore(messaggio)  — resta aperta con l'errore e un pulsante Chiudi
 *   MpBoot.chiudi()           — chiude subito
 * E, per la schermata d'ingresso: orologio di sistema e titolo che si
 * "decodifica" (vedi `avviaIngresso`).
 */
(function () {
    'use strict';

    const CARATTERE_MS = 13;       // velocità della scrittura a macchina
    const RIGHE_VISIBILI = 9;      // oltre, le più vecchie escono dall'alto
    const ROTAZIONE_MS = 2600;     // ogni quanto cambia il messaggio d'attesa
    const MINIMO_VISIBILE_MS = 1900; // anche a server già sveglio, il tempo di leggere la sequenza
    const STIMA_RISVEGLIO_MS = 22000; // costante di tempo della barra (vedi percentuale())

    // Frasi dell'attesa lunga: nessuna dice una cosa falsa sul sistema, sono
    // la voce di KaibaCorp che racconta un risveglio. Si pescano senza
    // ripetere le ultime, così non si legge due volte la stessa di fila.
    const MESSAGGI_ATTESA = [
        'sincronizzazione dei reattori di calcolo',
        'riscaldamento dei server quantici',
        'calibrazione olografica dell\'arena',
        'handshake con la Torre KaibaCorp',
        'allocazione della sala duello',
        'verifica dei protocolli del Duel Disk',
        'caricamento del database carte',
        'apertura del canale cifrato',
        'ottimizzazione della latenza di rete',
        'compilazione delle regole di duello',
        'stabilizzazione dell\'energia del nodo',
        'riavvio del servizio di stanze'
    ];

    const ridotto = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    let radice = null;
    let corpo = null;
    let barra = null;
    let percentualeEl = null;
    let tempoEl = null;
    let tentativoEl = null;
    let faseEl = null;
    let nodoEl = null;
    let chiudiBtn = null;

    let coda = [];
    let scrivendo = false;
    let aperturaTs = 0;
    let timerTempo = null;
    let timerRotazione = null;
    let tentativo = 0;
    let risvegliato = false;
    let suggerimentoDato = false;
    let ultimi = [];
    let concluso = false;     // connesso() o errore() già chiamati
    let percentualeFinale = null; // se impostata, la barra la raggiunge e resta lì

    function costruisci() {
        if (radice) return;
        radice = document.createElement('div');
        radice.className = 'mp-boot';
        radice.hidden = true;
        radice.setAttribute('role', 'status');
        radice.setAttribute('aria-live', 'polite');
        radice.innerHTML = `
            <div class="mp-boot-scan" aria-hidden="true"></div>
            <div class="mp-boot-pannello">
                <div class="mp-boot-testa">
                    <span class="mp-boot-kc" aria-hidden="true">KC</span>
                    <div class="mp-boot-titoli">
                        <span class="mp-boot-sistema">KAIBACORP SYSTEM</span>
                        <span class="mp-boot-rete">DUEL LINK NETWORK</span>
                    </div>
                    <span class="mp-boot-fase" data-fase="avvio"><span class="mp-boot-led"></span><span data-boot="fase">AVVIO</span></span>
                </div>
                <div class="mp-boot-corpo" data-boot="corpo"></div>
                <div class="mp-boot-piede">
                    <div class="mp-boot-barra"><span class="mp-boot-riempimento" data-boot="barra"></span></div>
                    <div class="mp-boot-dati">
                        <span>SYNC <b data-boot="pct">0%</b></span>
                        <span>T+<b data-boot="tempo">00:00</b></span>
                        <span>TENT. <b data-boot="tent">0</b></span>
                        <span class="mp-boot-nodo" data-boot="nodo">NODO --</span>
                    </div>
                    <button type="button" class="mp-boot-chiudi" data-boot="chiudi" hidden>Chiudi</button>
                </div>
            </div>`;
        document.body.appendChild(radice);
        corpo = radice.querySelector('[data-boot="corpo"]');
        barra = radice.querySelector('[data-boot="barra"]');
        percentualeEl = radice.querySelector('[data-boot="pct"]');
        tempoEl = radice.querySelector('[data-boot="tempo"]');
        tentativoEl = radice.querySelector('[data-boot="tent"]');
        faseEl = radice.querySelector('.mp-boot-fase');
        nodoEl = radice.querySelector('[data-boot="nodo"]');
        chiudiBtn = radice.querySelector('[data-boot="chiudi"]');
        chiudiBtn.addEventListener('click', chiudi);
    }

    // --- Scrittura a macchina ------------------------------------------
    function aggiungiRiga(testo, classe, esito) {
        coda.push({ testo: testo, classe: classe || '', esito: esito || '' });
        processa();
    }

    function processa() {
        if (scrivendo || !coda.length || !corpo) return;
        const voce = coda.shift();
        const riga = document.createElement('div');
        riga.className = 'mp-boot-riga' + (voce.classe ? ' ' + voce.classe : '');
        corpo.appendChild(riga);
        while (corpo.children.length > RIGHE_VISIBILI) corpo.removeChild(corpo.firstChild);

        const finisci = () => {
            if (voce.esito) {
                const es = document.createElement('span');
                es.className = 'mp-boot-esito';
                es.textContent = voce.esito;
                riga.appendChild(es);
            }
            riga.classList.remove('scrivendo');
            scrivendo = false;
            processa();
        };

        scrivendo = true;
        if (ridotto()) { riga.textContent = voce.testo; finisci(); return; }
        riga.classList.add('scrivendo');
        let i = 0;
        const passo = () => {
            if (!corpo || !riga.isConnected) { scrivendo = false; return; }
            // Qualche carattere per volta quando la coda si accumula, per non
            // restare indietro rispetto a ciò che sta davvero succedendo.
            const blocco = coda.length > 3 ? 4 : (coda.length > 1 ? 2 : 1);
            i = Math.min(voce.testo.length, i + blocco);
            riga.textContent = voce.testo.slice(0, i);
            if (i >= voce.testo.length) finisci();
            else setTimeout(passo, CARATTERE_MS);
        };
        passo();
    }

    function quandoVuota(callback, limiteMs) {
        const fine = Date.now() + (limiteMs || 4000);
        const controlla = () => {
            if ((!coda.length && !scrivendo) || Date.now() > fine) callback();
            else setTimeout(controlla, 60);
        };
        controlla();
    }

    // --- Barra, cronometro e fase ----------------------------------------
    function secondi() { return Math.max(0, Math.round((Date.now() - aperturaTs) / 1000)); }

    // Curva che sale in fretta e poi rallenta, senza mai arrivare a 100:
    // 63% dopo STIMA_RISVEGLIO_MS e poi sempre più piano, fino al tetto del
    // 94%. È un'ESTIMA del tempo, non un dato del server, e il tetto lo dice.
    function percentuale() {
        if (percentualeFinale !== null) return percentualeFinale;
        const t = Date.now() - aperturaTs;
        return Math.min(94, Math.round(100 * (1 - Math.exp(-t / STIMA_RISVEGLIO_MS)) * 0.99));
    }

    function nomeFase(pct) {
        if (concluso && percentualeFinale === 100) return ['online', 'ONLINE'];
        if (pct < 12) return ['avvio', 'AVVIO'];
        if (!risvegliato) return ['avvio', 'COLLEGAMENTO'];
        if (pct < 70) return ['risveglio', 'RISVEGLIO NODO'];
        return ['sync', 'SINCRONIZZAZIONE'];
    }

    function aggiorna() {
        if (!radice || radice.hidden) return;
        const pct = percentuale();
        barra.style.transform = `scaleX(${pct / 100})`;
        percentualeEl.textContent = pct + '%';
        const s = secondi();
        tempoEl.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
        tentativoEl.textContent = String(tentativo);
        if (!radice.classList.contains('mp-boot--errore')) {
            const [stato, etichetta] = nomeFase(pct);
            faseEl.dataset.fase = stato;
            faseEl.lastElementChild.textContent = etichetta;
        }
        // Dopo mezzo minuto un solo, sincero suggerimento: è un server
        // gratuito, e sapere perché si aspetta lo rende tollerabile.
        if (!suggerimentoDato && risvegliato && s >= 25 && !concluso) {
            suggerimentoDato = true;
            aggiungiRiga('> il nodo gratuito impiega fino a ~60 s a riavviarsi: resta connesso', 'avviso');
        }
    }

    function etichettaCasuale() {
        const hex = Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');
        return '[0x' + hex + ']';
    }

    function prossimoMessaggio() {
        let scelta;
        let guardia = 0;
        do {
            scelta = MESSAGGI_ATTESA[Math.floor(Math.random() * MESSAGGI_ATTESA.length)];
            guardia++;
        } while (ultimi.indexOf(scelta) !== -1 && guardia < 20);
        ultimi.push(scelta);
        if (ultimi.length > 5) ultimi.shift();
        return scelta;
    }

    function avviaRotazione() {
        if (timerRotazione) return;
        timerRotazione = setInterval(() => {
            if (concluso) return;
            // Se la scrittura è in ritardo non si accumulano righe vecchie.
            if (coda.length > 1) return;
            aggiungiRiga('> ' + prossimoMessaggio() + ' ' + etichettaCasuale(), 'dinamica');
        }, ROTAZIONE_MS);
    }

    function fermaTimer() {
        if (timerTempo) { clearInterval(timerTempo); timerTempo = null; }
        if (timerRotazione) { clearInterval(timerRotazione); timerRotazione = null; }
    }

    // --- Interfaccia -------------------------------------------------------
    function apri(url) {
        costruisci();
        fermaTimer();
        coda = [];
        scrivendo = false;
        corpo.textContent = '';
        radice.classList.remove('mp-boot--errore', 'mp-boot--ok');
        chiudiBtn.hidden = true;
        tentativo = 0;
        risvegliato = false;
        suggerimentoDato = false;
        ultimi = [];
        concluso = false;
        percentualeFinale = null;
        aperturaTs = Date.now();

        let host = '--';
        try { host = new URL(url.replace(/^ws/i, 'http')).host; } catch (e) { /* indirizzo non analizzabile: resta il segnaposto */ }
        nodoEl.textContent = 'NODO ' + host.toUpperCase();
        nodoEl.title = host;

        radice.hidden = false;
        // Riavvia l'animazione di accensione (stile schermo CRT) a ogni apertura.
        radice.classList.remove('mp-boot--in');
        void radice.offsetWidth;
        radice.classList.add('mp-boot--in');

        aggiungiRiga('> boot kernel duel-link ........', '', 'OK');
        aggiungiRiga('> verifica integrità Duel Disk ........', '', 'OK');
        aggiungiRiga('> ricerca nodo server: ' + host, 'dinamica');

        timerTempo = setInterval(aggiorna, 250);
        aggiorna();
    }

    function risveglio(info) {
        if (!radice || radice.hidden || concluso) return;
        tentativo = (info && info.attempt) || (tentativo + 1);
        if (!risvegliato) {
            risvegliato = true;
            aggiungiRiga('> nodo in STANDBY: sequenza di risveglio avviata', 'avviso');
            avviaRotazione();
        } else {
            aggiungiRiga('> nodo non ancora raggiungibile — nuovo tentativo ' + tentativo, 'avviso');
        }
        aggiorna();
    }

    function connesso() {
        return new Promise((risolvi) => {
            if (!radice || radice.hidden) { risolvi(); return; }
            concluso = true;
            fermaTimer();
            timerTempo = setInterval(aggiorna, 250);
            const trascorso = Date.now() - aperturaTs;
            const attesa = Math.max(0, MINIMO_VISIBILE_MS - trascorso);
            setTimeout(() => {
                percentualeFinale = 100;
                radice.classList.add('mp-boot--ok');
                aggiungiRiga('> canale cifrato stabilito ........', '', 'OK');
                aggiungiRiga('> ACCESSO CONSENTITO', 'accesso');
                aggiorna();
                quandoVuota(() => setTimeout(() => { chiudi(); risolvi(); }, ridotto() ? 200 : 700), 5000);
            }, attesa);
        });
    }

    function errore(messaggio) {
        if (!radice || radice.hidden) return;
        concluso = true;
        fermaTimer();
        radice.classList.add('mp-boot--errore');
        faseEl.dataset.fase = 'errore';
        faseEl.lastElementChild.textContent = 'OFFLINE';
        aggiungiRiga('> ERRORE: ' + String(messaggio || 'connessione non riuscita').toUpperCase(), 'errore');
        aggiungiRiga('> premi Chiudi e riprova', 'avviso');
        chiudiBtn.hidden = false;
        aggiorna();
    }

    function chiudi() {
        fermaTimer();
        coda = [];
        scrivendo = false;
        if (radice) radice.hidden = true;
    }

    // --- Schermata d'ingresso ---------------------------------------------
    function orologio() {
        const el = document.getElementById('mpSysClock');
        if (!el) return;
        const scrivi = () => {
            const d = new Date();
            el.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, '0')).join(':');
        };
        scrivi();
        setInterval(scrivi, 1000);
    }

    // Il titolo compare "decodificato": caratteri casuali che si fissano da
    // sinistra a destra. Il testo vero è già nel DOM (e in aria-label) prima
    // dell'effetto: chi non vede l'animazione, o la disattiva, non perde niente.
    function decodificaTitolo() {
        const el = document.querySelector('.mp-title');
        if (!el || ridotto()) return;
        const vero = el.textContent;
        el.setAttribute('aria-label', vero);
        const simboli = '01<>/#$%&*+=?';
        const passi = 16;
        let n = 0;
        const t = setInterval(() => {
            n++;
            const fissi = Math.floor((n / passi) * vero.length);
            let s = vero.slice(0, fissi);
            for (let i = fissi; i < vero.length; i++) {
                s += vero[i] === ' ' ? ' ' : simboli[Math.floor(Math.random() * simboli.length)];
            }
            el.textContent = s;
            if (n >= passi) { clearInterval(t); el.textContent = vero; }
        }, 42);
    }

    function avviaIngresso() {
        orologio();
        decodificaTitolo();
    }

    window.MpBoot = { apri: apri, risveglio: risveglio, connesso: connesso, errore: errore, chiudi: chiudi };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avviaIngresso);
    else avviaIngresso();
})();
