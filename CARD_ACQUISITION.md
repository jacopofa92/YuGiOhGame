# Acquisizione carte — fonte di verità

Regole implementate in `js/economy/card-acquisition.js`,
`js/data/card-rarity.js` e `js/economy/shop-catalog.js`. La Cartoteca mostra
anche la fonte nella scheda della carta.

Le Sfide accettano premi dati come `cards: [{ id, qty }]` e
`unlockPacks: ['id-pacchetto']`; entrambi persistono nel salvataggio.

## Limiti e deck

- Massimo 3 copie per carta.
- Starter/Structure non sommano i doppioni: la quantità diventa il massimo
  fra posseduta e contenuta nel singolo deck.
- Starter base subito; Yugi/Kaiba Evolution dopo il Regno dei Duellanti;
  Structure Yu-Gi-Oh dopo Battle City I. Qualsiasi difficoltà.
- La Grande Guerra non partecipa a queste regole.

## Rarità, rotazione e buste

Fasce: Comune, Rara, Super Rara, Ultra Rara, Leggendaria, Segreta e Mitica.
Segrete e Mitiche non entrano nelle buste generiche.

- 3 Comuni/giorno: 150 Crediti + 1 Stella.
- 2 Rare/giorno: 450 + 2; 1 Super/2 giorni: 900 + 4.
- 1 Ultra/settimana: 1800 + 8; 1 Leggendaria/2 settimane:
  3500 + 15 + 1 Carta del Millennio.
- Busta Base: 200 + 1 Stella; Avanzata: 450 + 2; Leggendaria:
  900 + 5 + 2 Carte Locazione, col 5% di Leggendaria.
- Ogni settimana: 2 tematiche da 1050 + 4 Stelle e 1 Premium da
  1800 + 8 Stelle + 1 Carta Locazione. Temi: Draghi, Incantatori, Macchine,
  Non-Morti, Guerrieri, Acqua, Arpie/Amazzoni e Toon.

Le carte firma entrano nel commercio soltanto dopo la prima copia ottenuta
dalla relativa impresa. I boss come Genesi del Vampiro sono Leggendari e
possono uscire da fonti premium coerenti.

## Carte firma (sempre a Difficile)

- Kaiba 50/100: una copia di Drago Bianco per soglia.
- Yugi o Yami Yugi 50/100: una copia di Mago Nero per soglia.
- Joey 50: Drago Nero Occhi Rossi; Pegasus 50: Drago Toon Occhi Blu.
- Mai 50: Piumino delle Arpie; Bakura 25: Destiny Board.
- Pegasus 25: Elefante Volante; dopo la prima copia ha lo 0,2% nelle sole
  buste tematiche Premium, fino a 3 copie.

## Spirit Message

- I: Regno dei Duellanti; N: Battle City I; A: Mondo Virtuale;
  L: Battle City II. Qualsiasi difficoltà, una volta per carta.

## Carte Dio

- Obelisk: storia anime completa a Normale o Difficile.
- Slifer: Battle City I a Difficile; Strings 50 volte a Difficile e almeno
  una vittoria terminata con 4000 LP o più.
- Ra: Battle City II a Difficile; torneo Battle City 3 volte a Difficile;
  Marik 40 volte a Difficile, di cui 10 perdendo al massimo 2000 LP.

## Exodia

- Drop per vittoria PvE: Facile 0,05%, Normale 0,15%, Difficile 0,30%.
- Seeker a Difficile raddoppia la chance e garantisce un pezzo mancante ogni
  10 vittorie. Pity globale dopo 250 vittorie valide senza pezzo.
- Multiplayer e abbandoni esclusi. L'autowin admin conta per tutto.

## Passi successivi concordati

1. Simulazione del farming e bilanciamento con dati reali.
2. Animazione epica finto 3D del drop carta.
