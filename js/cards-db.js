/**
 * cards-db.js — Database delle carte (492 carte totali)
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
 *
 * "artOnly" (opzionale, solo se true): l'immagine in images/cards/<id>.jpeg
 * è SOLO l'illustrazione ritagliata (niente scan completo della carta —
 * nessun nome/stelle/ATK-DEF disegnati dentro il file), a differenza delle
 * altre immagini di questo set che sono scan completi pronti da mostrare
 * così come sono. js/card-renderer.js usa questo flag per decidere DOVE
 * mettere l'immagine: uno scan completo copre l'intera carta (nasconde la
 * cornice CSS, che sarebbe ridondante); un'illustrazione va invece DENTRO
 * la finestra-immagine della cornice CSS (.card-frame-art), che resta
 * visibile intorno a lei con nome/stelle/ATK-DEF disegnati a CSS.
 *
 * "vanilla" (solo mostri Normali/Rituali/Fusione non-Rituale/non-Fusione,
 * opzionale, solo se true): vero se questa carta è un vero Normal Monster
 * nel gioco reale (nessun effetto di carta, solo testo descrittivo), per
 * distinguerla da un vero Effect Monster — è un dato di IDENTITÀ della
 * carta, indipendente dal fatto che il suo effetto sia già stato
 * programmato in questo motore o resti data-only (stesso spirito del
 * campo "subtype" sopra). js/card-renderer.js lo usa per la tinta
 * arancione (Effect Monster) contro gialla (Normal Monster) dello sfondo
 * carta — vedi js/card.css — assente su Rituali/Fusioni, che hanno già il
 * proprio colore strutturale (blu/viola) indipendente da questa
 * distinzione. Le 5 carte di Exodia (id 11, 41-44) sono vanilla: true
 * anche se il loro testo descrive la vittoria automatica, perché sulla
 * carta reale quella non è un "effetto" ma una regola speciale legata al
 * possedere tutti e 5 i pezzi in mano.
 */
const cardDatabase = [
    // ===== Carte originali =====
    { id: 1, origin: 'yu-gi-oh', name: 'Drago Bianco Occhi Blu', type: 'monster', level: 8, race: 'Drago', attribute: 'LUCE', attack: 3000, defense: 2500, effect: 'Questo drago leggendario è un mostro dal potere devastante, temuto in tutto il mondo del Duel.', vanilla: true, artOnly: true },
    { id: 2, origin: 'yu-gi-oh', name: 'Mago Nero', type: 'monster', level: 7, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 2500, defense: 2100, effect: 'Il mago supremo in termini di attacco e difesa.', artOnly: true },
    { id: 4, origin: 'yu-gi-oh', name: 'Guerriero Celtico', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1400, defense: 1200, vanilla: true, artOnly: true },
    { id: 6, origin: 'yu-gi-oh', name: 'Cavaliere Oscuro', type: 'monster', level: 6, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 2000, defense: 1800, vanilla: true },
    { id: 7, origin: 'yu-gi-oh', name: 'Buco Nero', type: 'spell', subtype: 'normal', effect: 'Distruggi tutti i mostri sul Terreno.', artOnly: true },
    { id: 8, origin: 'yu-gi-oh', name: 'Spada Rivelatrice', type: 'spell', subtype: 'normal', effect: 'I mostri del tuo avversario non possono attaccare.', artOnly: true },
    { id: 10, origin: 'yu-gi-oh', name: 'Cilindro Magico', type: 'trap', subtype: 'normal', effect: 'Quando un mostro dell\'avversario dichiara un attacco: annulla l\'attacco e, se lo fai, infliggi al tuo avversario danno pari all\'ATK di quel mostro.', artOnly: true },
    { id: 11, origin: 'yu-gi-oh', name: 'Braccio Dx Del Proibito', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 200, defense: 300, vanilla: true, artOnly: true },

    // ===== Nuove carte (12-40) =====
    { id: 12, origin: 'yu-gi-oh', name: 'Drago Nero Occhi Rossi', type: 'monster', level: 7, race: 'Drago', attribute: 'OSCURITÀ', attack: 2400, defense: 2000, effect: 'Un drago feroce avvolto da un\'aura oscura.', vanilla: true, artOnly: true },
    { id: 13, origin: 'yu-gi-oh', name: 'Teschio Evocato', type: 'monster', level: 6, race: 'Demone', attribute: 'OSCURITÀ', attack: 2500, defense: 1200, effect: 'Un demone convocato dagli inferi con un fulmine devastante.', vanilla: true, artOnly: true },
    { id: 14, origin: 'yu-gi-oh', name: 'Gaia il Cavaliere Feroce', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2300, defense: 2100, effect: 'Un cavaliere che cavalca un possente destriero da guerra.', vanilla: true, artOnly: true },
    { id: 15, origin: 'yu-gi-oh', name: 'Maledizione del Drago', type: 'monster', level: 5, race: 'Drago', attribute: 'OSCURITÀ', attack: 2000, defense: 1500, vanilla: true, artOnly: true },
    { id: 16, origin: 'yu-gi-oh', name: 'Gearfried il Cavaliere di Ferro', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1800, defense: 1600, effect: 'Se un giocatore qualsiasi equipaggia una Carta Equipaggiamento a questa carta: distruggi quella Carta Equipaggiamento.', artOnly: true },
    { id: 17, origin: 'yu-gi-oh', name: 'Jinzo', type: 'monster', level: 6, race: 'Macchina', attribute: 'OSCURITÀ', attack: 2400, defense: 1500, effect: 'Le carte Trappola sul Terreno perdono il loro effetto.', artOnly: true },
    { id: 20, origin: 'yu-gi-oh', name: 'Buster Blader', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2600, defense: 2300, effect: 'Guadagna 500 ATK per ogni mostro Tipo Drago controllato dal tuo avversario o nel suo Cimitero.', artOnly: true },
    { id: 22, origin: 'yu-gi-oh', name: 'Kuriboh', type: 'monster', level: 1, race: 'Demone', attribute: 'OSCURITÀ', attack: 300, defense: 200, effect: 'Piccolo ma prezioso: può sacrificarsi per annullare un danno da battaglia.', artOnly: true },
    { id: 23, origin: 'yu-gi-oh', name: 'Insetto Divoratore', type: 'monster', level: 2, race: 'Insetto', attribute: 'TERRA', attack: 450, defense: 600, effect: 'FLIP: scegli come bersaglio 1 mostro sul Terreno; distruggilo.', artOnly: true },
    { id: 24, origin: 'yu-gi-oh', name: 'Elfi Gemelli', type: 'monster', level: 4, race: 'Incantatore', attribute: 'TERRA', attack: 1900, defense: 900, vanilla: true, artOnly: true },
    { id: 25, origin: 'yu-gi-oh', name: 'Ryu Kishin', type: 'monster', level: 3, race: 'Demone', attribute: 'OSCURITÀ', attack: 1000, defense: 500, vanilla: true, artOnly: true },
    { id: 27, origin: 'yu-gi-oh', name: 'Cucciolo di Drago', type: 'monster', level: 4, race: 'Drago', attribute: 'VENTO', attack: 1200, defense: 700, vanilla: true, artOnly: true },
    { id: 28, origin: 'yu-gi-oh', name: 'Mago del Tempo', type: 'monster', level: 4, race: 'Incantatore', attribute: 'LUCE', attack: 500, defense: 400, effect: 'Una volta per turno: puoi lanciare una moneta e chiamarla. Se indovini, distruggi tutti i mostri controllati dal tuo avversario. Se sbagli, distruggi quanti più mostri possibile che controlli, e se lo fai, subisci danno pari a metà dell\'ATK totale che quei mostri avevano mentre erano scoperti sul Terreno.', artOnly: true },
    { id: 29, origin: 'yu-gi-oh', name: 'Drago Bianco Definitivo', type: 'monster', level: 10, race: 'Drago', attribute: 'LUCE', attack: 4500, defense: 3800, extraDeck: true, category: 'fusion', effect: 'La fusione di tre Draghi Bianchi Occhi Blu: una forza quasi inarrestabile.', artOnly: true },
    { id: 30, origin: 'yu-gi-oh', name: 'Obelisk il Tormentatore', type: 'monster', level: 10, race: 'Essere Divino', attribute: 'DIVINO', attack: 4000, defense: 4000, effect: 'Uno dei tre Dei Egizi: un colosso di pura forza distruttiva.', vanilla: true, artOnly: true },
    { id: 31, origin: 'yu-gi-oh', name: 'Slifer il Drago del Cielo', type: 'monster', level: 10, race: 'Essere Divino', attribute: 'DIVINO', attack: 3000, defense: 2500, effect: 'Uno dei tre Dei Egizi: le sue statistiche crescono con le carte in mano.', vanilla: true, artOnly: true },
    { id: 33, origin: 'yu-gi-oh', name: 'Il Guardiano del Cancello', type: 'monster', level: 11, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 3750, defense: 3400, extraDeck: true, category: 'fusion', effect: 'Non può essere Evocata Normalmente/Set. Deve prima essere Special Summonata (dalla tua mano) sacrificando "Sanga del Tuono", "Kazejin" e "Suijin".', artOnly: true },
    { id: 34, origin: 'yu-gi-oh', name: 'Ragno Lanciatore', type: 'monster', level: 6, race: 'Macchina', attribute: 'TERRA', attack: 2200, defense: 2500, effect: 'Un mostro meccanico armato di missili a lungo raggio.', vanilla: true, artOnly: true },
    { id: 35, origin: 'yu-gi-oh', name: 'Rinascita del Mostro', type: 'spell', subtype: 'normal', effect: 'Special Summon di un mostro da un Cimitero, tuo o dell\'avversario.', artOnly: true },
    { id: 36, origin: 'yu-gi-oh', name: 'Vaso dell\'Avidità', type: 'spell', subtype: 'normal', effect: 'Pesca 2 carte.', artOnly: true },
    { id: 37, origin: 'yu-gi-oh', name: 'Folgore Fulminante', type: 'spell', subtype: 'normal', effect: 'Distruggi tutte le carte sul Terreno del tuo avversario.', artOnly: true },
    { id: 38, origin: 'yu-gi-oh', name: 'Fusione', type: 'spell', subtype: 'normal', effect: 'Fondi insieme i Materiali Fusione elencati su un Mostro Fusione.', artOnly: true },
    { id: 40, origin: 'yu-gi-oh', name: 'Buco Trappola', type: 'trap', subtype: 'normal', effect: 'Quando l\'avversario Evoca Normalmente o Special Summon un mostro con più di 1000 ATK: distruggilo.', artOnly: true },

    // ===== Prima Serie (Duelist Kingdom) — 41-58 =====
    // I 5 pezzi di Exodia il Proibito: se li hai tutti e 5 in mano, vinci
    // subito il duello — vedi checkExodiaWin() in js/game-flow.js. "Braccio
    // Dx del Proibito" (id 11) è il quinto pezzo, già presente da prima.
    { id: 41, origin: 'yu-gi-oh', name: 'Testa Proibita', type: 'monster', level: 3, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1000, defense: 1000, effect: 'Se hai in mano tutti e 5 i pezzi di Exodia il Proibito, vinci automaticamente il duello.', artOnly: true, vanilla: true },
    { id: 42, origin: 'yu-gi-oh', name: 'Braccio Sx del Proibito', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 200, defense: 300, effect: 'Se hai in mano tutti e 5 i pezzi di Exodia il Proibito, vinci automaticamente il duello.', vanilla: true, artOnly: true },
    { id: 43, origin: 'yu-gi-oh', name: 'Gamba Dx del Proibito', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 200, defense: 300, effect: 'Se hai in mano tutti e 5 i pezzi di Exodia il Proibito, vinci automaticamente il duello.', vanilla: true, artOnly: true },
    { id: 44, origin: 'yu-gi-oh', name: 'Gamba Sx del Proibito', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 200, defense: 300, effect: 'Se hai in mano tutti e 5 i pezzi di Exodia il Proibito, vinci automaticamente il duello.', vanilla: true, artOnly: true },

    { id: 47, origin: 'yu-gi-oh', name: 'Cavaliere Missile', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1500, defense: 1300, effect: 'Una volta per turno, puoi farlo tornare in mano a fine turno: se lo fai, in quel turno può attaccare direttamente i Life Points dell\'avversario.', artOnly: true },
    { id: 50, origin: 'yu-gi-oh', name: 'Larva Mostruosa', type: 'monster', level: 3, race: 'Insetto', attribute: 'TERRA', attack: 500, defense: 400, effect: 'Rimanendo sul Terreno può evolversi in Bozzolo dell\'Evoluzione.', vanilla: true },
    { id: 52, origin: 'yu-gi-oh', name: 'Grande Falena', type: 'monster', level: 8, race: 'Insetto', attribute: 'TERRA', attack: 2600, defense: 2500, effect: 'Non può essere Evocata Normalmente né Set. Questa carta può essere Special Summonata solo sacrificando "Falena Piccola" durante il tuo 4° turno dopo che "Falena Piccola" è stata equipaggiata con "Bozzolo dell\'Evoluzione".', artOnly: true },
    { id: 54, origin: 'yu-gi-oh', name: 'Muro d\'Illusione', type: 'monster', level: 4, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1000, defense: 1850, effect: 'Quando viene attaccato, prima del calcolo dei danni puoi rimandare il mostro attaccante in mano al suo proprietario.', artOnly: true },

    // Rituale: Guerriero Nero Supremo si evoca sacrificando mostri per un
    // Livello totale pari o superiore al suo grazie al suo rito — vedi la
    // registrazione dell'effetto in js/card-effects.js (semplificata:
    // basta avere entrambe le carte, come per le altre evocazioni
    // speciali di questo gioco).
    { id: 55, origin: 'yu-gi-oh', name: 'Guerriero Nero Supremo', type: 'monster', level: 8, race: 'Guerriero', attribute: 'TERRA', attack: 3000, defense: 2500, category: 'ritual', effect: 'Evocabile solo tramite Rito del Guerriero Nero, sacrificando mostri per un Livello totale di almeno 8.', artOnly: true },
    { id: 56, origin: 'yu-gi-oh', name: 'Rito del Guerriero Nero', type: 'spell', subtype: 'ritual', effect: 'Sacrifica dal Terreno mostri per un Livello totale di almeno 8 per Special Summon Guerriero Nero Supremo dalla mano.', artOnly: true },

    // Fusione: come per gli Extra Deck già presenti (Drago Bianco
    // Definitivo, Il Guardiano del Cancello), qui contano come carte
    // ottenibili in mazzo/Cimitero — non c'è ancora una vera Evocazione
    // Fusione con selezione dei materiali.
    { id: 57, origin: 'yu-gi-oh', name: 'Gaia il Drago Campione', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2600, defense: 2100, extraDeck: true, category: 'fusion', effect: 'Fusione di Gaia il Cavaliere Feroce e Maledizione del Drago.', artOnly: true },
    { id: 58, origin: 'yu-gi-oh', name: 'Spadaccino di Fuoco', type: 'monster', level: 7, race: 'Guerriero', attribute: 'FUOCO', attack: 1800, defense: 1600, extraDeck: true, category: 'fusion', effect: 'Fusione del Manipolatore di Fiamme e dello Spadaccino Mascherato.', artOnly: true },

    // Importate da yugioh.com (pagina 22 della lista alfabetica). Escluse da
    // quella pagina: Sonic Maid (Synchro, meccanica non supportata da questo
    // motore — vedi "NIENTE Pendulum/XYZ/Link/Synchro" in card-effects.js),
    // Summoned Skull e Swords of Revealing Light (già presenti come Teschio
    // Evocato id13 e Spada Rivelatrice id8), e Spell Sanctuary/Star
    // Blaster/Sword of Soul (mai stampate come vere carte TCG/OCG: pagine
    // "solo anime" di yugioh.com, una delle quali — Star Blaster — non ha
    // nemmeno un testo effetto ricostruito in modo affidabile).
    { id: 59, origin: 'yu-gi-oh', name: 'Carica dell\'Anima', type: 'spell', subtype: 'normal', effect: 'Special Summon di un mostro dal tuo Cimitero; poi perdi 1000 Life Points.', artOnly: true },
    { id: 69, origin: 'yu-gi-oh', name: 'Stop Difesa', type: 'spell', subtype: 'normal', effect: 'Cambia in Posizione di Attacco un mostro in Posizione di Difesa controllato dal tuo avversario.', artOnly: true },
    { id: 71, origin: 'yu-gi-oh', name: 'Suijin', type: 'monster', level: 7, race: 'Acquatico', attribute: 'ACQUA', attack: 2500, defense: 2400, effect: 'Durante il calcolo dei danni, se questa carta viene attaccata, puoi rendere pari a 0 l\'ATK del mostro attaccante.', artOnly: true },
    { id: 73, origin: 'yu-gi-oh', name: 'Super Roboyarou', type: 'monster', level: 6, race: 'Macchina', attribute: 'TERRA', attack: 1200, defense: 500, extraDeck: true, category: 'fusion', effect: 'Fusione di Roboyarou e Robolady. Durante il Damage Step guadagna 1000 ATK in battaglia.', artOnly: true },
    { id: 74, origin: 'yu-gi-oh', name: 'Guardiano della Palude', type: 'monster', level: 5, race: 'Guerriero', attribute: 'TERRA', attack: 1800, defense: 1500, effect: 'Guadagna 500 ATK per ogni Guardiano della Palude di Lava che controlli.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 1/26) — solo identità TCG reale,
    // le varianti/carte esistenti SOLO nell'anime di quella pagina sono
    // state scartate (es. "Active Guard", "Advanced Shield", "Aeris",
    // "Aero Nail", "Aetonyx Flame", "Aid to the Doomed", "Air Fortress
    // Ziggurat", "Altar of Mist", "Altar of Restoration", "Ambush Shield").
    // Alcune hanno un effetto reale troppo complesso per i meccanismi già
    // presenti nel motore (bersagli multipli, guardare la mano avversaria,
    // buff ATK/DEF continuo — gameState.atkDefBonus esiste già ma nessun
    // punto del motore lo legge ancora): quelle restano solo testo/dati,
    // senza una CardEffects.register corrispondente — vedi il commento su
    // ciascuna qui sotto.
    { id: 77, origin: 'yu-gi-oh', name: 'Coccinella della Rovina a 4 Stelle', type: 'monster', level: 3, race: 'Insetto', attribute: 'VENTO', attack: 800, defense: 1200, effect: 'FLIP: distruggi tutti i mostri scoperti di Livello 4 sul campo del tuo avversario.', artOnly: true },
    // Effetto ORA REGISTRATO in js/card-effects.js (id 78), da quando
    // "Drago Berserk" è stata importata come id 110 (pagina 3) — vedi lì
    // per la semplificazione (dalla mano soltanto, non anche dal Deck).
    { id: 78, origin: 'yu-gi-oh', name: 'Patto col Sovrano Oscuro', type: 'spell', subtype: 'quick-play', effect: 'Se un mostro con 8 o più Stelle Livello che controlli è stato mandato al Cimitero in questo turno: Special Summon 1 Drago Berserk dalla tua mano o dal tuo Deck.', artOnly: true },
    // Effetto reale (buff continuo ATK/DEF): non applicato in campo, vedi
    // nota in testa a questo blocco su gameState.atkDefBonus.
    { id: 79, origin: 'yu-gi-oh', name: 'Un Oceano Leggendario', type: 'spell', subtype: 'field', effect: 'Ogni mostro ACQUA sul campo è considerato di Livello inferiore di 1 e guadagna 200 ATK/DEF.', artOnly: true },
    { id: 80, origin: 'yu-gi-oh', name: 'Un Battito d\'Ali del Drago Gigante', type: 'spell', subtype: 'normal', effect: 'Riporta in mano 1 mostro Tipo Drago di Livello 5+ che controlli; se lo fai, distruggi tutte le Magie/Trappole sul Terreno.', artOnly: true },
    // Effetto reale: guadagna Life Points ogni volta che UNA QUALSIASI
    // Magia si risolve (tua o dell'avversario) — il motore non ha ancora
    // un aggancio generico "dopo la risoluzione di ogni Magia".
    { id: 81, origin: 'yu-gi-oh', name: 'Assorbimento di Magia', type: 'spell', subtype: 'continuous', effect: 'Ogni volta che una Magia viene attivata, guadagni 500 Life Points subito dopo la sua risoluzione.', artOnly: true },
    // Effetto reale (danno perforante + pesca alla risoluzione del danno):
    // non applicato, vedi nota in testa a questo blocco.
    { id: 82, origin: 'yu-gi-oh', name: 'Parshath il Cavaliere Alato', type: 'monster', level: 5, race: 'Fata', attribute: 'LUCE', attack: 1900, defense: 1400, effect: 'Se attacca un mostro in Posizione di Difesa, infligge danno perforante. Quando infligge danno da battaglia al tuo avversario: pesca 1 carta.', artOnly: true },
    { id: 83, origin: 'yu-gi-oh', name: 'Spada di Alligatore', type: 'monster', level: 4, race: 'Bestia', attribute: 'TERRA', attack: 1500, defense: 1200, effect: 'Un lucertolone estremamente abile nel maneggiare la spada, capace di colpire alla velocità del suono.', artOnly: true, vanilla: true },
    // Effetto reale (attacco diretto sotto condizione): non applicato, la
    // dichiarazione di un attacco diretto qui dipende dal campo avversario
    // vuoto, non da un controllo per-carta come questo.
    { id: 84, origin: 'yu-gi-oh', name: 'Drago Spada di Alligatore', type: 'monster', level: 5, race: 'Drago', attribute: 'VENTO', attack: 1700, defense: 1500, extraDeck: true, category: 'fusion', effect: 'Fusione di Cucciolo di Drago e Spada di Alligatore. Può attaccare direttamente se gli unici mostri scoperti controllati dal tuo avversario sono TERRA, ACQUA o FUOCO.', artOnly: true },
    { id: 85, origin: 'yu-gi-oh', name: 'Alpha il Guerriero Magnetico', type: 'monster', level: 4, race: 'Roccia', attribute: 'TERRA', attack: 1400, defense: 1700, effect: 'Uno dei tre Guerrieri Magnetici: insieme a Beta e Gamma, può fondersi in Valkyrion il Magneto Guerriero.', artOnly: true, vanilla: true },
    // Effetto reale: "guarda la mano dell'avversario e prendine un mostro"
    // — non c'è ancora un'interfaccia per mostrare al giocatore la mano
    // (nascosta) dell'avversario e sceglierne una carta.
    { id: 86, origin: 'yu-gi-oh', name: 'Amazzone Maestra delle Catene', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1500, defense: 1300, effect: 'Quando questa carta viene distrutta in battaglia e mandata al Cimitero: puoi pagare 1000 Life Points; se lo fai, guarda la mano del tuo avversario e aggiungi alla tua mano 1 mostro che vi si trova.', artOnly: true },
    // Effetto reale (nessun danno da battaglia per le sue battaglie): non
    // applicato, richiederebbe un controllo per-carta dentro
    // resolveBattleDamage() in js/actions.js, non ancora presente.
    { id: 87, origin: 'yu-gi-oh', name: 'Amazzone Combattente', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1500, defense: 1300, effect: 'Non subisci danno da battaglia dagli attacchi che coinvolgono questa carta.', artOnly: true },
    // Versione SEMPLIFICATA: gira scoperti in Posizione di Attacco i mostri
    // dell'avversario, ma senza il -500 ATK dell'effetto reale (stesso
    // limite del buff continuo spiegato in testa al blocco).
    { id: 88, origin: 'yu-gi-oh', name: 'Arciere delle Amazzoni', type: 'trap', subtype: 'normal', effect: 'Se controlli un mostro "Amazzone" quando il tuo avversario dichiara un attacco: gira scoperti in Posizione di Attacco tutti i mostri del tuo avversario (e ne riduce l\'ATK di 500 finché restano scoperti).', artOnly: true },
    // Effetto reale: richiede 2 bersagli scelti dal giocatore (1 proprio +
    // 1 dell'avversario) — non c'è ancora un'interfaccia di selezione
    // doppia, solo quella a singolo bersaglio (es. Rinascita del Mostro).
    { id: 89, origin: 'yu-gi-oh', name: 'Amazzone Incantatrice', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro "Amazzone" che controlli e 1 mostro scoperto controllato dal tuo avversario; scambia l\'ATK originale tra i due bersagli fino alla fine di questo turno.', artOnly: true },
    // Effetto reale (danno da battaglia rediretto all'avversario): non
    // applicato, stesso limite di Amazzone Combattente qui sopra.
    { id: 90, origin: 'yu-gi-oh', name: 'Amazzone Spadaccina', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1500, defense: 1600, effect: 'Il danno da battaglia che subiresti dagli attacchi che coinvolgono questa carta viene invece subito dal tuo avversario.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 2/26) — stesso criterio della
    // pagina 1: solo identità TCG reale. Scartate perché SOLO anime:
    // "Arduous Decision", "Armored Centipede", "Armored Gravitation",
    // "Attrition", "Aura Armor", "Backup Gardna". "Baby Dragon" non è stata
    // reimportata: è già id 27 (Cucciolo di Drago).
    { id: 91, origin: 'yu-gi-oh', name: 'Bestia Anfibia', type: 'monster', level: 6, race: 'Pesce', attribute: 'ACQUA', attack: 2400, defense: 2000, effect: 'Una creatura che vive sia in acqua che sulla terraferma, pronta a colpire da entrambi gli ambienti.', artOnly: true, vanilla: true },
    // Effetto reale: equipaggiabile SOLO a "Jinzo" (id 17) — richiede di
    // scegliere un mostro bersaglio all'attivazione di una Magia
    // Equipaggiamento, interfaccia non ancora presente in questo motore
    // (esiste solo la selezione di un bersaglio nemico, non di un proprio
    // mostro specifico).
    { id: 92, origin: 'yu-gi-oh', name: 'Amplificatore', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a "Jinzo". Il mostro equipaggiato nega le Trappole solo dell\'avversario, non più anche le proprie; se questa carta lascia il campo, distruggi il mostro equipaggiato.', artOnly: true },
    { id: 93, origin: 'yu-gi-oh', name: 'Antico Elfo', type: 'monster', level: 4, race: 'Incantatore', attribute: 'LUCE', attack: 1450, defense: 1200, effect: 'Un elfo che pratica la magia da innumerevoli generazioni.', artOnly: true, vanilla: true },
    // Effetto reale: Special Summon di "La Jinn il Genio Mistico della
    // Lampada" (carta non presente in questo database) — nessun
    // CardEffects.register finché quella carta non esiste davvero qui.
    { id: 94, origin: 'yu-gi-oh', name: 'Lampada Antica', type: 'monster', level: 3, race: 'Incantatore', attribute: 'VENTO', attack: 900, defense: 1400, effect: 'Durante la tua Main Phase, se questa carta è scoperta sul campo, puoi Special Summon "La Jinn il Genio Mistico della Lampada" dalla tua mano.', artOnly: true },
    // Effetto reale: dall'inizio della Battle Phase, per il resto del
    // turno nessuno può attivare Magie/Trappole — non applicato, il motore
    // non ha un modo per negare Magie/Trappole "solo fino a fine turno"
    // (gameState.spellsNegatedFor/trapsNegatedFor si ricalcolano ad ogni
    // render in base a cosa è IN CAMPO, non hanno un timer).
    { id: 95, origin: 'yu-gi-oh', name: 'Frecce Anti-Magia', type: 'spell', subtype: 'quick-play', effect: 'All\'inizio della Battle Phase: per il resto di questo turno, non si possono attivare Magie/Trappole (né in risposta a questa carta).', artOnly: true },
    { id: 96, origin: 'yu-gi-oh', name: 'Aqua Madoor', type: 'monster', level: 4, race: 'Incantatore', attribute: 'ACQUA', attack: 1200, defense: 2000, effect: 'Un guardiano d\'acqua la cui difesa è quasi impenetrabile.', artOnly: true, vanilla: true },
    { id: 97, origin: 'yu-gi-oh', name: 'Armaill', type: 'monster', level: 3, race: 'Guerriero', attribute: 'TERRA', attack: 700, defense: 1300, effect: 'Uno strano guerriero che maneggia tre lame letali con entrambe le mani e la coda.', artOnly: true, vanilla: true },
    { id: 98, origin: 'yu-gi-oh', name: 'Lucertola Corazzata', type: 'monster', level: 4, race: 'Rettile', attribute: 'TERRA', attack: 1500, defense: 1200, effect: 'Una lucertola dalla pelle durissima e dal morso feroce.', artOnly: true, vanilla: true },
    { id: 99, origin: 'yu-gi-oh', name: 'Zombie Corazzato', type: 'monster', level: 3, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1500, defense: 0, effect: 'Questo guerriero brandisce una lama letale con forza devastante e cieca.', artOnly: true, vanilla: true },
    // Versione SEMPLIFICATA: solo l'opzione "distruggi il mostro
    // attaccante" — l'altra opzione dell'effetto reale (reindirizzare
    // l'attacco a un bersaglio diverso) richiederebbe modificare la
    // risoluzione dell'attacco in resolveAttack()/actions.js, non solo
    // aggiungere un CardEffects.register.
    { id: 100, origin: 'yu-gi-oh', name: 'Armatura Guida d\'Attacco', type: 'trap', subtype: 'normal', effect: 'Quando un mostro dichiara un attacco, puoi scegliere: distruggi il mostro attaccante, oppure reindirizza l\'attacco a un altro mostro in campo. Attivabile una sola volta per turno.', artOnly: true },
    { id: 101, origin: 'yu-gi-oh', name: 'Assalitore con l\'Ascia', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1700, defense: 1150, effect: 'Un guerriero la cui possente ascia può spaccare in due qualunque scudo.', artOnly: true, vanilla: true },
    { id: 102, origin: 'yu-gi-oh', name: 'Drago Nero del Teschio', type: 'monster', level: 9, race: 'Drago', attribute: 'OSCURITÀ', attack: 3200, defense: 2500, extraDeck: true, category: 'fusion', effect: 'Fusione di Teschio Evocato e Drago Nero Occhi Rossi.', artOnly: true },
    { id: 103, origin: 'yu-gi-oh', name: 'Barox', type: 'monster', level: 5, race: 'Demone', attribute: 'OSCURITÀ', attack: 1380, defense: 1530, extraDeck: true, category: 'fusion', effect: 'Fusione di Panda Furioso e Ryu Kishin.', artOnly: true },
    { id: 104, origin: 'yu-gi-oh', name: 'Drago Barile', type: 'monster', level: 7, race: 'Macchina', attribute: 'OSCURITÀ', attack: 2600, defense: 2200, effect: 'Una volta per turno: scegli come bersaglio 1 mostro controllato dal tuo avversario; lancia una moneta 3 volte e distruggilo se almeno 2 risultati sono Testa.', artOnly: true },
    { id: 105, origin: 'yu-gi-oh', name: 'Insetto di Base', type: 'monster', level: 2, race: 'Insetto', attribute: 'TERRA', attack: 500, defense: 700, effect: 'Di solito viaggia in sciami: il suo ambiente ideale è la foresta.', artOnly: true, vanilla: true },
    { id: 106, origin: 'yu-gi-oh', name: 'Bue da Battaglia', type: 'monster', level: 4, race: 'Bestia-Guerriero', attribute: 'TERRA', attack: 1700, defense: 1000, effect: 'Un guerriero taurino la cui carica è devastante quanto la sua ascia.', artOnly: true, vanilla: true },

    // ===== Importate da yugioh.com (pagina 3/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime: "Beckon to the Dark",
    // "Black Hole Shield". Non reimportate perché già presenti: "Blue-Eyes
    // White Dragon" (id 1), "Black Luster Ritual" (id 56, Rito del
    // Guerriero Nero) e "Black Luster Soldier" (id 55, Guerriero Nero
    // Supremo) — già nel database dalla prima serie di questo progetto.
    { id: 107, origin: 'yu-gi-oh', name: 'Toro da Battaglia', type: 'monster', level: 5, race: 'Bestia-Guerriero', attribute: 'TERRA', attack: 1800, defense: 1300, effect: 'Un toro che vive nei boschi, carica i mostri nemici con un paio di corna letali.', artOnly: true, vanilla: true },
    { id: 108, origin: 'yu-gi-oh', name: 'Guerriero da Battaglia', type: 'monster', level: 3, race: 'Guerriero', attribute: 'TERRA', attack: 700, defense: 1000, effect: 'Un guerriero fiero e muscoloso che combatte a mani nude, senza bisogno di armi.', artOnly: true, vanilla: true },
    { id: 109, origin: 'yu-gi-oh', name: 'Castoro Guerriero', type: 'monster', level: 4, race: 'Bestia-Guerriero', attribute: 'TERRA', attack: 1200, defense: 1500, effect: 'Un castoro addestrato al combattimento, abile nel costruire ripari difensivi.', artOnly: true, vanilla: true },
    // Effetto reale: 3500 ATK ma perde 500 ATK per ogni tua End Phase; può
    // attaccare tutti i mostri dell'avversario una volta ciascuno. La
    // clausola "special summonabile solo tramite Patto col Sovrano Oscuro"
    // (id 78) ORA È SODDISFATTA — vedi lì, l'effetto di id 78 è stato
    // aggiornato per usare davvero questa carta.
    { id: 110, origin: 'yu-gi-oh', name: 'Drago Berserk', type: 'monster', level: 8, race: 'Drago', attribute: 'OSCURITÀ', attack: 3500, defense: 0, effect: 'Deve essere Special Summonato tramite "Patto col Sovrano Oscuro" e non può esserlo in altro modo. Può attaccare tutti i mostri dell\'avversario, una volta ciascuno. Ad ogni tua End Phase, perde 500 ATK.', artOnly: true },
    // Effetto reale: ciclo di scarto-mano + pesca-e-scarta ripetuto fino a
    // 8 volte — troppo complesso/aleatorio per i meccanismi già presenti,
    // resta solo testo/dati.
    { id: 111, origin: 'yu-gi-oh', name: 'Anima del Berserker', type: 'spell', subtype: 'quick-play', effect: 'Quando un tuo mostro infligge 1500 o meno danni con un attacco diretto: scarta tutta la tua mano (min. 1); scopri la prima carta del tuo Deck e, se è un mostro, mandala al Cimitero e infliggi 500 danni, poi ripeti fino a 7 volte o finché non scopri una carta non-mostro.', artOnly: true },
    { id: 112, origin: 'yu-gi-oh', name: 'Beta il Guerriero Magnetico', type: 'monster', level: 4, race: 'Roccia', attribute: 'TERRA', attack: 1700, defense: 1600, effect: 'Alpha, Beta e Gamma si fondono insieme per formare un potente mostro.', artOnly: true, vanilla: true },
    { id: 113, origin: 'yu-gi-oh', name: 'Bickuribox', type: 'monster', level: 7, race: 'Demone', attribute: 'OSCURITÀ', attack: 2300, defense: 2000, extraDeck: true, category: 'fusion', effect: 'Fusione di Pagliaccio Ruvido e Pagliaccio dei Sogni.', artOnly: true },
    { id: 114, origin: 'yu-gi-oh', name: 'Insetto Gigante', type: 'monster', level: 4, race: 'Insetto', attribute: 'TERRA', attack: 1200, defense: 1500, effect: 'Una formica gigante che vive nella giungla, potente sia in attacco che in difesa.', artOnly: true, vanilla: true },
    // Effetto reale: se Set da sola e presa di mira da una Magia, si gira
    // scoperta in Difesa e nega quella Magia — richiederebbe un aggancio
    // sul BERSAGLIO di una Magia avversaria, non ancora presente nel
    // motore (canActivate/activate riguardano solo chi attiva la carta).
    { id: 115, origin: 'yu-gi-oh', name: 'Gran Scudo Gardna', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 100, defense: 2600, effect: 'Se questa carta, l\'unica coperta sul Terreno, viene presa di mira da una Magia: gira scoperta in Posizione di Difesa e nega quella Magia. Se attaccata, a fine Damage Step passa in Posizione di Attacco.', artOnly: true },
    // Effetto reale: Rito Magia per "Relinquished" (carta non presente in
    // questo database) — nessun CardEffects.register finché quella carta
    // non esiste davvero qui.
    { id: 116, origin: 'yu-gi-oh', name: 'Rito dell\'Illusione Nera', type: 'spell', subtype: 'ritual', effect: 'Usata per Ritual Summon "Relinquished": sacrifica anche un mostro di Livello 1 o superiore dalla mano o dal Terreno.', artOnly: true },
    // Effetto reale (+500 ATK continuo + danno quando lascia il campo): non
    // applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra in questo file (gameState.atkDefBonus non ancora letto da
    // nessuna parte del motore).
    { id: 117, origin: 'yu-gi-oh', name: 'Ciondolo Nero', type: 'spell', subtype: 'equip', effect: 'Il mostro equipaggiato guadagna 500 ATK. Quando questa carta viene mandata dal Terreno al Cimitero: infliggi 500 danni al tuo avversario.', artOnly: true },
    { id: 118, origin: 'yu-gi-oh', name: 'Drago di Fuoco delle Terre Nere', type: 'monster', level: 4, race: 'Drago', attribute: 'OSCURITÀ', attack: 1500, defense: 800, artOnly: true, vanilla: true },
    // Effetto reale (+400 ATK con mano di 1 carta o meno): non applicato,
    // stesso limite del buff ATK/DEF continuo spiegato più sopra.
    { id: 119, origin: 'yu-gi-oh', name: 'Cavaliere della Lama', type: 'monster', level: 4, race: 'Guerriero', attribute: 'LUCE', attack: 1600, defense: 1000, effect: 'Finché hai 1 carta o meno in mano, questa carta guadagna 400 ATK.', artOnly: true },
    // Effetto reale (si equipaggia da sola al mostro attaccante se attacca
    // questa carta coperta, poi lo distrugge al turno successivo): troppo
    // complesso/in più fasi per i meccanismi già presenti, resta solo
    // testo/dati.
    { id: 120, origin: 'yu-gi-oh', name: 'Sfera Esplosiva', type: 'monster', level: 4, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1400, defense: 1400, effect: 'Se questa carta coperta in Posizione di Difesa viene attaccata: si equipaggia al mostro attaccante. Alla successiva Standby Phase dell\'avversario, distruggi quel mostro e infliggi danno pari al suo ATK.', artOnly: true },
    { id: 121, origin: 'yu-gi-oh', name: 'Blocca Attacco', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro scoperto in Posizione di Attacco controllato dal tuo avversario; cambialo in Posizione di Difesa scoperta.', artOnly: true },
    // Effetto reale (scambio ATK con un altro Guerriero + special summon
    // dal Cimitero al banish): non applicato, richiederebbe un'interfaccia
    // di selezione bersaglio + banish dal proprio Cimitero non ancora
    // presenti per questo tipo di effetto.
    { id: 122, origin: 'yu-gi-oh', name: 'Spadaccino di Fiamma Blu', type: 'monster', level: 4, race: 'Guerriero', attribute: 'FUOCO', attack: 1800, defense: 1600, effect: 'Una volta per turno, durante la Battle Phase di uno dei due giocatori: scegli come bersaglio 1 altro mostro Guerriero che controlli; questa carta perde 600 ATK e quel mostro guadagna 600 ATK.', artOnly: true },
    // Effetto reale: richiede "Toon World" (carta non presente in questo
    // database) in campo per essere Special Summonata — nessun
    // CardEffects.register finché quella carta non esiste davvero qui.
    { id: 123, origin: 'yu-gi-oh', name: 'Drago Toon Occhi Blu', type: 'monster', level: 8, race: 'Drago', attribute: 'LUCE', attack: 3000, defense: 2500, effect: 'Special Summonabile dalla mano sacrificando 2 mostri, solo se controlli "Mondo Toon". Non può attaccare il turno in cui viene Special Summonata; paga 500 Life Points per dichiarare un attacco.', artOnly: true },
    { id: 124, origin: 'yu-gi-oh', name: 'Drago Occhi Blu Definitivo', type: 'monster', level: 12, race: 'Drago', attribute: 'LUCE', attack: 4500, defense: 3800, extraDeck: true, category: 'fusion', effect: 'Fusione di tre Draghi Bianchi Occhi Blu.', artOnly: true },
    // Effetto reale (evocabile solo tramite Flip Summon + -1000 ATK se
    // l'avversario controlla mostri): non applicato, richiederebbe
    // distinguere un'Evocazione Normale da un Flip Summon, non ancora
    // presente nel motore.
    { id: 125, origin: 'yu-gi-oh', name: 'Cinghiale Soldato', type: 'monster', level: 4, race: 'Bestia-Guerriero', attribute: 'TERRA', attack: 2000, defense: 500, effect: 'Evocabile solo tramite Flip Summon (viene distrutto se Evocato Normalmente). Se il tuo avversario controlla almeno un mostro, l\'ATK di questa carta è ridotto di 1000 punti.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 4/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime: "Brigadier of
    // Landstar", "Bronze Knights", "Burning Knuckle", "Burning Soul
    // Sword", "Buster Knuckle", "Buster Pyle", "Card Exchange".
    { id: 126, origin: 'yu-gi-oh', name: 'Pinguino Fulmine', type: 'monster', level: 3, race: 'Tuono', attribute: 'ACQUA', attack: 1100, defense: 800, effect: 'Ogni braccio forma una frusta elettrica, capace di paralizzare i nemici con scariche fulminee.', artOnly: true, vanilla: true },
    // Effetto reale (+300 ATK/DEF continuo al Incantatore equipaggiato):
    // non applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra in questo file (gameState.atkDefBonus non ancora letto da
    // nessuna parte del motore).
    { id: 127, origin: 'yu-gi-oh', name: 'Libro delle Arti Segrete', type: 'spell', subtype: 'equip', effect: 'Un mostro Incantatore equipaggiato con questa carta guadagna 300 ATK e 300 DEF.', artOnly: true },
    { id: 128, origin: 'yu-gi-oh', name: 'Buco Trappola senza Fondo', type: 'trap', subtype: 'normal', effect: 'Quando l\'avversario Evoca un mostro con 1500 o più ATK: distruggilo e bandiscilo.', artOnly: true },
    // Effetto reale: 600 danni all'avversario ad ogni tua Standby Phase —
    // non applicato, il motore non ha un aggancio per "effetto continuo di
    // un mostro che si attiva da solo ad ogni Standby Phase" (solo
    // static(), ricalcolato ad ogni render, non un'azione ripetuta nel
    // tempo).
    { id: 129, origin: 'yu-gi-oh', name: 'Bowganian', type: 'monster', level: 3, race: 'Macchina', attribute: 'TERRA', attack: 1300, defense: 1000, effect: 'Una volta per turno, durante la tua Standby Phase: infliggi 600 danni al tuo avversario.', artOnly: true },
    // Effetto reale: prendere il controllo di un mostro avversario è un
    // meccanismo del tutto nuovo (spostare temporaneamente una carta da un
    // campo all'altro) — non presente nel motore, resta solo testo/dati.
    { id: 130, origin: 'yu-gi-oh', name: 'Controllo Mentale', type: 'spell', subtype: 'normal', effect: 'Paga 800 Life Points, poi scegli come bersaglio 1 mostro scoperto controllato dal tuo avversario Evocabile Normalmente/Set; prendine il controllo fino alla End Phase.', artOnly: true },
    // Effetto reale (Segnalino Magia: +300 ATK all'Evocazione, si può
    // rimuovere per distruggere una Magia/Trappola): non applicato, stesso
    // limite del buff ATK/DEF continuo spiegato più sopra.
    { id: 131, origin: 'yu-gi-oh', name: 'Distruttore, il Guerriero Magico', type: 'monster', level: 4, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1600, defense: 1000, effect: 'Se questa carta viene Evocata Normalmente: piazzaci sopra un Segnalino Magia. Guadagna 300 ATK per ogni Segnalino Magia su di essa; puoi rimuoverne uno per distruggere 1 Magia/Trappola sul Terreno.', artOnly: true },
    { id: 132, origin: 'yu-gi-oh', name: 'Soffio di Luce', type: 'spell', subtype: 'normal', effect: 'Distruggi tutti i mostri Tipo Roccia scoperti sul Terreno.', artOnly: true },
    // Effetto reale (distrugge le Magie Campo all'attivazione + 500 danni
    // ad ogni Standby Phase di entrambi i giocatori): non applicato,
    // stesso limite di Bowganian qui sopra (nessun aggancio per un
    // effetto continuo che si ripete ad ogni Standby Phase).
    { id: 133, origin: 'yu-gi-oh', name: 'Terra in Fiamme', type: 'spell', subtype: 'continuous', effect: 'Quando questa carta viene attivata: se ci sono Magie Campo sul Terreno, distruggile. Durante la Standby Phase di ciascun giocatore: chi è di turno subisce 500 danni.', artOnly: true },
    // Semplificazione: il Tributo è auto-selezionato (il mostro Tipo Drago
    // con l'ATK più alto che controlli), stesso spirito di altre carte con
    // selezione automatica già presenti (es. Faglia, id 243).
    { id: 134, origin: 'yu-gi-oh', name: 'Soffio Esplosivo', type: 'trap', subtype: 'normal', effect: 'Sacrifica 1 mostro Tipo Drago; distruggi tutti i mostri scoperti sul Terreno la cui DEF è minore o uguale all\'ATK che aveva il mostro sacrificato.', artOnly: true },
    // Effetto reale (+300 ATK/DEF continuo + torna in mano se distrutta
    // mentre equipaggiata): non applicato, stesso limite del buff
    // ATK/DEF continuo spiegato più sopra.
    { id: 135, origin: 'yu-gi-oh', name: 'Pugnale Farfalla - Elma', type: 'spell', subtype: 'equip', effect: 'Il mostro equipaggiato guadagna 300 ATK. Quando questa carta viene mandata al Cimitero mentre è equipaggiata: puoi farla tornare in mano.', artOnly: true },
    // Effetto reale: rianima 1 mostro dal Cimitero MA lo lega a questa
    // carta (se una delle due viene distrutta, distrugge anche l'altra) —
    // il legame bidirezionale fra due carte diverse è un meccanismo nuovo,
    // non presente nel motore; implementarlo senza quel legame (come una
    // semplice Rinascita del Mostro travestita da Trappola) tradirebbe
    // troppo l'identità della carta, quindi resta solo testo/dati.
    { id: 136, origin: 'yu-gi-oh', name: 'Richiamo degli Infestati', type: 'trap', subtype: 'continuous', effect: 'Attivala scegliendo come bersaglio 1 mostro nel tuo Cimitero; Special Summonalo in Posizione di Attacco. Quando questa carta lascia il Terreno: distruggi quel mostro. Quando quel mostro viene distrutto: distruggi questa carta.', artOnly: true },
    // Effetto reale (sacrifica 1 mostro: infliggi 500 danni): non
    // applicato, richiederebbe un'interfaccia "attiva l'effetto di un tuo
    // mostro in campo" non ancora presente (solo Magie/Trappole hanno un
    // pulsante di attivazione manuale).
    { id: 137, origin: 'yu-gi-oh', name: 'Soldato Cannone', type: 'monster', level: 4, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1400, defense: 1300, effect: 'Puoi sacrificare 1 mostro; infliggi 500 danni al tuo avversario.', artOnly: true },
    { id: 138, origin: 'yu-gi-oh', name: 'Distruzione di Carte', type: 'spell', subtype: 'normal', effect: 'Entrambi i giocatori scartano quante più carte possono dalla mano, poi ciascuno pesca lo stesso numero di carte che ha scartato.', artOnly: true },
    { id: 139, origin: 'yu-gi-oh', name: 'Guardia di Carte', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1600, defense: 500, effect: 'Se questa carta viene Evocata Normalmente o Special Summonata: piazzaci sopra un Segnalino Guardia. Guadagna 300 ATK per ogni Segnalino Guardia su di essa.', artOnly: true },
    // Effetto reale (pesca fino a 3 in mano + avversario non subisce danni
    // per il resto del turno + scarti tutta la mano a fine turno + niente
    // Special Summon questo turno): non applicato, richiederebbe più
    // flag/agganci nuovi (danno azzerato a tempo, scarto automatico a fine
    // turno, blocco Special Summon) — resta solo testo/dati.
    { id: 140, origin: 'yu-gi-oh', name: 'Carta della Rovina', type: 'spell', subtype: 'normal', effect: 'Pesca finché non hai 3 carte in mano; per il resto di questo turno il tuo avversario non subisce danni. Durante la End Phase di questo turno, manda tutta la tua mano al Cimitero. Non puoi Special Summonare nel turno in cui attivi questa carta.', artOnly: true },
    // Effetto reale: pesca 1 carta ogni volta che fai una Special Summon
    // dal Cimitero — non applicato, non c'è un aggancio generico "dopo
    // ogni Special Summon dal Cimitero" nel motore.
    { id: 141, origin: 'yu-gi-oh', name: 'Carta del Ritorno Sicuro', type: 'spell', subtype: 'continuous', effect: 'Quando un mostro viene Special Summonato dal tuo Cimitero, puoi pescare 1 carta.', artOnly: true },
    // Effetto reale (FLIP: +200 ATK/DEF continuo a tutti i mostri Zombie):
    // non applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra.
    { id: 142, origin: 'yu-gi-oh', name: 'Castello delle Illusioni Oscure', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 920, defense: 1930, effect: 'FLIP: aumenta di 200 punti ATK/DEF di tutti i mostri Tipo Zombie, e continua ad aumentarli di altri 200 punti ad ogni tua Standby Phase, finché resta scoperta in campo (fino al tuo 4° turno dopo l\'attivazione).', artOnly: true },

    // ===== Importate da yugioh.com (pagina 5/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime: "Celebration of
    // Creation", "Cell Division", "Chain of the Underworld", "Chaos
    // Barrier Field", "Charm of Lamentation", "Chasm of Spikes", "Class
    // System". Non reimportata perché già presente: "Celtic Guardian"
    // (id 4, Guerriero Celtico).
    { id: 143, origin: 'yu-gi-oh', name: 'Mura del Castello', type: 'trap', subtype: 'normal', effect: 'Aumenta di 500 punti la DEF di 1 mostro scelto come bersaglio, per il turno in cui questa carta viene attivata.', artOnly: true },
    // Effetto reale (sacrifica 1 mostro: infliggi danno pari a metà del
    // suo ATK): non applicato, stesso limite di Soldato Cannone (id 137) —
    // richiederebbe l'interfaccia "attiva l'effetto di un tuo mostro in
    // campo", non ancora presente.
    { id: 144, origin: 'yu-gi-oh', name: 'Tartaruga Catapulta', type: 'monster', level: 5, race: 'Acquatico', attribute: 'ACQUA', attack: 1000, defense: 2000, effect: 'Una volta per turno: puoi sacrificare 1 mostro; infliggi al tuo avversario danno pari a metà dell\'ATK che aveva il mostro sacrificato.', artOnly: true },
    // Effetto reale (+500 ATK continuo + effetto secondario su "Guardian
    // Eatos", carta non presente in questo database): non applicato,
    // stesso limite del buff ATK/DEF continuo spiegato più sopra.
    { id: 145, origin: 'yu-gi-oh', name: 'Spada Celeste - Eatos', type: 'spell', subtype: 'equip', effect: 'Il mostro equipaggiato guadagna 500 ATK. Quando questa carta viene mandata dal Terreno al Cimitero, puoi scegliere come bersaglio 1 "Guardian Eatos" che controlli: guadagna 500 ATK per ogni mostro bandito.', artOnly: true },
    // Effetto reale: scatta su QUALUNQUE Evocazione (non solo quella
    // dell'avversario) e distrugge le copie della carta anche nel Deck —
    // il motore ha solo un aggancio "quando L'AVVERSARIO evoca" (vedi
    // Buco Trappola, id 40/128), non uno generico per entrambi i
    // giocatori, e non ha un modo per cercare/rimuovere carte dal Deck per
    // nome.
    { id: 146, origin: 'yu-gi-oh', name: 'Catena di Distruzione', type: 'trap', subtype: 'normal', effect: 'Quando viene Evocato un mostro con 2000 o meno ATK: scegli come bersaglio quel mostro; distruggi tutte le carte con lo stesso nome nella mano e nel Deck di chi lo controlla.', artOnly: true },
    // Effetto reale: prendere il controllo di un mostro avversario è un
    // meccanismo del tutto nuovo — non presente nel motore, stesso limite
    // di Controllo Mentale (id 130).
    { id: 147, origin: 'yu-gi-oh', name: 'Cambio di Cuore', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro scoperto controllato dal tuo avversario; prendine il controllo fino alla End Phase.', artOnly: true },
    // Vera identità TCG: "Yellow Luster Shield" — qui "Chaos Shield" è
    // solo il nome col quale la carta appare nell'anime (stesso spirito
    // del commento su Spada Rivelatrice in js/card-effects.js).
    // Effetto reale (+300 DEF continuo a tutti i propri mostri): non
    // applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra.
    { id: 148, origin: 'yu-gi-oh', name: 'Scudo Lustro Giallo', type: 'spell', subtype: 'continuous', effect: 'Finché questa carta è sul Terreno, tutti i mostri che controlli guadagnano 300 DEF.', artOnly: true },
    // Effetto reale (Special Summon dal Cimitero di "Berfomet" o
    // "Gazelle il Re delle Bestie Mitiche" quando distrutta — nessuna
    // delle due presente in questo database): non applicato.
    { id: 149, origin: 'yu-gi-oh', name: 'Chimera la Bestia Mitica Volante', type: 'monster', level: 6, race: 'Bestia', attribute: 'VENTO', attack: 2100, defense: 1800, extraDeck: true, category: 'fusion', effect: 'Fusione di Gazelle il Re delle Bestie Mitiche e Berfomet. Sempre considerata una carta "Bestia Fantasma".', artOnly: true },
    // Effetto reale (scarta 1 Magia: distruggi 1 Magia/Trappola
    // dell'avversario): non applicato, richiederebbe l'interfaccia "attiva
    // l'effetto di un tuo mostro in campo", non ancora presente.
    { id: 150, origin: 'yu-gi-oh', name: 'Chiron il Mago', type: 'monster', level: 4, race: 'Bestia-Guerriero', attribute: 'TERRA', attack: 1800, defense: 1000, effect: 'Una volta per turno: puoi scartare 1 Magia dalla mano, poi scegliere come bersaglio 1 Magia/Trappola controllata dal tuo avversario; distruggila.', artOnly: true },
    // Effetto reale (+500 DEF continuo a tutti i mostri in Posizione di
    // Difesa): non applicato, stesso limite del buff ATK/DEF continuo
    // spiegato più sopra.
    { id: 151, origin: 'yu-gi-oh', name: 'Coro del Santuario', type: 'spell', subtype: 'field', effect: 'Tutti i mostri in Posizione di Difesa sul Terreno guadagnano 500 DEF.', artOnly: true },
    // Effetto reale: scelta casuale dell'avversario fra 3 carte con esiti
    // diversi — troppo aleatorio/complesso per i meccanismi già presenti,
    // resta solo testo/dati.
    { id: 152, origin: 'yu-gi-oh', name: 'Prescelto', type: 'spell', subtype: 'normal', effect: 'Scegli 1 Mostro e 2 carte non-Mostro dalla tua mano. Il tuo avversario ne sceglie 1 a caso: se è un Mostro, Special Summonalo e manda le altre due al Cimitero; altrimenti manda tutte e tre le carte al Cimitero.', artOnly: true },
    // Effetto reale (converte tutti i mostri scoperti in Tipo Macchina +
    // buff/malus ATK/DEF continuo): non applicato, stesso limite del buff
    // ATK/DEF continuo spiegato più sopra (e "cambiare il Tipo di un
    // mostro" è comunque un meccanismo non presente nel motore).
    { id: 153, origin: 'yu-gi-oh', name: 'Notte Meccanica', type: 'spell', subtype: 'continuous', effect: 'Tutti i mostri scoperti sul Terreno diventano Tipo Macchina. I mostri Macchina che controlli guadagnano 500 ATK/DEF; quelli dell\'avversario perdono 500 ATK/DEF.', artOnly: true },
    // Effetto reale: crea un Token che copia le statistiche del mostro
    // avversario Evocato — il motore non ha un meccanismo di Token che
    // copiano un'altra carta, resta solo testo/dati.
    { id: 154, origin: 'yu-gi-oh', name: 'Clonazione', type: 'trap', subtype: 'normal', effect: 'Quando l\'avversario Evoca Normalmente o tramite Flip Summon un mostro con un Livello: scegli come bersaglio quel mostro; Special Summon 1 Token con le stesse statistiche originali. Se il mostro bersaglio viene distrutto, distruggi anche il Token.', artOnly: true },
    { id: 155, origin: 'yu-gi-oh', name: 'Zombie Pagliaccio', type: 'monster', level: 2, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1350, defense: 0, effect: 'Un pagliaccio resuscitato dai poteri dell\'oscurità: la sua danza mortale ha mandato molti mostri alla tomba.', artOnly: true, vanilla: true },
    // Effetto reale: torna in cima al Deck quando va al Cimitero — non
    // applicato, il motore non ha un aggancio generico "ogni volta che
    // QUALUNQUE carta viene mandata al Cimitero" per un effetto della
    // carta stessa.
    { id: 156, origin: 'yu-gi-oh', name: 'Cavaliere Scarafaggio', type: 'monster', level: 3, race: 'Insetto', attribute: 'TERRA', attack: 800, defense: 900, effect: 'Quando questa carta viene mandata al Cimitero: torna in cima al tuo Deck.', artOnly: true },
    // Effetto reale: si equipaggia a "Petit Moth" (carta non presente in
    // questo database) sostituendone le statistiche — non applicato.
    { id: 157, origin: 'yu-gi-oh', name: 'Bozzolo dell\'Evoluzione', type: 'monster', level: 3, race: 'Insetto', attribute: 'TERRA', attack: 0, defense: 2000, effect: 'Scegli come bersaglio 1 "Petit Moth" che controlli; equipaggia questa carta dalla mano a quel bersaglio, la cui ATK/DEF diventa quella di questa carta.', artOnly: true },
    // Effetto reale: 300 danni ogni volta che un mostro dell'avversario va
    // al SUO Cimitero, per tutta la partita — il motore non ha un modo per
    // "osservare" continuamente gli invii al Cimitero nel tempo, solo
    // reagire a un trigger puntuale, resta solo testo/dati.
    { id: 158, origin: 'yu-gi-oh', name: 'Venditore di Bare', type: 'trap', subtype: 'continuous', effect: 'Ogni volta che un mostro viene mandato al Cimitero del tuo avversario: infliggi 300 danni al tuo avversario.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 6/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime: "Command Angel",
    // "Command Silencer", "Compensation Mediation", "Contagion of
    // Madness", "Crystal Seal", "Curse Transfer", "Cursebreaker". Non
    // reimportata perché già presente: "Curse of Dragon" (id 15,
    // Maledizione del Drago).
    { id: 159, origin: 'yu-gi-oh', name: 'Ondata Gelida', type: 'spell', subtype: 'normal', effect: 'Attivabile solo all\'inizio della Main Phase 1. Fino al tuo prossimo turno, né tu né il tuo avversario potete giocare o Set Magie/Trappole.', artOnly: true },
    { id: 160, origin: 'yu-gi-oh', name: 'Potere Raccolto', type: 'trap', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro scoperto sul Terreno; equipaggialo con tutte le Magie Equipaggiamento presenti sul Terreno.', artOnly: true },
    // Effetto reale: richiede tutti e 5 i pezzi di Exodia (id 11, 41, 42,
    // 43, 44 — tutti presenti in questo database) nel Cimitero, non in
    // mano — non applicato, servirebbe un controllo dedicato sul
    // Cimitero analogo a hasExodiaAssembled() in game-flow.js (che
    // controlla solo la mano), non presente per questo caso.
    { id: 161, origin: 'yu-gi-oh', name: 'Patto con Exodia', type: 'spell', subtype: 'normal', effect: 'Attivabile solo se hai "Exodia il Proibito" e le sue quattro parti nel Cimitero. Special Summon 1 "Exodia Necross" dalla mano.', artOnly: true },
    // Effetto reale: copia ATK/DEF di un mostro avversario alla propria
    // Evocazione — non applicato, mutare le statistiche di UNA SOLA
    // istanza di una carta è rischioso in questo motore (le carte in campo
    // condividono l'oggetto di cards-db.js, non una copia propria).
    { id: 162, origin: 'yu-gi-oh', name: 'Copione', type: 'monster', level: 1, race: 'Incantatore', attribute: 'LUCE', attack: 0, defense: 100, effect: 'Se questa carta viene Evocata: scegli come bersaglio 1 mostro scoperto controllato dal tuo avversario; l\'ATK/DEF di questa carta diventano pari all\'ATK/DEF originali di quel bersaglio.', artOnly: true },
    // Effetto reale (torna in mano un mostro dell'avversario quando questa
    // carta passa da Difesa ad Attacco): non applicato, il motore non ha
    // un aggancio per "quando la POSIZIONE di un mostro cambia" come
    // trigger di un effetto della carta stessa. Materiale di Fusione di
    // Bickuribox (id 113).
    { id: 163, origin: 'yu-gi-oh', name: 'Pagliaccio Insolente', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1350, defense: 1400, effect: 'Se questa carta viene cambiata da Posizione di Difesa a Posizione di Attacco: riporta in mano 1 mostro controllato dal tuo avversario.', artOnly: true },
    { id: 164, origin: 'yu-gi-oh', name: 'Drago Strisciante', type: 'monster', level: 5, race: 'Drago', attribute: 'TERRA', attack: 1600, defense: 1400, effect: 'Un drago che, privo di ali, striscia sul terreno con movenze lente ma inesorabili.', artOnly: true, vanilla: true },
    // Effetto reale (sacrifica 1 mostro OSCURITÀ con 1000 o meno ATK,
    // guarda la mano avversaria e distruggi i mostri con 1500+ ATK): non
    // applicato, stesso limite delle altre carte "guarda la mano
    // dell'avversario" già viste (es. Amazzone Maestra delle Catene, id 86).
    { id: 165, origin: 'yu-gi-oh', name: 'Virus Distruggi-Carte', type: 'trap', subtype: 'normal', effect: 'Sacrifica 1 mostro OSCURITÀ con 1000 o meno ATK: il tuo avversario non subisce danni fino alla fine del turno successivo; guarda la sua mano e tutti i mostri che controlla, poi distruggi quelli con 1500 o più ATK.', artOnly: true },
    // Effetto reale: gira in Posizione di Attacco tutti i mostri in
    // Posizione di Difesa sul Terreno e viceversa, di entrambi i
    // giocatori.
    { id: 166, origin: 'yu-gi-oh', name: 'Maledizione del Demone', type: 'spell', subtype: 'normal', effect: 'Cambia in Posizione di Difesa tutti i mostri scoperti in Posizione di Attacco sul Terreno, e viceversa (di entrambi i giocatori).', artOnly: true },
    // Coppia Rituale: "La Bestia Mascherata" si evoca con "Maledizione
    // della Bestia Mascherata" (id 168) qui sotto — stesso meccanismo già
    // usato da Guerriero Nero Supremo/Rito del Guerriero Nero (id 55/56).
    { id: 167, origin: 'yu-gi-oh', name: 'La Bestia Mascherata', type: 'monster', level: 8, race: 'Demone', attribute: 'OSCURITÀ', attack: 3200, defense: 1800, category: 'ritual', effect: 'Evocabile solo tramite Maledizione della Bestia Mascherata, sacrificando mostri per un Livello totale di almeno 8.', artOnly: true },
    { id: 168, origin: 'yu-gi-oh', name: 'Maledizione della Bestia Mascherata', type: 'spell', subtype: 'ritual', effect: 'Sacrifica dal Terreno mostri per un Livello totale di almeno 8 per Special Summon La Bestia Mascherata dalla mano.', artOnly: true },
    { id: 169, origin: 'yu-gi-oh', name: 'Tenda degli Oscuri', type: 'monster', level: 2, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 600, defense: 500, effect: 'Una tenda creata da un incantatore: si dice che faccia crescere un potere oscuro.', artOnly: true, vanilla: true },
    { id: 170, origin: 'yu-gi-oh', name: 'Comandante Cyber', type: 'monster', level: 2, race: 'Macchina', attribute: 'OSCURITÀ', attack: 750, defense: 700, effect: 'Una forza d\'assalto equipaggiata con lanciarazzi e bazooka.', artOnly: true, vanilla: true },
    { id: 171, origin: 'yu-gi-oh', name: 'Falco Cyber', type: 'monster', level: 4, race: 'Macchina', attribute: 'VENTO', attack: 1400, defense: 1200, effect: 'Un falco a propulsione che viaggia alla velocità del suono.', artOnly: true, vanilla: true },
    // Vera identità TCG: "Cyber Harpie Lady" — qui "Cyber Harpie" è solo il
    // nome col quale appare nell'anime (stesso spirito del commento su id
    // 148, Scudo Lustro Giallo). L'unico testo della carta reale è una
    // clausola di nome ("il nome di questa carta è sempre considerato
    // 'Harpie Lady'"), non un vero effetto di gioco: nessun
    // CardEffects.register necessario.
    { id: 172, origin: 'yu-gi-oh', name: 'Arpia Cyber', type: 'monster', level: 4, race: 'Bestia Alata', attribute: 'VENTO', attack: 1800, defense: 1300, effect: '(Il nome di questa carta è sempre considerato "Harpie Lady".)', artOnly: true },
    // Effetto reale (FLIP: distruggi tutti i mostri sul Terreno, poi
    // entrambi i giocatori rivelano le prime 5 carte del Deck e
    // Special Summonano quelle di Livello 4 o inferiore): non applicato,
    // troppo complesso/in più fasi per i meccanismi già presenti.
    { id: 173, origin: 'yu-gi-oh', name: 'Barattolo Cyber', type: 'monster', level: 3, race: 'Roccia', attribute: 'OSCURITÀ', attack: 900, defense: 900, effect: 'FLIP: distruggi tutti i mostri sul Terreno. Poi entrambi i giocatori rivelano le prime 5 carte del proprio Deck: i mostri di Livello 4 o inferiore rivelati possono essere Special Summonati (scoperti in Attacco o coperti in Difesa), le altre carte vanno in mano.', artOnly: true },
    // Effetto reale (alla propria Evocazione: distruggi o ruba una Magia
    // Equipaggiamento sul Terreno): non applicato, richiederebbe
    // un'interfaccia di selezione bersaglio su Magie Equipaggiamento
    // specifiche, non ancora presente.
    { id: 174, origin: 'yu-gi-oh', name: 'Predone Cyber', type: 'monster', level: 4, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1400, defense: 1000, effect: 'Se questa carta viene Evocata: attiva 1 di questi effetti — distruggi 1 Magia Equipaggiamento sul Terreno, oppure equipaggiala a questa carta.', artOnly: true },
    // Effetto reale (+500 ATK continuo, equipaggiabile solo a Harpie
    // Lady/Harpie Lady Sisters): non applicato, stesso limite del buff
    // ATK/DEF continuo spiegato più sopra.
    { id: 175, origin: 'yu-gi-oh', name: 'Scudo Cyber', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a "Harpie Lady" o "Harpie Lady Sisters". Il mostro equipaggiato guadagna 500 ATK.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 7/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime: "Dark Wall of Wind",
    // "Data Brain". Non reimportate perché già presenti: "Dark Hole" (id 7,
    // Buco Nero) e "Dark Magician" (id 2, Mago Nero).
    { id: 176, origin: 'yu-gi-oh', name: 'Soldato Cyber del Mondo Oscuro', type: 'monster', level: 4, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1400, defense: 1200 , artOnly: true, vanilla: true },
    { id: 177, origin: 'yu-gi-oh', name: 'Alligatore Cyber-Tecnologico', type: 'monster', level: 5, race: 'Macchina', attribute: 'VENTO', attack: 2500, defense: 1600, effect: 'In origine uno pterodattilo, ferito gravemente da un drago: la tecnologia più avanzata lo ha salvato trasformandolo in un potente cyborg.' , artOnly: true, vanilla: true },
    // Effetto reale: equipaggiabile SOLO a "Gradius" (carta non presente
    // in questo database), +300 ATK continuo + danno perforante — non
    // applicato.
    { id: 178, origin: 'yu-gi-oh', name: 'Laser Ciclone', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a "Gradius". Il mostro equipaggiato guadagna 300 ATK; se attacca un mostro in Posizione di Difesa con ATK superiore alla sua DEF, infligge la differenza come danno.' , artOnly: true },
    // Effetto reale (dopo il calcolo dei danni, se questa carta ha
    // combattuto: bandisci il mostro avversario E questa carta): non
    // applicato, richiederebbe modificare la risoluzione della battaglia
    // in resolveBattleDamage()/actions.js per gestire un bando invece del
    // normale invio al Cimitero.
    { id: 179, origin: 'yu-gi-oh', name: 'Guerriero D.D.', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1200, defense: 1000, effect: 'Dopo il calcolo dei danni, se questa carta ha combattuto: bandisci quel mostro, poi bandisci anche questa carta.' , artOnly: true },
    { id: 180, origin: 'yu-gi-oh', name: 'Assalitore Oscuro', type: 'monster', level: 4, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1200, defense: 1200, effect: 'Armato con la Spada Psichica, questo sinistro assassino domina la terra del male.' , artOnly: true, vanilla: true },
    { id: 181, origin: 'yu-gi-oh', name: 'Pipistrello Oscuro', type: 'monster', level: 3, race: 'Bestia Alata', attribute: 'VENTO', attack: 1000, defense: 1000 , artOnly: true, vanilla: true },
    { id: 182, origin: 'yu-gi-oh', name: 'Chimera Oscura', type: 'monster', level: 5, race: 'Demone', attribute: 'OSCURITÀ', attack: 1610, defense: 1460, effect: 'Un mostro che abita il mondo dei demoni: attacca sputando fiamme oscure.' , artOnly: true, vanilla: true },
    // Effetto reale: Rito Magia per "Paladino del Drago Oscuro" (carta non
    // presente in questo database) — non applicato.
    { id: 183, origin: 'yu-gi-oh', name: 'Rito del Drago Oscuro', type: 'spell', subtype: 'ritual', effect: 'Usata per Ritual Summon "Paladino del Drago Oscuro": sacrifica dal Terreno o dalla mano mostri per un Livello totale di almeno 4.' , artOnly: true },
    // Effetto reale (fusione di Mago Nero + Spadaccino Fiammeggiante,
    // nessun danno da battaglia + Special Summon "Cavaliere del Miraggio"
    // quando distrutta): non applicato, stesso limite di Amazzone
    // Combattente (id 87) più la dipendenza da "Cavaliere del Miraggio",
    // carta non presente in questo database.
    { id: 184, origin: 'yu-gi-oh', name: 'Cavaliere della Fiamma Oscura', type: 'monster', level: 6, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 2200, defense: 800, extraDeck: true, category: 'fusion', effect: 'Fusione di Mago Nero e Spadaccino Fiammeggiante. Non subisci danno da battaglia dagli attacchi che coinvolgono questa carta. Quando questa carta viene distrutta in battaglia: Special Summon 1 Cavaliere del Miraggio dalla mano o dal Deck.' , artOnly: true },
    { id: 185, origin: 'yu-gi-oh', name: 'Folletto Oscuro', type: 'monster', level: 4, race: 'Rettile', attribute: 'OSCURITÀ', attack: 1600, defense: 1800, effect: 'Un Folletto Selvaggio evolutosi in qualcosa di ancora più brutale e aggressivo.' , artOnly: true, vanilla: true },
    // Effetto reale (all'Evocazione: -800 ATK continuo a 1 mostro
    // bersaglio): non applicato, stesso limite del buff ATK/DEF continuo
    // spiegato più sopra.
    { id: 186, origin: 'yu-gi-oh', name: 'Jeroid Oscuro', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1200, defense: 1500, effect: 'Quando questa carta viene Evocata: scegli come bersaglio 1 mostro scoperto sul Terreno; perde 800 ATK.', artOnly: true },
    // Effetto reale: Rito Magia per "Mago del Caos Nero" (carta non
    // presente in questo database) — non applicato.
    { id: 187, origin: 'yu-gi-oh', name: 'Rito della Magia Oscura', type: 'spell', subtype: 'ritual', effect: 'Usata per Ritual Summon "Mago del Caos Nero": sacrifica dal Terreno o dalla mano mostri per un Livello totale di almeno 8.', artOnly: true },
    // Effetto reale (+300 ATK continuo per ogni Mago Nero/Mago del Caos
    // Nero nel Cimitero): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra.
    { id: 188, origin: 'yu-gi-oh', name: 'Maga Oscura', type: 'monster', level: 6, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 2000, defense: 1700, effect: 'Guadagna 300 ATK per ogni Mago Nero o Mago del Caos Nero nel Cimitero.' , artOnly: true },
    // Effetto reale (fusione di Mago Nero + Buster Blader; scarta 1 carta:
    // nega e distruggi 1 Magia; +500 ATK per ogni mostro Tipo Drago in
    // campo/Cimitero): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra (e il "nega l'attivazione di una Magia"
    // richiederebbe un'interfaccia di risposta simile a Forza Riflessa/id
    // 9, ma per le Magie).
    { id: 189, origin: 'yu-gi-oh', name: 'Paladino Oscuro', type: 'monster', level: 8, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 2900, defense: 2400, extraDeck: true, category: 'fusion', effect: 'Fusione di Mago Nero e Buster Blader. Non può essere Special Summonato se non tramite Fusion Summon. Finché è scoperta in campo, puoi scartare 1 carta per negare e distruggere l\'attivazione di una Magia. Guadagna 500 ATK per ogni mostro Tipo Drago sul Terreno e nei Cimiteri.', artOnly: true },
    { id: 190, origin: 'yu-gi-oh', name: 'Coniglio Oscuro', type: 'monster', level: 4, race: 'Bestia', attribute: 'OSCURITÀ', attack: 1100, defense: 1500, effect: 'Salta su, giù e tutt\'intorno! Nessuno riesce a mettere le mani su questo simpatico coniglietto.' , artOnly: true, vanilla: true },
    // Effetto reale: catena di dipendenze troppo lunga (richiede "Mago del
    // Tempo" e un lancio di moneta riuscito, sacrifica "Mago Nero" dal
    // campo) — non applicato.
    { id: 191, origin: 'yu-gi-oh', name: 'Saggio Oscuro', type: 'monster', level: 9, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 2800, defense: 3200, effect: 'Non può essere Evocato Normalmente/Set. Se hai indovinato il lancio di moneta dell\'effetto di "Mago del Tempo": puoi sacrificare 1 "Mago Nero" sul Terreno; Special Summon questa carta dalla mano o dal Deck. Se Special Summonata così: aggiungi 1 Magia dal Deck alla mano.', artOnly: true },
    // Effetto reale: sinergia con "Destiny Board"/"Spirit Message" (carte
    // non presenti in questo database) + lancio di moneta per annullare
    // attacchi — troppo complesso/dipendente, resta solo testo/dati.
    { id: 192, origin: 'yu-gi-oh', name: 'Santuario Oscuro', type: 'spell', subtype: 'field', effect: 'Se una carta "Spirit Message" verrebbe piazzata sul Terreno con "Destiny Board": puoi Special Summonarla come Mostro Normale (Demone/OSCURITÀ/Livello 1/ATK 0/DEF 0) invece. Quando un mostro dell\'avversario dichiara un attacco: lancia una moneta; se esce Testa, annulla l\'attacco e infliggi danno pari a metà dell\'ATK di quel mostro.', artOnly: true },
    // Effetto reale (durante la propria Standby Phase, se è l'unico mostro
    // controllato: passa in Posizione di Difesa): non applicato, il motore
    // non ha un aggancio per un effetto di un mostro che si attiva da solo
    // ad ogni Standby Phase.
    { id: 193, origin: 'yu-gi-oh', name: 'Zebra Oscura', type: 'monster', level: 4, race: 'Bestia', attribute: 'TERRA', attack: 1800, defense: 400, effect: 'Se questa carta è l\'unico mostro che controlli durante la tua Standby Phase: passa in Posizione di Difesa (non puoi cambiarne la Posizione in questo stesso turno).', artOnly: true },
    // Effetto reale (FLIP: 1 mostro bersaglio non può attaccare finché
    // questa carta resta scoperta): non applicato, richiederebbe un flag
    // persistente controllato al momento della dichiarazione di un
    // attacco, non ancora presente per effetti-carta di questo tipo.
    { id: 194, origin: 'yu-gi-oh', name: 'Illusionista dagli Occhi Oscuri', type: 'monster', level: 2, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 0, defense: 1400, effect: 'FLIP: scegli come bersaglio 1 mostro sul Terreno; non può dichiarare un attacco finché questa carta resta scoperta in campo.', artOnly: true },
    { id: 195, origin: 'yu-gi-oh', name: 'Rimuovi Magia', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 Magia scoperta, o 1 Magia/Trappola Set, sul Terreno; distruggila se è una Magia (se il bersaglio è coperto, rivelalo prima).' , artOnly: true },
    // ===== Importate da yugioh.com (pagina 8/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime: "Deepest Impact",
    // "Defender Iceberg", "Diamond Head Dragon", "Double Cloth Armor",
    // "Dragon Revival Ritual".
    { id: 196, origin: 'yu-gi-oh', name: 'Des Volstgalph', type: 'monster', level: 6, race: 'Drago', attribute: 'TERRA', attack: 2200, defense: 1700, effect: 'Se questa carta distrugge in battaglia un mostro dell\'avversario: infliggi 500 danni. Ogni volta che una Magia Normale o Veloce si risolve, guadagna 200 ATK fino a fine turno.', artOnly: true },
    // Effetto reale: cerca "Dimension Dice" (carta non presente in questo
    // database) all'attivazione + lancio di dado in Battle Phase — non
    // applicato.
    { id: 197, origin: 'yu-gi-oh', name: 'Prigione dei Dadi', type: 'spell', subtype: 'field', effect: 'Quando questa carta viene attivata: puoi aggiungere 1 "Dado Dimensionale" dal Deck alla mano. All\'inizio della Battle Phase: ciascun giocatore lancia un dado a sei facce e ne applica il risultato a tutti i propri mostri fino a fine turno (1: -1000 ATK, 2: +1000 ATK, 3: -500 ATK, 4: +500 ATK, 5: ATK dimezzata, 6: ATK raddoppiata).', artOnly: true },
    // Effetto reale (immune a Magie/Trappole senza bersaglio specifico +
    // non distrutta in battaglia contro mostri con 1900 o meno ATK): non
    // applicato, richiederebbe agganci di immunità non ancora presenti nel
    // motore.
    { id: 198, origin: 'yu-gi-oh', name: 'Drago della Dimensione Diversa', type: 'monster', level: 5, race: 'Drago', attribute: 'LUCE', attack: 1200, defense: 1500, effect: 'L\'effetto di una Magia o Trappola non può distruggere questa carta a meno che non la scelga specificamente come bersaglio. Questa carta non viene distrutta in battaglia se combatte con un mostro con 1900 o meno ATK.', artOnly: true },
    // Effetto reale (costringe 1 proprio mostro Incantatore di Livello 7+
    // ad attaccare tutti i mostri avversari una volta ciascuno): non
    // applicato, il motore non supporta attacchi multipli dello stesso
    // mostro nello stesso turno.
    { id: 199, origin: 'yu-gi-oh', name: 'Movimento d\'Onda Diffuso', type: 'spell', subtype: 'normal', effect: 'Se il tuo avversario controlla un mostro: paga 1000 Life Points, poi scegli come bersaglio 1 mostro Incantatore di Livello 7+ che controlli; in questo turno deve attaccare tutti i mostri dell\'avversario, una volta ciascuno, e gli altri tuoi mostri non possono attaccare.', artOnly: true },
    // Effetto reale: richiede di controllare già una carta con effetto a
    // lancio di dado (dipendenza su altre carte non presenti) — non
    // applicato.
    { id: 200, origin: 'yu-gi-oh', name: 'Dado Dimensionale', type: 'spell', subtype: 'normal', effect: 'Se controlli una carta con un effetto che richiede un lancio di dado: puoi sacrificare 1 mostro; Special Summon dalla mano o dal Deck 1 mostro con un effetto che richiede un lancio di dado.', artOnly: true },
    // Effetto reale (bandisce temporaneamente un proprio mostro fino alla
    // prossima Standby Phase): non applicato, richiederebbe una zona di
    // bando temporanea con un timer di ritorno, non presente nel motore.
    { id: 201, origin: 'yu-gi-oh', name: 'Buco Dimensionale', type: 'spell', subtype: 'normal', effect: 'Scegli 1 mostro sul tuo Terreno; bandiscilo fino alla tua prossima Standby Phase.', artOnly: true },
    // Effetto reale: torna in campo dal Cimitero durante la Standby Phase
    // successiva a un invio al Cimitero causato da una Magia Continua —
    // non applicato, troppo specifico/dipendente dal tipo di effetto che
    // l'ha mandata al Cimitero.
    { id: 202, origin: 'yu-gi-oh', name: 'Bambola della Rovina', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1600, defense: 1700, effect: 'Durante la tua prossima Standby Phase dopo che questa carta è stata mandata dal campo al Cimitero dall\'effetto di una Magia Continua: Special Summonala dal Cimitero.', artOnly: true },
    { id: 203, origin: 'yu-gi-oh', name: 'Doma l\'Angelo del Silenzio', type: 'monster', level: 5, race: 'Fata', attribute: 'OSCURITÀ', attack: 1600, defense: 1400, effect: 'Questa fata governa la fine dell\'esistenza.', artOnly: true, vanilla: true },
    // Effetto reale: infliggi all'avversario lo stesso danno che subisci
    // da un effetto di un suo mostro — non applicato, il motore non ha un
    // aggancio generico per "danno subito da un effetto mostro" distinto
    // dal danno da battaglia.
    { id: 204, origin: 'yu-gi-oh', name: 'Sosia', type: 'trap', subtype: 'continuous', effect: 'Quando subisci danno dall\'effetto di un mostro controllato dal tuo avversario: infliggi al tuo avversario lo stesso ammontare di danno.', artOnly: true },
    // Effetto reale (sacrifica 2 mostri: prendi il controllo di 2 mostri
    // avversari fino alla tua End Phase): non applicato, stesso limite del
    // meccanismo "prendi il controllo" già visto (es. Cambio di Cuore, id
    // 147).
    { id: 205, origin: 'yu-gi-oh', name: 'Doppia Presa Magica', type: 'trap', subtype: 'normal', effect: 'Sacrifica 2 mostri, poi scegli come bersaglio 2 mostri scoperti controllati dal tuo avversario; prendine il controllo fino alla tua End Phase.', artOnly: true },
    // Effetto reale: costringe in Posizione di Difesa (bloccata) tutti i
    // mostri Tipo Drago scoperti sul Terreno, di entrambi i giocatori.
    { id: 206, origin: 'yu-gi-oh', name: 'Vaso Cattura-Drago', type: 'trap', subtype: 'continuous', effect: 'Tutti i mostri Tipo Drago scoperti sul Terreno vengono cambiati in Posizione di Difesa e non possono cambiare Posizione, finché questa carta resta scoperta in campo.', artOnly: true },
    // Effetto reale (Fusione di Guerriero Nero Supremo + Drago Occhi Blu
    // Definitivo; +500 ATK per ogni mostro Tipo Drago che controlli):
    // entrambi i materiali di Fusione sono già in questo database (id 55 e
    // 124!) ma l'effetto ATK continuo non è applicato, stesso limite del
    // buff ATK/DEF continuo spiegato più sopra.
    { id: 207, origin: 'yu-gi-oh', name: 'Cavaliere Maestro dei Draghi', type: 'monster', level: 12, race: 'Drago', attribute: 'LUCE', attack: 5000, defense: 5000, extraDeck: true, category: 'fusion', effect: 'Fusione di Guerriero Nero Supremo e Drago Occhi Blu Definitivo. Non può essere Special Summonato se non tramite Fusion Summon. Guadagna 500 ATK per ogni mostro Tipo Drago che controlli, esclusa questa carta.', artOnly: true },
    // Effetto reale (equipaggiabile solo a un mostro OSCURITÀ, +600 ATK
    // continuo + immunità a effetti + recupero dal Cimitero): non
    // applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra.
    { id: 208, origin: 'yu-gi-oh', name: 'Artigli di Drago', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a un mostro OSCURITÀ. Il mostro equipaggiato guadagna 600 ATK e non può essere distrutto dagli effetti delle carte dell\'avversario.', artOnly: true },
    // Effetto reale (FLIP: distruggi tutti i "Vaso Cattura-Drago" scoperti
    // sul Terreno; se ne distruggi almeno uno, gira in Posizione di
    // Attacco tutti i mostri Tipo Drago): non applicato, contro-effetto
    // troppo specifico per id 206 qui sopra.
    { id: 209, origin: 'yu-gi-oh', name: 'Suonatore di Draghi', type: 'monster', level: 3, race: 'Piroico', attribute: 'FUOCO', attack: 200, defense: 1800, effect: 'FLIP: distruggi tutti i "Vaso Cattura-Drago" scoperti sul Terreno. Se ne distruggi almeno uno: gira in Posizione di Attacco tutti i mostri Tipo Drago scoperti sul Terreno.', artOnly: true },
    { id: 210, origin: 'yu-gi-oh', name: 'Cacciatore di Draghi', type: 'monster', level: 6, race: 'Demone', attribute: 'OSCURITÀ', attack: 2000, defense: 2100, effect: 'Quando questa carta viene Evocata Normalmente o tramite Flip Summon: distruggi 1 mostro Tipo Drago scoperto sul Terreno.', artOnly: true },
    { id: 211, origin: 'yu-gi-oh', name: 'Drago Zombie', type: 'monster', level: 3, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1600, defense: 0, effect: 'Un drago resuscitato dalla stregoneria: il suo respiro è altamente corrosivo.', artOnly: true, vanilla: true },
    // Effetto reale (i propri mostri Tipo Drago infliggono danno
    // perforante): non applicato, il motore non ha un meccanismo di danno
    // perforante generico riutilizzabile per più carte.
    { id: 212, origin: 'yu-gi-oh', name: 'Furia del Drago', type: 'trap', subtype: 'continuous', effect: 'I mostri Tipo Drago che controlli infliggono danno perforante quando attaccano un mostro in Posizione di Difesa.', artOnly: true },
    { id: 213, origin: 'yu-gi-oh', name: 'Dragoness la Cavaliera Malvagia', type: 'monster', level: 3, race: 'Guerriero', attribute: 'VENTO', attack: 1200, defense: 900, extraDeck: true, category: 'fusion', effect: 'Fusione di Armaill e Drago Scudo Monocolo.', artOnly: true },
    // Effetto reale (quando attaccata: reindirizza l'attacco a un altro
    // proprio mostro): non applicato, stesso limite di Armatura Guida
    // d'Attacco (id 100) e Sfera Esplosiva (id 120) — la scelta alternativa
    // di reindirizzare un attacco richiederebbe modificare
    // resolveAttack()/actions.js.
    { id: 214, origin: 'yu-gi-oh', name: 'Spiritello dei Sogni', type: 'monster', level: 2, race: 'Pianta', attribute: 'LUCE', attack: 300, defense: 200, effect: 'Se attaccata da un mostro dell\'avversario: scegli un altro tuo mostro e designalo come nuovo bersaglio dell\'attacco, poi calcola il danno.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 9/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime: "Duelist's Glove",
    // "Excalibur", "Extinction Fist".
    // Effetto reale: attivabile solo quando una propria Trappola viene
    // distrutta da un effetto avversario — non applicato, il motore non
    // ha un aggancio per "quando una MIA Trappola viene distrutta
    // dall'avversario".
    { id: 215, origin: 'yu-gi-oh', name: 'Neve Battente', type: 'trap', subtype: 'normal', effect: 'Attivabile solo quando 1 o più tue Trappole vengono distrutte e mandate dal Terreno al Cimitero da un effetto controllato dal tuo avversario. Distruggi 1 Magia o Trappola sul Terreno.', artOnly: true },
    // Effetto reale: scarta la carta pescata dall'avversario nella sua
    // Draw Phase — non applicato, il motore non ha un aggancio sulla
    // pescata dell'avversario per una carta continua già in campo.
    { id: 216, origin: 'yu-gi-oh', name: 'Fuori Gioco', type: 'trap', subtype: 'normal', effect: 'Quando il tuo avversario pesca per la sua pescata normale nella Draw Phase: il tuo avversario scarta la carta appena pescata.', artOnly: true },
    { id: 217, origin: 'yu-gi-oh', name: 'Strega Oscura Dunames', type: 'monster', level: 4, race: 'Fata', attribute: 'LUCE', attack: 1800, defense: 1050, effect: 'Anche quando tutte le probabilità sono contro di lei, questa coraggiosa fata avanza in battaglia e non si ritira mai.', artOnly: true, vanilla: true },
    { id: 218, origin: 'yu-gi-oh', name: 'Verme del Dungeon', type: 'monster', level: 5, race: 'Insetto', attribute: 'TERRA', attack: 1800, defense: 1500, effect: 'Nascosto sotto i pavimenti di un labirinto, ingoia chiunque passi al di sopra.', artOnly: true, vanilla: true },
    { id: 219, origin: 'yu-gi-oh', name: 'Tornado di Polvere', type: 'trap', subtype: 'normal', effect: 'Scegli come bersaglio 1 Magia/Trappola controllata dal tuo avversario; distruggila, poi puoi Set 1 Magia/Trappola dalla tua mano.', artOnly: true },
    // Effetto reale: l'avversario sceglie tra 2 Attributi indicati, poi si
    // distruggono tutti i mostri scoperti con l'Attributo scelto — non
    // applicato, richiederebbe un'interfaccia di scelta per il bot/umano
    // che deve rispondere, non presente per questo tipo di effetto.
    { id: 220, origin: 'yu-gi-oh', name: 'Scuotiterra', type: 'trap', subtype: 'normal', effect: 'Scegli 2 Attributi. Il tuo avversario ne sceglie 1 dei 2: distruggi tutti i mostri scoperti con quell\'Attributo sul Terreno.', artOnly: true },
    // Effetto reale: ogni End Phase, sacrifica 1 mostro e infliggi danno
    // pari a metà del suo ATK originale — non applicato, il motore non ha
    // un aggancio per un effetto continuo obbligatorio ad ogni End Phase.
    { id: 221, origin: 'yu-gi-oh', name: 'Ectoplasmatore', type: 'spell', subtype: 'continuous', effect: 'Una volta per turno, durante la End Phase di ciascun giocatore: chi è di turno deve sacrificare 1 mostro scoperto; se lo fa, infliggi al proprio avversario danno pari a metà dell\'ATK originale del mostro sacrificato.', artOnly: true },
    // Effetto reale (il mostro che l'attacca non può attaccare nel turno
    // successivo): non applicato, richiederebbe tracciare un divieto
    // d'attacco specifico per un mostro nel turno successivo, non presente
    // nel motore.
    { id: 222, origin: 'yu-gi-oh', name: 'Lucertola Elettrica', type: 'monster', level: 3, race: 'Tuono', attribute: 'TERRA', attack: 850, defense: 800, effect: 'Un mostro non-Zombie che attacca questa carta non può attaccare nel suo turno successivo.', artOnly: true },
    // Effetto reale (bandisci dal Cimitero: termina la Battle Phase, una
    // volta per Duello): non applicato, il motore non ha un concetto di
    // "una volta per Duello" (solo per turno).
    { id: 223, origin: 'yu-gi-oh', name: 'Tartaruga Elettromagnetica', type: 'monster', level: 4, race: 'Macchina', attribute: 'LUCE', attack: 0, defense: 1800, effect: 'Durante la Battle Phase dell\'avversario: puoi bandire questa carta dal Cimitero; termina la Battle Phase. Puoi usare questo effetto solo una volta per Duello.', artOnly: true },
    // Effetto ora implementato in card-effects.js (vedi pagina 12/26):
    // "Lady Arpia" e "Sorelle Lady Arpia" sono state aggiunte al database,
    // chiudendo la dipendenza che prima rendeva questa carta data-only.
    { id: 224, origin: 'yu-gi-oh', name: 'Egotista Elegante', type: 'spell', subtype: 'normal', effect: 'Se "Lady Arpia" è sul Terreno: Special Summon 1 "Lady Arpia" o "Sorelle Lady Arpia" dalla mano o dal Deck.', artOnly: true },
    // Effetto reale (+400 ATK/-200 DEF continuo a un mostro LUCE
    // equipaggiato): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra.
    { id: 225, origin: 'yu-gi-oh', name: 'Luce dell\'Elfo', type: 'spell', subtype: 'equip', effect: 'Un mostro LUCE equipaggiato con questa carta guadagna 400 ATK e perde 200 DEF.', artOnly: true },
    // Effetto reale (cambia Posizione oppure sacrifica 1 mostro per
    // prendere il controllo di 1 mostro avversario): non applicato, stesso
    // limite del meccanismo "prendi il controllo" già visto (es. Cambio di
    // Cuore, id 147).
    { id: 226, origin: 'yu-gi-oh', name: 'Controllore del Nemico', type: 'spell', subtype: 'quick-play', effect: 'Attiva 1 di questi effetti: cambia la Posizione di battaglia di 1 mostro scoperto dell\'avversario; oppure sacrifica 1 mostro, poi prendi il controllo di 1 mostro scoperto dell\'avversario fino alla End Phase.', artOnly: true },
    // Effetto reale (+200 ATK/DEF continuo per ogni carta nella mano
    // dell'avversario): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra.
    { id: 227, origin: 'yu-gi-oh', name: 'Drenaggio di Energia', type: 'trap', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro scoperto che controlli; guadagna 200 ATK/DEF per ogni carta nella mano del tuo avversario, fino a fine turno.', artOnly: true },
    { id: 228, origin: 'yu-gi-oh', name: 'Aerosol Sterminatore', type: 'spell', subtype: 'normal', effect: 'Distruggi tutti i mostri Tipo Insetto scoperti sul Terreno.', artOnly: true },
    { id: 229, origin: 'yu-gi-oh', name: 'Bandisci il Malvagio', type: 'spell', subtype: 'normal', effect: 'Distruggi tutti i mostri Tipo Demone scoperti sul Terreno.', artOnly: true },
    // Effetto reale: Special Summonabile solo tramite "Patto con Exodia"
    // (id 161, già data-only) + non distruttibile in battaglia/da
    // Magie-Trappole + guadagna 500 ATK ogni Standby Phase + si autodistrugge
    // se non hai tutti e 5 i pezzi di Exodia nel Cimitero — non applicato,
    // dipendenza a catena troppo lunga.
    { id: 230, origin: 'yu-gi-oh', name: 'Exodia Necross', type: 'monster', level: 4, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1800, defense: 0, effect: 'Deve essere Special Summonato tramite "Patto con Exodia" e non può esserlo in altro modo. Non può essere distrutta in battaglia né dall\'effetto di una Magia/Trappola. Una volta per turno, durante la tua Standby Phase: guadagna 500 ATK.', artOnly: true },
    // CORREZIONE (scoperta in pagina 15/26): questa carta è in realtà un
    // DUPLICATO di "Testa Proibita" (id 41), già presente fin dal set
    // originale di 76 carte con lo stesso identico effetto — e le sue
    // quattro parti ("Braccio Dx/Sx", "Gamba Dx/Sx del Proibito") erano
    // GIÀ TUTTE presenti come id 11, 42, 43, 44, con la vittoria
    // automatica già funzionante tramite hasExodiaAssembled() in
    // game-flow.js (EXODIA_PIECE_IDS = [11, 41, 42, 43, 44]). Al momento
    // dell'importazione di questa pagina non me ne ero accorto. Non
    // rimossa/rinumerata per non rompere gli id di tutte le carte
    // successive: resta in database come voce doppia, ma il suo effetto
    // NON è collegato a checkGameOver() (solo id 41 lo è), quindi il testo
    // sotto non promette più erroneamente una vittoria che questa
    // specifica istanza non può dare.
    // Effetto reale (lancio di moneta quando l'avversario attacca +
    // pagamento di 500 LP ad ogni propria Standby Phase o autodistruzione):
    // non applicato, troppo aleatorio/in più fasi per i meccanismi già
    // presenti.
    { id: 232, origin: 'yu-gi-oh', name: 'Scatola delle Fate', type: 'trap', subtype: 'continuous', effect: 'Quando un mostro dell\'avversario dichiara un attacco: lancia una moneta; se esce il risultato scelto, l\'ATK del mostro attaccante diventa 0 fino alla fine della Battle Phase. Durante ciascuna tua Standby Phase: paga 500 Life Points o distruggi questa carta.', artOnly: true },
    // Effetto reale (danno perforante per il mostro equipaggiato): non
    // applicato, il motore non ha un meccanismo di danno perforante
    // generico riutilizzabile per più carte.
    { id: 233, origin: 'yu-gi-oh', name: 'Impatto Meteora Fatato', type: 'spell', subtype: 'equip', effect: 'Se il mostro equipaggiato attacca un mostro in Posizione di Difesa: infligge danno perforante al tuo avversario.', artOnly: true },
    { id: 234, origin: 'yu-gi-oh', name: 'Dono della Fata', type: 'monster', level: 4, race: 'Incantatore', attribute: 'LUCE', attack: 1400, defense: 1000, effect: 'Questo mostro alato è conosciuto per portare felicità a tutti.', artOnly: true, vanilla: true },
    // Effetto reale (reindirizza a un altro bersaglio valido una Magia
    // dell'avversario che ha come bersaglio esattamente 1 mostro): non
    // applicato, richiederebbe un aggancio sul BERSAGLIO di una Magia
    // avversaria, non ancora presente nel motore (stesso limite di Gran
    // Scudo Gardna, id 115).
    { id: 235, origin: 'yu-gi-oh', name: 'Specchietto della Fata', type: 'trap', subtype: 'normal', effect: 'Quando il tuo avversario attiva una Magia che ha come bersaglio esattamente 1 mostro sul Terreno (e nessun\'altra carta): scegli un altro bersaglio valido; quella Magia ora ha come bersaglio la nuova carta.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 10/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime: "Fire Whip", "Full
    // Armor Gravitation", "Full Moon". Non reimportata perché già
    // presente: "Gaia The Fierce Knight" (id 14, Gaia il Cavaliere Feroce).
    // Effetto reale: manda al Cimitero 1 Trappola per Special Summonare
    // un mostro Fusione specifico dall'Extra Deck (dipendenza da altre
    // carte "Legendary Dragon" non presenti in questo database) — non
    // applicato.
    { id: 236, origin: 'yu-gi-oh', name: 'Zanna di Critias', type: 'spell', subtype: 'normal', effect: 'Sempre considerata anche "Drago Leggendario Critias". Manda al Cimitero 1 Trappola dalla mano o dal Terreno per Special Summonare dall\'Extra Deck 1 mostro Fusione che richiede questa carta.', artOnly: true },
    { id: 237, origin: 'yu-gi-oh', name: 'Folletto Selvaggio Feroce', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1300, defense: 1400, artOnly: true, vanilla: true },
    // Effetto reale (FLIP: rimescola mano/Terreno/Cimitero di entrambi i
    // giocatori nel Deck, poi pescano 5 carte): non applicato, un reset
    // totale dello stato di gioco è troppo invasivo/rischioso da
    // implementare senza uno studio dedicato.
    { id: 238, origin: 'yu-gi-oh', name: 'Barattolo di Fibra', type: 'monster', level: 3, race: 'Pianta', attribute: 'TERRA', attack: 500, defense: 500, effect: 'FLIP: entrambi i giocatori rimescolano nel proprio Deck tutte le carte da mano, Terreno e Cimitero, poi pescano 5 carte.', artOnly: true },
    { id: 239, origin: 'yu-gi-oh', name: 'Piovra Demoniaca', type: 'monster', level: 4, race: 'Acquatico', attribute: 'ACQUA', attack: 1200, defense: 1400, effect: 'Un calamaro gigante che trascina i propri nemici in una tomba acquatica.', artOnly: true, vanilla: true },
    // Effetto reale: tutti i mostri scoperti vengono girati in Posizione
    // di Attacco e non possono cambiare Posizione, finché resta scoperta.
    // Stesso schema di Vaso Cattura-Drago (id 206), qui su TUTTI i mostri
    // invece che solo i Draghi.
    { id: 240, origin: 'yu-gi-oh', name: 'Ordini d\'Attacco Finali', type: 'trap', subtype: 'continuous', effect: 'Tutti i mostri scoperti sul Terreno vengono cambiati in Posizione di Attacco e non possono cambiare Posizione, finché questa carta resta scoperta in campo.', artOnly: true },
    // Effetto reale (ogni volta che guadagni Life Points: 500 danni
    // all'avversario): non applicato, il motore non ha un aggancio
    // generico "ogni volta che si guadagnano Life Points" (solo azioni
    // dirette di cura/danno puntuali).
    { id: 241, origin: 'yu-gi-oh', name: 'Principessa di Fuoco', type: 'monster', level: 4, race: 'Piroico', attribute: 'FUOCO', attack: 1300, defense: 1500, effect: 'Ogni volta che guadagni Life Points: infliggi 500 danni al tuo avversario.', artOnly: true },
    // Effetto reale (FLIP: scarta a caso 2 carte dalla mano per 800
    // danni): non applicato, richiederebbe una selezione casuale dalla
    // mano, non ancora presente nel motore.
    { id: 242, origin: 'yu-gi-oh', name: 'Stregone di Fuoco', type: 'monster', level: 4, race: 'Incantatore', attribute: 'FUOCO', attack: 1000, defense: 1500, effect: 'FLIP: scarta a caso 2 carte dalla tua mano per infliggere 800 danni al tuo avversario.', artOnly: true },
    { id: 243, origin: 'yu-gi-oh', name: 'Faglia', type: 'spell', subtype: 'normal', effect: 'Distruggi il mostro scoperto con l\'ATK più basso controllato dal tuo avversario (a tua scelta in caso di parità).', artOnly: true },
    // Effetto reale: Special Summon di 5 Kuriboh specifici (nessuno
    // presente in questo database) sacrificando l'unico mostro di Livello
    // 5 controllato — non applicato, troppo di nicchia.
    { id: 244, origin: 'yu-gi-oh', name: 'Crepuscolo a Cinque Stelle', type: 'spell', subtype: 'normal', effect: 'Se l\'unico mostro che controlli è 1 mostro di Livello 5: sacrificalo; Special Summon 5 mostri Kuriboh dalla mano, dal Deck e/o dal Cimitero (non possono essere sacrificati per un\'Evocazione Tributo).', artOnly: true },
    { id: 245, origin: 'yu-gi-oh', name: 'Spadaccino di Fiamma', type: 'monster', level: 5, race: 'Guerriero', attribute: 'FUOCO', attack: 1800, defense: 1600, artOnly: true, vanilla: true },
    // Effetto reale (immune a effetti distruttivi dell'avversario una
    // volta a turno + vittoria automatica con un attacco diretto in
    // condizioni specifiche): non applicato, meccaniche troppo complesse
    // e una vera e propria condizione di vittoria alternativa, non
    // supportata dal motore.
    { id: 246, origin: 'yu-gi-oh', name: 'Elefante Volante', type: 'monster', level: 4, race: 'Bestia', attribute: 'VENTO', attack: 1850, defense: 1300, effect: 'Una volta per turno dell\'avversario, se dovrebbe essere distrutta da un suo effetto: non viene distrutta. Se questo è successo nella End Phase dell\'avversario: se questa carta infligge danno da attacco diretto nel tuo turno successivo, vinci il Duello.', artOnly: true },
    { id: 247, origin: 'yu-gi-oh', name: 'Pesce Volante', type: 'monster', level: 4, race: 'Pesce', attribute: 'VENTO', attack: 800, defense: 500, effect: 'Tre desideri sono concessi a chi ha la fortuna di vedere questo mostro in volo.', artOnly: true, vanilla: true },
    // Effetto reale (quando distrutta in battaglia: Special Summon 1
    // mostro VENTO con 1500 o meno ATK dal Deck): non applicato, richiede
    // ricerca nel Deck per statistiche, meccanismo non ancora presente.
    { id: 248, origin: 'yu-gi-oh', name: 'Kamakiri Volante #1', type: 'monster', level: 4, race: 'Bestia Alata', attribute: 'VENTO', attack: 1400, defense: 900, effect: 'Quando questa carta viene distrutta in battaglia e mandata al Cimitero: puoi Special Summon dal Deck, scoperto in Posizione di Attacco, 1 mostro VENTO con 1500 o meno ATK.', artOnly: true },
    { id: 249, origin: 'yu-gi-oh', name: 'Kamakiri Volante #2', type: 'monster', level: 4, race: 'Bestia Alata', attribute: 'VENTO', attack: 1500, defense: 800, artOnly: true, vanilla: true },
    { id: 250, origin: 'yu-gi-oh', name: 'Pinguino Volante', type: 'monster', level: 4, race: 'Acquatico', attribute: 'ACQUA', attack: 1200, defense: 1000, artOnly: true, vanilla: true },
    { id: 251, origin: 'yu-gi-oh', name: 'Sepoltura Sciocca', type: 'spell', subtype: 'normal', effect: 'Manda 1 mostro dal tuo Deck al Cimitero.', artOnly: true },
    // Coppia Rituale: "Balena Fortezza" si evoca con "Giuramento della
    // Balena Fortezza" (id 253) qui sotto — stesso meccanismo già usato da
    // Guerriero Nero Supremo/Rito del Guerriero Nero (id 55/56).
    { id: 252, origin: 'yu-gi-oh', name: 'Balena Fortezza', type: 'monster', level: 7, race: 'Pesce', attribute: 'ACQUA', attack: 2350, defense: 2150, category: 'ritual', effect: 'Evocabile solo tramite Giuramento della Balena Fortezza, sacrificando mostri per un Livello totale di almeno 7.', artOnly: true },
    { id: 253, origin: 'yu-gi-oh', name: 'Giuramento della Balena Fortezza', type: 'spell', subtype: 'ritual', effect: 'Sacrifica dal Terreno mostri per un Livello totale di almeno 7 per Special Summon Balena Fortezza dalla mano.', artOnly: true },
    // Fusione di Gaia il Cavaliere Feroce (id 14) e Maledizione del Drago
    // (id 15) — entrambi i materiali già in questo database! Nessun
    // effetto meccanico noto oltre alle statistiche.
    { id: 254, origin: 'yu-gi-oh', name: 'Gaia il Campione dei Draghi', type: 'monster', level: 7, race: 'Drago', attribute: 'VENTO', attack: 2600, defense: 2100, extraDeck: true, category: 'fusion', effect: 'Fusione di Gaia il Cavaliere Feroce e Maledizione del Drago.', artOnly: true },
    // Effetto reale: condizioni di attivazione troppo specifiche (mano
    // avversaria 6+, propria mano 2 o meno) + lancio di moneta con penalità
    // di saltare il turno successivo se sbagliato — non applicato, troppo
    // rischioso/aleatorio per i meccanismi già presenti.
    { id: 255, origin: 'yu-gi-oh', name: 'Azzardo', type: 'trap', subtype: 'normal', effect: 'Attivabile solo se il tuo avversario ha 6 o più carte in mano e tu ne hai 2 o meno. Lancia una moneta e chiamala: se indovini, pesca finché non hai 5 carte in mano; se sbagli, salta il tuo turno successivo.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 11/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime/non giocabili: "Glory
    // of the King's Hand" (carta ufficiale ma dichiarata "non utilizzabile
    // in Duello" sulla carta stessa), "Gorlag" (SOLO anime, mai stampata).
    // Non reimportate perché già presenti: "Gate Guardian" (id 33, Il
    // Guardiano del Cancello), "Gearfried the Iron Knight" (id 16,
    // Gearfried il Cavaliere di Ferro).
    { id: 256, origin: 'yu-gi-oh', name: 'Garoozis', type: 'monster', level: 5, race: 'Guerriero Bestia', attribute: 'FUOCO', attack: 1800, defense: 1500, effect: 'Un guerriero bestia che brandisce un\'ascia, con la testa di un drago.', artOnly: true, vanilla: true },
    // Effetto reale (paga 800 LP una volta per turno in Main Phase 1:
    // questa carta può attaccare direttamente in questo turno): non
    // applicato, il motore non ha un meccanismo di effetti Ignition per i
    // mostri (solo Magie/Trappole hanno canActivate/activate — vedi
    // commento in testa a card-effects.js).
    { id: 257, origin: 'yu-gi-oh', name: 'Golem Meccanico la Fortezza Mobile', type: 'monster', level: 4, race: 'Macchina', attribute: 'TERRA', attack: 800, defense: 2200, effect: 'Una volta per turno, durante il tuo Main Phase 1: puoi pagare 800 Life Points; questa carta può attaccare direttamente il tuo avversario in questo turno.', artOnly: true },
    // Effetto reale: Special Summonabile solo tramite "Vincoli Recisi"
    // (carta non presente in questo database) + distrugge 1 mostro
    // avversario ogni volta che viene equipaggiata con una Carta
    // Equipaggiamento — non applicato, dipendenza a catena + nessun
    // aggancio "ogni volta che questa carta viene equipaggiata".
    { id: 258, origin: 'yu-gi-oh', name: 'Gearfried il Maestro di Spada', type: 'monster', level: 7, race: 'Guerriero', attribute: 'LUCE', attack: 2600, defense: 2200, effect: 'Non può essere Evocato Normalmente/Set. Deve essere Special Summonato tramite "Vincoli Recisi". Ogni volta che questa carta viene equipaggiata con una Carta Equipaggiamento: scegli come bersaglio 1 mostro controllato dal tuo avversario; distruggilo.', artOnly: true },
    // Effetto reale (quando distrutta in battaglia: 500 danni + Special
    // Summon di altri "Germe Gigante" dal Deck): non applicato, il motore
    // ha il trigger ON_DESTROY riservato ma non ancora collegato a nessuna
    // carta (vedi commento in duel-engine.js sopra il case ON_DESTROY).
    { id: 259, origin: 'yu-gi-oh', name: 'Germe Gigante', type: 'monster', level: 2, race: 'Demone', attribute: 'OSCURITÀ', attack: 1000, defense: 100, effect: 'Quando questa carta viene distrutta in battaglia e mandata al Cimitero: infliggi 500 danni al tuo avversario, poi puoi Special Summon dal Deck un numero qualsiasi di mostri "Germe Gigante" scoperti in Posizione di Attacco.', artOnly: true },
    { id: 260, origin: 'yu-gi-oh', name: 'Gigantesco Serpente di Mare Rosso', type: 'monster', level: 4, race: 'Acquatico', attribute: 'ACQUA', attack: 1800, defense: 800, artOnly: true, vanilla: true },
    { id: 261, origin: 'yu-gi-oh', name: 'Soldato di Pietra Gigante', type: 'monster', level: 3, race: 'Roccia', attribute: 'TERRA', attack: 1300, defense: 2000, artOnly: true, vanilla: true },
    { id: 262, origin: 'yu-gi-oh', name: 'Turbine Gigante', type: 'spell', subtype: 'normal', effect: 'Fai tornare in mano tutte le Magie e Trappole sul Terreno, di entrambi i giocatori.', artOnly: true },
    { id: 263, origin: 'yu-gi-oh', name: 'Dono dell\'Elfa Mistica', type: 'trap', subtype: 'normal', effect: 'Aumenta i tuoi Life Points di 300 punti per ogni mostro sul Terreno, di entrambi i giocatori.', artOnly: true },
    { id: 264, origin: 'yu-gi-oh', name: 'Lupo Giga-Tech', type: 'monster', level: 4, race: 'Macchina', attribute: 'FUOCO', attack: 1200, defense: 1400, effect: 'Un lupo di ferro con zanne affilatissime capaci di perforare qualsiasi armatura.', artOnly: true, vanilla: true },
    { id: 265, origin: 'yu-gi-oh', name: 'Gil Garth', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1800, defense: 1200, artOnly: true, vanilla: true },
    // Effetto reale (Special Summon di questa carta direttamente dalla
    // mano; se evocata così, l'avversario può Special Summonare 1 mostro
    // dal proprio Cimitero): non applicato, richiederebbe una procedura di
    // evocazione alternativa dalla mano (fuori dal normale flusso
    // Evocazione Normale/Set) non ancora presente nel motore.
    { id: 266, origin: 'yu-gi-oh', name: 'Gilasaurus', type: 'monster', level: 3, race: 'Dinosauro', attribute: 'TERRA', attack: 1400, defense: 400, effect: 'Puoi Special Summon questa carta dalla tua mano. Se viene Evocata così: il tuo avversario può Special Summon 1 mostro dal proprio Cimitero.', artOnly: true },
    // Effetto reale: Evocabile Normalmente sacrificando 3 mostri invece
    // che con l'Evocazione Tributo standard, distruggendo poi tutti i
    // mostri dell'avversario — non applicato, il numero di Tributi
    // richiesti nel motore è calcolato solo in base al Livello
    // (getTributesRequired in cards-db.js, sempre 2 per Livello 7+), senza
    // eccezioni per carta. Qui è quindi Evocabile con i 2 Tributi standard
    // ma senza il bonus "distruggi tutto".
    { id: 267, origin: 'yu-gi-oh', name: 'Gilford il Fulmine', type: 'monster', level: 8, race: 'Guerriero', attribute: 'LUCE', attack: 2800, defense: 1400, effect: 'Puoi Sacrificare 3 mostri per Evocare Tributo (ma non Set) questa carta. Se Evocata così: distruggi tutti i mostri controllati dal tuo avversario.', artOnly: true },
    // Fusione di "Guardiano del Labirinto" e "Protettore del Trono",
    // nessuno dei due presente in questo database.
    { id: 268, origin: 'yu-gi-oh', name: 'Giltia il Cavaliere D.', type: 'monster', level: 5, race: 'Guerriero', attribute: 'LUCE', attack: 1850, defense: 1500, extraDeck: true, category: 'fusion', effect: 'Fusione di Guardiano del Labirinto e Protettore del Trono.', artOnly: true },
    // Effetto reale (se attacca: a fine Battle Phase viene girata in
    // Posizione di Difesa e non può cambiare Posizione fino alla End Phase
    // del turno successivo): non applicato, il motore non ha un aggancio
    // "dopo che questa carta ha attaccato" (esiste solo ON_ATTACK_DECLARE,
    // PRIMA del calcolo danni, per le finestre di risposta).
    { id: 269, origin: 'yu-gi-oh', name: 'Forza d\'Attacco Goblin', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 2300, defense: 0, effect: 'Se questa carta attacca: viene cambiata in Posizione di Difesa alla fine della Battle Phase, e la sua Posizione non può essere cambiata fino alla End Phase del tuo turno successivo.', artOnly: true },
    { id: 270, origin: 'yu-gi-oh', name: 'Gokibore', type: 'monster', level: 4, race: 'Insetto', attribute: 'TERRA', attack: 1200, defense: 1400, effect: 'Un grande scarafaggio sferico che attacca i nemici travolgendoli mentre rotola.', artOnly: true, vanilla: true },
    // Effetto reale (fino a fine turno, annulla tutti gli effetti dei
    // mostri in Posizione di Difesa): non applicato, il motore non ha un
    // meccanismo generico di negazione effetti per sottoinsieme di mostri
    // (solo negazione totale Magie/Trappole per giocatore, es. Jinzo).
    { id: 271, origin: 'yu-gi-oh', name: 'Occhio di Gorgone', type: 'trap', subtype: 'normal', effect: 'Fino alla fine di questo turno, tutti gli effetti dei mostri in Posizione di Difesa vengono annullati.', artOnly: true },
    // SEMPLIFICAZIONE: l'effetto reale lascia scegliere al giocatore quali
    // 2 delle carte in mano scartare dopo aver pescato — qui, non essendo
    // presente un'interfaccia di selezione dalla mano, si scartano
    // automaticamente le 2 carte appena pescate per ultime.
    { id: 272, origin: 'yu-gi-oh', name: 'Carità Aggraziata', type: 'spell', subtype: 'normal', effect: 'Pesca 3 carte, poi scarta 2 carte.', artOnly: true },
    // Effetto reale (lancio di dado: tutti i propri mostri guadagnano
    // ATK/DEF pari al risultato x100, fino a fine turno): non applicato,
    // stesso limite del buff ATK/DEF continuo spiegato più sopra —
    // gameState.atkDefBonus esiste già come infrastruttura ma nessun
    // codice lo legge ancora durante il calcolo dei danni in battaglia, e
    // qui servirebbe anche una pulizia automatica a fine turno mai
    // implementata.
    { id: 273, origin: 'yu-gi-oh', name: 'Dado Aggraziato', type: 'spell', subtype: 'quick-play', effect: 'Lancia un dado a sei facce. Tutti i mostri che controlli attualmente guadagnano ATK/DEF pari al risultato x100, fino alla fine di questo turno.', artOnly: true },
    // Chiude il riferimento incrociato di "Laser Ciclone" (id 178, già
    // presente, equipaggiabile solo su "Gradius").
    { id: 274, origin: 'yu-gi-oh', name: 'Gradius', type: 'monster', level: 4, race: 'Macchina', attribute: 'LUCE', attack: 1200, defense: 800, effect: 'Un caccia ad alte prestazioni con capsule di potenza per capacità d\'attacco variabili.', artOnly: true, vanilla: true },
    { id: 275, origin: 'yu-gi-oh', name: 'Grande Anziano Tiki', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1500, defense: 800, effect: 'Un mostro mascherato che scaglia la più letale delle maledizioni.', artOnly: true, vanilla: true },

    // ===== Importate da yugioh.com (pagina 12/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime/non parte del vero
    // TCG (dichiarato esplicitamente sulla scheda ufficiale yugioh.com):
    // "Grave Arm", "Great White Terror", "Guardian Formation", "Guardian
    // Treasure", "Hand Control", "Harpie Lady Sparrow Formation". Non
    // reimportata perché già presente con lo stesso nome: "Great Moth"
    // (id 52, Grande Falena — statistiche leggermente diverse
    // nell'originale fan-made di questo database, ma il nome coincide).
    // Effetto reale: scegli 1 Magia dal Cimitero dell'avversario e usala
    // come se fosse in mano fino a fine turno, pagando 2000 danni se la
    // usi — non applicato, richiederebbe un meccanismo di "carta presa in
    // prestito dal Cimitero avversario giocabile come dalla mano", non
    // presente nel motore.
    { id: 276, origin: 'yu-gi-oh', name: 'Tombarolo', type: 'trap', subtype: 'normal', effect: 'Scegli 1 Magia dal Cimitero del tuo avversario. Puoi usarla come se fosse nella tua mano fino alla fine del turno. Se la usi, subisci 2000 danni.', artOnly: true },
    // Effetto reale (+500 ATK continuo + i mostri dell'avversario non
    // possono cambiare Posizione di Battaglia): non applicato, stesso
    // limite del buff ATK/DEF continuo spiegato più sopra, più un
    // secondo effetto di blocco-Posizione generico non presente.
    { id: 277, origin: 'yu-gi-oh', name: 'Ascia di Gravità - Grarl', type: 'spell', subtype: 'equip', effect: 'Il mostro equipaggiato guadagna 500 ATK. I mostri controllati dal tuo avversario non possono cambiare Posizione di Battaglia.', artOnly: true },
    // Fusione di "Capelli di Serpente" (non presente in questo database) e
    // Drago Zombie (id 211, già presente!). Nessun effetto meccanico oltre
    // alle statistiche.
    { id: 278, origin: 'yu-gi-oh', name: 'Grande Mammut di Goldfine', type: 'monster', level: 6, race: 'Zombie', attribute: 'OSCURITÀ', attack: 2200, defense: 1800, extraDeck: true, category: 'fusion', effect: 'Fusione di Capelli di Serpente e Drago Zombie.', artOnly: true },
    { id: 279, origin: 'yu-gi-oh', name: 'Grande Squalo Bianco', type: 'monster', level: 4, race: 'Pesce', attribute: 'ACQUA', attack: 1600, defense: 800, effect: 'Un enorme squalo bianco con denti affilati come rasoi.', artOnly: true, vanilla: true },
    { id: 280, origin: 'yu-gi-oh', name: 'Griffore', type: 'monster', level: 4, race: 'Bestia', attribute: 'TERRA', attack: 1200, defense: 1500, effect: 'La pelle coriacea di questo mostro respinge quasi ogni attacco.', artOnly: true, vanilla: true },
    { id: 281, origin: 'yu-gi-oh', name: 'Bugroth l\'Assalitore Terrestre', type: 'monster', level: 4, race: 'Macchina', attribute: 'TERRA', attack: 1500, defense: 1000, effect: 'Un robot da battaglia di superficie, un tempo usato per la guerra navale.', artOnly: true, vanilla: true },
    // Effetto reale: dipendenza a catena su "Guardian Eatos" (ancora non
    // presente) — "Falce del Mietitore - Falce del Terrore" invece è
    // stata aggiunta come id 411 (pagina 19/26). Non può Evocare altri
    // mostri finché in campo, rinasce scartando una carta se mandata al
    // Cimitero dal campo — non applicato comunque, troppe dipendenze e
    // meccanismi non presenti.
    { id: 282, origin: 'yu-gi-oh', name: 'Guardiano Falce del Terrore', type: 'monster', level: 8, race: 'Demone', attribute: 'OSCURITÀ', attack: 2500, defense: 2000, effect: 'Non può essere Evocata Normalmente/Set. Deve essere Special Summonata tramite il proprio effetto. Se "Guardian Eatos" viene distrutta e mandata al tuo Cimitero: puoi Special Summonare questa carta dalla mano. Non puoi Evocare Normalmente/Special Summonare altri mostri finché questa carta è in campo.', artOnly: true },
    // Effetto reale: non evocabile senza "Pugnale a Farfalla - Elma" (non
    // presente in questo database) già in campo — non applicato, il
    // motore non ha un meccanismo generico di "restrizione all'Evocazione
    // basata su un'altra carta specifica sul Terreno".
    { id: 283, origin: 'yu-gi-oh', name: 'Guardiana Elma', type: 'monster', level: 3, race: 'Fata', attribute: 'VENTO', attack: 1300, defense: 1200, effect: 'Non può essere Evocata a meno che tu non controlli scoperta "Pugnale a Farfalla - Elma". Quando questa carta viene Evocata Normalmente o Special Summonata: puoi scegliere come bersaglio 1 Carta Equipaggiamento appropriata nel tuo Cimitero; equipaggiala a questa carta.', artOnly: true },
    // Coppia con "Ascia di Gravità - Grarl" (id 277, qui sopra): l'effetto
    // reale non evoca questa carta senza quella equipaggiata in campo
    // (oppure come Special Summon se è l'unica carta in mano) — non
    // applicato, stessa restrizione all'Evocazione non supportata vista
    // sopra per Guardiana Elma.
    { id: 284, origin: 'yu-gi-oh', name: 'Guardiano Grarl', type: 'monster', level: 5, race: 'Dinosauro', attribute: 'TERRA', attack: 2500, defense: 1000, effect: 'Non può essere Evocata a meno che tu non controlli scoperta "Ascia di Gravità - Grarl". Se questa carta è l\'unica nella tua mano, puoi Special Summonarla (dalla mano).', artOnly: true },
    // Effetto reale: non evocabile senza "Bastone del Silenzio - Kay'est"
    // (non presente in questo database) già in campo + immunità a effetti
    // Magia e ai bersagli d'attacco (ma non agli attacchi diretti) — non
    // applicato, stessa restrizione all'Evocazione vista sopra più
    // un'immunità agli attacchi non generalizzabile facilmente.
    { id: 285, origin: 'yu-gi-oh', name: 'Guardiano Kay\'est', type: 'monster', level: 4, race: 'Serpente di Mare', attribute: 'ACQUA', attack: 1000, defense: 1800, effect: 'Non può essere Evocato a meno che tu non controlli scoperta "Bastone del Silenzio - Kay\'est". Questa carta non è influenzata dagli effetti delle Magie e non può essere scelta come bersaglio per gli attacchi, ma questo non impedisce al tuo avversario di attaccarti direttamente.', artOnly: true },
    // Effetto reale (+400 ATK/-200 DEF continuo a un mostro VENTO
    // equipaggiato): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra.
    { id: 286, origin: 'yu-gi-oh', name: 'Ventaglio di Raffica', type: 'spell', subtype: 'equip', effect: 'Un mostro VENTO equipaggiato con questa carta guadagna 400 ATK e perde 200 DEF.', artOnly: true },
    { id: 287, origin: 'yu-gi-oh', name: 'Amante Felice', type: 'monster', level: 2, race: 'Fata', attribute: 'LUCE', attack: 800, defense: 500, effect: 'I nemici colpiti dal Raggio del Cuore emesso dalla fronte di questo piccolo cherubino diventano felicissimi.', artOnly: true, vanilla: true },
    // Chiude finalmente il riferimento incrociato di Arpia Cyber (id 172,
    // il cui nome è sempre considerato "Harpie Lady"), Scudo Cyber (id
    // 175) ed Egotista Elegante (id 224) — tutte già presenti nel
    // database ma finora senza la vera "Lady Arpia" a cui fare
    // riferimento. Vedi id 224 in card-effects.js, il cui effetto è ora
    // stato implementato dato vero questo import.
    { id: 288, origin: 'yu-gi-oh', name: 'Lady Arpia', type: 'monster', level: 4, race: 'Bestia Alata', attribute: 'VENTO', attack: 1300, defense: 1400, effect: 'Questo essere umanoide alato è bellissimo da guardare ma letale in battaglia.', artOnly: true, vanilla: true },
    // Effetto reale: se controlli 3+ "Lady Arpia"/"Sorelle Lady Arpia",
    // distruggi fino a quel numero di mostri avversari e infliggi danno
    // pari all'ATK più alto originale tra quelli distrutti, ma non puoi
    // Special Summonare né condurre la Battle Phase in questo turno — non
    // applicato, selezione multi-bersaglio + tracking di restrizioni
    // valide solo per il turno corrente non presenti nel motore.
    { id: 289, origin: 'yu-gi-oh', name: 'Lady Arpia Formazione della Fenice', type: 'spell', subtype: 'normal', effect: 'Se controlli 3 o più "Lady Arpia" e/o "Sorelle Lady Arpia": scegli come bersaglio un numero di mostri controllati dal tuo avversario pari al numero totale di "Lady Arpia" e "Sorelle Lady Arpia" che controlli; distruggili, poi infliggi al tuo avversario danno pari all\'ATK originale più alto tra i mostri distrutti. Non puoi Special Summonare mostri né condurre la tua Battle Phase nel turno in cui attivi questa carta.', artOnly: true },
    // Non può essere Evocata Normalmente/Set: deve essere prima Special
    // Summonata tramite Egotista Elegante (id 224, il cui effetto è ora
    // implementato in card-effects.js, dato che sia questa carta che Lady
    // Arpia (id 288) sono finalmente presenti nel database).
    { id: 290, origin: 'yu-gi-oh', name: 'Sorelle Lady Arpia', type: 'monster', level: 6, race: 'Bestia Alata', attribute: 'VENTO', attack: 1950, defense: 2100, effect: 'Non può essere Evocata Normalmente né Set. Deve essere prima Special Summonata tramite Egotista Elegante.', artOnly: true },
    { id: 291, origin: 'yu-gi-oh', name: 'Piumino delle Arpie', type: 'spell', subtype: 'normal', effect: 'Distruggi tutte le Magie e Trappole controllate dal tuo avversario.', artOnly: true },
    // Effetto reale: se controlli un mostro Bestia Alata VENTO, annulla
    // fino a fine turno gli effetti dei mostri attivati dall'avversario +
    // attivabile dalla mano se controlli un mostro "Harpie" + recupera
    // Piumino delle Arpie dal Deck/Cimitero se questa carta viene
    // distrutta dall'avversario — non applicato, negazione effetti
    // generica non presente + attivazione diretta dalla mano per una
    // Trappola non supportata dal motore.
    { id: 292, origin: 'yu-gi-oh', name: 'Tempesta di Piume delle Arpie', type: 'trap', subtype: 'normal', effect: 'Se controlli un mostro Bestia Alata VENTO: fino alla fine di questo turno, annulla tutti gli effetti dei mostri che il tuo avversario attiva. Se controlli un mostro "Harpie", puoi attivare questa carta dalla mano. Se questa carta, mentre è nella tua zona Magia/Trappola, viene distrutta da un effetto del tuo avversario: puoi aggiungere 1 "Piumino delle Arpie" dal tuo Deck o Cimitero alla mano.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 13/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime (dichiarato
    // esplicitamente sulla scheda ufficiale yugioh.com): "Infestation",
    // "Horned Saurus" (nonostante abbia un'apparenza da carta Fusione
    // moderna, la sua stessa scheda ufficiale conferma che non fa parte
    // del vero TCG).
    // Effetto reale (+300 ATK/DEF continuo per ogni "Lady Arpia" sul
    // Terreno): non applicato, stesso limite del buff ATK/DEF continuo
    // spiegato più sopra.
    { id: 293, origin: 'yu-gi-oh', name: 'Drago da Compagnia delle Arpie', type: 'monster', level: 7, race: 'Drago', attribute: 'VENTO', attack: 2000, defense: 2500, effect: 'Guadagna 300 ATK/DEF per ogni "Lady Arpia" sul Terreno.', artOnly: true },
    // Effetto reale (può attaccare una seconda volta in ogni Battle
    // Phase): non applicato, il motore non supporta attacchi multipli
    // dello stesso mostro nello stesso turno (stesso limite di Movimento
    // d'Onda Diffuso, id 199).
    { id: 294, origin: 'yu-gi-oh', name: 'Cavaliere Hayabusa', type: 'monster', level: 3, race: 'Guerriero', attribute: 'TERRA', attack: 1000, defense: 700, effect: 'Questa carta può attaccare una seconda volta in ogni Battle Phase.', artOnly: true },
    { id: 295, origin: 'yu-gi-oh', name: 'Scarabeo Ercole', type: 'monster', level: 5, race: 'Insetto', attribute: 'TERRA', attack: 1500, defense: 2000, effect: 'Uno scarabeo enorme con un carapace resistente e un corno pericoloso.', artOnly: true, vanilla: true },
    { id: 296, origin: 'yu-gi-oh', name: 'Eroe dell\'Est', type: 'monster', level: 3, race: 'Guerriero', attribute: 'TERRA', attack: 1100, defense: 1000, artOnly: true, vanilla: true },
    { id: 297, origin: 'yu-gi-oh', name: 'Hinotama', type: 'spell', subtype: 'normal', effect: 'Infliggi 500 danni al tuo avversario.', artOnly: true },
    { id: 298, origin: 'yu-gi-oh', name: 'Gigante Un Occhio', type: 'monster', level: 4, race: 'Guerriero Bestia', attribute: 'TERRA', attack: 1200, defense: 1000, effect: 'Un colosso con un solo occhio e braccia spesse e potenti, fatte per colpi devastanti.', artOnly: true, vanilla: true },
    { id: 299, origin: 'yu-gi-oh', name: 'Diavoletto Cornuto', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1300, defense: 1000, effect: 'Un piccolo demone che vive nel buio: il suo unico corno lo rende un avversario formidabile.', artOnly: true, vanilla: true },
    // Effetto reale (Trappola Contatore: quando un mostro sta per essere
    // Evocato, sacrifica 1 mostro per annullare l'Evocazione e distruggere
    // quel mostro): non applicato, il motore risolve già l'Evocazione
    // PRIMA di aprire la finestra di risposta dell'avversario (vedi
    // commento in testa a duel-engine.js sulle "finestre di risposta"),
    // quindi una vera negazione PRIMA della risoluzione non è
    // strutturalmente possibile con l'architettura attuale.
    { id: 300, origin: 'yu-gi-oh', name: 'Corno del Paradiso', type: 'trap', subtype: 'normal', effect: 'Quando un mostro sta per essere Evocato: sacrifica 1 mostro; annulla l\'Evocazione, e se lo fai, distruggi quel mostro.', artOnly: true },
    // Effetto reale (+700 ATK/DEF continuo + torna in cima al Deck se
    // mandata al Cimitero dal Terreno): non applicato, stesso limite del
    // buff ATK/DEF continuo spiegato più sopra, più un meccanismo di
    // "torna in cima al Deck" non presente.
    { id: 301, origin: 'yu-gi-oh', name: 'Corno dell\'Unicorno', type: 'spell', subtype: 'equip', effect: 'Il mostro equipaggiato guadagna 700 ATK e DEF. Quando questa carta viene mandata dal Terreno al Cimitero: rimettila in cima al Deck.', artOnly: true },
    { id: 302, origin: 'yu-gi-oh', name: 'Melma Umanoide', type: 'monster', level: 4, race: 'Acquatico', attribute: 'ACQUA', attack: 800, defense: 2000, effect: 'Questa melma sembra avere alcuni geni umani nel suo corredo genetico.', artOnly: true, vanilla: true },
    // Fusione di "Drago Verme" (non presente in questo database) e Melma
    // Umanoide (id 302, qui sopra!). Nessun effetto meccanico oltre alle
    // statistiche.
    { id: 303, origin: 'yu-gi-oh', name: 'Drago Verme Umanoide', type: 'monster', level: 7, race: 'Acquatico', attribute: 'ACQUA', attack: 2200, defense: 2000, extraDeck: true, category: 'fusion', effect: 'Fusione di Drago Verme e Melma Umanoide.', artOnly: true },
    { id: 304, origin: 'yu-gi-oh', name: 'Hurricail', type: 'monster', level: 2, race: 'Incantatore', attribute: 'VENTO', attack: 900, defense: 200, effect: 'Un tornado che devasta le terre desolate con venti taglienti in grado di tagliare fino all\'osso.', artOnly: true, vanilla: true },
    { id: 305, origin: 'yu-gi-oh', name: 'Hyozanryu', type: 'monster', level: 7, race: 'Drago', attribute: 'LUCE', attack: 2100, defense: 2800, effect: 'Un drago creato da un enorme diamante che scintilla di una luce accecante.', artOnly: true, vanilla: true },
    { id: 306, origin: 'yu-gi-oh', name: 'Mago Senza Volto Illusionista', type: 'monster', level: 5, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1200, defense: 2200, effect: 'Manipola gli attacchi nemici con il potere dell\'illusione.', artOnly: true, vanilla: true },
    // Effetto reale (nessun limite al numero di carte in mano): non
    // applicato, questo motore non applica MAI un limite al numero di
    // carte in mano a fine turno, quindi l'effetto di questa carta
    // sarebbe un no-op senza alcun risultato osservabile.
    { id: 307, origin: 'yu-gi-oh', name: 'Carte Infinite', type: 'spell', subtype: 'continuous', effect: 'Non c\'è alcun limite al numero di carte nella mano dei giocatori.', artOnly: true },
    // Effetto reale (distruggi durante la End Phase i mostri di Livello 3
    // o inferiore Evocati Normalmente/tramite Flip in questo turno): non
    // applicato, il motore non ha un trigger agganciato alla End Phase per
    // effetti carta generici (solo un cambio di gameState.phase), né un
    // tracking di "Evocato in questo turno" per singolo mostro.
    { id: 308, origin: 'yu-gi-oh', name: 'Congedo Infinito', type: 'trap', subtype: 'continuous', effect: 'I mostri di Livello 3 o inferiore vengono distrutti durante la End Phase del turno in cui sono stati Evocati Normalmente o tramite Flip Summon.', artOnly: true },
    // Effetto reale (+700 ATK continuo, equipaggiabile solo su un mostro
    // Tipo Insetto): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra.
    { id: 309, origin: 'yu-gi-oh', name: 'Armatura Insetto con Cannone Laser', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a un mostro Tipo Insetto. Guadagna 700 ATK.', artOnly: true },
    // Effetto reale (i mostri Tipo Insetto dell'avversario non possono
    // dichiarare un attacco): non applicato, il motore non ha un
    // meccanismo generico di divieto d'attacco per sottoinsieme di mostri
    // in base al Tipo (solo divieto totale per giocatore, es. Spada
    // Rivelatrice).
    { id: 310, origin: 'yu-gi-oh', name: 'Barriera d\'Insetti', type: 'spell', subtype: 'continuous', effect: 'I mostri Tipo Insetto controllati dal tuo avversario non possono dichiarare un attacco.', artOnly: true },
    // Effetto reale (+1000 ATK solo durante il Damage Step se attacca un
    // mostro VENTO): non applicato, il motore non ha un aggancio per
    // modificatori di ATK condizionati al Damage Step/al tipo del
    // mostro bersaglio.
    { id: 311, origin: 'yu-gi-oh', name: 'Soldati Insetto del Cielo', type: 'monster', level: 3, race: 'Insetto', attribute: 'VENTO', attack: 1000, defense: 800, effect: 'Se questa carta attacca un mostro VENTO: guadagna 1000 ATK solo durante il Damage Step.', artOnly: true },
    // Effetto reale (bandisci un proprio mostro fino alla End Phase): non
    // applicato, stessa mancanza di zona di bando temporanea con timer di
    // ritorno vista per Buco Dimensionale (id 201).
    { id: 312, origin: 'yu-gi-oh', name: 'Trasportatore di Materia Interdimensionale', type: 'trap', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro scoperto che controlli; bandiscilo fino alla End Phase.', artOnly: true },
    // Effetto reale (+400 ATK/-200 DEF continuo a un mostro TERRA
    // equipaggiato): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra.
    { id: 313, origin: 'yu-gi-oh', name: 'Rinvigorimento', type: 'spell', subtype: 'equip', effect: 'Un mostro TERRA equipaggiato con questa carta guadagna 400 ATK e perde 200 DEF.', artOnly: true },
    { id: 314, origin: 'yu-gi-oh', name: 'Medusa', type: 'monster', level: 4, race: 'Acquatico', attribute: 'ACQUA', attack: 1200, defense: 1500, effect: 'Una medusa quasi invisibile e semitrasparente che fluttua nel mare.', artOnly: true, vanilla: true },

    // ===== Importate da yugioh.com (pagina 14/26) — stesso criterio delle
    // pagine precedenti. Scartate perché SOLO anime (dichiarato
    // esplicitamente sulla scheda ufficiale yugioh.com): "Jet Gauntlet",
    // "Junk Dealer", "Jurassic Heart", "KC-1 Crayton", "Knight of Dark
    // Dragon". Non reimportata perché già presente: "Jinzo" (id 17).
    // "Kamakiriman" e "Krokodilus" sono carte reali ma pubblicate SOLO nel
    // TCG giapponese (OCG), mai stampate in inglese: incluse comunque,
    // seguendo il criterio "vera identità TCG reale" concordato con
    // l'utente (l'OCG è comunque il vero gioco di carte, non l'anime).
    // Effetto reale: si sacrifica durante la propria Standby Phase (dopo
    // essere stata Flip Summonata) per distruggere tutti i propri mostri
    // e infliggere danno pari a metà del loro ATK totale — non applicato,
    // il motore non ha un trigger agganciato alla Standby Phase per
    // effetti carta generici, né un tracking "questa carta è stata
    // Flip Summonata in un turno precedente e aspetta la prossima Standby
    // Phase".
    { id: 315, origin: 'yu-gi-oh', name: 'Bomba a Tempo', type: 'monster', level: 2, race: 'Piroico', attribute: 'FUOCO', attack: 200, defense: 1000, effect: 'FLIP: sacrifica questa carta durante la tua Standby Phase per distruggere tutti i mostri sul tuo Terreno e infliggere al tuo avversario danno pari a metà dell\'ATK totale dei mostri distrutti (esclusa questa carta).', artOnly: true },
    // Effetto reale (lancio di moneta quando dichiara un attacco: se
    // sbagli, perdi metà dei tuoi Life Points): non applicato, il motore
    // non dispatcha onAttackDeclare al PROPRIO mostro attaccante (solo
    // come finestra di risposta per il DIFENSORE, es. Kuriboh id 22).
    { id: 316, origin: 'yu-gi-oh', name: 'Jirai Gumo', type: 'monster', level: 4, race: 'Insetto', attribute: 'TERRA', attack: 2200, defense: 100, effect: 'Quando questa carta dichiara un attacco: lancia una moneta e chiamala. Se sbagli, perdi metà dei tuoi Life Points.', artOnly: true },
    { id: 317, origin: 'yu-gi-oh', name: 'Uomo Giudice', type: 'monster', level: 6, race: 'Guerriero', attribute: 'TERRA', attack: 2200, defense: 1500, effect: 'Questo guerriero armato di clava combatte fino alla fine e non si arrende mai.', artOnly: true, vanilla: true },
    { id: 318, origin: 'yu-gi-oh', name: 'Kagemusha della Fiamma Blu', type: 'monster', level: 2, race: 'Guerriero', attribute: 'TERRA', attack: 800, defense: 400, effect: 'Al servizio come sosia del Sovrano della Fiamma Blu, è un maestro spadaccino che impugna una lama pregiata.', artOnly: true, vanilla: true },
    { id: 319, origin: 'yu-gi-oh', name: 'Kairyu-Shin', type: 'monster', level: 5, race: 'Serpente di Mare', attribute: 'ACQUA', attack: 1800, defense: 1500, effect: 'Un drago marino conosciuto come il Re dell\'Oceano, attacca i nemici con enormi onde anomale.', artOnly: true, vanilla: true },
    // Effetto reale (non può essere distrutta in battaglia da un mostro
    // con lo stesso ATK + quando distrutta: fai tornare in mano 1 mostro
    // sul Terreno): non applicato, il primo effetto richiederebbe un caso
    // speciale nel calcolo dei danni in battaglia non generico, il
    // secondo richiede il trigger ON_DESTROY riservato ma mai collegato
    // (vedi commento in duel-engine.js).
    { id: 320, origin: 'yu-gi-oh', name: 'Kaiser Glider', type: 'monster', level: 6, race: 'Drago', attribute: 'LUCE', attack: 2400, defense: 2200, effect: 'Non può essere distrutta in battaglia da un mostro con lo stesso ATK. Se questa carta viene distrutta e mandata al Cimitero: scegli come bersaglio 1 mostro sul Terreno; fallo tornare in mano.', artOnly: true },
    // Effetto reale (può essere considerata come 2 Tributi per
    // un'Evocazione Tributo di un mostro LUCE): non applicato, il conteggio
    // dei Tributi nel motore è generico (ogni mostro sacrificato vale
    // sempre 1), stesso limite del caso speciale di Gilford il Fulmine
    // (id 267).
    { id: 321, origin: 'yu-gi-oh', name: 'Kaiser Sea Horse', type: 'monster', level: 4, race: 'Serpente di Mare', attribute: 'LUCE', attack: 1700, defense: 1650, effect: 'Questa carta può essere considerata come 2 Tributi per l\'Evocazione Tributo di un mostro LUCE.', artOnly: true },
    // Effetto reale (immunità agli attacchi condizionata + cerca
    // "Polymerization"/Fusione dal Deck in Main Phase + Special Summon se
    // bandita): non applicato, troppe clausole complesse (ricerca dal
    // Deck + meccanica di bando) per un'unica carta.
    { id: 322, origin: 'yu-gi-oh', name: 'Kaitoptera', type: 'monster', level: 4, race: 'Dinosauro', attribute: 'VENTO', attack: 1400, defense: 1000, effect: 'Se il tuo avversario controlla 2 o più mostri scoperti (eccetto mostri VENTO), quei mostri non possono scegliere questa carta come bersaglio per gli attacchi. Durante il tuo Main Phase: puoi aggiungere 1 "Fusione" dal Deck alla mano. Se questa carta viene bandita: puoi Special Summonarla, poi puoi aggiungere 1 "Fusione" dal Cimitero alla mano.', artOnly: true },
    { id: 323, origin: 'yu-gi-oh', name: 'Kamakiriman', type: 'monster', level: 4, race: 'Insetto', attribute: 'TERRA', attack: 1150, defense: 1400, effect: 'Un uomo a forma di mantide con due falci affilate come rasoi.', artOnly: true, vanilla: true },
    // Effetto reale (Effetto Veloce durante il calcolo dei danni: rendi 0
    // l'ATK del mostro attaccante per questo combattimento, una sola volta
    // finché scoperta): non applicato, la finestra di risposta del motore
    // controlla solo Magie/Trappole Set e la mano del difensore, mai il
    // suo Terreno mostri, e consuma sempre la carta rispondente — un
    // mostro scoperto che usa il proprio effetto senza lasciare il campo
    // non è supportato da questo meccanismo (vedi respondWindow in
    // duel-engine.js).
    { id: 324, origin: 'yu-gi-oh', name: 'Kazejin', type: 'monster', level: 7, race: 'Incantatore', attribute: 'VENTO', attack: 2400, defense: 2200, effect: 'Durante il calcolo dei danni, se questa carta viene attaccata (Effetto Veloce): puoi rendere 0 l\'ATK del mostro attaccante solo durante questo calcolo dei danni. Puoi usare questo effetto di "Kazejin" solo una volta finché è scoperta in campo.', artOnly: true },
    { id: 325, origin: 'yu-gi-oh', name: 'Ago Killer', type: 'monster', level: 4, race: 'Insetto', attribute: 'VENTO', attack: 1200, defense: 1000, effect: 'Un\'ape enorme dalla forza eccezionale, particolarmente pericolosa in sciame.', artOnly: true, vanilla: true },
    // Effetto reale (+2000 ATK/DEF durante il calcolo dei danni se
    // combatte contro un mostro Tipo Guerriero): non applicato, stesso
    // limite del bonus condizionato al Damage Step spiegato per Soldati
    // Insetto del Cielo (id 311).
    { id: 326, origin: 'yu-gi-oh', name: 'Soldato Cinetico', type: 'monster', level: 3, race: 'Macchina', attribute: 'TERRA', attack: 1350, defense: 1800, effect: 'Durante il calcolo dei danni, se questa carta combatte contro un mostro Tipo Guerriero: guadagna 2000 ATK e DEF solo durante questo calcolo dei danni.', artOnly: true },
    { id: 327, origin: 'yu-gi-oh', name: 'Re di Yamimakai', type: 'monster', level: 5, race: 'Demone', attribute: 'OSCURITÀ', attack: 2000, defense: 1530, effect: 'Impugna il potere dell\'oscurità per distruggere i suoi nemici.', artOnly: true, vanilla: true },
    // Effetto reale (se attaccata scoperta in Difesa: diventa una Carta
    // Equipaggiamento sul mostro attaccante, niente calcolo danni; cura LP
    // pari a metà dell'ATK del mostro equipaggiato ad ogni Standby Phase
    // avversaria): non applicato, un mostro che si trasforma in una Carta
    // Equipaggiamento è un cambio di tipo-carta non supportato dal motore.
    { id: 328, origin: 'yu-gi-oh', name: 'Kiseitai', type: 'monster', level: 2, race: 'Demone', attribute: 'OSCURITÀ', attack: 300, defense: 800, effect: 'Quando un mostro dell\'avversario attacca questa carta coperta in Posizione di Difesa: questa carta diventa una Carta Equipaggiamento equipaggiata al mostro attaccante (niente calcolo dei danni). Durante ciascuna Standby Phase del tuo avversario: aumenta i tuoi Life Points di metà dell\'ATK del mostro equipaggiato con questa carta.', artOnly: true },
    // Effetto reale: sacrifica "Mago Nero" (id 2, già presente) per
    // Special Summon "Cavaliere Mago Nero" (Dark Magician Knight, non
    // presente in questo database) dalla mano, dal Deck o dal Cimitero —
    // non applicato, la carta bersaglio dell'evocazione non esiste in
    // questo database.
    { id: 329, origin: 'yu-gi-oh', name: 'Titolo del Cavaliere', type: 'spell', subtype: 'normal', effect: 'Sacrifica 1 "Mago Nero" scoperto; Special Summon 1 "Cavaliere Mago Nero" dalla mano, dal Deck o dal Cimitero.', artOnly: true },
    { id: 330, origin: 'yu-gi-oh', name: 'Kojikocy', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1500, defense: 1200, effect: 'Un cacciatore di uomini con braccia potenti in grado di frantumare massi.', artOnly: true, vanilla: true },
    { id: 331, origin: 'yu-gi-oh', name: 'Drago Koumori', type: 'monster', level: 4, race: 'Drago', attribute: 'OSCURITÀ', attack: 1500, defense: 1200, effect: 'Un drago vizioso e sputafuoco la cui fiamma malvagia corrompe l\'anima delle sue vittime.', artOnly: true, vanilla: true },
    { id: 332, origin: 'yu-gi-oh', name: 'Krokodilus', type: 'monster', level: 4, race: 'Rettile', attribute: 'ACQUA', attack: 1100, defense: 1200, effect: 'Un coccodrillo feroce e straordinariamente intelligente.', artOnly: true, vanilla: true },

    // ===== Importate da yugioh.com (pagina 15/26) — stesso criterio delle
    // pagine precedenti. Scartata perché SOLO anime (confermata anche
    // nel database ufficiale Konami, non solo su yugioh.com): "Limit
    // Tribute". Non reimportate perché già presenti: "Kuriboh" (id 22),
    // "Left Arm of the Forbidden One" (id 42, Braccio Sx del Proibito),
    // "Left Leg of the Forbidden One" (id 44, Gamba Sx del Proibito) — le
    // 5 carte di Exodia erano già tutte nel set originale di 76 carte
    // (vedi correzione al commento di id 41). "Kuribandit" e "Legion the Fiend
    // Jester" hanno la dicitura anime-only obsoleta su yugioh.com ma sono
    // confermate carte TCG reali nel database ufficiale Konami (la pagina
    // yugioh.com non è mai stata aggiornata dopo la loro stampa fisica).
    // "Living Arrow" (nome anime) è stata stampata nel vero TCG come
    // "Spell Shattering Arrow": usata qui la vera identità TCG, come da
    // criterio concordato con l'utente.
    // Effetto reale (Trappola a doppia modalità: cambia in Difesa il
    // mostro attaccante dell'avversario, E/O si equipaggia a un proprio
    // mostro per +500 ATK): non applicato, è una carta a doppio-modo
    // troppo esotica (contemporaneamente Trappola-risposta e
    // Trappola-che-diventa-Equip) per i meccanismi generici già presenti.
    { id: 333, origin: 'yu-gi-oh', name: 'Kunai con Catena', type: 'trap', subtype: 'normal', effect: 'Attiva 1 o entrambi questi effetti (simultaneamente): ●Quando un mostro dell\'avversario dichiara un attacco: scegli come bersaglio il mostro attaccante; cambialo in Posizione di Difesa. ●Scegli come bersaglio 1 tuo mostro scoperto; equipaggia questa carta a quel bersaglio. Guadagna 500 ATK.', artOnly: true },
    // Effetto reale (durante la End Phase, se Evocata Normalmente in
    // questo turno: sacrificala per scavare le prime 5 carte del Deck,
    // aggiungerne 1 Magia/Trappola alla mano, il resto al Cimitero): non
    // applicato, il motore non ha un trigger agganciato alla End Phase per
    // effetti carta generici (stesso limite di Congedo Infinito, id 308).
    { id: 334, origin: 'yu-gi-oh', name: 'Kuribandit', type: 'monster', level: 3, race: 'Demone', attribute: 'OSCURITÀ', attack: 1000, defense: 700, effect: 'Durante la End Phase, se questa carta è stata Evocata Normalmente in questo turno: puoi sacrificarla; scava le prime 5 carte del tuo Deck, puoi aggiungere 1 Magia/Trappola scavata alla mano, poi manda le carte rimanenti al Cimitero.', artOnly: true },
    { id: 335, origin: 'yu-gi-oh', name: 'La Jinn il Genio Mistico della Lampada', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1800, defense: 1000, effect: 'Un genio della lampada al servizio del suo padrone.', artOnly: true, vanilla: true },
    // Fusione di Lupo Giga-Tech (id 264, già presente!) e "Cannon
    // Soldier" (non presente in questo database). Nessun effetto
    // meccanico oltre alle statistiche.
    { id: 336, origin: 'yu-gi-oh', name: 'Carro Armato del Labirinto', type: 'monster', level: 7, race: 'Macchina', attribute: 'OSCURITÀ', attack: 2400, defense: 2400, extraDeck: true, category: 'fusion', effect: 'Fusione di Lupo Giga-Tech e Soldato Cannone.', artOnly: true },
    { id: 337, origin: 'yu-gi-oh', name: 'Muro del Labirinto', type: 'monster', level: 5, race: 'Roccia', attribute: 'TERRA', attack: 0, defense: 3000, effect: 'Queste mura formano un labirinto senza uscita per i nemici.', artOnly: true, vanilla: true },
    { id: 338, origin: 'yu-gi-oh', name: 'Dama della Fede', type: 'monster', level: 3, race: 'Incantatore', attribute: 'LUCE', attack: 1100, defense: 800, effect: 'Placa le anime altrui recitando un misterioso incantesimo.', artOnly: true, vanilla: true },
    // Effetto reale: Special Summonabile solo sacrificando "Falena
    // Piccola" (non presente in questo database) al 2° turno dopo che è
    // stata equipaggiata con Bozzolo dell'Evoluzione (id 51/157, già
    // presente) — non applicato, dipendenza a catena su una carta non
    // presente + tracking multi-turno non supportato.
    { id: 339, origin: 'yu-gi-oh', name: 'Larva della Falena', type: 'monster', level: 2, race: 'Insetto', attribute: 'TERRA', attack: 500, defense: 400, effect: 'Non può essere Evocata Normalmente né Set. Questa carta può essere Special Summonata solo sacrificando "Falena Piccola" al 2° dei tuoi turni dopo che "Falena Piccola" è stata equipaggiata con "Bozzolo dell\'Evoluzione".', artOnly: true },
    // Effetto reale (+300 ATK/DEF continuo, equipaggiabile solo su un
    // mostro Tipo Insetto): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra.
    { id: 340, origin: 'yu-gi-oh', name: 'Armatura Cannone Laser', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a un mostro Tipo Insetto. Guadagna 300 ATK e DEF.', artOnly: true },
    // Effetto reale (attivabile solo nel turno dell'avversario con 1000 o
    // meno Life Points: manda al Cimitero tutte le altre carte sul
    // Terreno/in mano di entrambi i giocatori, poi l'avversario Special
    // Summon 1 mostro e attacca; chi resta con un mostro solo alla fine
    // del turno vince): non applicato, il motore non ha condizioni di
    // vittoria alternative oltre a "LP a 0" ed Exodia (hardcoded).
    { id: 341, origin: 'yu-gi-oh', name: 'Ultimo Turno', type: 'trap', subtype: 'normal', effect: 'Attivabile solo nel turno del tuo avversario, quando i tuoi Life Points sono 1000 o meno. Scegli 1 mostro sul tuo Terreno e manda tutte le altre carte sul Terreno e nelle mani di entrambi i giocatori ai rispettivi Cimiteri. Poi il tuo avversario sceglie e Special Summona 1 mostro dal proprio Deck scoperto in Posizione di Attacco e attacca il tuo mostro scelto (il danno da questa battaglia è sempre 0). Il giocatore il cui mostro resta da solo sul Terreno alla End Phase di questo turno vince il Duello. In ogni altro caso è Pareggio.', artOnly: true },
    { id: 342, origin: 'yu-gi-oh', name: 'Ragno Lanciarazzi', type: 'monster', level: 7, race: 'Macchina', attribute: 'FUOCO', attack: 2200, defense: 2500, effect: 'Un ragno meccanico con lanciarazzi capaci di fuoco casuale.', artOnly: true, vanilla: true },
    // "Swamp Battleguard" era già presente fin dal set originale come id
    // 74 "Guardiano della Palude" (con l'identico effetto speculare
    // "+500 ATK per ogni Guardiano di Lava controllato" — le due carte si
    // richiamano a vicenda). Effetto reale (+500 ATK per ogni "Swamp
    // Battleguard" controllato): comunque non applicato, stesso limite
    // del buff ATK/DEF continuo spiegato più sopra — gameState.atkDefBonus
    // esiste come infrastruttura ma nessun codice lo legge ancora durante
    // il calcolo dei danni in battaglia.
    { id: 343, origin: 'yu-gi-oh', name: 'Guardiano di Lava', type: 'monster', level: 5, race: 'Guerriero', attribute: 'TERRA', attack: 1550, defense: 1800, effect: 'Guadagna 500 ATK per ogni "Guardiano della Palude" che controlli.', artOnly: true },
    // Effetto reale (+300 ATK/DEF continuo, equipaggiabile solo su un
    // mostro Tipo Guerriero): non applicato, stesso limite del buff
    // ATK/DEF continuo spiegato più sopra.
    { id: 344, origin: 'yu-gi-oh', name: 'Spada Leggendaria', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a un mostro Tipo Guerriero. Guadagna 300 ATK e DEF.', artOnly: true },
    // Effetto reale (può attaccare direttamente i Life Points
    // dell'avversario): non applicato, stesso limite di Gear Golem la
    // Fortezza Mobile (id 257) — il motore non ha un meccanismo generico
    // per "questo mostro può sempre attaccare direttamente".
    { id: 345, origin: 'yu-gi-oh', name: 'Leghul', type: 'monster', level: 1, race: 'Insetto', attribute: 'TERRA', attack: 300, defense: 350, effect: 'Questo mostro può attaccare direttamente i Life Points del tuo avversario.', artOnly: true },
    // Effetto reale (Evocazione Tributo extra di un mostro Incantatore in
    // aggiunta alla propria Evocazione Normale + recupero da Cimitero se
    // mandata al Cimitero dal campo): non applicato, il motore non
    // supporta un'Evocazione Tributo aggiuntiva oltre a quella Normale del
    // turno.
    { id: 346, origin: 'yu-gi-oh', name: 'Legion il Giullare Demoniaco', type: 'monster', level: 4, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1300, defense: 1500, effect: 'Durante il tuo Main Phase, puoi Evocare Tributo 1 mostro Incantatore in Posizione di Attacco, in aggiunta alla tua Evocazione Normale/Set (solo una volta per turno). Se questa carta viene mandata dal campo al Cimitero: puoi aggiungere 1 mostro Normale Incantatore dal Deck o dal Cimitero alla mano.', artOnly: true },
    { id: 347, origin: 'yu-gi-oh', name: 'Leogun', type: 'monster', level: 5, race: 'Bestia', attribute: 'TERRA', attack: 1750, defense: 1550, effect: 'Un mostro enorme con una criniera simile a quella del Re degli Animali.', artOnly: true, vanilla: true },
    // Effetto reale (bandisci 1 carta casuale dalla mano dell'avversario;
    // torna in mano dopo 4 Standby Phase dell'avversario): non applicato,
    // richiederebbe selezione casuale dalla mano avversaria + tracking
    // multi-turno del ritorno, entrambi non presenti nel motore.
    { id: 348, origin: 'yu-gi-oh', name: 'Spada della Forza di Luce', type: 'trap', subtype: 'normal', effect: 'Bandisci 1 carta a caso dalla mano del tuo avversario, coperta. Durante la 4ª Standby Phase del tuo avversario dopo l\'attivazione di questa carta: restituiscigliela.', artOnly: true },
    // Effetto reale (+800 ATK continuo, equipaggiabile solo su un mostro
    // Tipo Guerriero, + tutti i mostri ACQUA sul Terreno perdono 500 ATK):
    // non applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra, più un secondo debuff generico non presente.
    { id: 349, origin: 'yu-gi-oh', name: 'Lama Fulminante', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a un mostro Tipo Guerriero. Guadagna 800 ATK. Tutti i mostri ACQUA sul Terreno perdono 500 ATK.', artOnly: true },
    // Effetto reale (raddoppia l'ATK di tutti i propri mostri Tipo
    // Macchina fino a fine turno, poi li distruggi nella End Phase): non
    // applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra, più la mancanza di un trigger agganciato alla End Phase
    // (stesso limite di Congedo Infinito, id 308).
    { id: 350, origin: 'yu-gi-oh', name: 'Rimozione del Limitatore', type: 'spell', subtype: 'quick-play', effect: 'Raddoppia l\'ATK di tutti i mostri Tipo Macchina che controlli attualmente, fino alla fine di questo turno. Durante la End Phase di questo turno: distruggi quei mostri.', artOnly: true },
    // Effetto reale (una volta per turno, durante la propria End Phase:
    // puoi cambiare la Posizione di Battaglia di questa carta): non
    // applicato, stessa mancanza di trigger agganciato alla End Phase.
    { id: 351, origin: 'yu-gi-oh', name: 'Piccola Guardia Alata', type: 'monster', level: 4, race: 'Guerriero', attribute: 'VENTO', attack: 1400, defense: 1800, effect: 'Una volta per turno, durante la tua End Phase: puoi cambiare la Posizione di Battaglia di questa carta.', artOnly: true },
    { id: 352, origin: 'yu-gi-oh', name: 'Freccia Spezza-Magie', type: 'spell', subtype: 'quick-play', effect: 'Distruggi il maggior numero possibile di Magie scoperte controllate dal tuo avversario, e se lo fai, infliggi 500 danni al tuo avversario per ciascuna.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 16/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime anche nel
    // database ufficiale Konami (non solo dicitura obsoleta su
    // yugioh.com): "Magical Academy", "Magical Pigeon", "Magical Trick
    // Mirror", "Martyr's Curse". "Man-Eating Plant" è una carta reale ma
    // pubblicata SOLO nel TCG giapponese (OCG): inclusa comunque, stesso
    // criterio di Kamakiriman/Krokodilus (pagina 14/26).
    // Effetto reale (nessun giocatore può scegliere come bersaglio mostri
    // Tipo Drago sul Terreno con effetti carta): non applicato, il motore
    // non ha un controllo centralizzato di "legalità del bersaglio" prima
    // di ogni effetto — servirebbe modificare ogni singolo effetto già
    // registrato per rispettarlo.
    { id: 353, origin: 'yu-gi-oh', name: 'Signore dei D.', type: 'monster', level: 4, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1200, defense: 1100, effect: 'Nessun giocatore può scegliere come bersaglio mostri Tipo Drago sul Terreno con effetti di carta.', artOnly: true },
    // Rituale ora Evocabile davvero tramite "Trasmigrazione Occhi Rossi"
    // (id 414, pagina 19/26 — vedi effetto implementato in
    // card-effects.js). Effetto reale del mostro stesso (una volta per
    // turno per ciascun giocatore, quando una carta/effetto viene
    // attivato: distruggi 1 mostro sul Terreno; stesso per 1
    // Magia/Trappola): non applicato, troppo simile a un floodgate
    // generico non presente nel motore.
    { id: 354, origin: 'yu-gi-oh', name: 'Signore del Rosso', type: 'monster', level: 8, race: 'Drago', attribute: 'FUOCO', attack: 2400, defense: 2100, category: 'ritual', effect: 'Evocabile Rituale solo tramite "Trasmigrazione Occhi Rossi". Una volta per turno, per ciascun giocatore, quando una carta o un effetto viene attivato (eccetto questa carta): puoi scegliere come bersaglio 1 mostro sul Terreno; distruggilo. Una volta per turno, per ciascun giocatore, quando una carta o un effetto viene attivato (eccetto questa carta): puoi scegliere come bersaglio 1 Magia/Trappola sul Terreno; distruggila.', artOnly: true },
    { id: 355, origin: 'yu-gi-oh', name: 'Signore di Zemia', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1300, defense: 1000, effect: 'Un\'entità malvagia che manipola i nemici verso un cammino di distruzione.', artOnly: true, vanilla: true },
    // Effetto reale (paga 2000 LP, dichiara il nome di 1 mostro:
    // l'avversario guarda il proprio Deck, rivela 1 copia se presente e
    // sceglie se aggiungerla alla mano di chi ha attivato la carta oppure
    // Special Summonarla, ignorando le condizioni di evocazione): non
    // applicato, richiederebbe una ricerca-e-rivelazione dal Deck con
    // scelta dell'avversario, meccanismo troppo specifico non presente.
    { id: 356, origin: 'yu-gi-oh', name: 'Ninna Nanna dell\'Obbedienza', type: 'spell', subtype: 'normal', effect: 'Paga 2000 Life Points e dichiara il nome di 1 Mostro; il tuo avversario guarda il proprio Deck, rivela 1 copia del mostro dichiarato se presente, e sceglie 1 di questi effetti: ●Il mostro dichiarato viene aggiunto alla mano di chi ha attivato questa carta. ●Chi ha attivato questa carta Special Summona il mostro dichiarato sul proprio Terreno in Posizione di Attacco, ignorando le condizioni di Evocazione.', artOnly: true },
    { id: 357, origin: 'yu-gi-oh', name: 'M-Guerriero #1', type: 'monster', level: 3, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 1000, defense: 500, effect: 'Specializzato in attacchi combinati, questo guerriero usa il magnetismo per bloccare la fuga di un nemico.', artOnly: true, vanilla: true },
    // Effetto reale (+300 ATK/DEF continuo, equipaggiabile solo su un
    // mostro Tipo Macchina): non applicato, stesso limite del buff
    // ATK/DEF continuo spiegato più sopra.
    { id: 358, origin: 'yu-gi-oh', name: 'Fabbrica di Conversione Meccanica', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a un mostro Tipo Macchina. Guadagna 300 ATK e DEF.', artOnly: true },
    // Effetto reale (+100 ATK per ogni mostro Tipo Macchina sul Terreno,
    // di entrambi i giocatori): non applicato, stesso limite del buff
    // ATK/DEF continuo spiegato più sopra.
    { id: 359, origin: 'yu-gi-oh', name: 'Re Macchina', type: 'monster', level: 6, race: 'Macchina', attribute: 'TERRA', attack: 2200, defense: 2000, effect: 'Guadagna 100 ATK per ogni mostro Tipo Macchina sul Terreno.', artOnly: true },
    // Effetto reale (danno perforante se attacca un mostro in Posizione di
    // Difesa): non applicato, il motore non ha un meccanismo di danno
    // perforante generico riutilizzabile (stesso limite di Furia del
    // Drago, id 212).
    { id: 360, origin: 'yu-gi-oh', name: 'Bestia Spada Impazzita', type: 'monster', level: 4, race: 'Dinosauro', attribute: 'TERRA', attack: 1400, defense: 1200, effect: 'Se questa carta attacca un mostro in Posizione di Difesa, infliggi danno perforante al tuo avversario.', artOnly: true },
    // Effetto reale (Trappola Contatore: quando l'avversario attiva una
    // Magia, scarta 1 carta per annullarla e distruggerla): non
    // applicato, il motore non ha un trigger per "l'avversario ha appena
    // attivato una Magia" (solo Evocazioni e dichiarazioni d'attacco
    // aprono finestre di risposta — vedi TRIGGER in duel-engine.js).
    { id: 361, origin: 'yu-gi-oh', name: 'Interferenza Magica', type: 'trap', subtype: 'normal', effect: 'Quando una Magia viene attivata: scarta 1 carta; annulla l\'attivazione, e se lo fai, distruggila.', artOnly: true },
    // Effetto reale (se controlli un mostro Incantatore: sacrifica 1
    // mostro per Special Summon 1 mostro Incantatore dalla mano, poi puoi
    // distruggere 1 mostro sul Terreno): non applicato, sequenza
    // multi-passo troppo specifica (sacrificio + evocazione scelta dalla
    // mano + distruzione opzionale) per i pattern già presenti.
    { id: 362, origin: 'yu-gi-oh', name: 'Dimensione Magica', type: 'spell', subtype: 'quick-play', effect: 'Se controlli un mostro Incantatore: scegli come bersaglio 1 mostro che controlli; sacrificalo, poi Special Summon 1 mostro Incantatore dalla tua mano, poi puoi distruggere 1 mostro sul Terreno.', artOnly: true },
    // Effetto reale (gioco di prestigio con 2 Magie/Trappole dal Deck + 1
    // mostro, mescolati coperti sul Terreno come token 0/0): non
    // applicato, meccanismo troppo esotico (carte-Deck trasformate in
    // "gusci" indistinguibili) per questo motore.
    { id: 363, origin: 'yu-gi-oh', name: 'Cappelli Magici', type: 'trap', subtype: 'normal', effect: 'Durante la Battle Phase del tuo avversario: scegli 2 Magie/Trappole dal tuo Deck e 1 mostro nella tua Main Monster Zone. Special Summonale come Mostri Normali (ATK 0/DEF 0) coperti in Posizione di Difesa, Set il mostro scelto se era scoperto, e mescolale sul Terreno. Le 2 carte scelte dal Deck vengono distrutte alla fine della Battle Phase.', artOnly: true },
    // Equipaggiabile solo a Muro del Labirinto (id 337, già presente!).
    // Effetto reale (sacrifica il mostro equipaggiato per Special Summon
    // "Wall Shadow" dal Deck, carta non presente in questo database): non
    // applicato.
    { id: 364, origin: 'yu-gi-oh', name: 'Labirinto Magico', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a "Muro del Labirinto". Puoi sacrificare il mostro equipaggiato; Special Summon "Wall Shadow" dal tuo Deck.', artOnly: true },
    // Effetto reale (+500 ATK per ogni Carta Equipaggiamento equipaggiata
    // a questa carta): non applicato, stesso limite del buff ATK/DEF
    // continuo spiegato più sopra.
    { id: 365, origin: 'yu-gi-oh', name: 'Maha Vailo', type: 'monster', level: 4, race: 'Incantatore', attribute: 'LUCE', attack: 1550, defense: 1400, effect: 'Guadagna 500 ATK per ogni Carta Equipaggiamento equipaggiata a questa carta.', artOnly: true },
    // SEMPLIFICAZIONE: manca la clausola finale dell'effetto reale ("non
    // puoi condurre la tua Battle Phase in questo turno") — il motore non
    // ha un meccanismo per bloccare la Battle Phase di un giocatore per
    // il resto del turno corrente.
    { id: 366, origin: 'yu-gi-oh', name: 'Makiu, la Nebbia Magica', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 "Teschio Evocato" o 1 mostro Tipo Tuono che controlli; distruggi tutti i mostri controllati dal tuo avversario con DEF pari o inferiore all\'ATK di quel mostro.', artOnly: true },
    { id: 367, origin: 'yu-gi-oh', name: 'Cimitero dei Mammut', type: 'monster', level: 3, race: 'Dinosauro', attribute: 'TERRA', attack: 1200, defense: 800, effect: 'Un mammut che protegge le tombe del suo branco ed è assolutamente spietato con i profanatori di tombe.', artOnly: true, vanilla: true },
    { id: 368, origin: 'yu-gi-oh', name: 'Pianta Mangiauomini', type: 'monster', level: 2, race: 'Pianta', attribute: 'TERRA', attack: 800, defense: 600, effect: 'Una pianta carnivora attraente alla vista ma pericolosa da avvicinare.', artOnly: true, vanilla: true },
    { id: 369, origin: 'yu-gi-oh', name: 'Masaki lo Spadaccino Leggendario', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1100, defense: 1100, effect: 'Il leggendario maestro di spada Masaki è un veterano di oltre 100 battaglie.', artOnly: true, vanilla: true },
    // Effetto reale (scegli 1 Magia scoperta sul Terreno: il suo
    // controllore subisce 500 danni ad ogni tua Standby Phase; distrutta
    // se la carta scelta lascia il Terreno): non applicato, il motore non
    // ha un trigger agganciato alla Standby Phase per effetti carta
    // generici (stesso limite di Exodia Necross, id 230).
    { id: 370, origin: 'yu-gi-oh', name: 'Maschera di Dissoluzione', type: 'spell', subtype: 'continuous', effect: 'Scegli 1 Magia scoperta sul Terreno. Il controllore di quella Magia subisce 500 danni durante ciascuna tua Standby Phase. Quando la carta scelta lascia il Terreno: distruggi questa carta.', artOnly: true },
    // Effetto reale (nessun giocatore può sacrificare carte): non
    // applicato, richiederebbe un nuovo flag globale consultato dal
    // flusso di selezione dei Tributi in actions.js (startTributeSelection
    // e le funzioni collegate), non presente.
    { id: 371, origin: 'yu-gi-oh', name: 'Maschera della Restrizione', type: 'trap', subtype: 'continuous', effect: 'Nessun giocatore può sacrificare carte.', artOnly: true },
    // Effetto reale (il mostro equipaggiato non può attaccare + infligge
    // 500 danni al suo controllore ad ogni tua Standby Phase): non
    // applicato, stessa mancanza di trigger agganciato alla Standby Phase.
    { id: 372, origin: 'yu-gi-oh', name: 'Maschera del Maledetto', type: 'spell', subtype: 'equip', effect: 'Il mostro equipaggiato non può attaccare. Una volta per turno, durante la tua Standby Phase: infliggi 500 danni al controllore del mostro equipaggiato.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 17/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime anche nel
    // database ufficiale Konami: "Mesmeric Control", "Mimesis", "Monster
    // Replace". Non reimportate perché già presenti: "Monster Reborn"
    // (id 35, Rinascita del Mostro), "Mind Control" (id 130, Controllo
    // Mentale).
    { id: 373, origin: 'yu-gi-oh', name: 'MechanicalChaser', type: 'monster', level: 4, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1850, defense: 800, effect: 'Un cacciatore che insegue senza sosta il proprio bersaglio per ordine del Re Macchina.', artOnly: true, vanilla: true },
    { id: 374, origin: 'yu-gi-oh', name: 'Megazowler', type: 'monster', level: 6, race: 'Dinosauro', attribute: 'TERRA', attack: 1800, defense: 2000, effect: 'Niente si mette sulla strada di questo dinosauro coperto di spuntoni!', artOnly: true, vanilla: true },
    { id: 375, origin: 'yu-gi-oh', name: 'Guardiano di Metallo', type: 'monster', level: 5, race: 'Demone', attribute: 'OSCURITÀ', attack: 1150, defense: 2150, effect: 'Un demone a guardia dei tesori degli inferi, si sente più a suo agio nel buio.', artOnly: true, vanilla: true },
    // Effetto reale (+300 ATK/DEF continuo all'equipaggiamento + bonus
    // ATK pari a metà dell'ATK del bersaglio durante il calcolo dei
    // danni): non applicato, stesso limite del buff ATK/DEF continuo
    // spiegato più sopra.
    { id: 376, origin: 'yu-gi-oh', name: 'Metalmorfosi', type: 'trap', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro scoperto sul Terreno; equipaggia questa carta a quel bersaglio. Guadagna 300 ATK/DEF. Se attacca, guadagna ATK pari a metà dell\'ATK del bersaglio dell\'attacco, solo durante il calcolo dei danni.', artOnly: true },
    // Effetto reale: Special Summonabile solo dal Deck sacrificando "Zoa"
    // (non presente in questo database) equipaggiata con Metalmorfosi (id
    // 376, qui sopra) — non applicato, dipendenza a catena su una carta
    // non presente.
    { id: 377, origin: 'yu-gi-oh', name: 'Metalzoa', type: 'monster', level: 8, race: 'Macchina', attribute: 'OSCURITÀ', attack: 3000, defense: 2300, effect: 'Non può essere Evocata Normalmente/Set. Deve prima essere Special Summonata dal Deck sacrificando "Zoa" equipaggiata con "Metalmorfosi".', artOnly: true },
    { id: 378, origin: 'yu-gi-oh', name: 'Meteora della Distruzione', type: 'spell', subtype: 'normal', effect: 'Se i Life Points del tuo avversario sono superiori a 3000: infliggi 1000 danni al tuo avversario.', artOnly: true },
    // Effetto reale (in questo turno, quando i tuoi mostri attaccano con
    // ATK superiore alla DEF del mostro avversario in Posizione di
    // Difesa: infliggi la differenza come danno da battaglia): non
    // applicato, richiederebbe modificare il calcolo dei danni in
    // actions.js (resolveBattleDamage) per aggiungere un bonus condizionato
    // a una Trappola attiva, meccanismo non presente.
    { id: 379, origin: 'yu-gi-oh', name: 'Meteorain', type: 'trap', subtype: 'normal', effect: 'In questo turno, quando i tuoi mostri attaccano con ATK superiore alla DEF del mostro dell\'avversario in Posizione di Difesa: infliggi la differenza come danno da battaglia ai Life Points del tuo avversario.', artOnly: true },
    // Effetto reale (quando un mostro viene mandato dal Terreno al tuo
    // Cimitero, anche durante il Damage Step: distruggi 1 mostro sul
    // Terreno): non applicato, il motore ha il trigger ON_DESTROY
    // riservato ma mai collegato a nessuna carta (vedi commento in
    // duel-engine.js, stesso limite di Germe Gigante id 259 e Kaiser
    // Glider id 320).
    { id: 380, origin: 'yu-gi-oh', name: 'Michizure', type: 'trap', subtype: 'normal', effect: 'Quando un mostro viene mandato dal Terreno al tuo Cimitero, anche durante il Damage Step: scegli come bersaglio 1 mostro sul Terreno; distruggilo.', artOnly: true },
    // Effetto reale: Special Summonabile solo tramite "Cavaliere Fiamma
    // Oscura" (non presente in questo database) + guadagna ATK pari
    // all'ATK originale del mostro avversario durante il calcolo dei
    // danni + si bandisce da sola a fine turno se ha attaccato/è stata
    // attaccata — non applicato, dipendenza a catena su una carta non
    // presente.
    { id: 381, origin: 'yu-gi-oh', name: 'Cavaliere del Miraggio', type: 'monster', level: 8, race: 'Guerriero', attribute: 'LUCE', attack: 2800, defense: 2000, effect: 'Non può essere Evocato Normalmente/Set. Deve essere Special Summonato tramite "Cavaliere Fiamma Oscura" e non può esserlo in altro modo. Solo durante il calcolo dei danni, questa carta guadagna ATK pari all\'ATK originale del mostro avversario con cui sta combattendo. Durante la End Phase di un turno in cui questa carta ha attaccato o è stata attaccata: bandiscila.', artOnly: true },
    { id: 382, origin: 'yu-gi-oh', name: 'Forza dello Specchio', type: 'trap', subtype: 'normal', effect: 'Quando un mostro dell\'avversario dichiara un attacco: distruggi tutti i mostri in Posizione di Attacco controllati dal tuo avversario.', artOnly: true },
    // Effetto reale (dimezza l'ATK di ogni mostro avversario che ha
    // attaccato mentre questa carta era scoperta, finché resta scoperta +
    // paga 2000 LP o si autodistrugge ad ogni tua Standby Phase): non
    // applicato, richiederebbe tracciare "ha attaccato mentre questa carta
    // era scoperta" per ogni singolo mostro avversario nel tempo, più la
    // consueta mancanza di trigger per la Standby Phase.
    { id: 383, origin: 'yu-gi-oh', name: 'Muro dello Specchio', type: 'trap', subtype: 'continuous', effect: 'Ogni mostro del tuo avversario che ha condotto un attacco mentre questa carta era scoperta sul Terreno ha l\'ATK dimezzato finché questa carta resta scoperta. Durante ciascuna tua Standby Phase: paga 2000 Life Points o distruggi questa carta.', artOnly: true },
    // Effetto reale (rimescola 1 proprio mostro sul Terreno più l'intera
    // mano nel Deck, poi pesca altrettante carte): non applicato, il
    // motore non ha un meccanismo per rimescolare carte DALLA mano/dal
    // Terreno DENTRO al Deck (solo il percorso opposto: pescare dal
    // Deck).
    { id: 384, origin: 'yu-gi-oh', name: 'Recupero dei Mostri', type: 'spell', subtype: 'quick-play', effect: 'Scegli come bersaglio 1 mostro che controlli; se è ancora sul Terreno, rimescolalo insieme a tutta la tua mano nel Deck, poi pesca un numero di carte pari a quelle rimescolate dalla mano.', artOnly: true },
    { id: 385, origin: 'yu-gi-oh', name: 'Domatore di Mostri', type: 'monster', level: 5, race: 'Guerriero', attribute: 'TERRA', attack: 1800, defense: 1600, effect: 'Un maestro di mostri che esercita il controllo su diverse creature.', artOnly: true, vanilla: true },
    // Effetto reale (sacrifica 1 Kuriboh scoperto; Special Summon quanti
    // più possibile "Kuriboh Token"): non applicato, il motore non ha un
    // meccanismo di Token (carte create al volo, non presenti nel
    // database) — stesso limite di Clonazione, id 154.
    { id: 386, origin: 'yu-gi-oh', name: 'Moltiplicazione', type: 'spell', subtype: 'quick-play', effect: 'Sacrifica 1 "Kuriboh" scoperto; Special Summon quanti più possibile Token "Kuriboh" (Demone/OSCURITÀ/Livello 1/ATK 300/DEF 200) in Posizione di Difesa. Non possono essere sacrificati per un\'Evocazione Tributo.', artOnly: true },
    // Fusione di "Strega della Foresta Nera" (non presente in questo
    // database) e Dama della Fede (id 338, già presente!). Nessun effetto
    // meccanico oltre alle statistiche.
    { id: 387, origin: 'yu-gi-oh', name: 'Re dei Musicisti', type: 'monster', level: 5, race: 'Incantatore', attribute: 'LUCE', attack: 1750, defense: 1500, extraDeck: true, category: 'fusion', effect: 'Fusione di Strega della Foresta Nera e Dama della Fede.', artOnly: true },
    // Effetto reale (distruggi 1 mostro dell'avversario, poi dai il
    // controllo di 1 tuo mostro all'avversario): non applicato, il
    // motore non ha un meccanismo di "dai il controllo all'avversario"
    // (solo il percorso opposto, "prendi il controllo", già limitato
    // altrove — vedi Cambio di Cuore, id 147).
    { id: 388, origin: 'yu-gi-oh', name: 'Scatola Mistica', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro controllato dal tuo avversario e 1 mostro che controlli; distruggi il primo bersaglio, poi dai il controllo del secondo bersaglio al tuo avversario.', artOnly: true },
    { id: 389, origin: 'yu-gi-oh', name: 'Cavaliere Mistico', type: 'monster', level: 4, race: 'Bestia', attribute: 'TERRA', attack: 1300, defense: 1550, effect: 'Metà uomo e metà cavallo, questo mostro è noto per la sua velocità estrema.', artOnly: true, vanilla: true },
    // Effetto reale (quando distrutta in battaglia: Special Summon 1
    // mostro OSCURITÀ con 1500 o meno ATK dal Deck): non applicato,
    // stesso limite del trigger ON_DESTROY riservato ma mai collegato,
    // più ricerca nel Deck per statistiche.
    { id: 390, origin: 'yu-gi-oh', name: 'Pomodoro Mistico', type: 'monster', level: 4, race: 'Pianta', attribute: 'OSCURITÀ', attack: 1400, defense: 1100, effect: 'Quando questa carta viene distrutta in battaglia e mandata al Cimitero: puoi Special Summon dal Deck, scoperto in Posizione di Attacco, 1 mostro OSCURITÀ con 1500 o meno ATK.', artOnly: true },
    { id: 391, origin: 'yu-gi-oh', name: 'Elfa Mistica', type: 'monster', level: 4, race: 'Incantatore', attribute: 'LUCE', attack: 800, defense: 2000, effect: 'Un\'elfa delicata che manca di offesa, ma ha una difesa formidabile sostenuta da un potere mistico.', artOnly: true, vanilla: true },

    // ===== Importate da yugioh.com (pagina 18/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime (assenti
    // sia da yugioh.com sia dal database ufficiale Konami/ygoprodeck):
    // "Natural Selection", "Negative Energy", "Nightmare Tri-Mirror",
    // "Nightmare Binding", "Nightmare's Chains", "Obedience", "Orichalcos
    // Aristeros", "Orichalcos Deuteros", "Orichalcos Dexia", "Orichalcos
    // Kyutora", "Orichalcos Malevolence", "Orichalcos Tritos", "Over
    // Boost", "Parasite Caterpillar" — la maggior parte di queste ultime
    // fa parte del sotto-tema "Orichalcos" dell'arco Doma, mai stampato
    // fisicamente salvo rare eccezioni (vedi id 396 qui sotto). Non
    // reimportata perché già presente: "Obelisk the Tormentor" (id 30,
    // Obelisk il Tormentatore).
    // SEMPLIFICAZIONE: manca la clausola finale dell'effetto reale
    // ("termina la Battle Phase") — il motore non ha un meccanismo per un
    // effetto-carta che forza una transizione di fase; annulla comunque
    // questo specifico attacco tramite cancelAttack(), che è la parte più
    // importante dell'effetto.
    { id: 392, origin: 'yu-gi-oh', name: 'Nega l\'Attacco', type: 'trap', subtype: 'normal', effect: 'Quando un mostro dell\'avversario dichiara un attacco: scegli come bersaglio il mostro attaccante; annulla l\'attacco, poi termina la Battle Phase.', artOnly: true },
    // Effetto reale (durante il turno dell'avversario, quando questa
    // carta viene mandata al tuo Cimitero da un effetto avversario:
    // diventa immediatamente la End Phase di questo turno): non
    // applicato, il motore non ha un meccanismo per forzare un salto
    // diretto alla End Phase da un effetto carta.
    { id: 393, origin: 'yu-gi-oh', name: 'Re Neko Mane', type: 'monster', level: 1, race: 'Bestia', attribute: 'TERRA', attack: 0, defense: 0, effect: 'Durante il turno del tuo avversario, quando questa carta in tuo possesso viene mandata al tuo Cimitero da un effetto carta dell\'avversario: diventa la End Phase di questo turno.', artOnly: true },
    { id: 394, origin: 'yu-gi-oh', name: 'Carro Armato Oni T-34', type: 'monster', level: 4, race: 'Macchina', attribute: 'TERRA', attack: 1400, defense: 1700, effect: 'Un carro armato corazzato posseduto da un demone che insegue i nemici finché non li schiaccia.', artOnly: true, vanilla: true },
    // Effetto reale (una volta per turno: lancia un dado a sei facce 3
    // volte, guadagna ATK/DEF pari al totale x100 fino alla fine del
    // turno dell'avversario, poi applica effetti diversi in base a quanti
    // risultati coincidono): non applicato, troppo complesso e aleatorio
    // (3 lanci di dado + logica condizionale a più rami) per i meccanismi
    // già presenti.
    { id: 395, origin: 'yu-gi-oh', name: 'Orgoth l\'Implacabile', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2500, defense: 2450, effect: 'Una volta per turno, durante il tuo Main Phase: puoi lanciare un dado a sei facce 3 volte, questa carta guadagna ATK/DEF pari al totale x100 (fino alla fine del turno del tuo avversario), poi, se 2 dei risultati sono uguali, applica l\'effetto appropriato. Se tutti e 3 sono uguali, applicali tutti.', artOnly: true },
    // Una delle rare carte "Orichalcos" stampate fisicamente (OCG, non
    // richiede "Il Sigillo di Orichalcos" per funzionare, solo una
    // qualsiasi carta nella propria Field Zone per il primo effetto).
    // Effetto reale (nega gli effetti del mostro equipaggiato + se hai
    // una carta in Field Zone, concedi lo stesso effetto a un altro
    // mostro fino a fine turno dell'avversario + Effetto Veloce: scarta 1
    // carta per distruggere 1 carta scoperta sul Terreno): non applicato,
    // troppe clausole condizionate per i meccanismi già presenti.
    { id: 396, origin: 'yu-gi-oh', name: 'Spada Sigillante di Orichalcos', type: 'spell', subtype: 'equip', effect: 'Gli effetti del mostro equipaggiato vengono negati. Se hai una carta nella tua Field Zone: puoi scegliere come bersaglio 1 mostro Effetto che controlli; quel mostro guadagna questo effetto fino alla fine del turno del tuo avversario (solo una volta per turno). Effetto Veloce, una volta per turno: puoi mandare 1 carta dalla mano al Cimitero, poi scegli come bersaglio 1 carta scoperta sul Terreno; distruggila.', artOnly: true },
    // Effetto reale (scegli 5 carte dal Deck e mostrale all'avversario;
    // l'avversario ne sceglie 1 da aggiungere alla tua mano, le altre
    // vanno al Cimitero): non applicato, richiederebbe rivelare più carte
    // dal Deck con scelta dell'avversario, meccanismo troppo specifico
    // non presente.
    { id: 397, origin: 'yu-gi-oh', name: 'Scelta Dolorosa', type: 'spell', subtype: 'normal', effect: 'Scegli 5 carte dal tuo Deck e mostrale al tuo avversario. Il tuo avversario ne sceglie 1: aggiungila alla tua mano e manda le rimanenti al Cimitero.', artOnly: true },
    // Rituale: nessuna Magia Rituale associata ("White Dragon Ritual")
    // presente in questo database, quindi non evocabile. Effetto reale
    // secondario (sacrifica questa carta per Special Summon 1 Drago
    // Bianco Occhi Blu, id 1, già presente, che non può attaccare per il
    // resto del turno): non applicato comunque, dato che la carta non è
    // mai in campo per usarlo.
    { id: 398, origin: 'yu-gi-oh', name: 'Paladino del Drago Bianco', type: 'monster', level: 4, race: 'Drago', attribute: 'LUCE', attack: 1900, defense: 1200, category: 'ritual', effect: 'Evocabile Rituale solo tramite "White Dragon Ritual". All\'inizio del Damage Step, se questa carta attacca un mostro coperto in Posizione di Difesa: distruggilo (niente danno né calcolo). Puoi sacrificare questa carta; Special Summon 1 "Drago Bianco Occhi Blu" dalla mano o dal Deck, che non può attaccare per il resto di questo turno.', artOnly: true },
    // Effetto reale (non può dichiarare un attacco a meno che tu non
    // sacrifichi 1 mostro): non applicato, richiederebbe un costo
    // pre-attacco verificato PRIMA della dichiarazione dell'attacco
    // (nella UI di selezione dell'attaccante), meccanismo non presente
    // nel flusso attuale di dichiarazione d'attacco.
    { id: 399, origin: 'yu-gi-oh', name: 'Guerriero Pantera', type: 'monster', level: 4, race: 'Guerriero Bestia', attribute: 'TERRA', attack: 2000, defense: 1600, effect: 'Questa carta non può dichiarare un attacco a meno che tu non sacrifichi 1 mostro.', artOnly: true },
    { id: 400, origin: 'yu-gi-oh', name: 'Drago Pappagallo', type: 'monster', level: 5, race: 'Drago', attribute: 'VENTO', attack: 2000, defense: 1300, effect: 'Un drago da cartone animato più pericoloso di quanto sembri.', artOnly: true, vanilla: true },

    // ===== Importate da yugioh.com (pagina 19/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime (assenti
    // anche dal database ufficiale Konami/ygoprodeck): "Pheromone Wasp",
    // "Power Balance", "Prophecy", "Psychic Armor Head", "Purity of the
    // Cemetery", "Ragnarok", "Rainbow Blessing", "Rare Metal Soul". Non
    // reimportate perché già presenti: "Polymerization" (id 38, Fusione),
    // "Red-Eyes B. Dragon" (id 12, Drago Nero Occhi Rossi).
    { id: 401, origin: 'yu-gi-oh', name: 'Macchina a Pendolo', type: 'monster', level: 6, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1750, defense: 2000, effect: 'Un\'orribile macchina di tortura con una grande lama a pendolo.', artOnly: true, vanilla: true },
    { id: 402, origin: 'yu-gi-oh', name: 'Piccola Angela', type: 'monster', level: 3, race: 'Fata', attribute: 'LUCE', attack: 600, defense: 900, effect: 'Una fata minuscola e velocissima, molto difficile da colpire.', artOnly: true, vanilla: true },
    // Effetto reale (quando questa carta viene mandata al tuo Cimitero:
    // puoi Special Summon 1 mostro Tipo Insetto dalla mano): non
    // applicato, stesso limite del trigger ON_DESTROY riservato ma mai
    // collegato (qui la condizione è anche più ampia, "mandata al
    // Cimitero" in generale, non solo per distruzione in battaglia).
    { id: 403, origin: 'yu-gi-oh', name: 'Cavalletta d\'Emergenza', type: 'monster', level: 4, race: 'Insetto', attribute: 'TERRA', attack: 1000, defense: 1200, effect: 'Quando questa carta che controlli viene mandata al tuo Cimitero: puoi Special Summon 1 mostro Tipo Insetto dalla tua mano.', artOnly: true },
    // Effetto reale: mostro "Union", si equipaggia a "Dark Blade" (non
    // presente in questo database) come Carta Equipaggiamento oppure si
    // stacca e si Special Summona da sola — non applicato, il motore non
    // ha alcun supporto per il meccanismo "Union" (mostri che diventano
    // Equip e viceversa).
    { id: 404, origin: 'yu-gi-oh', name: 'Drago Nero Pece', type: 'monster', level: 3, race: 'Drago', attribute: 'OSCURITÀ', attack: 900, defense: 600, effect: 'Una volta per turno, durante il tuo Main Phase, se controlli questa carta sul Terreno, puoi equipaggiarla a "Dark Blade" come Carta Equipaggiamento (mostro Union), oppure staccarla e Special Summonarla scoperta in Posizione di Attacco. Mentre equipaggiata, il mostro equipaggiato guadagna 400 ATK/DEF.', artOnly: true },
    // Effetto reale (sacrifica questa carta scoperta; prendi il controllo
    // di tutti i mostri scoperti di Livello 3 o inferiore dell'avversario):
    // non applicato, stesso limite del meccanismo "prendi il controllo"
    // già visto (es. Cambio di Cuore, id 147).
    { id: 405, origin: 'yu-gi-oh', name: 'Anima Oscura Posseduta', type: 'monster', level: 3, race: 'Demone', attribute: 'OSCURITÀ', attack: 1200, defense: 800, effect: 'Puoi sacrificare questa carta scoperta; prendi il controllo di tutti i mostri scoperti di Livello 3 o inferiore attualmente controllati dal tuo avversario.', artOnly: true },
    // Effetto reale: dipendenza a catena su "Castle of Dark Illusions"
    // (non presente in questo database) + conteggio di 4 Standby Phase
    // consecutive — non applicato, troppo specifico e multi-turno.
    { id: 406, origin: 'yu-gi-oh', name: 'Pumpking il Re dei Fantasmi', type: 'monster', level: 6, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1800, defense: 2000, effect: 'Guadagna 100 ATK/DEF finché "Castle of Dark Illusions" è sul Terreno. Inoltre, durante la tua Standby Phase, se "Castle of Dark Illusions" è sul Terreno: guadagna altri 100 ATK/DEF, per un massimo di 4 delle tue Standby Phase.', artOnly: true },
    // Effetto reale (l'avversario indovina la carta in fondo al tuo
    // Cimitero: se indovina viene bandita, se sbaglia viene Special
    // Summonata sul tuo Terreno): non applicato, meccanismo di
    // indovinello interattivo troppo specifico per i pattern già presenti.
    { id: 407, origin: 'yu-gi-oh', name: 'Domanda', type: 'spell', subtype: 'normal', effect: 'Quando attivi questa carta, il tuo avversario non può controllare le carte nel Cimitero. Il tuo avversario dichiara il nome del primo mostro che si trova in fondo al tuo Cimitero. Se indovina, quel mostro viene bandito. Se sbaglia, quel mostro viene Special Summonato sul tuo Terreno.', artOnly: true },
    // Fusione di "Battle Ox" (non presente in questo database) e Cavaliere
    // Mistico (id 389, già presente!). Nessun effetto meccanico oltre alle
    // statistiche.
    { id: 408, origin: 'yu-gi-oh', name: 'Cavallerizzo Rabbioso', type: 'monster', level: 6, race: 'Guerriero Bestia', attribute: 'TERRA', attack: 2000, defense: 1700, extraDeck: true, category: 'fusion', effect: 'Fusione di Battle Ox e Cavaliere Mistico.', artOnly: true },
    { id: 409, origin: 'yu-gi-oh', name: 'Raigeki', type: 'spell', subtype: 'normal', effect: 'Distruggi tutti i mostri controllati dal tuo avversario.', artOnly: true },
    // Effetto reale (FLIP: scegli 1 Trappola sul Terreno e distruggila; se
    // la carta scelta è Set, guardala prima — se è Trappola distruggila,
    // se è Magia rimettila coperta): non applicato, il meccanismo di
    // "sbirciare una carta Set prima di decidere" è troppo esotico per i
    // pattern già presenti.
    { id: 410, origin: 'yu-gi-oh', name: 'Mietitore delle Carte', type: 'monster', level: 5, race: 'Demone', attribute: 'OSCURITÀ', attack: 1380, defense: 1930, effect: 'FLIP: scegli 1 Trappola sul Terreno e distruggila. Se la carta scelta è Set, guardala: se è una Trappola viene distrutta, se è una Magia torna nella posizione originale.', artOnly: true },
    // Equipaggiabile solo a Guardiano Falce del Terrore (id 283, già
    // presente — questa carta chiude finalmente quella dipendenza citata
    // nel suo commento). Effetto reale (+500 ATK per ogni mostro nei
    // Cimiteri, di entrambi i giocatori): non applicato, stesso limite del
    // buff ATK/DEF continuo spiegato più sopra.
    { id: 411, origin: 'yu-gi-oh', name: 'Falce del Mietitore - Falce del Terrore', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a "Guardiano Falce del Terrore". Guadagna 500 ATK per ogni mostro nei Cimiteri.', artOnly: true },
    { id: 412, origin: 'yu-gi-oh', name: 'Ragazza Arciera Rossa', type: 'monster', level: 4, race: 'Acquatico', attribute: 'ACQUA', attack: 1400, defense: 1500, effect: 'Una sirena arciera che si nasconde in un guscio protettivo, aspettando il momento giusto per colpire.', artOnly: true, vanilla: true },
    // Effetto reale: Special Summonabile solo dal Deck sacrificando Drago
    // Nero Occhi Rossi (id 12, già presente) equipaggiato con Metalmorfosi
    // (id 376, già presente) — entrambi i materiali ci sono! Ma il
    // meccanismo "sacrifica + Special Summon dal Deck" resta non
    // applicato, stesso limite di Metalzoa (id 377).
    { id: 413, origin: 'yu-gi-oh', name: 'Drago Nero Metallico Occhi Rossi', type: 'monster', level: 8, race: 'Macchina', attribute: 'OSCURITÀ', attack: 2800, defense: 2400, effect: 'Non può essere Evocato Normalmente/Set. Deve prima essere Special Summonato dal Deck sacrificando "Drago Nero Occhi Rossi" equipaggiato con "Metalmorfosi".', artOnly: true },
    // Chiude la dipendenza di Signore del Rosso (id 354): ora Evocabile
    // Rituale davvero (vedi effetto implementato in card-effects.js).
    // SEMPLIFICAZIONE: l'effetto reale permette anche di bandire mostri
    // "Red-Eyes" dal Cimitero al posto di sacrificarli dal Terreno — qui,
    // come per Rito del Guerriero Nero (id 56), si sacrificano solo
    // mostri dal proprio Terreno per un Livello totale di almeno 8.
    { id: 414, origin: 'yu-gi-oh', name: 'Trasmigrazione Occhi Rossi', type: 'spell', subtype: 'ritual', effect: 'Sacrifica dal Terreno mostri per un Livello totale di almeno 8 per Special Summon Signore del Rosso dalla mano.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 20/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime (assenti
    // anche da ygoprodeck): "Reduction Barrier", "Rescuer from the
    // Grave", "Roll of Fate", "Rose Whip". Non reimportate perché già
    // presenti: "Right Arm of the Forbidden One" (id 11, Braccio Dx Del
    // Proibito), "Right Leg of the Forbidden One" (id 43, Gamba Dx del
    // Proibito).
    // Chiude finalmente la dipendenza di Gearfried il Maestro di Spada
    // (id 258): sacrifica Gearfried il Cavaliere di Ferro (id 16, già
    // presente) per Special Summonare Gearfried il Maestro di Spada (id
    // 258) dalla mano o dal Deck.
    { id: 415, origin: 'yu-gi-oh', name: 'Vincoli Recisi', type: 'spell', subtype: 'normal', effect: 'Sacrifica 1 "Gearfried il Cavaliere di Ferro"; Special Summon 1 "Gearfried il Maestro di Spada" dalla tua mano o dal Deck.', artOnly: true },
    // Rituale: nessuna Magia Rituale associata ("Black Illusion Ritual")
    // presente in questo database, quindi non evocabile. Effetto reale
    // (equipaggia 1 mostro dell'avversario a questa carta, copiandone
    // ATK/DEF; se distrutta in battaglia, distruggi quel mostro al posto
    // suo; il danno da battaglia subito viene inflitto anche
    // all'avversario): non applicato comunque, troppo esotico (un mostro
    // che "indossa" un altro mostro come equipaggiamento) per i
    // meccanismi già presenti.
    { id: 416, origin: 'yu-gi-oh', name: 'Abbandonato', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 0, defense: 0, category: 'ritual', effect: 'Evocabile Rituale solo tramite "Black Illusion Ritual". Una volta per turno: puoi scegliere come bersaglio 1 mostro controllato dal tuo avversario; equipaggia quel bersaglio a questa carta (massimo 1). L\'ATK/DEF di questa carta diventano pari a quelli del mostro equipaggiato.', artOnly: true },
    { id: 417, origin: 'yu-gi-oh', name: 'Rimuovi Trappola', type: 'spell', subtype: 'normal', effect: 'Scegli 1 Trappola scoperta sul Terreno e distruggila.', artOnly: true },
    // Effetto reale (scarta 1 mostro dalla mano; a fine turno, riporta in
    // mano 1 tuo mostro distrutto in battaglia in QUESTO turno): non
    // applicato, richiederebbe tracciare "distrutto in battaglia in
    // questo turno" più un effetto ritardato a fine turno, meccanismi non
    // presenti.
    { id: 418, origin: 'yu-gi-oh', name: 'Ritorno dei Dannati', type: 'spell', subtype: 'normal', effect: 'Scarta 1 Mostro dalla mano al Cimitero. Riporta in mano, alla fine di questo turno, 1 tuo mostro distrutto e mandato al Cimitero in seguito a una battaglia avvenuta in questo turno.', artOnly: true },
    // Effetto reale (testo attuale con errata, più restrittivo
    // dell'originale: attivabile solo nel turno dell'avversario, solo su
    // un mostro con ATK <= ai LP del suo controllore; distruggilo e
    // infliggi danno pari al suo ATK a entrambi i giocatori): non
    // applicato, condizione di turno + danno simmetrico a entrambi i
    // giocatori troppo specifici per i pattern già presenti.
    { id: 419, origin: 'yu-gi-oh', name: 'Anello della Distruzione', type: 'trap', subtype: 'normal', effect: 'Durante il turno del tuo avversario: scegli come bersaglio 1 mostro scoperto controllato dal tuo avversario il cui ATK sia pari o inferiore ai suoi Life Points; distruggi quel mostro, e se lo fai, subisci danno pari al suo ATK originale, poi infliggi al tuo avversario danno pari al danno che hai subito.', artOnly: true },
    // Effetto reale (-500 ATK/DEF continuo al proprio mostro equipaggiato
    // + i mostri dell'avversario possono attaccare solo quel mostro): non
    // applicato, stesso limite del buff/debuff ATK/DEF continuo spiegato
    // più sopra, più un reindirizzamento generico degli attacchi non
    // presente (stesso limite di Armatura Guida d'Attacco, id 100).
    { id: 420, origin: 'yu-gi-oh', name: 'Anello Magnetico', type: 'spell', subtype: 'equip', effect: 'Puoi equipaggiare questa carta solo a un mostro sul tuo Terreno. Il mostro equipaggiato perde 500 ATK/DEF. Inoltre, tutti i mostri sul Terreno del tuo avversario possono attaccare solo il mostro equipaggiato con questa carta, se attaccano.', artOnly: true },
    // Effetto reale (dimezza l'ATK di 1 mostro scoperto e aggiungi quella
    // quantità all'ATK di un altro mostro scoperto, fino a fine turno):
    // non applicato, stesso limite del buff/debuff ATK/DEF continuo
    // spiegato più sopra (un cambiamento "fino a fine turno" non avrebbe
    // comunque alcun effetto osservabile in battaglia).
    { id: 421, origin: 'yu-gi-oh', name: 'Riryoku', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 2 mostri scoperti sul Terreno; dimezza l\'ATK di 1 mostro, e se lo fai, aggiungi l\'ATK perso all\'altro mostro. Questi effetti durano fino alla fine di questo turno.', artOnly: true },
    { id: 422, origin: 'yu-gi-oh', name: 'Grotta dell\'Orco di Roccia #1', type: 'monster', level: 3, race: 'Roccia', attribute: 'TERRA', attack: 800, defense: 1200, effect: 'Protetto da un corpo solido di roccia, questo mostro sferra un pugno capace di spezzare le ossa.', artOnly: true, vanilla: true },
    // Equipaggiabile solo a Guardiano Kay'est (id 285, già presente —
    // chiude quel riferimento incrociato). Effetto reale (+500 DEF
    // continuo + nega altri effetti Magia che bersagliano il mostro
    // equipaggiato, distruggendo quella Magia): non applicato, stesso
    // limite del buff ATK/DEF continuo spiegato più sopra, più un
    // meccanismo di negazione mirata non generalizzabile facilmente.
    { id: 423, origin: 'yu-gi-oh', name: 'Bastone del Silenzio - Kay\'est', type: 'spell', subtype: 'equip', effect: 'Il mostro equipaggiato guadagna 500 DEF. Nega altri effetti Magia che scelgono come bersaglio il mostro equipaggiato, e se lo fai, distruggi quella Magia.', artOnly: true },
    { id: 424, origin: 'yu-gi-oh', name: 'Bambola Canaglia', type: 'monster', level: 4, race: 'Incantatore', attribute: 'LUCE', attack: 1600, defense: 1000, effect: 'Una bambola letale dotata di potere mistico, particolarmente potente quando attacca le forze oscure.', artOnly: true, vanilla: true },
    // Effetto reale (quando l'avversario dichiara un attacco: lancia un
    // dado a sei facce con 6 risultati diversi, dal dimezzare i propri LP
    // al reindirizzare l'attacco a un mostro a scelta, fino a distruggere
    // il mostro attaccante): non applicato, troppo esotico e con troppi
    // rami condizionali per i pattern già presenti.
    { id: 425, origin: 'yu-gi-oh', name: 'Ragno della Roulette', type: 'spell', subtype: 'quick-play', effect: 'Quando un mostro dell\'avversario dichiara un attacco: lancia un dado a sei facce e applica il risultato. 1: dimezza i tuoi LP. 2: rendi quell\'attacco un attacco diretto. 3: scegli 1 mostro che controlli, cambia il bersaglio dell\'attacco su di esso e calcola i danni. 4: scegli un altro mostro dell\'avversario, cambia il bersaglio dell\'attacco su di esso e calcola i danni. 5: annulla l\'attacco e infliggi al tuo avversario danno pari all\'ATK di quel mostro. 6: distruggi il mostro dell\'avversario.', artOnly: true },
    // Stesso schema di Jinzo (id 17): effetto CONTINUO del mostro/carta,
    // non un'attivazione manuale.
    { id: 426, origin: 'yu-gi-oh', name: 'Decreto Reale', type: 'trap', subtype: 'continuous', effect: 'Nega tutti gli altri effetti Trappola sul Terreno.', artOnly: true },
    { id: 427, origin: 'yu-gi-oh', name: 'Rude Kaiser', type: 'monster', level: 5, race: 'Guerriero Bestia', attribute: 'TERRA', attack: 1800, defense: 1600, effect: 'Con un\'ascia in ogni mano, questo mostro infligge danni pesanti.', artOnly: true, vanilla: true },
    { id: 428, origin: 'yu-gi-oh', name: 'Ryu-Kishin Potenziato', type: 'monster', level: 4, race: 'Demone', attribute: 'OSCURITÀ', attack: 1600, defense: 1200, effect: 'Un gargoyle potenziato dai poteri dell\'oscurità. I suoi artigli affilatissimi lo rendono un avversario degno di nota.', artOnly: true, vanilla: true },
    { id: 429, origin: 'yu-gi-oh', name: 'Ryu-Ran', type: 'monster', level: 7, race: 'Drago', attribute: 'FUOCO', attack: 2200, defense: 2600, effect: 'Un piccolo drago feroce riparato in un uovo dall\'aspetto ingannevolmente innocuo.', artOnly: true, vanilla: true },
    // Chiude finalmente il riferimento incrociato tra Maga Oscura (id 188,
    // già presente) e Mago Nero (id 2, già presente).
    { id: 430, origin: 'yu-gi-oh', name: 'Pietra del Saggio', type: 'spell', subtype: 'normal', effect: 'Se controlli scoperta "Maga Oscura": Special Summon 1 "Mago Nero" dalla tua mano o dal Deck.', artOnly: true },
    { id: 431, origin: 'yu-gi-oh', name: 'Saggi il Pagliaccio Oscuro', type: 'monster', level: 3, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 600, defense: 1500, effect: 'Questo pagliaccio appare dal nulla ed esegue mosse molto strane per evitare gli attacchi nemici.', artOnly: true, vanilla: true },
    // Effetto reale (+700 ATK continuo, equipaggiabile solo su un mostro
    // Tipo FUOCO): non applicato, stesso limite del buff ATK/DEF continuo
    // spiegato più sopra.
    { id: 432, origin: 'yu-gi-oh', name: 'Salamandra', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a un mostro FUOCO. Guadagna 700 ATK.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 21/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime (assenti
    // anche da ygoprodeck): "Self-Tribute", "Set Sail for the Kingdom",
    // "Seven-Armed Fiend", "Shadow Balance", "Shield Wall", "Silver
    // Dollar", "Sky Union", "Soldier Revolt".
    // Effetto reale (quando mandata dal Terreno al Cimitero: aggiungi 1
    // mostro con 1500 o meno ATK dal Deck alla mano): non applicato,
    // stesso limite del trigger ON_DESTROY riservato ma mai collegato,
    // più ricerca nel Deck per statistiche.
    { id: 433, origin: 'yu-gi-oh', name: 'Sangan', type: 'monster', level: 3, race: 'Demone', attribute: 'OSCURITÀ', attack: 1000, defense: 600, effect: 'Quando questa carta viene mandata dal Terreno al Cimitero: puoi aggiungere alla mano 1 mostro con 1500 o meno ATK dal Deck (una volta per turno).', artOnly: true },
    // Effetto reale (Special Summon 4 Token "Pecora"): non applicato, il
    // motore non ha un meccanismo di Token (stesso limite di Clonazione,
    // id 154, e Moltiplicazione, id 386).
    { id: 434, origin: 'yu-gi-oh', name: 'Capro Espiatorio', type: 'spell', subtype: 'quick-play', effect: 'Special Summon 4 Token "Pecora" (Bestia/TERRA/Livello 1/ATK 0/DEF 0) in Posizione di Difesa. Non possono essere sacrificati per un\'Evocazione Tributo. Non puoi Evocare altri mostri nel turno in cui attivi questa carta (ma puoi Set).', artOnly: true },
    { id: 435, origin: 'yu-gi-oh', name: 'Soldato della Scienza', type: 'monster', level: 3, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 800, defense: 800, effect: 'Soldati equipaggiati con armamenti all\'avanguardia per affrontare creature sconosciute.', artOnly: true, vanilla: true },
    { id: 436, origin: 'yu-gi-oh', name: 'Drago Serpente della Notte', type: 'monster', level: 7, race: 'Drago', attribute: 'OSCURITÀ', attack: 2350, defense: 2400, effect: 'Un drago creato dall\'anima di un cavaliere malvagio.', artOnly: true, vanilla: true },
    // Effetto reale (+100 ATK per ogni mostro nel proprio Cimitero): non
    // applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra.
    { id: 437, origin: 'yu-gi-oh', name: 'Spettro Ombra', type: 'monster', level: 5, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1600, defense: 1300, effect: 'Guadagna 100 ATK per ogni mostro nel tuo Cimitero.', artOnly: true },
    // Effetto reale (gira scoperto in Posizione di Attacco 1 mostro Set
    // dell'avversario, senza attivarne l'eventuale effetto Flip): non
    // applicato, il motore non ha un meccanismo per rivelare un mostro Set
    // senza passare dalla battaglia (unico modo in cui un FLIP scatta
    // oggi).
    { id: 438, origin: 'yu-gi-oh', name: 'Ombra degli Occhi', type: 'trap', subtype: 'normal', effect: 'Quando 1 o più mostri vengono Set sul Terreno del tuo avversario: scegli come bersaglio 1 di quei mostri Set; giralo scoperto in Posizione di Attacco (gli Effetti Flip non si attivano).', artOnly: true },
    // Effetto reale (-700 ATK continuo + non può attaccare né cambiare
    // Posizione, finché resta scoperta): non applicato, stesso limite del
    // buff/debuff ATK/DEF continuo spiegato più sopra, più un divieto
    // d'attacco specifico per UN SOLO mostro (non tutto il campo di un
    // giocatore) non generalizzabile con i flag attuali.
    { id: 439, origin: 'yu-gi-oh', name: 'Incantesimo Ombra', type: 'trap', subtype: 'continuous', effect: 'Attiva questa carta scegliendo come bersaglio 1 mostro scoperto controllato dal tuo avversario; perde 700 ATK, inoltre non può attaccare né cambiare la sua Posizione di Battaglia. Quando lascia il Terreno: distruggi questa carta.', artOnly: true },
    // Effetto reale (scambia ATK e DEF originali di tutti i mostri
    // scoperti sul Terreno, fino a fine turno): non applicato — mutare
    // direttamente le statistiche di un mostro modificherebbe l'oggetto
    // carta CONDIVISO in cardDatabase (usato da ogni copia di quella
    // carta in ogni duello), corrompendolo permanentemente; servirebbe un
    // sistema di override per-istanza con pulizia a fine turno, non
    // presente.
    { id: 440, origin: 'yu-gi-oh', name: 'Scudo e Spada', type: 'spell', subtype: 'normal', effect: 'Scambia l\'ATK e la DEF originali di tutti i mostri scoperti attualmente sul Terreno, fino alla fine di questo turno.', artOnly: true },
    // Effetto reale (+700 ATK continuo, equipaggiabile solo su un mostro
    // LUCE): non applicato, stesso limite del buff ATK/DEF continuo
    // spiegato più sopra.
    { id: 441, origin: 'yu-gi-oh', name: 'Palazzo Splendente', type: 'spell', subtype: 'equip', effect: 'Equipaggiabile solo a un mostro LUCE. Guadagna 700 ATK.', artOnly: true },
    { id: 442, origin: 'yu-gi-oh', name: 'Abisso Splendente', type: 'monster', level: 4, race: 'Fata', attribute: 'LUCE', attack: 1600, defense: 1800, effect: 'Questo mostro impiega i poteri sia della Luce che dell\'Oscurità.', artOnly: true, vanilla: true },
    { id: 443, origin: 'yu-gi-oh', name: 'Amicizia Splendente', type: 'monster', level: 4, race: 'Fata', attribute: 'LUCE', attack: 1300, defense: 1100, effect: 'Il paciere tra i mostri.', artOnly: true, vanilla: true },
    { id: 444, origin: 'yu-gi-oh', name: 'Zanna d\'Argento', type: 'monster', level: 3, race: 'Bestia', attribute: 'TERRA', attack: 1200, defense: 800, effect: 'Un lupo delle nevi bellissimo da vedere, ma assolutamente feroce in battaglia.', artOnly: true, vanilla: true },
    // Effetto reale (lancio di dado: i mostri dell'avversario perdono
    // ATK/DEF pari al risultato x100, fino a fine turno): non applicato,
    // stesso limite del buff/debuff ATK/DEF continuo spiegato più sopra
    // (stesso limite di Dado Aggraziato, id 273).
    { id: 445, origin: 'yu-gi-oh', name: 'Dado Teschio', type: 'trap', subtype: 'normal', effect: 'Lancia un dado a sei facce. Tutti i mostri controllati dal tuo avversario perdono ATK/DEF pari al risultato x100, fino alla fine di questo turno.', artOnly: true },
    // Effetto reale (quando mandata al Cimitero: guadagna 1000 Life
    // Points): non applicato, stesso limite del trigger ON_DESTROY
    // riservato ma mai collegato (qui la condizione è ancora più ampia,
    // "mandata al Cimitero" in generale).
    { id: 446, origin: 'yu-gi-oh', name: 'Coccinella Marchio Teschio', type: 'monster', level: 4, race: 'Insetto', attribute: 'TERRA', attack: 500, defense: 1500, effect: 'Quando questa carta viene mandata al Cimitero: aumenta i tuoi Life Points di 1000 punti.', artOnly: true },
    { id: 447, origin: 'yu-gi-oh', name: 'Slot Machine', type: 'monster', level: 7, race: 'Macchina', attribute: 'OSCURITÀ', attack: 2000, defense: 2300, effect: 'Si dice che l\'abilità di questa macchina vari a seconda del risultato degli slot.', artOnly: true, vanilla: true },
    // Effetto reale (Trappola Contatore: quando un mostro sta per essere
    // Evocato, O una Magia/Trappola viene attivata: paga metà dei tuoi
    // Life Points; annulla l'Evocazione o l'attivazione, e se lo fai,
    // distruggi quella carta): non applicato, stessa duplice limitazione
    // strutturale già citata per Corno del Paradiso (id 300, negazione
    // PRIMA della risoluzione di un'Evocazione non possibile con questa
    // architettura) e Interferenza Magica (id 361, nessun trigger per
    // "l'avversario ha attivato una Magia/Trappola").
    { id: 448, origin: 'yu-gi-oh', name: 'Giudizio Solenne', type: 'trap', subtype: 'normal', effect: 'Quando un mostro sta per essere Evocato, oppure una Magia/Trappola viene attivata: paga metà dei tuoi Life Points; annulla l\'Evocazione o l\'attivazione, e se lo fai, distruggi quella carta.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 22/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime (assenti
    // anche da ygoprodeck): "Spell Sanctuary", "Star Blaster", "Sword of
    // Soul". Non reimportate perché già presenti: "Summoned Skull" (id
    // 13, Teschio Evocato), "Stop Defense" (id 69, Stop Difesa), "Suijin"
    // (id 71), "Super Roboyarou" (id 73), "Swamp Battleguard" (id 74,
    // Guardiano della Palude — vedi correzione sopra al commento di id
    // 343), "Swords of Revealing Light" (id 8, Spada Rivelatrice). "Soul
    // Charge" è già presente come id 59 (Carica dell'Anima).
    { id: 449, origin: 'yu-gi-oh', name: 'Ancella Sonica', type: 'monster', level: 3, race: 'Guerriero', attribute: 'TERRA', attack: 1200, defense: 900, effect: 'Una fanciulla che usa il suono a suo vantaggio, brandisce una falce a forma di nota musicale.', artOnly: true, vanilla: true },
    // Effetto reale (attivabile solo se controlli un mostro Tipo Demone;
    // paga 500 LP; entrambi i giocatori scelgono 1 carta Mostro dal
    // Cimitero dell'avversario e la bandiscono): non applicato, scelta
    // interattiva da entrambi i lati troppo specifica per i pattern già
    // presenti.
    { id: 450, origin: 'yu-gi-oh', name: 'Demolizione dell\'Anima', type: 'trap', subtype: 'continuous', effect: 'Puoi attivare l\'effetto di questa carta solo se controlli un mostro Tipo Demone. Paga 500 Life Points per usare questo effetto. Entrambi i giocatori scelgono 1 carta Mostro dal Cimitero dell\'avversario. Bandite le carte scelte.', artOnly: true },
    // Effetto reale (scegli 1 mostro dell'avversario; in questo turno, se
    // sacrifichi un mostro, devi sacrificare quel bersaglio come se lo
    // controllassi tu; non puoi condurre la tua Battle Phase in questo
    // turno): non applicato, sostituzione condizionata del Tributo +
    // blocco della Battle Phase, entrambi meccanismi non presenti.
    { id: 451, origin: 'yu-gi-oh', name: 'Scambio di Anime', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro controllato dal tuo avversario; in questo turno, se sacrifichi un mostro, devi sacrificare quel bersaglio come se lo controllassi tu. Non puoi condurre la tua Battle Phase nel turno in cui attivi questa carta.', artOnly: true },
    // SEMPLIFICAZIONE: l'effetto reale lascia scegliere quali carte
    // bandire — qui, come per altri effetti "auto-seleziona", vengono
    // bandite automaticamente le prime carte trovate nei Cimiteri
    // (fino a 5, in ordine: proprio Cimitero, poi quello dell'avversario).
    { id: 452, origin: 'yu-gi-oh', name: 'Rilascio dell\'Anima', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio fino a 5 carte in un Cimitero qualsiasi; bandiscile.', artOnly: true },
    { id: 453, origin: 'yu-gi-oh', name: 'Cacciatore di Anime', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro scoperto controllato dal tuo avversario; distruggilo, poi il tuo avversario guadagna 1000 Life Points.', artOnly: true },
    // Effetto reale (danno perforante contro mostri in Posizione di
    // Difesa + si gira in Posizione di Difesa alla fine del Damage Step
    // se attacca): non applicato, il motore non ha né un meccanismo di
    // danno perforante generico né un trigger agganciato alla fine del
    // Damage Step.
    { id: 454, origin: 'yu-gi-oh', name: 'Drago Lancia', type: 'monster', level: 4, race: 'Drago', attribute: 'VENTO', attack: 1900, defense: 0, effect: 'Durante una battaglia tra questa carta attaccante e un mostro in Posizione di Difesa la cui DEF sia inferiore all\'ATK di questa carta, infliggi la differenza come danno da battaglia al tuo avversario. Se questa carta attacca, viene cambiata in Posizione di Difesa alla fine del Damage Step.', artOnly: true },
    // Effetto reale (nega TUTTI gli effetti Magia sul Terreno, di
    // entrambi i giocatori): non applicato. Il flag gameState.spellsNegatedFor
    // esiste già (usato da Jinzo, id 17, per le Trappole) ma in
    // duel-engine.js viene controllato SOLO per le Magie già Set attivate
    // dal Terreno (zone==='st' in canActivate) — le Magie giocate
    // direttamente dalla mano (il percorso standard in questo motore, via
    // promptHandSpellActivation in actions.js) lo bypassano del tutto,
    // quindi l'effetto sarebbe praticamente invisibile nella maggior
    // parte delle partite.
    { id: 455, origin: 'yu-gi-oh', name: 'Cancellatore di Magie', type: 'monster', level: 5, race: 'Macchina', attribute: 'VENTO', attack: 1800, defense: 1600, effect: 'Le Magie sul Terreno, e i loro effetti, non possono essere attivate. Nega tutti gli effetti Magia sul Terreno.', artOnly: true },
    // Effetto reale (ogni mostro che attacca viene girato in Posizione di
    // Difesa alla fine del Damage Step e bloccato fino alla End Phase del
    // turno successivo del suo controllore, finché questa carta resta sul
    // Terreno): non applicato, il motore non ha un trigger agganciato
    // alla fine del Damage Step, né un tracking multi-turno del blocco.
    { id: 456, origin: 'yu-gi-oh', name: 'Ragnatela', type: 'spell', subtype: 'field', effect: 'Se un mostro dichiara un attacco, viene cambiato in Posizione di Difesa alla fine del Damage Step. Non può cambiare la sua Posizione di Battaglia fino alla End Phase del turno successivo del suo controllore, finché questa carta resta sul Terreno.', artOnly: true },
    { id: 457, origin: 'yu-gi-oh', name: 'Spikebot', type: 'monster', level: 5, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1800, defense: 1700, effect: 'Un soldato meccanico creato da uno stregone malvagio, attacca con le due sfere d\'acciaio fissate alle sue braccia.', artOnly: true, vanilla: true },
    { id: 458, origin: 'yu-gi-oh', name: 'Spirito dell\'Arpa', type: 'monster', level: 4, race: 'Fata', attribute: 'LUCE', attack: 800, defense: 2000, effect: 'Uno spirito che placa l\'anima con la musica della sua arpa celeste.', artOnly: true, vanilla: true },
    // Effetto reale (Effetto Veloce: bandisci 2 mostri OSCURITÀ dal
    // Cimitero; bandisci questa carta scoperta fino alla End Phase, una
    // volta per turno): non applicato, richiederebbe una zona di bando
    // temporanea con timer di ritorno, stesso limite di Buco Dimensionale
    // (id 201).
    { id: 459, origin: 'yu-gi-oh', name: 'Ninja d\'Assalto', type: 'monster', level: 4, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 1700, defense: 1200, effect: 'Effetto Veloce: puoi bandire 2 mostri OSCURITÀ dal tuo Cimitero; bandisci questa carta scoperta fino alla End Phase. Puoi usare questo effetto solo una volta per turno.', artOnly: true },
    // Effetto reale (paga 1000 LP; lancia un dado a sei facce con 3
    // effetti diversi in base al risultato): non applicato, troppo
    // aleatorio e con troppi rami condizionali per i pattern già
    // presenti.
    { id: 460, origin: 'yu-gi-oh', name: 'Dado di Evocazione', type: 'spell', subtype: 'normal', effect: 'Paga 1000 Life Points; lancia un dado a sei facce e applica il risultato. 1 o 2: puoi Evocare Normalmente 1 mostro aggiuntivo. 3 o 4: puoi Special Summon 1 mostro dal Cimitero. 5 o 6: puoi Special Summon 1 mostro di Livello 5 o superiore dalla mano.', artOnly: true },
    { id: 461, origin: 'yu-gi-oh', name: 'Braccio di Spada del Drago', type: 'monster', level: 6, race: 'Dinosauro', attribute: 'TERRA', attack: 1750, defense: 2030, effect: 'Questo colosso giurassico ha una spina dorsale coperta di placche a forma di spada e una coda che spacca teschi.', artOnly: true, vanilla: true },
    // Effetto reale (alla fine della Battle Phase, se ha distrutto in
    // battaglia mostri in questa Battle Phase: equipaggiali dal Cimitero
    // a questa carta come Carte Equipaggiamento, ciascuna +200 ATK): non
    // applicato, un mostro distrutto che diventa una Carta Equipaggiamento
    // è un cambio di tipo-carta non supportato (stesso limite di
    // Kiseitai, id 328).
    { id: 462, origin: 'yu-gi-oh', name: 'Cacciatore di Spade', type: 'monster', level: 7, race: 'Guerriero', attribute: 'TERRA', attack: 2450, defense: 1700, effect: 'Alla fine della Battle Phase, se questa carta ha distrutto in battaglia dei mostri e li ha mandati al Cimitero in questa Battle Phase: equipaggiali dal Cimitero a questa carta come Carte Equipaggiamento con questo effetto: il mostro equipaggiato guadagna 200 ATK.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 23/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime (assenti
    // anche da ygoprodeck, "The Monarchy" verificata anche direttamente
    // su yugioh.com): "Take One Chance", "Tank Corps", "Tears of a
    // Mermaid", "The Monarchy", "Thirst for Compensation". Non
    // reimportate perché già presenti: "The Masked Beast" (id 167, La
    // Bestia Mascherata), "Time Wizard" (id 28, Mago del Tempo).
    { id: 463, origin: 'yu-gi-oh', name: 'Spadaccino di Landstar', type: 'monster', level: 3, race: 'Guerriero', attribute: 'TERRA', attack: 500, defense: 1200, effect: 'Un dilettante con la spada, questo guerriero fatato si affida ai suoi poteri misteriosi.', artOnly: true, vanilla: true },
    { id: 464, origin: 'yu-gi-oh', name: 'La 13ª Tomba', type: 'monster', level: 3, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1200, defense: 900, effect: 'Uno zombie apparso improvvisamente dal lotto #13 — una tomba vuota.', artOnly: true, vanilla: true },
    // Effetto reale (+200 ATK continuo ai propri mostri Guerriero per ogni
    // mostro Guerriero o Incantatore controllato): non applicato, stesso
    // limite del buff ATK/DEF continuo spiegato più sopra.
    { id: 465, origin: 'yu-gi-oh', name: 'Le Forze A.', type: 'spell', subtype: 'continuous', effect: 'Tutti i mostri Tipo Guerriero che controlli guadagnano 200 ATK per ogni mostro Tipo Guerriero o Incantatore che controlli.', artOnly: true },
    // Effetto reale (l'avversario deve tenere la mano scoperta; guadagna
    // 1000 LP se ha una Magia in mano durante la sua Standby Phase): non
    // applicato, il motore non ha un trigger agganciato alla Standby
    // Phase per effetti carta generici (stesso limite di Exodia Necross,
    // id 230), oltre a non avere un concetto di "mano rivelata".
    { id: 466, origin: 'yu-gi-oh', name: 'L\'Occhio della Verità', type: 'trap', subtype: 'continuous', effect: 'Il tuo avversario deve tenere la mano rivelata. Una volta per turno, durante la Standby Phase del tuo avversario, se ha una Magia in mano: guadagna 1000 Life Points.', artOnly: true },
    // Effetto reale (se l'avversario controlla almeno 2 mostri in più di
    // te, puoi Special Summonarla dalla mano): non applicato, procedura di
    // evocazione alternativa dalla mano non supportata (stesso limite di
    // Gilasaurus, id 266).
    { id: 467, origin: 'yu-gi-oh', name: 'Il Demone Megacyber', type: 'monster', level: 6, race: 'Guerriero', attribute: 'OSCURITÀ', attack: 2200, defense: 1200, effect: 'Se il tuo avversario controlla almeno 2 mostri in più di te, puoi Special Summonare questa carta (dalla tua mano).', artOnly: true },
    // Chiude finalmente la dipendenza di Signore dei D. (id 353, il cui
    // effetto reale originale citava proprio questa carta) — ora
    // Evocabile davvero.
    { id: 468, origin: 'yu-gi-oh', name: 'Il Flauto per Evocare i Draghi', type: 'spell', subtype: 'normal', effect: 'Special Summon fino a 2 mostri Tipo Drago dalla tua mano. "Signore dei D." deve essere sul Terreno per attivare e risolvere questo effetto.', artOnly: true },
    // Effetto reale (+500 ATK continuo ai propri mostri + non
    // distruttibile una volta a turno + immunità agli attacchi sul mostro
    // con ATK più basso se ne controlli 2+ in Attacco + distrugge i propri
    // mostri Special Summonati quando attivata + blocca Special Summon
    // dall'Extra Deck + una sola volta per Duello): non applicato, troppe
    // clausole complesse e un floodgate multi-effetto per i pattern già
    // presenti.
    { id: 469, origin: 'yu-gi-oh', name: 'Il Sigillo di Orichalcos', type: 'spell', subtype: 'field', effect: 'Tutti i mostri che controlli guadagnano 500 ATK. Una volta per turno, questa carta non può essere distrutta da effetti carta. Finché controlli 2 o più mostri scoperti in Posizione di Attacco, il tuo avversario non può scegliere come bersaglio dell\'attacco i tuoi mostri con l\'ATK più basso. Se questa carta viene attivata: distruggi tutti i mostri Special Summonati che controlli. Non puoi Special Summonare mostri dall\'Extra Deck. Puoi attivare questa carta solo una volta per Duello.', artOnly: true },
    // Chiude la dipendenza di Grande Mammut di Goldfine (id 278): ora
    // entrambi i materiali di Fusione sono presenti nel database.
    { id: 470, origin: 'yu-gi-oh', name: 'Capelli di Serpente', type: 'monster', level: 4, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1500, defense: 1200, artOnly: true, vanilla: true },
    // Effetto reale (sacrifica 1 proprio mostro (esclusa questa carta) ad
    // ogni tua Standby Phase, o questa carta viene distrutta): non
    // applicato, il motore non ha un trigger agganciato alla Standby
    // Phase per effetti carta generici.
    { id: 471, origin: 'yu-gi-oh', name: 'L\'Amazzone Ostile', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 2000, defense: 1000, effect: 'Sacrifica 1 tuo mostro sul Terreno (esclusa questa carta) durante ciascuna tua Standby Phase. Se non lo fai, questa carta viene distrutta.', artOnly: true },
    // Uno dei tre Dei Egizi (gli altri due, Obelisk il Tormentatore e
    // Slifer il Drago del Cielo, sono già id 30 e 31). Sulla carta reale
    // ATK/DEF sono variabili (mostrati come "?/?"), qui rappresentati come
    // 0/0 dato che nessuna delle sue clausole viene applicata. Effetto
    // reale (non Special Summonabile; richiede 3 Tributi per l'Evocazione
    // Normale, che non può essere negata; quando Evocata Normalmente
    // nessun'altra carta/effetto può essere attivato; puoi pagare LP fino
    // a restarne con 100 per guadagnare ATK/DEF pari a quanto pagato;
    // puoi pagare 1000 LP per distruggere 1 mostro sul Terreno): non
    // applicato, troppe clausole complesse (stat variabili + blocco totale
    // delle attivazioni altrui) per i meccanismi già presenti.
    { id: 472, origin: 'yu-gi-oh', name: 'Il Drago Alato di Ra', type: 'monster', level: 10, race: 'Essere Divino', attribute: 'DIVINO', attack: 0, defense: 0, effect: 'Uno dei tre Dei Egizi: le sue statistiche variano in base ai Life Points sacrificati.', artOnly: true },
    // Fusione di Mago del Tempo (id 28, già presente) e Cucciolo di Drago
    // (id 27, già presente). Nessun effetto meccanico oltre alle
    // statistiche.
    { id: 473, origin: 'yu-gi-oh', name: 'Drago dei Mille', type: 'monster', level: 7, race: 'Drago', attribute: 'VENTO', attack: 2400, defense: 2000, extraDeck: true, category: 'fusion', effect: 'Fusione di Mago del Tempo e Cucciolo di Drago.', artOnly: true },
    // Chiude finalmente il riferimento incrociato a Mago Nero (id 2, già
    // presente).
    { id: 474, origin: 'yu-gi-oh', name: 'Mille Coltelli', type: 'spell', subtype: 'normal', effect: 'Se controlli "Mago Nero": scegli come bersaglio 1 mostro controllato dal tuo avversario; distruggilo.', artOnly: true },
    { id: 475, origin: 'yu-gi-oh', name: 'Idolo dai Mille Occhi', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 0, defense: 0, artOnly: true, vanilla: true },
    // Fusione di Abbandonato (id 416, già presente) e Idolo dai Mille
    // Occhi (id 475, qui sopra). Effetto reale (gli altri mostri sul
    // Terreno non possono cambiare Posizione né attaccare + equipaggia 1
    // mostro dell'avversario copiandone ATK/DEF, stesso schema di
    // Abbandonato): non applicato, stesso limite di Abbandonato/Relinquished
    // (id 416) — mostro che "indossa" un altro mostro come equipaggiamento,
    // troppo esotico per i meccanismi già presenti.
    { id: 476, origin: 'yu-gi-oh', name: 'Restrizione dai Mille Occhi', type: 'monster', level: 1, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 0, defense: 0, extraDeck: true, category: 'fusion', effect: 'Fusione di Abbandonato e Idolo dai Mille Occhi. Gli altri mostri sul Terreno non possono cambiare Posizione di Battaglia né attaccare.', artOnly: true },
    { id: 477, origin: 'yu-gi-oh', name: 'Ascia Tigre', type: 'monster', level: 4, race: 'Guerriero Bestia', attribute: 'TERRA', attack: 1300, defense: 1100, effect: 'Un guerriero bestia rapido e potente che brandisce un\'ascia.', artOnly: true, vanilla: true },
    // Effetto reale (quando un mostro viene distrutto in battaglia e
    // mandato al Cimitero: Special Summonalo di nuovo sullo stesso
    // Terreno, nella stessa Posizione): non applicato, il motore non ha
    // una finestra di risposta agganciata a "dopo che un mostro è stato
    // distrutto in battaglia" (esiste solo ON_ATTACK_DECLARE, PRIMA del
    // calcolo danni).
    { id: 478, origin: 'yu-gi-oh', name: 'Macchina del Tempo', type: 'trap', subtype: 'normal', effect: 'Quando un mostro viene distrutto in battaglia e mandato al Cimitero: Special Summonalo di nuovo sullo stesso Terreno, nella stessa Posizione di Battaglia in cui si trovava quando è stato distrutto.', artOnly: true },
    // Effetto reale (salta la Draw Phase del turno successivo
    // dell'avversario): non applicato, richiederebbe un flag consultato
    // dal flusso della Draw Phase in game-flow.js, meccanismo non
    // presente.
    { id: 479, origin: 'yu-gi-oh', name: 'Sigillo del Tempo', type: 'trap', subtype: 'normal', effect: 'Salta la Draw Phase del turno successivo del tuo avversario.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 24/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime (assenti
    // anche da ygoprodeck): "Toy Robot Box", "Trap Buster Armor", "Trap
    // Displacement", "Twin-Bow Centaur". Non reimportata perché già
    // presente: "Trap Hole" (id 40, Buco Trappola).
    // Effetto reale (se distrugge in battaglia un mostro dell'avversario:
    // l'avversario salta la sua prossima Main Phase 1): non applicato, il
    // motore non ha un meccanismo per "saltare una fase" del turno
    // successivo dell'avversario.
    { id: 480, origin: 'yu-gi-oh', name: 'Divoratempo', type: 'monster', level: 6, race: 'Macchina', attribute: 'OSCURITÀ', attack: 1900, defense: 1700, effect: 'Se questa carta distrugge in battaglia un mostro dell\'avversario: il tuo avversario salta la sua prossima Main Phase 1.', artOnly: true },
    { id: 481, origin: 'yu-gi-oh', name: 'Alligatore Toon', type: 'monster', level: 4, race: 'Rettile', attribute: 'ACQUA', attack: 800, defense: 1600, effect: 'Un mostro alligatore uscito direttamente dai cartoni animati.', artOnly: true, vanilla: true },
    // Effetto reale (se controlli "Mondo dei Toon": Special Summon 1
    // mostro Toon dalla mano o dal Deck con Livello pari o inferiore a
    // quello del mostro bersaglio, ignorandone le condizioni di
    // Evocazione): non applicato, ricerca dal Deck filtrata per Livello +
    // evocazione che ignora le condizioni, troppo specifico.
    { id: 482, origin: 'yu-gi-oh', name: 'Maschera Toon', type: 'trap', subtype: 'normal', effect: 'Se controlli "Mondo dei Toon": scegli come bersaglio 1 mostro scoperto controllato dal tuo avversario; Special Summon 1 mostro Toon dalla tua mano o dal Deck con Livello pari o inferiore a quello del mostro bersaglio, ignorandone le condizioni di Evocazione.', artOnly: true },
    // Effetto reale (non può attaccare nel turno in cui viene Evocata +
    // distrutta se "Mondo dei Toon" viene distrutto + può attaccare
    // direttamente se controlli "Mondo dei Toon" e l'avversario non ha
    // mostri Toon + pesca 1 carta se infligge danno da battaglia): non
    // applicato, troppe clausole condizionate (attacco diretto permesso +
    // dipendenza da un'altra carta sul Terreno) per i pattern già
    // presenti.
    { id: 483, origin: 'yu-gi-oh', name: 'Stregone Mascherato Toon', type: 'monster', level: 4, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 900, defense: 1400, effect: 'Non può attaccare nel turno in cui viene Evocata. Se "Mondo dei Toon" scoperto sul Terreno viene distrutto, distruggi questa carta. Finché controlli "Mondo dei Toon" e il tuo avversario non controlla mostri Toon, questa carta può attaccare direttamente il tuo avversario. Se questa carta infligge danno da battaglia al tuo avversario: pesca 1 carta.', artOnly: true },
    // Effetto reale: non Evocabile Normalmente/Set, deve essere Special
    // Summonata dalla mano mentre controlli "Mondo dei Toon" + paga 500 LP
    // per attaccare + distrutta se "Mondo dei Toon" viene distrutto — non
    // applicato, procedura di evocazione alternativa dalla mano non
    // supportata (stesso limite di Gilasaurus, id 266).
    { id: 484, origin: 'yu-gi-oh', name: 'Sirena Toon', type: 'monster', level: 4, race: 'Acquatico', attribute: 'ACQUA', attack: 1400, defense: 1500, effect: 'Non può essere Evocata Normalmente/Set. Deve prima essere Special Summonata (dalla tua mano), mentre controlli "Mondo dei Toon". Non può attaccare nel turno in cui viene Special Summonata. Devi pagare 500 Life Points per dichiarare un attacco con questa carta. Se "Mondo dei Toon" scoperto sul Terreno viene distrutto, distruggi questa carta.', artOnly: true },
    // Effetto reale (il mostro Toon bersaglio può attaccare una seconda
    // volta in questa Battle Phase): non applicato, il motore non
    // supporta attacchi multipli dello stesso mostro nello stesso turno
    // (stesso limite di Movimento d'Onda Diffuso, id 199).
    { id: 485, origin: 'yu-gi-oh', name: 'Riavvolgimento Toon', type: 'spell', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro Toon che controlli; può attaccare una seconda volta in questa Battle Phase.', artOnly: true },
    // Stessa struttura di Sirena Toon (id 484): non applicato per lo
    // stesso motivo (procedura di evocazione alternativa dalla mano non
    // supportata).
    { id: 486, origin: 'yu-gi-oh', name: 'Teschio Evocato Toon', type: 'monster', level: 6, race: 'Demone', attribute: 'OSCURITÀ', attack: 2500, defense: 1200, effect: 'Non può essere Evocata Normalmente/Set. Deve prima essere Special Summonata (dalla tua mano) sacrificando 1 mostro, mentre controlli "Mondo dei Toon". Non può attaccare nel turno in cui viene Special Summonata. Devi pagare 500 Life Points per dichiarare un attacco con questa carta. Se "Mondo dei Toon" scoperto sul Terreno viene distrutto, distruggi questa carta.', artOnly: true },
    { id: 487, origin: 'yu-gi-oh', name: 'Mondo dei Toon', type: 'spell', subtype: 'continuous', effect: 'Attiva questa carta pagando 1000 Life Points.', artOnly: true },
    { id: 488, origin: 'yu-gi-oh', name: 'Torike', type: 'monster', level: 3, race: 'Bestia', attribute: 'TERRA', attack: 1200, defense: 600, effect: 'Sebbene sia uno scarso difensore, il corno affilato di questo mostro gli dà un vantaggio quando attacca.', artOnly: true, vanilla: true },
    // Attivabile solo mentre "Umi" (id 497, qui sotto) è sul Terreno.
    // Effetto reale (mentre "Umi" è scoperta sul Terreno, non subisci
    // danno da battaglia dai mostri che attaccano; distrutta quando "Umi"
    // lascia il Terreno): non applicato, richiederebbe controllare un
    // flag continuo durante OGNI calcolo dei danni in battaglia
    // (resolveBattleDamage in actions.js), meccanismo non presente.
    { id: 489, origin: 'yu-gi-oh', name: 'Muro del Tornado', type: 'trap', subtype: 'continuous', effect: 'Attivabile solo mentre "Umi" è sul Terreno. Finché "Umi" è scoperta sul Terreno, non subisci danno da battaglia dai mostri che attaccano. Distruggi questa carta quando "Umi" lascia il Terreno.', artOnly: true },
    // SEMPLIFICAZIONE: l'effetto reale risponde a QUALSIASI Evocazione,
    // inclusa la propria — qui, come per Buco Trappola (id 40), risponde
    // solo a un'Evocazione dell'AVVERSARIO (stesso schema delle finestre
    // di risposta di questo motore).
    { id: 490, origin: 'yu-gi-oh', name: 'Tributo Torrenziale', type: 'trap', subtype: 'normal', effect: 'Quando un mostro viene Evocato: distruggi tutti i mostri sul Terreno.', artOnly: true },
    { id: 491, origin: 'yu-gi-oh', name: 'Trakodon', type: 'monster', level: 3, race: 'Dinosauro', attribute: 'TERRA', attack: 1300, defense: 800, effect: 'Un drago a strisce tigrate spesso visto sfrecciare attraverso le terre desolate a velocità impressionanti.', artOnly: true, vanilla: true },
    // SEMPLIFICAZIONE: la carta reale può bersagliare qualsiasi mostro sul
    // Terreno (anche un proprio mostro coperto) — qui, come per altri
    // effetti "distruggi 1 mostro", sceglie sempre un mostro scoperto
    // dell'avversario.
    { id: 492, origin: 'yu-gi-oh', name: 'Tributo ai Dannati', type: 'spell', subtype: 'normal', effect: 'Scarta 1 carta dalla mano, poi scegli come bersaglio 1 mostro sul Terreno; distruggilo.', artOnly: true },
    // Effetto reale (durante la End Phase, se questa carta è nel Cimitero
    // perché distrutta e mandata lì in questo turno: puoi Special
    // Summonarla con ATK/DEF pari a 1000, una sola volta per Duello): non
    // applicato, il motore non ha un trigger agganciato alla End Phase per
    // effetti carta generici, né un concetto di "una volta per Duello"
    // (solo per turno).
    { id: 493, origin: 'yu-gi-oh', name: 'Behemoth a Due Teste', type: 'monster', level: 3, race: 'Drago', attribute: 'VENTO', attack: 1500, defense: 1200, effect: 'Durante la End Phase, se questa carta è nel Cimitero perché distrutta sul Terreno e mandata lì in questo turno: puoi Special Summonarla, ma il suo ATK/DEF diventano 1000. Puoi usare questo effetto di "Behemoth a Due Teste" solo una volta per Duello.', artOnly: true },
    // Fusione di 2x "Thunder Dragon" (non presente in questo database).
    // Nessun effetto meccanico oltre alle statistiche.
    { id: 494, origin: 'yu-gi-oh', name: 'Drago del Tuono a Due Teste', type: 'monster', level: 7, race: 'Tuono', attribute: 'LUCE', attack: 2800, defense: 2100, extraDeck: true, category: 'fusion', effect: 'Fusione di 2 "Thunder Dragon".', artOnly: true },
    { id: 495, origin: 'yu-gi-oh', name: 'Re Rex a Due Teste', type: 'monster', level: 4, race: 'Dinosauro', attribute: 'TERRA', attack: 1600, defense: 1200, effect: 'Un mostro potente le cui due teste attaccano come una sola.', artOnly: true, vanilla: true },
    // Effetto reale (equipaggiabile solo a un mostro Tipo Drago: +400
    // ATK/DEF continuo + può attaccare fino a 2 volte per Battle Phase +
    // si autodistrugge a fine turno se ha attaccato un mostro): non
    // applicato, stesso limite del buff ATK/DEF continuo spiegato più
    // sopra, più attacchi multipli non supportati (stesso limite di
    // Movimento d'Onda Diffuso, id 199).
    { id: 496, origin: 'yu-gi-oh', name: 'Ala del Tiranno', type: 'trap', subtype: 'normal', effect: 'Scegli come bersaglio 1 mostro Tipo Drago sul Terreno; equipaggia questa carta a quel bersaglio. Guadagna 400 ATK/DEF, inoltre può effettuare fino a 2 attacchi contro mostri in ogni Battle Phase. Una volta per turno, durante la End Phase, se il mostro equipaggiato con questa carta tramite questo effetto ha attaccato un mostro dell\'avversario in questo turno: distruggi questa carta.', artOnly: true },
    // Chiude la dipendenza di Muro del Tornado (id 489, qui sopra).
    // Effetto reale (+200 ATK/DEF ai mostri Pesce/Serpente di
    // Mare/Tuono/Acquatico sul Terreno, -200 ATK/DEF ai mostri
    // Macchina/Piroico sul Terreno, di entrambi i giocatori): non
    // applicato, stesso limite del buff/debuff ATK/DEF continuo spiegato
    // più sopra.
    { id: 497, origin: 'yu-gi-oh', name: 'Umi', type: 'spell', subtype: 'field', effect: 'Tutti i mostri Tipo Pesce, Serpente di Mare, Tuono e Acquatico sul Terreno guadagnano 200 ATK/DEF, inoltre tutti i mostri Tipo Macchina e Piroico sul Terreno perdono 200 ATK/DEF.', artOnly: true },
    // Effetto reale (attivabile solo se entrambi i giocatori hanno 5+
    // mostri nel Cimitero; distruggi quanti più mostri possibile sul
    // Terreno, poi bandisci coperti tutti i mostri dai Deck; ogni Standby
    // Phase entrambi i giocatori possono Special Summon 1 mostro dal
    // proprio Cimitero, bandendolo quando lascia il campo; una sola volta
    // per Duello): non applicato, troppe clausole complesse (condizione
    // sui Cimiteri di entrambi + bando di massa dai Deck + trigger
    // ricorrente alla Standby Phase) per i pattern già presenti.
    { id: 498, origin: 'yu-gi-oh', name: 'Cerchio degli Inferi', type: 'spell', subtype: 'continuous', effect: 'Attiva questa carta se entrambi i giocatori hanno 5 o più mostri nel Cimitero; distruggi quanti più mostri possibile sul Terreno, poi ogni giocatore bandisce coperti tutti i mostri dal proprio Deck, poi puoi Special Summon 1 Mostro Normale dal tuo Cimitero. Una volta per turno, durante la Standby Phase: ogni giocatore può Special Summon 1 mostro dal proprio Cimitero, ignorandone le condizioni di Evocazione, ma bandiscilo quando lascia il campo. Puoi attivare solo 1 "Cerchio degli Inferi" per Duello.', artOnly: true },

    // ===== Importate da yugioh.com (pagina 25/26) — stesso criterio delle
    // pagine precedenti. Scartate perché confermate SOLO anime (assenti
    // anche da ygoprodeck): "Vow of Tribe", "Wish of Final Effort".
    // Effetto reale (se infligge danno da battaglia: dichiara un tipo di
    // carta, l'avversario manda 1 carta di quel tipo dal Deck al
    // Cimitero; Special Summonabile dal Cimitero durante la propria
    // Standby Phase se distrutta da un effetto avversario): non
    // applicato, richiederebbe una scelta di tipo-carta + manipolazione
    // del Deck avversario, oltre alla consueta mancanza di trigger
    // agganciato alla Standby Phase.
    { id: 499, origin: 'yu-gi-oh', name: 'Signore dei Vampiri', type: 'monster', level: 5, race: 'Zombie', attribute: 'OSCURITÀ', attack: 2000, defense: 1500, effect: 'Se questa carta infligge danno da battaglia al tuo avversario: dichiara 1 tipo di carta (Mostro, Magia o Trappola); il tuo avversario manda 1 carta di quel tipo dal Deck al Cimitero.', artOnly: true },
    // Effetto reale (può sostituire qualsiasi Materiale da Fusione
    // nominato su un Mostro Fusione, purché gli altri materiali siano
    // corretti): non applicato, richiederebbe un'interfaccia di selezione
    // dei Materiali da Fusione non presente in questo motore.
    { id: 500, origin: 'yu-gi-oh', name: 'Versago il Distruttore', type: 'monster', level: 3, race: 'Demone', attribute: 'OSCURITÀ', attack: 1100, defense: 900, effect: 'Questa carta può essere usata come sostituto di 1 qualsiasi Materiale da Fusione nominato sulla Carta Mostro Fusione, purché gli altri materiali siano corretti.', artOnly: true },
    // Effetto reale (sacrifica un numero qualsiasi di mostri, esclusi i
    // Token; l'avversario manda un numero pari di Magie dal Deck al
    // Cimitero): non applicato, sacrificio di conteggio variabile +
    // manipolazione del Deck avversario, meccanismi troppo specifici.
    { id: 501, origin: 'yu-gi-oh', name: 'Cannone Virus', type: 'trap', subtype: 'normal', effect: 'Sacrifica un numero qualsiasi di mostri, esclusi i Token; il tuo avversario manda dal Deck al Cimitero un numero di Magie pari al numero di mostri sacrificati (o tutte le sue Magie, se sono meno).', artOnly: true },
    { id: 502, origin: 'yu-gi-oh', name: 'Predone Vorse', type: 'monster', level: 4, race: 'Guerriero Bestia', attribute: 'OSCURITÀ', attack: 1900, defense: 1200, effect: 'Questo malvagio guerriero bestia fa ogni cosa orribile immaginabile, e la adora! La sua ascia porta i segni delle sue innumerevoli vittime.', artOnly: true, vanilla: true },
    // Effetto reale (non subisci danno da battaglia dai mostri
    // dell'avversario in questo turno; i tuoi mostri non possono essere
    // distrutti in battaglia in questo turno): non applicato, richiederebbe
    // un flag continuo per l'intero turno consultato durante OGNI calcolo
    // dei danni in battaglia (resolveBattleDamage in actions.js), stesso
    // limite di Muro del Tornado (id 489) e Meteorain (id 379).
    { id: 503, origin: 'yu-gi-oh', name: 'Waboku', type: 'trap', subtype: 'normal', effect: 'Non subisci danno da battaglia dai mostri del tuo avversario in questo turno. I tuoi mostri non possono essere distrutti in battaglia in questo turno.', artOnly: true },
    { id: 504, origin: 'yu-gi-oh', name: 'Guerriero Dai Grepher', type: 'monster', level: 4, race: 'Guerriero', attribute: 'TERRA', attack: 1700, defense: 1600, effect: 'Il guerriero che sa manipolare i draghi. Nessuno conosce il suo misterioso passato.', artOnly: true, vanilla: true },
    { id: 505, origin: 'yu-gi-oh', name: 'Water Omotics', type: 'monster', level: 4, race: 'Acquatico', attribute: 'ACQUA', attack: 1400, defense: 1200, effect: 'Trasforma l\'acqua che trabocca da una brocca in draghi all\'attacco.', artOnly: true, vanilla: true },
    // Chiude finalmente la dipendenza di Paladino del Drago Bianco (id
    // 398): ora Evocabile davvero.
    { id: 506, origin: 'yu-gi-oh', name: 'Rituale del Drago Bianco', type: 'spell', subtype: 'ritual', effect: 'Sacrifica dal Terreno o dalla mano mostri per un Livello totale di almeno 4 per Special Summon Paladino del Drago Bianco dalla mano.', artOnly: true },
    { id: 507, origin: 'yu-gi-oh', name: 'Drago Alato, Guardiano della Fortezza #1', type: 'monster', level: 4, race: 'Drago', attribute: 'VENTO', attack: 1400, defense: 1200, effect: 'Un drago comunemente trovato a guardia delle fortezze di montagna. Il suo attacco caratteristico è una picchiata improvvisa.', artOnly: true, vanilla: true },
    // Chiude la dipendenza di Re dei Musicisti (id 387). Effetto reale
    // (quando mandata dal Terreno al Cimitero: aggiungi 1 mostro con 1500
    // o meno DEF dal Deck alla mano): non applicato, stesso limite del
    // trigger ON_DESTROY riservato ma mai collegato (stesso limite di
    // Sangan, id 433).
    { id: 508, origin: 'yu-gi-oh', name: 'Strega della Foresta Nera', type: 'monster', level: 4, race: 'Incantatore', attribute: 'OSCURITÀ', attack: 1100, defense: 1200, effect: 'Quando questa carta viene mandata dal Terreno al Cimitero: puoi aggiungere alla mano 1 mostro con 1500 o meno DEF dal Deck (una volta per turno).', artOnly: true },
    // Chiude la dipendenza di Drago Verme Umanoide (id 303).
    { id: 509, origin: 'yu-gi-oh', name: 'Drago Verme', type: 'monster', level: 4, race: 'Rettile', attribute: 'TERRA', attack: 1400, defense: 1500, effect: 'Una volta che questo mostro si avvolge attorno a una vittima, non c\'è via di fuga.', artOnly: true, vanilla: true },
    { id: 510, origin: 'yu-gi-oh', name: 'Cannone Testa X', type: 'monster', level: 4, race: 'Macchina', attribute: 'LUCE', attack: 1800, defense: 1500, effect: 'Un mostro con una possente canna a cannone, capace di integrare i suoi attacchi combinandosi e separandosi da altri mostri.', artOnly: true, vanilla: true },
    // Fusione di Cannone Testa X (id 510, qui sopra) e Testa di Drago Y
    // (id 513, qui sotto) — entrambi i materiali sono presenti! Effetto
    // reale (Special Summonabile dall'Extra Deck bandendo le carte sopra
    // indicate invece che tramite Fusione standard + scarta 1 carta per
    // distruggere 1 Magia/Trappola scoperta dell'avversario): non
    // applicato, procedura di Fusione non standard (bando invece di
    // "Fusione") non supportata da questo motore.
    { id: 511, origin: 'yu-gi-oh', name: 'Cannone Drago XY', type: 'monster', level: 6, race: 'Macchina', attribute: 'LUCE', attack: 2200, defense: 1900, extraDeck: true, category: 'fusion', effect: 'Deve prima essere Special Summonato (dal tuo Extra Deck) bandendo le carte sopra indicate che controlli (non stai usando "Fusione"). Non può essere Special Summonato dal Cimitero. Puoi scartare 1 carta, poi scegliere come bersaglio 1 Magia/Trappola scoperta controllata dal tuo avversario; distruggila.', artOnly: true },
    // Fusione di Cannone Drago XY (id 511, qui sopra) e Carro Armato
    // Metallico Z (id 515, qui sotto). Stesso limite di id 511: procedura
    // di Fusione non standard, non applicata.
    { id: 512, origin: 'yu-gi-oh', name: 'Cannone Drago XYZ', type: 'monster', level: 8, race: 'Macchina', attribute: 'LUCE', attack: 2800, defense: 2600, extraDeck: true, category: 'fusion', effect: 'Deve prima essere Special Summonato (dal tuo Extra Deck) bandendo le carte sopra indicate che controlli (non stai usando "Fusione"). Non può essere Special Summonato dal Cimitero. Puoi scartare 1 carta, poi scegliere come bersaglio 1 carta controllata dal tuo avversario; distruggila.', artOnly: true },
    // Mostro Union: si equipaggia a Cannone Testa X per +400 ATK/DEF, o si
    // stacca e si Special Summona da solo. Non applicato: il motore non
    // ha alcun supporto per il meccanismo "Union" (stesso limite di Drago
    // Nero Pece, id 404).
    { id: 513, origin: 'yu-gi-oh', name: 'Testa di Drago Y', type: 'monster', level: 4, race: 'Macchina', attribute: 'LUCE', attack: 1500, defense: 1600, effect: 'Una volta per turno, puoi: scegliere come bersaglio 1 "Cannone Testa X" che controlli; equipaggia questa carta a quel bersaglio; oppure: staccala e Special Summonala. Il mostro equipaggiato guadagna 400 ATK/DEF.', artOnly: true },
    { id: 514, origin: 'yu-gi-oh', name: 'Yaranzo', type: 'monster', level: 4, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1300, defense: 1500, effect: 'Uno scrigno del tesoro contenente un mostro che attacca ogni bandito incauto.', artOnly: true, vanilla: true },
    // Mostro Union: si equipaggia a Cannone Testa X o Testa di Drago Y per
    // +600 ATK/DEF, o si stacca e si Special Summona da solo. Non
    // applicato, stesso limite del meccanismo "Union" non supportato.
    { id: 515, origin: 'yu-gi-oh', name: 'Carro Armato Metallico Z', type: 'monster', level: 4, race: 'Macchina', attribute: 'LUCE', attack: 1500, defense: 1300, effect: 'Una volta per turno, puoi: scegliere come bersaglio 1 "Cannone Testa X" o "Testa di Drago Y" che controlli; equipaggia questa carta a quel bersaglio; oppure: staccala e Special Summonala. Il mostro equipaggiato guadagna 600 ATK/DEF.', artOnly: true },
    { id: 516, origin: 'yu-gi-oh', name: 'Zanki', type: 'monster', level: 5, race: 'Guerriero', attribute: 'TERRA', attack: 1500, defense: 1700, effect: 'La sua lama, sguainata con rapidità, infligge danni rapidi e fatali.', artOnly: true, vanilla: true },
    // Chiude la dipendenza di Zera il Mant (id 518, qui sotto): ora
    // Evocabile davvero.
    { id: 517, origin: 'yu-gi-oh', name: 'Rituale di Zera', type: 'spell', subtype: 'ritual', effect: 'Sacrifica dal Terreno o dalla mano mostri per un Livello totale di almeno 8 per Special Summon Zera il Mant dalla mano.', artOnly: true },
    { id: 518, origin: 'yu-gi-oh', name: 'Zera il Mant', type: 'monster', level: 8, race: 'Demone', attribute: 'OSCURITÀ', attack: 2800, defense: 2300, category: 'ritual', effect: 'Questa carta può essere Evocata Rituale solo tramite la Magia Rituale "Rituale di Zera".', artOnly: true },
    { id: 519, origin: 'yu-gi-oh', name: 'Gravità Zero', type: 'trap', subtype: 'normal', effect: 'Cambia la Posizione di Battaglia di tutti i mostri scoperti sul Terreno.', artOnly: true },
    // Chiude parzialmente la dipendenza di Metalzoa (id 377): la carta
    // "Zoa" ora esiste, ma il meccanismo "sacrifica dal Deck equipaggiata
    // con Metalmorfosi" resta comunque non applicato (stesso limite già
    // spiegato per id 377).
    { id: 520, origin: 'yu-gi-oh', name: 'Zoa', type: 'monster', level: 7, race: 'Demone', attribute: 'OSCURITÀ', attack: 2600, defense: 1900, effect: 'Un mostro il cui pieno potenziale si raggiunge solo se equipaggiato con "Metalmorfosi".', artOnly: true, vanilla: true },

    // ===== Importate da yugioh.com (pagina 26/26 — ULTIMA PAGINA). Una
    // sola carta su questa pagina.
    // Fusione di "Skull Servant" (non presente in questo database) e
    // Guerriero da Battaglia (id 108, già presente). Nessun effetto
    // meccanico oltre alle statistiche.
    { id: 521, origin: 'yu-gi-oh', name: 'Guerriero Zombie', type: 'monster', level: 3, race: 'Zombie', attribute: 'OSCURITÀ', attack: 1200, defense: 900, extraDeck: true, category: 'fusion', effect: 'Fusione di Skull Servant e Guerriero da Battaglia.', artOnly: true },

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
