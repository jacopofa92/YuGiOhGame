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
        bustaLeggendariaInLocazione: 3
    };

    /**
     * PREZZO DEI MAZZI — composto e CRESCENTE.
     *
     * Un mazzo non costa più solo Stelle: costa Stelle *e* Crediti
     * insieme, e dal secondo dello stesso tipo in poi anche una fra
     * Carta Locazione e Carta del Millennio. Così tutte e quattro le
     * valute finiscono per servire, e nessun torneo diventa saltabile.
     *
     * E soprattutto: ogni mazzo comprato fa salire il prezzo del
     * SUCCESSIVO dello stesso tipo. Il primo Starter è un traguardo
     * raggiungibile presto; il settimo è un impegno serio. Senza questo,
     * superata una certa soglia di Stelle si svuoterebbe lo scaffale in
     * un colpo solo e i mazzi smetterebbero di essere un obiettivo.
     * I due contatori sono SEPARATI: comprare Structure non rende più
     * cari gli Starter, e viceversa — sono due collezioni distinte.
     */
    const PREZZI_MAZZI = {
        starter: {
            stelleBase: 8, stellePerAcquisto: 2,
            creditiBase: 600, creditiPerAcquisto: 150,
            /** Dal N-esimo acquisto in poi serve anche una carta speciale (0 = il primo, 1 = dal secondo). */
            extraDalNumero: 1
        },
        structure: {
            stelleBase: 12, stellePerAcquisto: 2,
            creditiBase: 900, creditiPerAcquisto: 250,
            extraDalNumero: 1
        }
    };
    /** Quante carte speciali servono, e quali sono accettate (una qualunque delle due, a scelta di chi compra). */
    const EXTRA_MAZZO = { quantita: 1, valuteAccettate: ['locatorCards', 'millenniumCards'] };

    /** Quanti pacchetti di un certo tipo il giocatore possiede già. */
    function possedutiDelTipo(kind) {
        let elenco = [];
        if (typeof starterStructureDeckDatabase !== 'undefined') elenco = starterStructureDeckDatabase;
        else if (Array.isArray(window.starterStructureDeckDatabase)) elenco = window.starterStructureDeckDatabase;
        const posseduti = window.SaveManager ? SaveManager.getOwnedPacks() : [];
        return elenco.filter((d) => d.kind === kind && posseduti.indexOf(d.packId) !== -1).length;
    }

    /**
     * Il costo del PROSSIMO mazzo di quel tipo. Uguale per tutti i mazzi
     * dello stesso tipo ancora da comprare: non è il singolo mazzo a
     * rincarare, è lo scaffale che si fa più caro man mano che lo si
     * svuota — così resta libera la scelta di QUALE prendere.
     */
    function costoMazzo(kind) {
        const t = PREZZI_MAZZI[kind === 'structure' ? 'structure' : 'starter'];
        const gia = possedutiDelTipo(kind === 'structure' ? 'structure' : 'starter');
        return {
            starChips: t.stelleBase + t.stellePerAcquisto * gia,
            credits: t.creditiBase + t.creditiPerAcquisto * gia,
            /** Vero dal secondo mazzo dello stesso tipo in poi. */
            richiedeExtra: gia >= t.extraDalNumero,
            extraQuantita: EXTRA_MAZZO.quantita,
            extraValute: EXTRA_MAZZO.valuteAccettate.slice(),
            giaPosseduti: gia
        };
    }

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
            // `nomeBreve` è quello stampato sulla fascia dorata della
            // bustina disegnata in shop.css: "Busta Base" per intero non
            // ci starebbe leggibile, e su una bustina vera c'è comunque
            // solo il nome dell'espansione.
            nomeBreve: 'BASE',
            icona: '📦',
            // `colore` è l'unico valore da dare alla bustina: tutte le sue
            // sfumature sono derivate da lì con color-mix (--pack-base).
            colore: '#1d4f9e',
            costo: { credits: PREZZI.bustaBase },
            carte: 10,
            composizione: { rare: 1 },
            ultraChance: 0.02,
            descrizione: '9 carte comuni e 1 rara garantita.'
        },
        {
            id: 'avanzata',
            nome: 'Busta Avanzata',
            nomeBreve: 'AVANZATA',
            icona: '🎁',
            colore: '#6a2da8',
            costo: { credits: PREZZI.bustaAvanzata },
            carte: 10,
            composizione: { rare: 2 },
            ultraChance: 0.06,
            descrizione: '8 carte comuni e 2 rare garantite.'
        },
        {
            id: 'leggendaria',
            nome: 'Busta Leggendaria',
            nomeBreve: 'LEGGENDARIA',
            icona: '👁️',
            colore: '#b8860b',
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
    /**
     * Il mostro con l'attacco più alto del mazzo: la sua "carta simbolo"
     * quando il pacchetto non ne dichiara una a mano (coverCardId).
     * Stessa regola di resolveCoverCard in creazione-deck.html — senza,
     * quattro scatole su diciannove restavano senza illustrazione.
     */
    function cartaSimbolo(deck) {
        const db = (typeof cardDatabase !== 'undefined' && Array.isArray(cardDatabase))
            ? cardDatabase : (window.cardDatabase || []);
        let migliore = null;
        (deck.main || []).forEach((entry) => {
            const carta = db.find((c) => c.id === entry.id);
            if (!carta || carta.type !== 'monster') return;
            if (!migliore || (carta.attack || 0) > (migliore.attack || 0)) migliore = carta;
        });
        return migliore ? migliore.id : null;
    }

    function mazziInVendita() {
        // `starterStructureDeckDatabase` è un const al primo livello di
        // uno script classico: NON è una proprietà di window (stessa
        // insidia di cardDatabase, vedi il commento in card-rarity.js), va
        // letto per identificatore.
        let elenco = [];
        if (typeof starterStructureDeckDatabase !== 'undefined') elenco = starterStructureDeckDatabase;
        else if (Array.isArray(window.starterStructureDeckDatabase)) elenco = window.starterStructureDeckDatabase;
        const posseduti = window.SaveManager ? SaveManager.getOwnedPacks() : [];
        return elenco
            // Un mazzo SENZA carte non si vende: "Starter Deck 2006" ha
            // `main: []` (è nel dataset ma non è mai stato riempito), e
            // comprarlo per 8 Stelle avrebbe dato al giocatore
            // esattamente nulla in cambio. Quando verrà riempito tornerà
            // in vetrina da solo, senza toccare niente qui.
            .filter((deck) => (deck.main || []).length > 0)
            .map((deck) => ({
            packId: deck.packId,
            nome: deck.name,
            kind: deck.kind,
            // La carta stampata sulla scatola: quella scelta a mano se
            // c'è, altrimenti il mostro con l'attacco più alto — stessa
            // regola di resolveCoverCard in creazione-deck.html, così lo
            // stesso mazzo mostra la stessa carta in entrambi i posti.
            coverCardId: deck.coverCardId || cartaSimbolo(deck),
            carte: (deck.main || []).reduce((somma, v) => somma + (v.qty || 0), 0),
            // Costo composto e crescente — vedi costoMazzo qui sopra.
            // Uno Structure parte più caro di uno Starter: è più
            // specializzato e più utile a costruire un mazzo vero.
            costo: costoMazzo(deck.kind),
            posseduto: posseduti.indexOf(deck.packId) !== -1
        }));
    }

    /** Il pacchetto COMPLETO (con main/extra) per id — serve al Negozio per mostrare cosa contiene prima di comprarlo. */
    function mazzoCompleto(packId) {
        let elenco = [];
        if (typeof starterStructureDeckDatabase !== 'undefined') elenco = starterStructureDeckDatabase;
        else if (Array.isArray(window.starterStructureDeckDatabase)) elenco = window.starterStructureDeckDatabase;
        return elenco.find((d) => d.packId === packId) || null;
    }

    window.ShopCatalog = {
        PREZZI: PREZZI,
        PREZZI_MAZZI: PREZZI_MAZZI,
        BUSTE: BUSTE,
        costoMazzo: costoMazzo,
        mazzoCompleto: mazzoCompleto,
        carteDelGiorno: carteDelGiorno,
        busteDellaSettimana: busteDellaSettimana,
        apriBusta: apriBusta,
        mazziInVendita: mazziInVendita
    };
})();
