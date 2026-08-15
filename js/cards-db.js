/**
 * cards-db.js — Database delle carte (76 carte totali)
 *
 * Ogni mostro ha un campo "level" (stelle) che determina se serve un
 * Tributo per essere Evocato Normalmente:
 *   - Level 7+   -> richiede 2 Tributi (sacrifica 2 mostri sul Terreno)
 *   - Level 5-6  -> richiede 1 Tributo (sacrifica 1 mostro sul Terreno)
 *   - Level 1-4  -> nessun Tributo, evocazione libera
 *
 * "origin" (provenienza): a cosa appartiene la carta, usato dal filtro
 * Provenienza in cartoteca.html e mostrato nel riepilogo di un deck in
 * creazione-deck.html — pensato per futuri duelli con restrizioni (es.
 * "solo carte Yu-Gi-Oh"). Valori usati finora: 'yu-gi-oh' (tutte le
 * carte qui sotto, il gioco base), 'fanmade' (carte originali di questo
 * progetto, non ancora presenti), 'ww1'/'ww2' (set a tema storico,
 * anch'essi non ancora presenti) — la tassonomia è già pronta per quando
 * arriveranno.
 *
 * "subtype" (solo Magie/Trappole): il vero sottotipo ufficiale della
 * carta — 'normal'/'continuous'/'quick-play'/'ritual'/'field'/'equip' per
 * le Magie, 'normal'/'continuous'/'counter' per le Trappole. Usato dal
 * filtro Sottotipo in cartoteca.html/creazione-deck.html. È un dato di
 * IDENTITÀ della carta (cosa è davvero nel gioco vero), indipendente da
 * come questo motore la implementa internamente — es. Spada Rivelatrice
 * è una Magia Normale ufficiale anche se qui resta scoperta sul Terreno
 * con `continuous: true` in js/card-effects.js per comodità di
 * implementazione (vedi il commento lì).
 */
const cardDatabase = [
    // ===== Carte originali =====
    { id: 1, origin: 'yu-gi-oh', name: 'Drago Bianco Occhi Blu', type: 'monster', level: 8, race: 'Drago', attribute: 'LUCE', attack: 3000, defense: 2500, effect: 'Questo drago leggendario è un mostro dal potere devastante, temuto in tutto il mondo del Duel.' },
    { id: 2, origin: 'yu-gi-oh', name: 'Mago Nero', type: 'monster', level: 7, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 2500, defense: 2100, effect: 'Il mago supremo in termini di attacco e difesa.' },
    { id: 3, origin: 'yu-gi-oh', name: 'Elfo Mistico', type: 'monster', level: 4, race: 'Incantatore', attribute: 'LUCE', attack: 800, defense: 2000 },
    { id: 4, origin: 'yu-gi-oh', name: 'Guerriero Celtico', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1400, defense: 1200 },
    { id: 5, origin: 'yu-gi-oh', name: 'Soldato di Pietra', type: 'monster', level: 4, race: 'Roccia', attribute: 'TERRA', attack: 1300, defense: 2000 },
    { id: 6, origin: 'yu-gi-oh', name: 'Cavaliere Oscuro', type: 'monster', level: 6, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 2000, defense: 1800 },
    { id: 7, origin: 'yu-gi-oh', name: 'Buco Nero', type: 'spell', subtype: 'normal', effect: 'Distruggi tutti i mostri sul Terreno.' },
    { id: 8, origin: 'yu-gi-oh', name: 'Spada Rivelatrice', type: 'spell', subtype: 'normal', effect: 'I mostri del tuo avversario non possono attaccare.' },
    { id: 9, origin: 'yu-gi-oh', name: 'Forza Riflessa', type: 'trap', subtype: 'normal', effect: 'Quando un mostro dell\'avversario dichiara un attacco: distruggi tutti i mostri in Posizione di Attacco controllati dal tuo avversario.' },
    { id: 10, origin: 'yu-gi-oh', name: 'Cilindro Magico', type: 'trap', subtype: 'normal', effect: 'Quando un mostro dell\'avversario dichiara un attacco: annulla l\'attacco e, se lo fai, infliggi al tuo avversario danno pari all\'ATK di quel mostro.' },
    { id: 11, origin: 'yu-gi-oh', name: 'Braccio Dx Del Proibito', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 200, defense: 300 },

    // ===== Nuove carte (12-40) =====
    { id: 12, origin: 'yu-gi-oh', name: 'Drago Nero Occhi Rossi', type: 'monster', level: 7, race: 'Drago', attribute: 'OSCURITÀ', attack: 2400, defense: 2000, effect: 'Un drago feroce avvolto da un\'aura oscura.' },
    { id: 13, origin: 'yu-gi-oh', name: 'Teschio Evocato', type: 'monster', level: 6, race: 'Demone', attribute: 'OSCURITÀ', attack: 2500, defense: 1200, effect: 'Un demone convocato dagli inferi con un fulmine devastante.' },
    { id: 14, origin: 'yu-gi-oh', name: 'Gaia il Cavaliere Feroce', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2300, defense: 2100, effect: 'Un cavaliere che cavalca un possente destriero da guerra.' },
    { id: 15, origin: 'yu-gi-oh', name: 'Maledizione del Drago', type: 'monster', level: 5, race: 'Drago', attribute: 'OSCURITÀ', attack: 2000, defense: 1500 },
    { id: 16, origin: 'yu-gi-oh', name: 'Gearfried il Cavaliere di Ferro', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1800, defense: 1600 },
    { id: 17, origin: 'yu-gi-oh', name: 'Jinzo', type: 'monster', level: 6, race: 'Macchina', attribute: 'OSCURITÀ', attack: 2400, defense: 1500, effect: 'Le carte Trappola sul Terreno perdono il loro effetto.' },
    { id: 18, origin: 'yu-gi-oh', name: 'Predone Vorse', type: 'monster', level: 4, race: 'Bestia-Guerriero', attribute: 'OSCURITÀ', attack: 1900, defense: 1200 },
    { id: 19, origin: 'yu-gi-oh', name: 'Maga Oscura', type: 'monster', level: 6, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 2000, defense: 1700, effect: 'Un\'allieva prodigio del Mago Nero.' },
    { id: 20, origin: 'yu-gi-oh', name: 'Buster Blader', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2600, defense: 2300, effect: 'Guadagna forza extra contro i mostri di Tipo Drago.' },
    { id: 21, origin: 'yu-gi-oh', name: 'Drago a Cannoni', type: 'monster', level: 7, race: 'Macchina', attribute: 'OSCURITÀ', attack: 2600, defense: 2200, effect: 'Un drago meccanico armato di cannoni multipli.' },
    { id: 22, origin: 'yu-gi-oh', name: 'Kuriboh', type: 'monster', level: 1, race: 'Demone', attribute: 'OSCURITÀ', attack: 300, defense: 200, effect: 'Piccolo ma prezioso: può sacrificarsi per annullare un danno da battaglia.' },
    { id: 23, origin: 'yu-gi-oh', name: 'Insetto Divoratore', type: 'monster', level: 2, race: 'Insetto', attribute: 'TERRA', attack: 450, defense: 600 },
    { id: 24, origin: 'yu-gi-oh', name: 'Elfi Gemelli', type: 'monster', level: 4, race: 'Incantatore', attribute: 'TERRA', attack: 1900, defense: 900 },
    { id: 25, origin: 'yu-gi-oh', name: 'Ryu Kishin', type: 'monster', level: 3, race: 'Demone', attribute: 'TERRA', attack: 1000, defense: 500 },
    { id: 26, origin: 'yu-gi-oh', name: 'Folletto Selvaggio', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1300, defense: 1400 },
    { id: 27, origin: 'yu-gi-oh', name: 'Cucciolo di Drago', type: 'monster', level: 4, race: 'Drago', attribute: 'VENTO', attack: 1200, defense: 700 },
    { id: 28, origin: 'yu-gi-oh', name: 'Mago del Tempo', type: 'monster', level: 4, race: 'Incantatore', attribute: 'LUCE', attack: 500, defense: 400, effect: 'Può alterare il flusso del tempo con la sua Ruota della Fortuna.' },
    { id: 29, origin: 'yu-gi-oh', name: 'Drago Bianco Definitivo', type: 'monster', level: 10, race: 'Drago', attribute: 'LUCE', attack: 4500, defense: 3800, extraDeck: true, category: 'fusion', effect: 'La fusione di tre Draghi Bianchi Occhi Blu: una forza quasi inarrestabile.' },
    { id: 30, origin: 'yu-gi-oh', name: 'Obelisk il Tormentatore', type: 'monster', level: 10, race: 'Essere Divino', attribute: 'DIVINO', attack: 4000, defense: 4000, effect: 'Uno dei tre Dei Egizi: un colosso di pura forza distruttiva.' },
    { id: 31, origin: 'yu-gi-oh', name: 'Slifer il Drago del Cielo', type: 'monster', level: 10, race: 'Essere Divino', attribute: 'DIVINO', attack: 3000, defense: 2500, effect: 'Uno dei tre Dei Egizi: le sue statistiche crescono con le carte in mano.' },
    { id: 32, origin: 'yu-gi-oh', name: 'Il Drago Alato di Ra', type: 'monster', level: 10, race: 'Essere Divino', attribute: 'DIVINO', attack: 4000, defense: 4000, effect: 'Uno dei tre Dei Egizi: il più antico e temuto tra loro.' },
    { id: 33, origin: 'yu-gi-oh', name: 'Il Guardiano del Cancello', type: 'monster', level: 10, race: 'Roccia', attribute: 'TERRA', attack: 3750, defense: 3400, extraDeck: true, category: 'fusion', effect: 'Fusione di tre guardiani elementali che proteggono un antico portale.' },
    { id: 34, origin: 'yu-gi-oh', name: 'Ragno Lanciatore', type: 'monster', level: 6, race: 'Macchina', attribute: 'TERRA', attack: 2200, defense: 2500, effect: 'Un mostro meccanico armato di missili a lungo raggio.' },
    { id: 35, origin: 'yu-gi-oh', name: 'Rinascita del Mostro', type: 'spell', subtype: 'normal', effect: 'Special Summon di un mostro da un Cimitero, tuo o dell\'avversario.' },
    { id: 36, origin: 'yu-gi-oh', name: 'Vaso dell\'Avidità', type: 'spell', subtype: 'normal', effect: 'Pesca 2 carte.' },
    { id: 37, origin: 'yu-gi-oh', name: 'Folgore Fulminante', type: 'spell', subtype: 'normal', effect: 'Distruggi tutte le carte sul Terreno del tuo avversario.' },
    { id: 38, origin: 'yu-gi-oh', name: 'Fusione', type: 'spell', subtype: 'normal', effect: 'Fondi insieme i Materiali Fusione elencati su un Mostro Fusione.' },
    { id: 39, origin: 'yu-gi-oh', name: 'Voragine', type: 'spell', subtype: 'normal', effect: 'Distruggi il mostro scoperto con l\'ATK più basso controllato dal tuo avversario.' },
    { id: 40, origin: 'yu-gi-oh', name: 'Buco Trappola', type: 'trap', subtype: 'normal', effect: 'Quando l\'avversario Evoca Normalmente o Special Summon un mostro con più di 1000 ATK: distruggilo.' },

    // ===== Prima Serie (Duelist Kingdom) — 41-58 =====
    // I 5 pezzi di Exodia il Proibito: se li hai tutti e 5 in mano, vinci
    // subito il duello — vedi checkExodiaWin() in js/game-flow.js. "Braccio
    // Dx del Proibito" (id 11) è il quinto pezzo, già presente da prima.
    { id: 41, origin: 'yu-gi-oh', name: 'Testa Proibita', type: 'monster', level: 3, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1000, defense: 1000, effect: 'Se hai in mano tutti e 5 i pezzi di Exodia il Proibito, vinci automaticamente il duello.' },
    { id: 42, origin: 'yu-gi-oh', name: 'Braccio Sx del Proibito', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 200, defense: 300, effect: 'Se hai in mano tutti e 5 i pezzi di Exodia il Proibito, vinci automaticamente il duello.' },
    { id: 43, origin: 'yu-gi-oh', name: 'Gamba Dx del Proibito', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 200, defense: 300, effect: 'Se hai in mano tutti e 5 i pezzi di Exodia il Proibito, vinci automaticamente il duello.' },
    { id: 44, origin: 'yu-gi-oh', name: 'Gamba Sx del Proibito', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 200, defense: 300, effect: 'Se hai in mano tutti e 5 i pezzi di Exodia il Proibito, vinci automaticamente il duello.' },

    { id: 45, origin: 'yu-gi-oh', name: 'Judge Man', type: 'monster', level: 6, race: 'Guerriero', attribute: 'TERRA', attack: 2200, defense: 1500 },
    { id: 46, origin: 'yu-gi-oh', name: 'La Jinn il Genio della Lampada', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1800, defense: 1000 },
    { id: 47, origin: 'yu-gi-oh', name: 'Cavaliere Missile', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1500, defense: 1300, effect: 'Una volta per turno, puoi farlo tornare in mano a fine turno: se lo fai, in quel turno può attaccare direttamente i Life Points dell\'avversario.' },
    { id: 48, origin: 'yu-gi-oh', name: 'Spadaccino delle Pianure', type: 'monster', level: 3, race: 'Guerriero', attribute: 'TERRA', attack: 500, defense: 400 },
    { id: 49, origin: 'yu-gi-oh', name: 'Insetto Divoratore Mostruoso', type: 'monster', level: 2, race: 'Insetto', attribute: 'TERRA', attack: 450, defense: 600, effect: 'FLIP: distruggi 1 mostro sul Terreno.' },
    { id: 50, origin: 'yu-gi-oh', name: 'Larva Mostruosa', type: 'monster', level: 3, race: 'Insetto', attribute: 'TERRA', attack: 500, defense: 400, effect: 'Rimanendo sul Terreno può evolversi in Bozzolo dell\'Evoluzione.' },
    { id: 51, origin: 'yu-gi-oh', name: 'Bozzolo dell\'Evoluzione', type: 'monster', level: 3, race: 'Insetto', attribute: 'TERRA', attack: 0, defense: 2000, effect: 'Dopo alcuni turni sul Terreno può evolversi in Grande Falena.' },
    { id: 52, origin: 'yu-gi-oh', name: 'Grande Falena', type: 'monster', level: 6, race: 'Insetto', attribute: 'TERRA', attack: 2600, defense: 2500, effect: 'Nasce dall\'evoluzione di Bozzolo dell\'Evoluzione.' },
    { id: 53, origin: 'yu-gi-oh', name: 'Bambola Canaglia', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1600, defense: 1000 },
    { id: 54, origin: 'yu-gi-oh', name: 'Muro d\'Illusione', type: 'monster', level: 4, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1000, defense: 1850, effect: 'Quando viene attaccato, prima del calcolo dei danni puoi rimandare il mostro attaccante in mano al suo proprietario.' },

    // Rituale: Guerriero Nero Supremo si evoca sacrificando mostri per un
    // Livello totale pari o superiore al suo grazie al suo rito — vedi la
    // registrazione dell'effetto in js/card-effects.js (semplificata:
    // basta avere entrambe le carte, come per le altre evocazioni
    // speciali di questo gioco).
    { id: 55, origin: 'yu-gi-oh', name: 'Guerriero Nero Supremo', type: 'monster', level: 8, race: 'Guerriero', attribute: 'TERRA', attack: 3000, defense: 2500, category: 'ritual', effect: 'Evocabile solo tramite Rito del Guerriero Nero, sacrificando mostri per un Livello totale di almeno 8.' },
    { id: 56, origin: 'yu-gi-oh', name: 'Rito del Guerriero Nero', type: 'spell', subtype: 'ritual', effect: 'Sacrifica dal Terreno mostri per un Livello totale di almeno 8 per Special Summon Guerriero Nero Supremo dalla mano.' },

    // Fusione: come per gli Extra Deck già presenti (Drago Bianco
    // Definitivo, Il Guardiano del Cancello), qui contano come carte
    // ottenibili in mazzo/Cimitero — non c'è ancora una vera Evocazione
    // Fusione con selezione dei materiali.
    { id: 57, origin: 'yu-gi-oh', name: 'Gaia il Drago Campione', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2600, defense: 2100, extraDeck: true, category: 'fusion', effect: 'Fusione di Gaia il Cavaliere Feroce e Maledizione del Drago.' },
    { id: 58, origin: 'yu-gi-oh', name: 'Spadaccino di Fuoco', type: 'monster', level: 7, race: 'Guerriero', attribute: 'FUOCO', attack: 1800, defense: 1600, extraDeck: true, category: 'fusion', effect: 'Fusione del Manipolatore di Fiamme e dello Spadaccino Mascherato.' },

    // Importate da yugioh.com (pagina 22 della lista alfabetica). Escluse da
    // quella pagina: Sonic Maid (Synchro, meccanica non supportata da questo
    // motore — vedi "NIENTE Pendulum/XYZ/Link/Synchro" in card-effects.js),
    // Summoned Skull e Swords of Revealing Light (già presenti come Teschio
    // Evocato id13 e Spada Rivelatrice id8), e Spell Sanctuary/Star
    // Blaster/Sword of Soul (mai stampate come vere carte TCG/OCG: pagine
    // "solo anime" di yugioh.com, una delle quali — Star Blaster — non ha
    // nemmeno un testo effetto ricostruito in modo affidabile).
    { id: 59, origin: 'yu-gi-oh', name: 'Carica dell\'Anima', type: 'spell', subtype: 'normal', effect: 'Special Summon di un mostro dal tuo Cimitero; poi perdi 1000 Life Points.' },
    { id: 60, origin: 'yu-gi-oh', name: 'Demolizione dell\'Anima', type: 'trap', subtype: 'continuous', effect: 'Se controlli un mostro di Tipo Demone: paga 500 Life Points, poi banisci una carta da ciascun Cimitero.' },
    { id: 61, origin: 'yu-gi-oh', name: 'Scambio di Anime', type: 'spell', subtype: 'normal', effect: 'Distruggi un mostro scoperto controllato dal tuo avversario.' },
    { id: 62, origin: 'yu-gi-oh', name: 'Liberazione dell\'Anima', type: 'spell', subtype: 'normal', effect: 'Banisci fino a 5 carte da uno o entrambi i Cimiteri.' },
    { id: 63, origin: 'yu-gi-oh', name: 'Ladro di Anime', type: 'spell', subtype: 'normal', effect: 'Distruggi un mostro scoperto controllato dal tuo avversario; il tuo avversario guadagna 1000 Life Points.' },
    { id: 64, origin: 'yu-gi-oh', name: 'Drago Lanciere', type: 'monster', level: 4, race: 'Drago', attribute: 'VENTO', attack: 1900, defense: 0, effect: 'Se attacca un mostro in Posizione di Difesa con DEF inferiore alla sua ATK, infligge la differenza come danno; dopo aver attaccato, passa in Posizione di Difesa.' },
    { id: 65, origin: 'yu-gi-oh', name: 'Cancella Magie', type: 'monster', level: 5, race: 'Macchina', attribute: 'VENTO', attack: 1800, defense: 1600, effect: 'Le Magie non possono essere attivate sul Terreno, finché questa carta resta scoperta in campo.' },
    { id: 66, origin: 'yu-gi-oh', name: 'Tela di Ragno', type: 'spell', subtype: 'field', effect: 'Ogni mostro che dichiara un attacco viene messo in Posizione di Difesa a fine Damage Step e non può cambiare posizione fino alla End Phase successiva.' },
    { id: 67, origin: 'yu-gi-oh', name: 'Robot a Punte', type: 'monster', level: 5, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1800, defense: 1700, effect: 'Un soldato meccanico creato da uno stregone malvagio: attacca con le due sfere d\'acciaio innestate sulle braccia.' },
    { id: 68, origin: 'yu-gi-oh', name: 'Spirito dell\'Arpa', type: 'monster', level: 4, race: 'Fata', attribute: 'LUCE', attack: 800, defense: 2000, effect: 'Uno spirito che allevia l\'anima con la musica della sua arpa celeste.' },
    { id: 69, origin: 'yu-gi-oh', name: 'Stop Difesa', type: 'spell', subtype: 'normal', effect: 'Cambia in Posizione di Attacco un mostro in Posizione di Difesa controllato dal tuo avversario.' },
    { id: 70, origin: 'yu-gi-oh', name: 'Ninja d\'Assalto', type: 'monster', level: 4, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 1700, defense: 1200, effect: 'Puoi bandire 2 mostri OSCURITÀ dal tuo Cimitero per bandire questa carta fino alla End Phase, evitando un attacco.' },
    { id: 71, origin: 'yu-gi-oh', name: 'Suijin', type: 'monster', level: 7, race: 'Acquatico', attribute: 'ACQUA', attack: 2500, defense: 2400, effect: 'Durante il calcolo dei danni, se questa carta viene attaccata, puoi rendere pari a 0 l\'ATK del mostro attaccante.' },
    { id: 72, origin: 'yu-gi-oh', name: 'Dado dell\'Evocazione', type: 'spell', subtype: 'normal', effect: 'Paga 1000 Life Points e tira un dado a sei facce: 1-2 puoi Evocare Normalmente, 3-4 Special Summon dal tuo Cimitero, 5-6 Special Summon dalla mano un mostro di Livello 5+.' },
    { id: 73, origin: 'yu-gi-oh', name: 'Super Roboyarou', type: 'monster', level: 6, race: 'Macchina', attribute: 'TERRA', attack: 1200, defense: 500, extraDeck: true, category: 'fusion', effect: 'Fusione di Roboyarou e Robolady. Durante il Damage Step guadagna 1000 ATK in battaglia.' },
    { id: 74, origin: 'yu-gi-oh', name: 'Guardiano della Palude', type: 'monster', level: 5, race: 'Guerriero', attribute: 'TERRA', attack: 1800, defense: 1500, effect: 'Guadagna 500 ATK per ogni Guardiano della Palude di Lava che controlli.' },
    { id: 75, origin: 'yu-gi-oh', name: 'Braccio-Spada del Drago', type: 'monster', level: 6, race: 'Dinosauro', attribute: 'TERRA', attack: 1750, defense: 2030, effect: 'Questo colosso giurassico ha una spina dorsale ricoperta di placche a forma di spada e una coda che spacca teschi.' },
    { id: 76, origin: 'yu-gi-oh', name: 'Cacciatore di Spade', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2450, defense: 1700, effect: 'Se distrugge un mostro in battaglia, lo equipaggia dal Cimitero a sé stesso, guadagnando 200 ATK per ogni mostro equipaggiato.' },
];

/** Etichette leggibili per il filtro Provenienza di cartoteca.html e il riepilogo deck di creazione-deck.html. */
const CARD_ORIGIN_LABELS = {
    'yu-gi-oh': 'Yu-Gi-Oh!',
    'fanmade': 'Fanmade',
    'ww1': 'WW1',
    'ww2': 'WW2'
};

/** Etichette leggibili per il filtro Categoria Mostro di cartoteca.html/creazione-deck.html. */
const MONSTER_CATEGORY_LABELS = {
    normal: '⚪ Normale',
    effect: '🟠 Con Effetto',
    fusion: '🟣 Fusione',
    ritual: '🔵 Rituale'
};

/**
 * Elenco completo dei Tipi Mostro (razze) ufficiali di Yu-Gi-Oh, per il
 * filtro "Tipo Mostro" di cartoteca.html/creazione-deck.html — un elenco
 * FISSO, non derivato dalle sole carte già presenti nel database, così il
 * filtro mostra sempre tutte le opzioni previste dal gioco vero anche per
 * i tipi non ancora rappresentati da nessuna carta qui dentro. Limitato ai
 * tipi già esistenti nell'era della prima serie (niente Psichico/Cyberse/
 * Wyrm/Dio Creatore, introdotti da espansioni molto più recenti).
 */
const MONSTER_RACES = [
    'Guerriero', 'Incantatore', 'Fata', 'Demone', 'Zombie', 'Macchina',
    'Acquatico', 'Piroico', 'Roccia', 'Bestia Alata', 'Pianta', 'Insetto',
    'Tuono', 'Drago', 'Bestia', 'Bestia-Guerriero', 'Dinosauro', 'Pesce',
    'Serpente di Mare', 'Rettile', 'Essere Divino', 'Illusione'
];

/** Etichette leggibili per il filtro Sottotipo Magia (card.subtype quando type === 'spell'). */
const SPELL_SUBTYPE_LABELS = {
    normal: 'Normale',
    continuous: 'Continua',
    'quick-play': 'Veloce',
    ritual: 'Rituale',
    field: 'Campo',
    equip: 'Equipaggiamento'
};

/** Etichette leggibili per il filtro Sottotipo Trappola (card.subtype quando type === 'trap'). */
const TRAP_SUBTYPE_LABELS = {
    normal: 'Normale',
    continuous: 'Continua',
    counter: 'Contatore'
};

/**
 * Categoria filtro di un mostro: 'fusion'/'ritual' vengono da card.category
 * (js/cards-db.js), 'effect' richiede che js/duel-engine.js + js/card-effects.js
 * siano caricati (solo nel duello vero — su Cartoteca/Creazione Deck vengono
 * caricati apposta SOLO per questo, vedi i rispettivi <script>). Se il motore
 * effetti non è disponibile, ogni mostro senza categoria strutturale ricade
 * su 'normal' anziché rompere il filtro.
 */
function getMonsterFilterCategory(card) {
    if (!card || card.type !== 'monster') return null;
    if (card.category === 'fusion') return 'fusion';
    if (card.category === 'ritual') return 'ritual';
    if (window.DuelEngine && typeof DuelEngine.getDefinition === 'function' && DuelEngine.getDefinition(card.id)) {
        return 'effect';
    }
    return 'normal';
}

function createRandomCard() {
    const template = cardDatabase[Math.floor(Math.random() * cardDatabase.length)];
    return { ...template, uid: Date.now() + Math.random() };
}

/**
 * Espande un deck salvato/a tema — { main: [{id, qty}, ...] } (vedi
 * js/save-manager.js e js/character-decks.js) — in un mazzo REALE
 * mescolato: un array di carte pronte da pescare una alla volta con
 * .pop(), ognuna con il proprio uid. Solo il Main Deck: l'Extra Deck
 * (Fusione) non si pesca mai normalmente, quindi resta ignorato qui —
 * usato da resetGameState() in js/game-flow.js per le partite offline.
 * Ritorna null se lo spec non è valido, così chi chiama può ricadere sul
 * vecchio pool casuale invece di un mazzo vuoto.
 */
function buildDeckFromSpec(deckSpec) {
    if (!deckSpec || !Array.isArray(deckSpec.main) || deckSpec.main.length === 0) return null;
    const cards = [];
    deckSpec.main.forEach((entry) => {
        const template = cardDatabase.find((c) => c.id === entry.id);
        if (!template) return;
        for (let i = 0; i < entry.qty; i++) {
            cards.push({ ...template, uid: `${Date.now()}_${Math.random().toString(36).slice(2)}_${cards.length}` });
        }
    });
    if (cards.length === 0) return null;
    // Fisher-Yates
    for (let i = cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
}

/**
 * Calcola quanti Tributi servono per Evocare Normalmente un dato mostro,
 * in base al suo Livello (stelle).
 */
function getTributesRequired(card) {
    if (!card || card.type !== 'monster' || !card.level) return 0;
    if (card.level >= 7) return 2;
    if (card.level >= 5) return 1;
    return 0;
}
