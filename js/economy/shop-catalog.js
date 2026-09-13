/**
 * js/economy/shop-catalog.js — IL CATALOGO DEL NEGOZIO
 * =====================================================================
 * Decide COSA è in vendita oggi e questa settimana, e a che prezzo.
 * Separato da negozio.html apposta: la pagina disegna, questo file
 * decide. Così l'offerta si può verificare (e prevedere) senza aprire
 * nessuna interfaccia.
 *
 * LA ROTAZIONE È DETERMINISTICA, NON CASUALE
 * L'offerta non viene sorteggiata alla visita — sarebbe un invito a
 * ricaricare la pagina finché non esce la carta giusta. È invece
 * calcolata da un SEME derivato dalla data del SERVER
 * (js/cloud/server-date.js): stesso giorno = stessa offerta, per
 * chiunque, da qualunque dispositivo, per quante volte si riapra la
 * pagina. Cambia da sola a mezzanotte UTC.
 *
 * PERCHÉ LA ROTAZIONE È IL FRENO PRINCIPALE DELL'ECONOMIA
 * Quattro carte al giorno e tre buste a settimana mettono un tetto a
 * quanto si può comprare, per quanti crediti si abbiano: senza, un
 * giocatore con molti crediti svuoterebbe il catalogo in un pomeriggio e
 * la collezione perderebbe senso. I mazzi sono l'eccezione — si comprano
 * una volta sola, quindi non hanno bisogno di essere razionati.
 */
(function () {
    'use strict';

    // ================================================================
    // Prezzi. Tutti qui, in un colpo d'occhio.
    // ================================================================
    const PREZZI = {
        cartaComune: 150,
        cartaRara: 900,
        /** La carta rara del giorno si può prendere anche a colpo sicuro con la valuta del Torneo Kaiba. */
        cartaRaraInMillennio: 1,
        bustaBase: 400,
        bustaAvanzata: 700,
        bustaLeggendaria: 1200,
        /** La Leggendaria si può pagare anche con la valuta di Battle City. */
        bustaLeggendariaInLocazione: 3,
        starterDeck: 8,      // in Stelle dell'Esagono
        structureDeck: 12    // in Stelle dell'Esagono
    };

    /**
     * Le tre buste della settimana. `composizione` è quante carte di
     * ciascuna rarità escono, `ultraChance` la probabilità che UNA delle
     * carte rare venga promossa a ultra rara.
     * Ogni busta contiene sempre 10 carte: cambia la qualità, mai la
     * quantità, così il confronto fra le tre è immediato.
     */
    const BUSTE = [
        {
            id: 'base',
            nome: 'Busta Base',
            icona: '📦',
            costo: { credits: PREZZI.bustaBase },
            carte: 10,
            composizione: { rare: 1 },
            ultraChance: 0.02,
            descrizione: '9 carte comuni e 1 rara garantita.'
        },
        {
            id: 'avanzata',
            nome: 'Busta Avanzata',
            icona: '🎁',
            costo: { credits: PREZZI.bustaAvanzata },
            carte: 10,
            composizione: { rare: 2 },
            ultraChance: 0.06,
            descrizione: '8 carte comuni e 2 rare garantite.'
        },
        {
            id: 'leggendaria',
            nome: 'Busta Leggendaria',
            icona: '💎',
            costo: { credits: PREZZI.bustaLeggendaria, locatorCards: PREZZI.bustaLeggendariaInLocazione },
            carte: 10,
            composizione: { rare: 2 },
            ultraChance: 0.12,
            descrizione: '8 comuni e 2 rare garantite, con la probabilità più alta di trovare un\'ultra rara.'
        }
    ];

    // ================================================================
    // Sorteggio deterministico
    // ================================================================

    /** Hash stabile di una stringa: stesso testo, stesso numero, sempre e ovunque. */
    function hash(testo) {
        let h = 2166136261;
        for (let i = 0; i < testo.length; i++) {
            h ^= testo.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    /** Generatore pseudo-casuale seminato (mulberry32): stesso seme, stessa sequenza. */
    function rng(seme) {
        let a = seme >>> 0;
        return function () {
            a |= 0; a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /** Estrae `quanti` elementi distinti da `pool` usando il generatore dato. */
    function pesca(pool, quanti, random) {
        const copia = pool.slice();
        const out = [];
        for (let i = 0; i < quanti && copia.length > 0; i++) {
            const idx = Math.floor(random() * copia.length);
            out.push(copia.splice(idx, 1)[0]);
        }
        return out;
    }

    function dayKey() {
        return (window.ServerDate && ServerDate.dayKey()) || new Date().toISOString().slice(0, 10);
    }
    function weekKey() {
        return (window.ServerDate && ServerDate.weekKey()) || 'W';
    }

    /**
     * Le 4 carte singole in vendita OGGI: 3 comuni e 1 rara.
     * La rara è volutamente presa dal gruppo 'rare' e non dalle ultra: le
     * ultra restano un colpo di fortuna delle buste o un acquisto mirato
     * con le Carte del Millennio, non merce da banco quotidiana.
     */
    function carteDelGiorno() {
        const giorno = dayKey();
        const comuni = window.CardRarity ? CardRarity.idsByRarity('common') : [];
        const rare = window.CardRarity ? CardRarity.idsByRarity('rare') : [];
        const r1 = rng(hash('carte-comuni-' + giorno));
        const r2 = rng(hash('carta-rara-' + giorno));
        const scelteComuni = pesca(comuni, 3, r1).map((id) => ({
            cardId: id, rarity: 'common', costo: { credits: PREZZI.cartaComune }
        }));
        const scelteRare = pesca(rare, 1, r2).map((id) => ({
            cardId: id,
            rarity: 'rare',
            costo: { credits: PREZZI.cartaRara, millenniumCards: PREZZI.cartaRaraInMillennio }
        }));
        return scelteComuni.concat(scelteRare);
    }

    /**
     * Le 3 buste di QUESTA settimana. La composizione è fissa (vedi
     * BUSTE), ma il CONTENUTO estratto all'apertura no: quello è
     * genuinamente casuale, altrimenti due giocatori che aprono la stessa
     * busta troverebbero le stesse carte e non ci sarebbe alcuna emozione
     * nell'aprirla. A ruotare ogni settimana è il "tema" della busta,
     * cioè il sottoinsieme di carte da cui pesca.
     */
    function busteDellaSettimana() {
        const settimana = weekKey();
        return BUSTE.map((b) => Object.assign({}, b, { temaSeed: hash(b.id + '-' + settimana) }));
    }

    /**
     * Apre una busta: torna l'elenco degli id estratti. Il caso QUI è
     * vero (Math.random), non seminato — vedi il commento su
     * busteDellaSettimana.
     */
    function apriBusta(busta) {
        if (!window.CardRarity) return [];
        const comuni = CardRarity.idsByRarity('common');
        const rare = CardRarity.idsByRarity('rare');
        const ultra = CardRarity.idsByRarity('ultra');
        const nRare = (busta.composizione && busta.composizione.rare) || 1;
        const nComuni = busta.carte - nRare;
        const casuale = () => Math.random();

        const estratte = pesca(comuni, nComuni, casuale)
            .concat(pesca(rare, nRare, casuale));
        // La promozione a ultra rara sostituisce UNA delle rare già
        // estratte, così la busta resta sempre di 10 carte.
        if (ultra.length > 0 && Math.random() < (busta.ultraChance || 0)) {
            estratte[estratte.length - 1] = pesca(ultra, 1, casuale)[0];
        }
        return estratte;
    }

    /**
     * I mazzi in vendita: TUTTI gli Starter e Structure Deck, sempre
     * disponibili (non ruotano) ma acquistabili UNA VOLTA SOLA — chi lo
     * possiede già lo vede come tale. Si pagano solo in Stelle
     * dell'Esagono, che arrivano quasi esclusivamente dai tornei: è
     * questo a impedire di comprare tutti i mazzi grindando duelli
     * liberi.
     */
    function mazziInVendita() {
        // `starterStructureDeckDatabase` è un const al primo livello di
        // uno script classico: NON è una proprietà di window (stessa
        // insidia di cardDatabase, vedi il commento in card-rarity.js), va
        // letto per identificatore.
        let elenco = [];
        if (typeof starterStructureDeckDatabase !== 'undefined') elenco = starterStructureDeckDatabase;
        else if (Array.isArray(window.starterStructureDeckDatabase)) elenco = window.starterStructureDeckDatabase;
        const posseduti = window.SaveManager ? SaveManager.getOwnedPacks() : [];
        return elenco.map((deck) => ({
            packId: deck.packId,
            nome: deck.name,
            kind: deck.kind,
            coverCardId: deck.coverCardId || null,
            carte: (deck.main || []).reduce((somma, v) => somma + (v.qty || 0), 0),
            // Uno Structure Deck costa più di uno Starter: è più
            // specializzato e più utile a costruire un mazzo vero.
            costo: { starChips: deck.kind === 'structure' ? PREZZI.structureDeck : PREZZI.starterDeck },
            posseduto: posseduti.indexOf(deck.packId) !== -1
        }));
    }

    window.ShopCatalog = {
        PREZZI: PREZZI,
        BUSTE: BUSTE,
        carteDelGiorno: carteDelGiorno,
        busteDellaSettimana: busteDellaSettimana,
        apriBusta: apriBusta,
        mazziInVendita: mazziInVendita
    };
})();
