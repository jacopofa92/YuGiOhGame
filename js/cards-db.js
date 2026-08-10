/**
 * cards-db.js — Database delle carte (40 carte totali)
 *
 * Ogni mostro ha un campo "level" (stelle) che determina se serve un
 * Tributo per essere Evocato Normalmente:
 *   - Level 7+   -> richiede 2 Tributi (sacrifica 2 mostri sul Terreno)
 *   - Level 5-6  -> richiede 1 Tributo (sacrifica 1 mostro sul Terreno)
 *   - Level 1-4  -> nessun Tributo, evocazione libera
 */
const cardDatabase = [
    // ===== Carte originali =====
    { id: 1, name: 'Drago Bianco Occhi Blu', type: 'monster', level: 8, attack: 3000, defense: 2500, effect: 'Questo drago leggendario è un mostro dal potere devastante, temuto in tutto il mondo del Duel.' },
    { id: 2, name: 'Mago Nero', type: 'monster', level: 7, attack: 2500, defense: 2100, effect: 'Il mago supremo in termini di attacco e difesa.' },
    { id: 3, name: 'Elfo Mistico', type: 'monster', level: 4, attack: 800, defense: 2000 },
    { id: 4, name: 'Guerriero Celtico', type: 'monster', level: 4, attack: 1400, defense: 1200 },
    { id: 5, name: 'Soldato di Pietra', type: 'monster', level: 4, attack: 1300, defense: 2000 },
    { id: 6, name: 'Cavaliere Oscuro', type: 'monster', level: 6, attack: 2000, defense: 1800 },
    { id: 7, name: 'Buco Nero', type: 'spell', effect: 'Distruggi tutti i mostri sul Terreno.' },
    { id: 8, name: 'Spada Rivelatrice', type: 'spell', effect: 'I mostri del tuo avversario non possono attaccare.' },
    { id: 9, name: 'Forza Riflessa', type: 'trap', effect: 'Quando un mostro dell\'avversario dichiara un attacco: distruggi tutti i mostri in Posizione di Attacco controllati dal tuo avversario.' },
    { id: 10, name: 'Cilindro Magico', type: 'trap', effect: 'Quando un mostro dell\'avversario dichiara un attacco: annulla l\'attacco e, se lo fai, infliggi al tuo avversario danno pari all\'ATK di quel mostro.' },
    { id: 11, name: 'Braccio Dx Del Proibito', type: 'monster', level: 1, attack: 200, defense: 300 },

    // ===== Nuove carte (12-40) =====
    { id: 12, name: 'Drago Nero Occhi Rossi', type: 'monster', level: 7, attack: 2400, defense: 2000, effect: 'Un drago feroce avvolto da un\'aura oscura.' },
    { id: 13, name: 'Teschio Evocato', type: 'monster', level: 6, attack: 2500, defense: 1200, effect: 'Un demone convocato dagli inferi con un fulmine devastante.' },
    { id: 14, name: 'Gaia il Cavaliere Feroce', type: 'monster', level: 7, attack: 2300, defense: 2100, effect: 'Un cavaliere che cavalca un possente destriero da guerra.' },
    { id: 15, name: 'Maledizione del Drago', type: 'monster', level: 5, attack: 2000, defense: 1500 },
    { id: 16, name: 'Gearfried il Cavaliere di Ferro', type: 'monster', level: 4, attack: 1800, defense: 1600 },
    { id: 17, name: 'Jinzo', type: 'monster', level: 6, attack: 2400, defense: 1500, effect: 'Le carte Trappola sul Terreno perdono il loro effetto.' },
    { id: 18, name: 'Predone Vorse', type: 'monster', level: 4, attack: 1900, defense: 1200 },
    { id: 19, name: 'Maga Oscura', type: 'monster', level: 6, attack: 2000, defense: 1700, effect: 'Un\'allieva prodigio del Mago Nero.' },
    { id: 20, name: 'Buster Blader', type: 'monster', level: 7, attack: 2600, defense: 2300, effect: 'Guadagna forza extra contro i mostri di Tipo Drago.' },
    { id: 21, name: 'Drago a Cannoni', type: 'monster', level: 7, attack: 2600, defense: 2200, effect: 'Un drago meccanico armato di cannoni multipli.' },
    { id: 22, name: 'Kuriboh', type: 'monster', level: 1, attack: 300, defense: 200, effect: 'Piccolo ma prezioso: può sacrificarsi per annullare un danno da battaglia.' },
    { id: 23, name: 'Insetto Divoratore', type: 'monster', level: 2, attack: 450, defense: 600 },
    { id: 24, name: 'Elfi Gemelli', type: 'monster', level: 4, attack: 1900, defense: 900 },
    { id: 25, name: 'Ryu Kishin', type: 'monster', level: 3, attack: 1000, defense: 500 },
    { id: 26, name: 'Folletto Selvaggio', type: 'monster', level: 4, attack: 1300, defense: 1400 },
    { id: 27, name: 'Cucciolo di Drago', type: 'monster', level: 4, attack: 1200, defense: 700 },
    { id: 28, name: 'Mago del Tempo', type: 'monster', level: 4, attack: 500, defense: 400, effect: 'Può alterare il flusso del tempo con la sua Ruota della Fortuna.' },
    { id: 29, name: 'Drago Bianco Definitivo', type: 'monster', level: 10, attack: 4500, defense: 3800, effect: 'La fusione di tre Draghi Bianchi Occhi Blu: una forza quasi inarrestabile.' },
    { id: 30, name: 'Obelisk il Tormentatore', type: 'monster', level: 10, attack: 4000, defense: 4000, effect: 'Uno dei tre Dei Egizi: un colosso di pura forza distruttiva.' },
    { id: 31, name: 'Slifer il Drago del Cielo', type: 'monster', level: 10, attack: 3000, defense: 2500, effect: 'Uno dei tre Dei Egizi: le sue statistiche crescono con le carte in mano.' },
    { id: 32, name: 'Il Drago Alato di Ra', type: 'monster', level: 10, attack: 4000, defense: 4000, effect: 'Uno dei tre Dei Egizi: il più antico e temuto tra loro.' },
    { id: 33, name: 'Il Guardiano del Cancello', type: 'monster', level: 10, attack: 3750, defense: 3400, effect: 'Fusione di tre guardiani elementali che proteggono un antico portale.' },
    { id: 34, name: 'Ragno Lanciatore', type: 'monster', level: 6, attack: 2200, defense: 2500, effect: 'Un mostro meccanico armato di missili a lungo raggio.' },
    { id: 35, name: 'Rinascita del Mostro', type: 'spell', effect: 'Special Summon di un mostro da un Cimitero, tuo o dell\'avversario.' },
    { id: 36, name: 'Vaso dell\'Avidità', type: 'spell', effect: 'Pesca 2 carte.' },
    { id: 37, name: 'Folgore Fulminante', type: 'spell', effect: 'Distruggi tutte le carte sul Terreno del tuo avversario.' },
    { id: 38, name: 'Fusione', type: 'spell', effect: 'Fondi insieme i Materiali Fusione elencati su un Mostro Fusione.' },
    { id: 39, name: 'Voragine', type: 'spell', effect: 'Distruggi il mostro scoperto con l\'ATK più basso controllato dal tuo avversario.' },
    { id: 40, name: 'Buco Trappola', type: 'trap', effect: 'Quando l\'avversario Evoca Normalmente o Special Summon un mostro con più di 1000 ATK: distruggilo.' },
];

function createRandomCard() {
    const template = cardDatabase[Math.floor(Math.random() * cardDatabase.length)];
    return { ...template, uid: Date.now() + Math.random() };
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
