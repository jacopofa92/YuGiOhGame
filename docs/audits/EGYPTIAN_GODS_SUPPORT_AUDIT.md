# Audit preliminare supporti Divinita' Egizie

Stato: inventario e primitive generiche conclusi; nessuna nuova carta ancora
aggiunta e nessun deck modificato.

## Base gia' presente

I tre Dei sono gia' carte realmente implementate, non semplici immagini:

- Obelisk (id 30): tre Tributi, niente Set/Special Summon, Evocazione senza
  risposta, immunita' al targeting ed effetto con due Tributi;
- Slifer (id 31): tre Tributi, ATK/DEF dalla mano e riduzione di 2000 ATK sui
  mostri avversari Evocati in Attacco;
- Drago Alato di Ra (id 472): tre Tributi, scelta reale del pagamento LP e
  rimozione pagando 1000 LP.

Il test `egyptian-gods.spec.js` copre statistiche, immunita' e pagamento LP;
gli spec di Yami Yugi, Kaiba e Marik coprono anche la scelta dei tre Tributi
da parte dell'IA. Le carte sono gia' limitate a una copia e hanno fonti di
acquisizione speciali.

## Primo pacchetto candidato

Testi e nomi italiani verificati il 2026-10-15 sul database ufficiale
Yu-Gi-Oh! Neuron.

| id riservato | Carta | Dio | Impatto tecnico |
|---:|---|---|---|
| 1271 | Attacco Forza del Tuono | Slifer | distruzione dei mostri scoperti; pescata opzionale in Main Phase; limite di un solo attaccante nel turno |
| 1272 | Pugno del Fato | Obelisk | negazione e distruzione di un Mostro con Effetto; in Main Phase puo' distruggere tutte le M/T avversarie |
| 1273 | Canto Antico | Ra | ricerca da Deck/Cimitero; una Evocazione Tributo aggiuntiva; effetto dal Cimitero che assegna a Ra la somma delle statistiche originali dei Tributi |

Le mosse firma dichiarano che attivazione ed effetto non possono essere
annullati. Il motore non possiede ancora un attributo generico affidabile per
questa clausola: va aggiunto nel punto unico della Catena, non simulato carta
per carta. Canto Antico richiede invece due primitive generiche:

1. una Evocazione Tributo aggiuntiva che non diventi una seconda Evocazione
   Normale libera;
2. registrare sulle carte offerte anche ATK/DEF originali, non soltanto id e
   numero dei Tributi come avviene oggi.

## Sequenza sicura

1. [completato] aggiungere e testare le tre primitive senza carte nuove;
2. implementare separatamente Attacco Forza del Tuono e Pugno del Fato;
3. implementare Canto Antico con test sui due ordini legali delle Evocazioni
   (Tributo prima o dopo quella Normale);
4. verificare Multiplayer e IA, poi audit 1/2/3 mantenendo invariati i deck;
5. lasciare Soul Crossing e le forme aggiuntive di Ra a una feature distinta.

Limite iniziale prudenziale da sottoporre ad audit: una copia per carta. Sono
supporti di Carte Dio gia' limitate a uno e non devono diventare staple
generiche o fonti ordinarie del Negozio.

## Primitive concluse

- `activationAndEffectCannotBeNegated` viene rispettato direttamente da
  `ctx.negateActivation()`, quindi copre ogni vecchia e futura risposta;
- `additionalTributeSummonFor` concede soltanto una Evocazione Tributo e
  lascia distinta la quota Normale, in entrambi gli ordini di utilizzo;
- ogni Evocazione Tributo conserva in `_tributedOriginalStats` id, ATK e DEF
  originali delle carte offerte, indipendentemente dai modificatori attivi.

Il test `primitive-supporti-divinita.spec.js` copre le tre regole. Restano
verdi anche gli spec mirati sui tre Dei, sulle negazioni e sull'Evocazione
Tributo a Terreno pieno. Typecheck verde; suite completa non eseguita.
