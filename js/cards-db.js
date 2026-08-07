const cardDatabase = [
    { id: 1, name: 'Drago Bianco Occhi Blu', type: 'monster', attack: 3000, defense: 2500 },
    { id: 2, name: 'Mago Nero', type: 'monster', attack: 2500, defense: 2100 },
    { id: 3, name: 'Elfo Mistico', type: 'monster', attack: 800, defense: 2000 },
    { id: 4, name: 'Guerriero Celtico', type: 'monster', attack: 1400, defense: 1200 },
    { id: 5, name: 'Soldato di Pietra', type: 'monster', attack: 1300, defense: 2000 },
    { id: 6, name: 'Cavaliere Oscuro', type: 'monster', attack: 2000, defense: 1800 },
    { id: 7, name: 'Buco Nero', type: 'spell', effect: 'Distruggi tutti i mostri sul Terreno.' },
    { id: 8, name: 'Spada Rivelatrice', type: 'spell', effect: 'I mostri del tuo avversario non possono attaccare.' },
    { id: 9, name: 'Forza Riflessa', type: 'trap', effect: 'Quando un mostro dell\'avversario dichiara un attacco: distruggi tutti i mostri in Posizione di Attacco controllati dal tuo avversario.' },
    { id: 10, name: 'Cilindro Magico', type: 'trap', effect: 'Quando un mostro dell\'avversario dichiara un attacco: annulla l\'attacco e, se lo fai, infliggi al tuo avversario danno pari all\'ATK di quel mostro.' }
];

function createRandomCard() {
    const template = cardDatabase[Math.floor(Math.random() * cardDatabase.length)];
    return { ...template, uid: Date.now() + Math.random() };
}
