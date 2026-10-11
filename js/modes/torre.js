// @ts-check
/**
 * torre.js — La logica della Torre dei Duellanti, condivisa da torre.html
 * (la scalata, la scelta del premio) e dal duello (js/modes/torre-mode.js).
 * =====================================================================
 * Un posto solo per le regole della scalata, perché due pagine diverse le
 * usano: torre.html la mostra e la fa avanzare, la pagina del duello
 * registra com'è finito il piano. Due copie della stessa regola andrebbero
 * alla deriva alla prima modifica.
 *
 * Lo stato vive in SaveManager.getModeState('torre') (forma: StatoTorre in
 * types/modalita.d.ts). Nulla qui tocca il motore di duello: si legge solo
 * come è finito un duello (Life Point rimasti, vinto o perso).
 *
 * Premi: dopo ogni piano vinto si sceglie fra DUE cose — recuperare Life
 * Point oppure un oggetto (vedi torreDatabase.oggetti). Nessun premio
 * finale per la Torre conquistata (scelta dell'utente: arriveranno carte
 * nuove più avanti): restano i soliti crediti di fine duello.
 */
const Torre = (function () {
    'use strict';

    const db = () => /** @type {any} */ (window).torreDatabase || torreDatabase;

    /** @returns {StatoTorre} */
    function stato() {
        /** @type {StatoTorre | null} */
        const s = window.SaveManager ? SaveManager.getModeState('torre') : null;
        return {
            inCorso: (s && s.inCorso) || null,
            ultimoEsito: (s && s.ultimoEsito) || null,
            record: Object.assign({ pianoMassimo: 0, tentativi: 0, conquiste: 0 }, (s && s.record) || {})
        };
    }

    /** @param {StatoTorre} s */
    function salva(s) {
        if (window.SaveManager) SaveManager.setModeState('torre', s);
    }

    /** @param {number} piano */
    const eBoss = (piano) => !!db().boss[piano];

    /** @param {number} piano @returns {FasciaTorre | null} */
    function fasciaDi(piano) {
        return db().fasce.find((f) => piano >= f.daPiano && piano <= f.aPiano) || null;
    }

    /**
     * Gli avversari di tutti i piani, sorteggiati una volta all'inizio della
     * scalata: così ricaricando la pagina non cambiano. Nessuno si incontra
     * due volte nella stessa scalata, nemmeno fra fasce diverse e nemmeno un
     * boss (Bandit Keith al piano 5 e di nuovo al 7 era capitato davvero):
     * si pesca prima fra chi non è ancora uscito, e solo se la fascia è
     * esaurita si accetta un ritorno.
     * @returns {string[]}
     */
    function sorteggiaAvversari() {
        /** @type {string[]} */
        const out = [];
        // I boss sono fissi: contano come già incontrati fin dall'inizio.
        const usati = new Set(Object.values(db().boss).map((b) => b.avversario));
        for (let piano = 1; piano <= db().piani; piano++) {
            const boss = db().boss[piano];
            if (boss) { out.push(boss.avversario); continue; }
            const f = fasciaDi(piano);
            if (!f) { out.push('kaiba'); continue; }
            const nuovi = f.avversari.filter((a) => !usati.has(a));
            const pool = nuovi.length ? nuovi : f.avversari;
            const scelto = pool[Math.floor(Math.random() * pool.length)];
            usati.add(scelto);
            out.push(scelto);
        }
        return out;
    }

    /** Chi, a che livello e dove, al piano indicato. @param {ScalataTorre} sc @param {number} piano @returns {PianoTorre} */
    function pianoDi(sc, piano) {
        const boss = db().boss[piano];
        if (boss) return boss;
        const f = fasciaDi(piano);
        return {
            avversario: sc.avversari[piano - 1],
            livello: f ? f.livello : 'Medio',
            campo: f ? f.campo : undefined
        };
    }

    /** Comincia una scalata nuova (quella vecchia, se c'era, è persa). @returns {StatoTorre} */
    function nuovaScalata() {
        const s = stato();
        s.inCorso = {
            piano: 1,
            lp: db().lpIniziali,
            avversari: sorteggiaAvversari(),
            oggetti: { mano: 0, primo: 0, lpAvversario: 0, carta: 0 },
            cartaFidata: null,
            sceltaInSospeso: null
        };
        s.ultimoEsito = null;
        s.record.tentativi++;
        salva(s);
        return s;
    }

    /** @param {ScalataTorre} sc @returns {string} l'URL del duello del piano corrente. */
    function urlDuello(sc) {
        const p = pianoDi(sc, sc.piano);
        return 'duelMonstersCore.html?mode=torre'
            + '&piano=' + sc.piano
            + '&character=' + encodeURIComponent(p.avversario)
            + '&difficulty=' + encodeURIComponent(p.livello)
            + (p.campo ? '&field=' + encodeURIComponent(p.campo) : '');
    }

    /** @param {ScalataTorre} sc @returns {OggettoTorre[]} gli oggetti che si possono ancora prendere. */
    function oggettiDisponibili(sc) {
        return db().oggetti.filter((o) => (sc.oggetti[o.id] || 0) < o.max);
    }

    /**
     * Le due scelte dopo un piano vinto: sempre il Ristoro, più un oggetto a
     * caso fra quelli ancora disponibili. Senza oggetti rimasti, solo il Ristoro.
     * @param {ScalataTorre} sc @returns {PremioTorre[]}
     */
    function generaScelta(sc) {
        /** @type {PremioTorre[]} */
        const scelte = [{ tipo: 'ristoro', lp: db().recuperoLp }];
        const disponibili = oggettiDisponibili(sc);
        if (disponibili.length) {
            const o = disponibili[Math.floor(Math.random() * disponibili.length)];
            scelte.push({ tipo: 'oggetto', oggetto: o.id });
        }
        return scelte;
    }

    /**
     * Applica la scelta fatta in torre.html e chiude la scelta in sospeso.
     * @param {number} indice quale delle scelte offerte
     * @param {number | null} [cartaId] la Carta fidata, per l'oggetto 'carta'
     * @returns {boolean} false se non c'era nulla da scegliere
     */
    function scegli(indice, cartaId) {
        const s = stato();
        const sc = s.inCorso;
        if (!sc || !sc.sceltaInSospeso || !sc.sceltaInSospeso[indice]) return false;
        const premio = sc.sceltaInSospeso[indice];
        if (premio.tipo === 'ristoro') {
            sc.lp = Math.min(db().lpIniziali, sc.lp + premio.lp);
        } else {
            sc.oggetti[premio.oggetto] = (sc.oggetti[premio.oggetto] || 0) + 1;
            if (premio.oggetto === 'carta') sc.cartaFidata = cartaId == null ? null : cartaId;
        }
        sc.sceltaInSospeso = null;
        salva(s);
        return true;
    }

    /**
     * Fine del duello di un piano (chiamata dalla pagina del duello).
     * @param {number} piano il piano giocato (dall'URL: un link vecchio non deve contare)
     * @param {boolean} vinto
     * @param {number} lpFinali i Life Point rimasti al giocatore
     * @returns {{ esito: 'ignorato' | 'sconfitta' | 'salito' | 'conquistata', piano: number, boss: boolean }}
     */
    function registraFine(piano, vinto, lpFinali) {
        const s = stato();
        const sc = s.inCorso;
        if (!sc || sc.piano !== piano || sc.sceltaInSospeso) return { esito: 'ignorato', piano: piano, boss: eBoss(piano) };
        if (!vinto) {
            s.record.pianoMassimo = Math.max(s.record.pianoMassimo, piano - 1);
            s.inCorso = null;
            s.ultimoEsito = { piano: piano, conquistata: false };
            salva(s);
            return { esito: 'sconfitta', piano: piano, boss: eBoss(piano) };
        }
        s.record.pianoMassimo = Math.max(s.record.pianoMassimo, piano);
        if (piano >= db().piani) {
            s.record.conquiste++;
            s.inCorso = null;
            s.ultimoEsito = { piano: piano, conquistata: true };
            salva(s);
            return { esito: 'conquistata', piano: piano, boss: true };
        }
        sc.lp = Math.max(1, Math.min(db().lpIniziali, lpFinali));
        sc.piano = piano + 1;
        sc.sceltaInSospeso = generaScelta(sc);
        salva(s);
        return { esito: 'salito', piano: piano, boss: eBoss(piano) };
    }

    /** Abbandona la scalata in corso (da torre.html). */
    function abbandona() {
        const s = stato();
        if (!s.inCorso) return;
        s.record.pianoMassimo = Math.max(s.record.pianoMassimo, s.inCorso.piano - 1);
        s.ultimoEsito = { piano: s.inCorso.piano, conquistata: false };
        s.inCorso = null;
        salva(s);
    }

    /** L'esito della scalata finita è stato mostrato: lo si dimentica. */
    function esitoMostrato() {
        const s = stato();
        s.ultimoEsito = null;
        salva(s);
    }

    /** @param {OggettoTorre['id']} id @returns {OggettoTorre | undefined} */
    const oggetto = (id) => db().oggetti.find((o) => o.id === id);

    return {
        stato, nuovaScalata, pianoDi, eBoss, urlDuello, oggettiDisponibili,
        scegli, registraFine, abbandona, esitoMostrato, oggetto,
        /** Quanti piani ha la Torre. */
        piani: () => db().piani
    };
})();

window.Torre = Torre;
