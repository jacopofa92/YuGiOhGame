/**
 * story-progress.js — Dove sei arrivato nella Modalità Storia.
 * =====================================================================
 * Il catalogo delle campagne sta in js/data/story-campaigns.js (solo
 * dati), il disegno della mappa in js/ui/node-map.js (solo disegno).
 * Qui c'è l'unica cosa che sa entrambe: a che punto è il giocatore.
 *
 * COM'È FATTO L'AVANZAMENTO. Una campagna è un elenco ORDINATO di tappe
 * (i capitoli servono solo a raggrupparle per il giocatore), quindi
 * l'avanzamento è un numero solo: quante tappe ha superato. Niente
 * elenco di id completati, che sarebbe la stessa informazione scritta in
 * modo più fragile — un id rinominato nel catalogo perderebbe il
 * progresso, mentre un indice no.
 *
 * Lo stato vive in SaveManager.getStoryState/setStoryState (contenitore
 * generico, come per i tornei):
 *   { completate: <numero di tappe superate>, finita: <bool>, premiata: <bool> }
 * `premiata` esiste perché il premio finale si paga UNA volta sola: la
 * campagna resta rigiocabile, il premio no.
 *
 * COME TORNA L'ESITO DI UN DUELLO. Non serve niente di nuovo: ogni duello
 * di ogni modalità lascia una breadcrolla in
 * sessionStorage['ygoLastDuelOutcome'] (js/duel-session.js), e qui si
 * legge quella. È lo stesso meccanismo dei tre tornei — se un giorno
 * cambia il modo in cui un duello racconta com'è finito, cambia in un
 * punto solo.
 */
(function () {
    'use strict';

    const OUTCOME_KEY = 'ygoLastDuelOutcome';

    function getCampaigns() {
        return (typeof storyCampaignsDatabase !== 'undefined') ? storyCampaignsDatabase : [];
    }

    /**
     * Il personaggio del roster dietro un id, o null.
     *
     * Serve a ritratto e nome vero: una tappa dice solo `characterId`, e
     * ripetere nome e immagine anche nel catalogo delle campagne
     * vorrebbe dire tenerli allineati a mano per sempre. Se
     * characters-db.js non e' caricato la Storia funziona lo stesso,
     * semplicemente senza volti — la pagina non deve rompersi per una
     * cosa decorativa.
     */
    function getPersonaggio(characterId) {
        if (!characterId || typeof characterDatabase === 'undefined') return null;
        return characterDatabase.find((c) => c.id === characterId) || null;
    }

    function getCampaign(campaignId) {
        return getCampaigns().find((c) => c.id === campaignId) || null;
    }

    /**
     * Tutte le tappe di una campagna in fila, con dentro il capitolo di
     * appartenenza e la propria posizione assoluta. È la forma con cui
     * lavora tutto il resto del file: i capitoli sono un modo di
     * RACCONTARE l'elenco, non un secondo livello da attraversare ogni
     * volta.
     */
    function getTappe(campaignId) {
        const campagna = getCampaign(campaignId);
        if (!campagna) return [];
        const out = [];
        (campagna.capitoli || []).forEach((cap, iCap) => {
            (cap.tappe || []).forEach((tappa) => {
                const pg = tappa.kind === 'duel' ? getPersonaggio(tappa.characterId) : null;
                out.push(Object.assign({}, tappa, {
                    indice: out.length,
                    capitoloId: cap.id,
                    capitoloNome: cap.nome,
                    capitoloTesto: cap.testo || '',
                    capitoloIndice: iCap,
                    // Ritratto e nome vero arrivano dal roster, non dal
                    // catalogo: una campagna dichiara CHI si affronta, non
                    // che faccia abbia.
                    immagine: pg ? pg.image : null,
                    nomeAvversario: pg ? pg.name : null,
                    titoloAvversario: pg ? pg.title : null
                }));
            });
        });
        return out;
    }

    /** L'avanzamento salvato, mai null: una campagna mai iniziata è semplicemente a zero. */
    function getProgress(campaignId) {
        const salvato = window.SaveManager ? SaveManager.getStoryState(campaignId) : null;
        return {
            completate: (salvato && salvato.completate) || 0,
            finita: !!(salvato && salvato.finita),
            premiata: !!(salvato && salvato.premiata),
            // Quanto si è arrivati DENTRO ogni tappa che è a sua volta un
            // percorso (un torneo, vedi `kind: 'torneo'` nel catalogo):
            // { [id della tappa]: quante sue prove superate }. Va portato
            // avanti da ogni scrittura, altrimenti superare una tappa
            // qualunque cancellerebbe i progressi del torneo.
            sotto: (salvato && salvato.sotto) || {}
        };
    }

    function setProgress(campaignId, progress) {
        if (window.SaveManager) SaveManager.setStoryState(campaignId, progress);
    }

    /**
     * Le tappe con il loro stato, pronte da disegnare:
     *   'fatta'      già superata
     *   'corrente'   la prossima da affrontare — l'unica giocabile
     *   'bloccata'   ancora da sbloccare
     *
     * Una sola tappa è 'corrente', sempre: è ciò che rende una Storia una
     * storia invece di un elenco di duelli a scelta libera.
     */
    function getTappeConStato(campaignId) {
        const progress = getProgress(campaignId);
        return getTappe(campaignId).map((tappa) => Object.assign({}, tappa, {
            stato: tappa.indice < progress.completate ? 'fatta'
                : (tappa.indice === progress.completate ? 'corrente' : 'bloccata')
        }));
    }

    /** La prossima tappa da affrontare, o null se la campagna è finita. */
    function getTappaCorrente(campaignId) {
        const progress = getProgress(campaignId);
        const tappe = getTappe(campaignId);
        return tappe[progress.completate] || null;
    }

    /**
     * Segna come superata la tappa corrente e va avanti. Torna lo stato
     * nuovo, con `appenaFinita` vero se è stata questa a chiudere la
     * campagna — serve alla pagina per mostrare la schermata finale una
     * volta sola.
     *
     * Le scene si superano leggendole; i duelli, vincendoli.
     */
    function avanza(campaignId) {
        const tappe = getTappe(campaignId);
        const progress = getProgress(campaignId);
        if (progress.completate >= tappe.length) return { progress: progress, appenaFinita: false };

        const nuovo = {
            completate: progress.completate + 1,
            finita: progress.completate + 1 >= tappe.length,
            premiata: progress.premiata,
            sotto: progress.sotto
        };
        const appenaFinita = nuovo.finita && !progress.finita;
        setProgress(campaignId, nuovo);
        return { progress: nuovo, appenaFinita: appenaFinita };
    }

    /**
     * Legge (e CONSUMA) la breadcrolla lasciata dall'ultimo duello, e se
     * era un duello di QUESTA campagna vinto dal giocatore fa avanzare la
     * storia.
     *
     * Consumarla è la parte importante: senza, un semplice ricaricamento
     * della pagina farebbe avanzare di nuovo la campagna con lo stesso
     * duello, e si arriverebbe in fondo senza giocare.
     *
     * Torna { avanzato, appenaFinita, perso } — `perso` distingue "hai
     * perso, riprova" da "non sei appena tornato da un duello", che sono
     * due cose diverse da raccontare.
     */
    function consumaEsitoDuello(campaignId) {
        let esito = null;
        try {
            const raw = sessionStorage.getItem(OUTCOME_KEY);
            if (raw) esito = JSON.parse(raw);
            sessionStorage.removeItem(OUTCOME_KEY);
        } catch (e) { /* noop */ }

        if (!esito || esito.mode !== 'story' || esito.campaignId !== campaignId) {
            return { avanzato: false, appenaFinita: false, perso: false, rigiocata: false, torneoId: null, opponentId: null };
        }

        // --- Duello di un TORNEO -------------------------------------
        // Regole diverse dal resto della campagna, ed è il punto: vincendo
        // si sale di un incontro, perdendo si ricomincia dal primo.
        if (esito.torneoId && getTorneo(campaignId, esito.torneoId)) {
            const base = {
                avanzato: false, appenaFinita: false, perso: false, rigiocata: false,
                torneoId: esito.torneoId, opponentId: esito.opponentId || null
            };
            if (esito.playerWon !== true) {
                const quante = getProgressoTorneo(campaignId, esito.torneoId);
                azzeraTorneo(campaignId, esito.torneoId);
                // `torneoAzzerato` porta da quanto si è caduti: dirlo è
                // tutta la differenza fra una punizione capita e una
                // mappa che si è misteriosamente svuotata.
                return Object.assign(base, { perso: true, torneoAzzerato: quante });
            }
            const salita = avanzaTorneo(campaignId, esito.torneoId);
            return Object.assign(base, {
                avanzato: true,
                torneoVinto: salita.torneoVinto,
                appenaFinita: salita.appenaFinita
            });
        }
        // Una tappa RIGIOCATA non fa avanzare niente: era già superata, e
        // rivincerla salterebbe la tappa successiva senza giocarla. Il
        // duello per il resto è del tutto normale — premi compresi,
        // esattamente come un Duello Libero, che è rigiocabile da sempre.
        if (esito.rigiocata === true) {
            return {
                avanzato: false, appenaFinita: false, perso: false,
                rigiocata: true, vinta: esito.playerWon === true,
                opponentId: esito.opponentId || null
            };
        }
        if (esito.playerWon !== true) {
            return { avanzato: false, appenaFinita: false, perso: true, rigiocata: false, opponentId: esito.opponentId || null };
        }
        const risultato = avanza(campaignId);
        return {
            avanzato: true, appenaFinita: risultato.appenaFinita, perso: false, rigiocata: false,
            // Chi si e' appena battuto: serve alla pagina per dirlo, e
            // arriva dall'esito del duello perche' la tappa a quel punto
            // e' gia' alle spalle.
            opponentId: esito.opponentId || null
        };
    }

    /**
     * Paga il premio finale della campagna, una volta sola. Torna
     * l'elenco delle voci accreditate (vuoto se era già stato pagato o se
     * la campagna non ne ha uno), ognuna con la propria spiegazione —
     * stesso contratto di tutto js/economy/rewards.js, dove sta anche
     * l'unica regola che conta: nessuna pagina accredita valute per conto
     * proprio.
     */
    function riscuotiPremioFinale(campaignId) {
        const campagna = getCampaign(campaignId);
        const progress = getProgress(campaignId);
        if (!campagna || !campagna.premioFinale || !progress.finita || progress.premiata) return [];
        if (!window.Rewards || !window.SaveManager) return [];

        const voci = Rewards.forStoryCampaign(campagna);
        setProgress(campaignId, Object.assign({}, progress, { premiata: true }));
        return voci;
    }

    /** Ricomincia una campagna da capo. Il premio finale, se già preso, resta preso. */
    function ricomincia(campaignId) {
        const progress = getProgress(campaignId);
        // `sotto` non si porta dietro: ricominciando la campagna anche i
        // tornei che contiene tornano al primo incontro.
        setProgress(campaignId, { completate: 0, finita: false, premiata: progress.premiata, sotto: {} });
    }

    // =================================================================
    // TAPPE CHE SONO A LORO VOLTA UN PERCORSO (kind: 'torneo')
    // =================================================================
    // Un torneo è una tappa della campagna che, invece di risolversi in
    // un solo duello, contiene un proprio elenco di prove su una propria
    // mappa. Vale la regola del gioco originale: si sale un incontro
    // alla volta, e chi perde ricomincia dal primo. La campagna intorno
    // non si muove finché il torneo non è vinto per intero.

    /** La tappa-torneo con quell'id, o null se non esiste in questa campagna. */
    function getTorneo(campaignId, tappaId) {
        const tappa = getTappe(campaignId).find((t) => t.id === tappaId);
        return (tappa && tappa.kind === 'torneo') ? tappa : null;
    }

    /** Quante prove del torneo sono già state superate. */
    function getProgressoTorneo(campaignId, tappaId) {
        return getProgress(campaignId).sotto[tappaId] || 0;
    }

    function setProgressoTorneo(campaignId, tappaId, quante) {
        const progress = getProgress(campaignId);
        const sotto = Object.assign({}, progress.sotto);
        sotto[tappaId] = quante;
        setProgress(campaignId, Object.assign({}, progress, { sotto: sotto }));
    }

    /**
     * Le prove di un torneo con il loro stato, nella stessa forma delle
     * tappe della campagna ('fatta' / 'corrente' / 'bloccata'): così la
     * pagina può disegnarle con la stessa mappa a nodi, senza sapere che
     * sta guardando un torneo invece di una campagna.
     */
    function getProveConStato(campaignId, tappaId) {
        const torneo = getTorneo(campaignId, tappaId);
        if (!torneo) return [];
        const fatte = getProgressoTorneo(campaignId, tappaId);
        return (torneo.tappe || []).map((prova, i) => {
            const pg = prova.kind === 'duel' ? getPersonaggio(prova.characterId) : null;
            return Object.assign({}, prova, {
                indice: i,
                torneoId: tappaId,
                immagine: pg ? pg.image : null,
                nomeAvversario: pg ? pg.name : null,
                stato: i < fatte ? 'fatta' : (i === fatte ? 'corrente' : 'bloccata')
            });
        });
    }

    /**
     * Supera una prova del torneo. Se era l'ultima, il torneo è vinto e
     * la CAMPAGNA avanza di una tappa (quella del torneo stesso).
     */
    function avanzaTorneo(campaignId, tappaId) {
        const torneo = getTorneo(campaignId, tappaId);
        if (!torneo) return { avanzato: false, torneoVinto: false, appenaFinita: false };
        const quante = getProgressoTorneo(campaignId, tappaId) + 1;
        const totali = (torneo.tappe || []).length;
        if (quante < totali) {
            setProgressoTorneo(campaignId, tappaId, quante);
            return { avanzato: true, torneoVinto: false, appenaFinita: false };
        }
        // Vinto: il torneo resta "pieno" (così rientrandoci si vede tutto
        // superato) e la campagna fa il suo passo.
        setProgressoTorneo(campaignId, tappaId, totali);
        const esito = avanza(campaignId);
        return { avanzato: true, torneoVinto: true, appenaFinita: esito.appenaFinita };
    }

    /**
     * Si riparte dal primo incontro. È la regola che dà peso al torneo:
     * nella campagna perdere non costa niente e si riprova la stessa
     * tappa, qui si perde la scalata.
     */
    function azzeraTorneo(campaignId, tappaId) {
        setProgressoTorneo(campaignId, tappaId, 0);
    }

    /**
     * Le carte di `deck` che questa campagna NON accetta, già raggruppate
     * per nome con il numero di copie: [{ id, nome, copie, motivo }].
     * Elenco vuoto = si può giocare.
     *
     * Serve a non far partire un duello con un mazzo fuori tema — e
     * soprattutto a DIRE QUALI carte sono di troppo. Un "non puoi giocare
     * questa campagna" senza l'elenco lascerebbe il giocatore a
     * indovinare su quaranta carte.
     *
     * Torna un elenco vuoto anche quando la campagna non dichiara nulla
     * (nessuna restrizione) o quando il database delle carte non è
     * caricato: un controllo che non può essere fatto non deve
     * trasformarsi in un divieto.
     */
    function carteNonAmmesse(campaignId, deck) {
        const campagna = getCampaign(campaignId);
        const regole = campagna && campagna.carteAmmesse;
        if (!regole || typeof cardDatabase === 'undefined' || !deck) return [];

        const origini = regole.origini || null;
        const conteggio = new Map();
        const voci = (deck.main || []).concat(deck.extra || []);
        voci.forEach((voce) => {
            const carta = cardDatabase.find((c) => c.id === voce.id);
            if (!carta) return;
            // Una carta senza `origin` è Yu-Gi-Oh: è il caso della quasi
            // totalità del database, dove il campo si scrive solo quando
            // fa eccezione.
            const origine = carta.origin || 'yu-gi-oh';
            let motivo = null;
            if (origini && origini.indexOf(origine) === -1) {
                motivo = `carta ${origine.toUpperCase()}`;
            } else if (regole.fazione && carta.fazione && carta.fazione !== regole.fazione) {
                motivo = `schieramento ${carta.fazione}`;
            }
            if (!motivo) return;
            const gia = conteggio.get(carta.id);
            if (gia) { gia.copie += (voce.qty || 1); return; }
            conteggio.set(carta.id, { id: carta.id, nome: carta.name, copie: voce.qty || 1, motivo: motivo });
        });
        return [...conteggio.values()];
    }

    /** Come si riassume a parole la regola di una campagna, per dirlo al giocatore prima che sbatta contro il divieto. */
    function descriviCarteAmmesse(campaignId) {
        const campagna = getCampaign(campaignId);
        const regole = campagna && campagna.carteAmmesse;
        if (!regole || !regole.origini) return null;
        const etichette = (window.CARD_ORIGIN_LABELS || {});
        const nomi = regole.origini.map((o) => etichette[o] || o).join(' o ');
        return regole.fazione
            ? `Solo carte ${nomi}, schieramento ${regole.fazione}`
            : `Solo carte ${nomi}`;
    }

    /**
     * L'URL del duello per una tappa, con tutto ciò che serve a tornare
     * indietro nel punto giusto.
     *
     * `opzioni.rigiocata`: è una tappa GIÀ superata che si sta rigiocando.
     * Il duello è identico in tutto — stesso avversario, stessa arena,
     * stessi premi di un duello qualunque — ma la storia non deve
     * avanzare una seconda volta. Il segno viaggia nell'URL e da lì nella
     * breadcrolla dell'esito, perché è l'unica cosa che sopravvive al
     * passaggio da questa pagina al duello e ritorno.
     */
    function urlDuello(campaignId, tappa, opzioni) {
        const params = new URLSearchParams({
            mode: 'story',
            campaign: campaignId,
            character: tappa.characterId,
            difficulty: tappa.difficulty || 'Medio'
        });
        if (tappa.field) params.set('field', tappa.field);
        // La colonna sonora del duello: quella della singola tappa se c'è
        // (il duello che merita un tema suo), altrimenti quella della
        // campagna. Una campagna che non ne dichiara nessuna non passa il
        // parametro affatto, e il duello suona come ha sempre suonato.
        const campagna = getCampaign(campaignId);
        const musica = tappa.music || (campagna && campagna.musicaDuello);
        if (musica) params.set('music', musica);
        if (opzioni && opzioni.rigiocata) params.set('replay', '1');
        // Duello che fa parte di un TORNEO dentro la campagna: al ritorno
        // l'esito va applicato alla scalata del torneo, non alla tappa
        // corrente della campagna. Viaggia nell'URL come tutto il resto.
        if (opzioni && opzioni.torneoId) params.set('torneo', opzioni.torneoId);
        return 'duelMonstersCore.html?' + params.toString();
    }

    /**
     * I capitoli con quante tappe ne hai superate: serve alla pagina per
     * dire "sei nel capitolo 2 di 5" invece di lasciarti contare i
     * pallini su una mappa lunga duemila pixel.
     */
    function getCapitoliConStato(campaignId) {
        const campagna = getCampaign(campaignId);
        if (!campagna) return [];
        const tappe = getTappeConStato(campaignId);
        return (campagna.capitoli || []).map((cap, i) => {
            const sue = tappe.filter((t) => t.capitoloIndice === i);
            const fatte = sue.filter((t) => t.stato === 'fatta').length;
            return {
                id: cap.id, nome: cap.nome, testo: cap.testo || '', indice: i,
                totali: sue.length, fatte: fatte,
                corrente: sue.some((t) => t.stato === 'corrente'),
                completo: sue.length > 0 && fatte === sue.length
            };
        });
    }

    window.StoryProgress = {
        getCampaigns: getCampaigns,
        getCampaign: getCampaign,
        getPersonaggio: getPersonaggio,
        getCapitoliConStato: getCapitoliConStato,
        carteNonAmmesse: carteNonAmmesse,
        descriviCarteAmmesse: descriviCarteAmmesse,
        getTappe: getTappe,
        getTappeConStato: getTappeConStato,
        getTappaCorrente: getTappaCorrente,
        getProgress: getProgress,
        avanza: avanza,
        consumaEsitoDuello: consumaEsitoDuello,
        riscuotiPremioFinale: riscuotiPremioFinale,
        ricomincia: ricomincia,
        urlDuello: urlDuello,
        // Tappe che sono a loro volta un percorso (kind: 'torneo').
        getTorneo: getTorneo,
        getProveConStato: getProveConStato,
        getProgressoTorneo: getProgressoTorneo,
        avanzaTorneo: avanzaTorneo,
        azzeraTorneo: azzeraTorneo
    };
})();
