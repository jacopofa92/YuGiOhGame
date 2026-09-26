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
        cartaComune: 100,
        cartaRara: 800,
        /** La carta rara del giorno si può prendere anche a colpo sicuro con la valuta del Torneo Kaiba. */
        cartaRaraInMillennio: 1,
        bustaBase: 200,
        bustaAvanzata: 400,
        bustaLeggendaria: 800,
        /** La Leggendaria si può pagare anche con la valuta di Battle City. */
        bustaLeggendariaInLocazione: 2
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
            stelleBase: 18, stellePerAcquisto: 7,
            creditiBase: 1400, creditiPerAcquisto: 550,
            /** Dal N-esimo acquisto in poi serve anche una carta speciale (0 = il primo, 1 = dal secondo). */
            extraDalNumero: 1
        },
        structure: {
            stelleBase: 28, stellePerAcquisto: 9,
            creditiBase: 2200, creditiPerAcquisto: 800,
            extraDalNumero: 1
        }
    };
    /**
     * Quante carte speciali servono, e quali sono accettate (una qualunque
     * delle due, a scelta di chi compra).
     *
     * La quantità CRESCE, come il prezzo: 1 dal secondo mazzo dello stesso
     * tipo, 2 dal quarto, 3 dal sesto. Prima restava fissa a uno per
     * sempre, e quella era la falla del bilancio — Stelle e Crediti
     * salivano, ma i "materiali" no, e dopo qualche torneo se ne avevano
     * abbastanza da svuotare lo scaffale senza più pensarci.
     *
     * È la barriera giusta da far salire perché Carte Locazione e Carte
     * del Millennio arrivano quasi solo dai tornei e dalle Sfide lunghe:
     * legare a loro i mazzi avanzati vuol dire che quei mazzi si guadagnano
     * giocando le cose impegnative, non accumulando crediti.
     */
    const EXTRA_MAZZO = { valuteAccettate: ['locatorCards', 'millenniumCards'] };
    /** Ogni quanti acquisti serve una carta speciale in più. */
    const EXTRA_OGNI = 2;

    function extraRichieste(gia, dalNumero) {
        if (gia < dalNumero) return 0;
        return 2 + Math.floor((gia - dalNumero) / EXTRA_OGNI);
    }

    // ================================================================
    // REQUISITI DI SBLOCCO — "questo si compra solo dopo aver fatto X"
    // ================================================================
    // Il prezzo dice QUANTO costa; questo dice SE è in vendita. Sono due
    // cose diverse, e tenerle separate serve: un mazzo può essere
    // economico e comunque arrivare tardi, o caro e disponibile subito.
    //
    // Oggi nessun mazzo ne dichiara uno, quindi tutto si comporta come
    // prima. È in piedi perché la richiesta è già stata fatta: sbloccare
    // certe carte o certi mazzi al raggiungimento di un punto delle
    // Storie. Quando servirà, basterà aggiungere al pacchetto in
    // js/data/starter-structure-decks.js una riga come:
    //
    //     richiede: { storia: 'forbiddenMemories', tappe: 12 }
    //     richiede: { storia: 'ww1', finita: true }
    //     richiede: { storie: [{ id: 'anime', finita: true },
    //                          { id: 'freedom', tappe: 8 }] }
    //
    // ...e nient'altro: il Negozio legge già da qui. La stessa forma vale
    // per una CARTA singola (le voci di carteDelGiorno accettano lo stesso
    // campo), perché la domanda è la stessa e due grammatiche diverse per
    // la stessa domanda divergono al primo ripensamento.
    //
    // Il progresso si legge da SaveManager.getStoryState, la stessa fonte
    // di js/story/story-progress.js — non se ne inventa una seconda.

    /** Quante tappe di quella campagna sono state superate, e se è finita. */
    function progressoStoria(campaignId) {
        const s = (window.SaveManager && SaveManager.getStoryState)
            ? SaveManager.getStoryState(campaignId) : null;
        return { completate: (s && s.completate) || 0, finita: !!(s && s.finita) };
    }

    /** Un singolo requisito è soddisfatto? `{ id, tappe?, finita? }` */
    function requisitoStoriaOk(req) {
        if (!req || !req.id) return true;
        const p = progressoStoria(req.id);
        if (req.finita && !p.finita) return false;
        if (typeof req.tappe === 'number' && p.completate < req.tappe) return false;
        return true;
    }

    /**
     * L'oggetto è sbloccato? Torna { sbloccato, motivo } — il MOTIVO
     * serve quanto la risposta: un pezzo di vetrina disattivato senza
     * spiegazione è la cosa che fa chiudere il Negozio, e in questo
     * progetto vale la regola che ogni premio e ogni blocco dicano la
     * regola che li ha prodotti.
     */
    function statoSblocco(voce) {
        const r = voce && voce.richiede;
        if (!r) return { sbloccato: true, motivo: '' };

        const elenco = r.storie
            ? r.storie.slice()
            : (r.storia ? [{ id: r.storia, tappe: r.tappe, finita: r.finita }] : []);
        const mancanti = elenco.filter((req) => !requisitoStoriaOk(req));
        if (mancanti.length === 0) return { sbloccato: true, motivo: '' };

        // Il nome leggibile della campagna arriva dal catalogo delle
        // Storie, se la pagina lo ha caricato; altrimenti si ripiega
        // sull'id, che è brutto ma vero.
        // NOTA PER QUANDO ARRIVERÀ IL PRIMO REQUISITO VERO: oggi le due
        // pagine del Negozio (negozio.html e la vista in index.html) non
        // caricano js/data/story-campaigns.js, perché finora non serviva a
        // nulla lì. Il giorno in cui un mazzo dichiarerà un `richiede`, va
        // aggiunto quel file a entrambe — altrimenti al giocatore
        // comparirà "arriva alla tappa 12 di forbiddenMemories" invece di
        // "di Memorie Proibite". Una riga per pagina, niente di più.
        const nomeStoria = (id) => {
            const campagne = (typeof storyCampaignsDatabase !== 'undefined') ? storyCampaignsDatabase : [];
            const c = campagne.find((x) => x.id === id);
            return c ? c.nome : id;
        };
        const parti = mancanti.map((req) => (req.finita
            ? `finisci ${nomeStoria(req.id)}`
            : `arriva alla tappa ${req.tappe} di ${nomeStoria(req.id)}`));
        return { sbloccato: false, motivo: 'Si sblocca quando: ' + parti.join(', ') + '.' };
    }

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
            extraQuantita: extraRichieste(gia, t.extraDalNumero),
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
            ultraChance: 0.12,
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
            ultraChance: 0.20,
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
            ultraChance: 0.82,
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
     *
     * Ogni voce porta anche `acquistataOggi`: UNA sola copia al giorno
     * per carta, richiesto esplicitamente dall'utente ("ne posso
     * comprare solo 1 in quella rotazione giornaliera") — senza questo
     * flag nulla impediva di ricomprare la stessa carta più volte finché
     * bastavano i crediti. Chi disegna la vetrina (js/economy/shop-ui.js)
     * decide cosa farne (qui: la toglie dalla griglia); il catalogo si
     * limita a dire il fatto, stesso principio già in uso per `posseduto`
     * su mazziInVendita qui sotto.
     */
    function carteDelGiorno() {
        const giorno = dayKey();
        const comuni = window.CardRarity ? CardRarity.idsByRarity('common') : [];
        const rare = window.CardRarity ? CardRarity.idsByRarity('rare') : [];
        const r1 = rng(hash('carte-comuni-' + giorno));
        const r2 = rng(hash('carta-rara-' + giorno));
        const giaComprata = (id) => !!(window.SaveManager && SaveManager.hasBoughtDailyShopCard(giorno, id));
        const scelteComuni = pesca(comuni, 3, r1).map((id) => ({
            cardId: id, rarity: 'common', costo: { credits: PREZZI.cartaComune }, acquistataOggi: giaComprata(id)
        }));
        const scelteRare = pesca(rare, 1, r2).map((id) => ({
            cardId: id,
            rarity: 'rare',
            costo: { credits: PREZZI.cartaRara, millenniumCards: PREZZI.cartaRaraInMillennio },
            acquistataOggi: giaComprata(id)
        }));
        return scelteComuni.concat(scelteRare);
    }

    /** Registra che la carta della rotazione giornaliera è stata comprata OGGI — vedi il commento su carteDelGiorno. */
    function segnaCartaDelGiornoComprata(cardId) {
        if (window.SaveManager) SaveManager.recordDailyShopCardPurchase(dayKey(), cardId);
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
            // SaveManager.ownsPack, non l'elenco grezzo: è l'unica
            // risposta a "il giocatore ce l'ha già?", la stessa che usa
            // Creazione Deck per decidere se un mazzo si può clonare. Le
            // due schermate devono per forza essere d'accordo, altrimenti
            // si finisce col vendere qualcosa che il giocatore ha già.
            posseduto: window.SaveManager ? SaveManager.ownsPack(deck.packId) : posseduti.indexOf(deck.packId) !== -1,
            // Sbloccato dal progresso delle Storie (vedi statoSblocco):
            // oggi nessun mazzo dichiara un requisito, quindi qui è sempre
            // vero e il Negozio si comporta come prima. Il campo c'è lo
            // stesso, così il giorno in cui un mazzo lo dichiarerà non
            // servirà toccare né questa funzione né chi la legge.
            sblocco: statoSblocco(deck)
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
        /** Quante carte speciali servono al dato numero di acquisti già fatti — vedi il commento sopra EXTRA_MAZZO. Esposta perché la UI possa scrivere il numero VERO nella regola invece di uno fisso destinato a invecchiare male. */
        extraRichieste: extraRichieste,
        /** "Questo si compra già?" — vedi statoSblocco: { sbloccato, motivo }. Vale per un mazzo come per una carta. */
        statoSblocco: statoSblocco,
        mazzoCompleto: mazzoCompleto,
        carteDelGiorno: carteDelGiorno,
        segnaCartaDelGiornoComprata: segnaCartaDelGiornoComprata,
        busteDellaSettimana: busteDellaSettimana,
        apriBusta: apriBusta,
        mazziInVendita: mazziInVendita
    };
})();
