/**
 * js/data/card-rarity.js — CLASSIFICAZIONE IN RARITÀ DELLE CARTE
 * =====================================================================
 * `data/cards.json` non ha (e non avrà) un campo `rarity`: aggiungerlo a
 * mano su 1131 carte sarebbe un lavoro enorme da rifare ad ogni carta
 * nuova. Qui la rarità si DERIVA, con lo stesso schema già usato altrove
 * nel progetto per i pesi dell'IA: una formula automatica che copre il
 * 95% dei casi, più un elenco CORTO di eccezioni curate a mano per le
 * carte che la formula sbaglierebbe.
 *
 * Perché la formula da sola non basta: in Yu-Gi-Oh il potere di una
 * carta non sta quasi mai nelle statistiche. Il Vaso dell'Avidità è una
 * Magia senza ATK né DEF che pesca due carte gratis ed è una delle carte
 * più forti mai stampate; un mostro vanilla da 3000 ATK che richiede due
 * Tributi è, al confronto, quasi ingiocabile. Nessuna euristica numerica
 * può indovinarlo: quelle carte vanno nominate una per una.
 *
 * SETTE LIVELLI: common, rare, super, ultra, legendary, secret e mythic.
 * Secret/Mythic descrivono soprattutto la FONTE (impresa o storia), non
 * soltanto la potenza. Per questo non entrano nelle buste generiche.
 *
 * Il Negozio (negozio.html) legge SOLO questo file per decidere cosa
 * offrire e a che prezzo: cambiare qui la classificazione di una carta
 * la sposta automaticamente di scaffale, senza toccare il Negozio.
 */
(function () {
    'use strict';

    /**
     * Carte che il Negozio non deve MAI vendere né mettere in una busta,
     * a nessun prezzo:
     *   - le tre Carte Dio Egizie: sono il premio di Battle City, darle in
     *     una busta svuoterebbe di senso il torneo;
     *   - i cinque pezzi di Exodia e le carte di Destiny Board: sono
     *     condizioni di VITTORIA ISTANTANEA (vedi checkGameOver in
     *     game-flow.js). Comprarle a caso in busta trasformerebbe la
     *     collezione in una corsa a chi le pesca per primo.
     *   - l'Elefante Volante, terza vittoria istantanea del motore.
     */
    const MYTHIC_IDS = new Set([30, 31, 472]);
    const SECRET_IDS = new Set([
        11, 41, 42, 43, 44,          // Exodia il Proibito + i 4 arti
        866, 867, 868, 869, 870,     // Destiny Board + Spirit Message I/N/A/L
        246                          // Elefante Volante
    ]);
    const LOCKED_IDS = new Set([...MYTHIC_IDS, ...SECRET_IDS]);

    /** Iconiche/boss: possono comparire soltanto nelle fasce più costose. */
    const LEGENDARY_IDS = new Set([
        1, 2, 12, 17, 29, 102, 123, 167, 188, 207, 409,
        291, 382, 656, 886
    ]);

    /**
     * ULTRA RARE curate a mano: le carte che decidono una partita da sole,
     * quasi tutte invisibili a una formula sulle statistiche.
     * Tenuto CORTO di proposito — più lungo diventa, meno significa
     * "ultra".
     */
    const ULTRA_IDS = new Set([
        36,   // Vaso dell'Avidità — pesca 2 carte, gratis
        7,    // Buco Nero — distrugge tutti i mostri in campo
        8,    // Spada Rivelatrice — blocca gli attacchi per 3 turni
        10,   // Cilindro Magico — ribalta un attacco addosso a chi lo lancia
        382,  // Forza dello Specchio — spazza via il campo che attacca
        291,  // Piumino delle Arpie — cancella l'intero retrocampo
        633,  // Sepoltura Prematura — rianima dal Cimitero
        136,  // Richiamo degli Infestati — idem, dal proprio Cimitero
        886,  // Metamorfosi — trasforma un mostro in uno dall'Extra Deck
        130,  // Controllo Mentale — ruba un mostro, in modo permanente
        874   // Confisca — guarda la mano avversaria e ne scarta una carta
    ]);

    const SUPER_IDS = new Set([40, 128, 173, 238, 251, 272, 300, 371, 492, 624, 633, 669, 671, 725, 793, 820]);

    /**
     * RARE curate a mano: forti ma non decisive da sole. Anche qui si
     * elencano solo quelle che la formula non prenderebbe (rimozioni e
     * utility senza statistiche).
     */
    const RARE_IDS = new Set([
        40,   // Buco Trappola
        503,  // Waboku
        434,  // Capro Espiatorio
        599,  // Sette Attrezzi del Bandito
        143,  // Mura del Castello
        793,  // Armatura Sakuretsu
        439,  // Incantesimo Ombra
        671,  // Dispositivo di Evacuazione Forzata
        201,  // Buco Dimensionale
        492,  // Tributo ai Dannati
        624,  // Rottura di Raigeki
        725,  // Il Guerriero Ritorna in Vita
        669,  // Libro della Vita
        820,  // Nega Attacco
        600,  // Trappola Fasulla
        690   // Ritorno di Fiamma
    ]);

    /**
     * COMUNI forzate: carte che la formula promuoverebbe per le sole
     * statistiche, ma che in partita non valgono quel posto — quasi
     * sempre vanilla enormi che costano due o tre Tributi.
     * `vanillaBigButCommon` non è un elenco di id ma una REGOLA (vedi
     * classify): un mostro senza effetto resta comune per quanto grosso
     * sia, perché il suo unico contributo è il numero sulla carta.
     */

    /** Parole che, nel testo di una Magia/Trappola, segnalano un effetto che pesa davvero. */
    const STRONG_KEYWORDS = [
        'distruggi tutt', 'tutti i mostri', 'tutte le carte',
        'annulla', 'nega ', 'pesca 2', 'pesca due',
        'special summon', 'evoca specialmente',
        'prendi il controllo', 'bandisci', 'ritorna nel deck'
    ];
    const MILD_KEYWORDS = [
        'distruggi 1', 'distruggi un', 'pesca 1', 'pesca una',
        'aggiungi', 'scegli come bersaglio', 'infliggi'
    ];

    function textOf(card) {
        return String((card && card.effect) || '').toLowerCase();
    }
    function hasAny(text, words) {
        return words.some((w) => text.indexOf(w) !== -1);
    }

    /**
     * La formula automatica. Volutamente prudente: promuove a 'rare' solo
     * quando ci sono ragioni chiare, e non promuove MAI a 'ultra' da sola
     * — le ultra sono tutte e sole quelle nominate in ULTRA_IDS, così il
     * livello più alto resta una scelta consapevole e non il risultato di
     * una soglia numerica.
     */
    function classify(card) {
        if (!card) return 'common';
        if (MYTHIC_IDS.has(card.id)) return 'mythic';
        if (SECRET_IDS.has(card.id)) return 'secret';
        if (LEGENDARY_IDS.has(card.id)) return 'legendary';
        if (ULTRA_IDS.has(card.id)) return 'ultra';
        if (SUPER_IDS.has(card.id)) return 'super';
        if (RARE_IDS.has(card.id)) return 'rare';

        if (card.type === 'monster') {
            // Un mostro SENZA effetto resta comune per quanto sia grosso:
            // il suo unico contributo è il numero stampato sopra, e in
            // più i Livelli alti costano Tributi che lo rendono lento.
            if (card.vanilla) return 'common';
            const stat = Math.max(card.attack || 0, card.defense || 0);
            const lv = card.level || 0;
            // Mostro con effetto, grosso E giocabile: raro.
            if (stat >= 2800 && lv >= 7) return card.vanilla ? 'rare' : 'super';
            if (stat >= 2400 && lv >= 7) return 'rare';
            // Il caso più prezioso del gioco reale: molta potenza a basso
            // costo di Evocazione (nessun Tributo sotto il Livello 5).
            if (stat >= 1900 && lv <= 4) return 'rare';
            return 'common';
        }

        // Magie e Trappole: contano solo le parole del loro effetto.
        const t = textOf(card);
        if (hasAny(t, STRONG_KEYWORDS)) return 'super';
        if (hasAny(t, MILD_KEYWORDS)) return 'common';
        return 'common';
    }

    const cache = Object.create(null);

    /**
     * Il database carte NON è sempre raggiungibile come `window.cardDatabase`:
     * dichiarato con `const` al primo livello di uno script classico non
     * diventa una proprietà di window (insidia già costata un bug in questo
     * progetto, vedi il commento su window.MONSTER_RACES in CLAUDE.md).
     * Va quindi letto per identificatore, con il window come ripiego.
     */
    function db() {
        if (typeof cardDatabase !== 'undefined' && Array.isArray(cardDatabase)) return cardDatabase;
        if (Array.isArray(window.cardDatabase)) return window.cardDatabase;
        return [];
    }

    /** Rarità commerciale/narrativa di una carta. */
    function rarityOf(cardId) {
        if (cache[cardId]) return cache[cardId];
        const card = db().find((c) => c.id === cardId);
        const r = classify(card);
        cache[cardId] = r;
        return r;
    }

    /** Tutte le carte di una rarità, come array di id. `origin` filtra il set di provenienza (default: solo Yu-Gi-Oh). */
    function idsByRarity(rarity, origin) {
        const wanted = origin === undefined ? 'yu-gi-oh' : origin;
        return db()
            .filter((c) => (wanted === null || (c.origin || 'yu-gi-oh') === wanted))
            .filter((c) => rarityOf(c.id) === rarity)
            .map((c) => c.id);
    }

    /** Vero se la carta può comparire nel Negozio (in vendita diretta o in busta). */
    function isPurchasable(cardId) {
        const r = rarityOf(cardId);
        return r !== 'secret' && r !== 'mythic';
    }

    /** Etichetta leggibile, usata dal Negozio nelle schede prodotto. */
    const LABELS = {
        common: 'Comune', rare: 'Rara', super: 'Super Rara', ultra: 'Ultra Rara',
        legendary: 'Leggendaria', secret: 'Segreta', mythic: 'Mitica'
    };

    window.CardRarity = {
        of: rarityOf,
        idsByRarity: idsByRarity,
        isPurchasable: isPurchasable,
        label: (r) => LABELS[r] || r,
        LABELS: LABELS,
        LOCKED_IDS: LOCKED_IDS,
        MYTHIC_IDS: MYTHIC_IDS,
        SECRET_IDS: SECRET_IDS
    };
})();
