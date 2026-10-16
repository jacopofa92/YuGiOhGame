# Audit preliminare supporti Divinita' Egizie

Stato: dati, immagini, primitive, effetti e test isolati delle tre carte
conclusi; nessun deck avversario o fonte economica ancora modificato.

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
annullati. La clausola passa ora dal punto unico della Catena. Canto Antico
usa invece due primitive generiche:

1. una Evocazione Tributo aggiuntiva che non diventi una seconda Evocazione
   Normale libera;
2. registrare sulle carte offerte anche ATK/DEF originali, non soltanto id e
   numero dei Tributi come avviene oggi.

## Sequenza sicura

1. [completato] aggiungere e testare le tre primitive senza carte nuove;
2. [completato] implementare separatamente Attacco Forza del Tuono e Pugno del Fato;
3. [completato] implementare Canto Antico con test sui due ordini legali delle Evocazioni
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

## Carte implementate

- `Attacco Forza del Tuono` distrugge soltanto i mostri scoperti, conta solo
  quelli realmente arrivati nel Cimitero per la pescata opzionale e applica
  il vincolo di un unico mostro attaccante senza impedire eventuali attacchi
  multipli dello stesso mostro;
- `Pugno del Fato` sceglie un Mostro con Effetto scoperto, ne annulla il nome
  fino a fine turno, lo distrugge e offre la rimozione opzionale dell'intera
  retroguardia se attivato nella propria Main Phase;
- `Canto Antico` recupera Ra da Deck o Cimitero, concede una quota distinta
  di Evocazione Tributo e, dal Cimitero, assegna al prossimo Ra Evocato tramite
  Tributo in quel turno la somma di ATK/DEF originali dei Tributi.

Copertura mirata: `supporti-divinita-slifer-obelisk.spec.js` e
`supporto-divinita-canto-antico.spec.js`, oltre al test delle primitive.
## Audit IA 1/2/3 e Multiplayer

Audit riproducibile concluso il 2026-10-15: 3.000 duelli, 50 semi contro
cinque avversari Hard per ognuna delle dodici varianti. Dati grezzi in
`reports/archetypes/EGYPTIAN_GODS_SUPPORT_1_2_3.json`; generatore in
`tools/audit-supporti-divinita.js`. Tutti i duelli sono terminati senza
errori carta, invarianti o stalli.

| Deck Hard | baseline | 1 copia | 2 copie | 3 copie |
|---|---:|---:|---:|---:|
| Strings / Attacco Forza del Tuono | 12,4% | 14,0% | 15,2% | 11,6% |
| Kaiba / Pugno del Fato | 34,0% | 34,8% | 34,8% | 38,0% |
| Marik / Canto Antico | 57,2% | 55,6% | 55,6% | 54,4% |

Attacco Forza del Tuono migliora Strings solo in misura contenuta e peggiora
a tre copie. Pugno del Fato incide poco a 1-2 copie: Obelisk compare raramente,
quindi la carta resta correttamente situazionale. Canto Antico aumenta la
presenza di Ra (dal 7,6% al 10,4% con una copia e al 12,4% con due) e accorcia
leggermente i duelli, senza aumentare il win rate di Marik.

Limite giocatore proposto: **1 copia per carta**. Sono mosse firma associate
a Dei gia' limitati a uno; le copie ulteriori aumentano soprattutto le mani
morte o la saturazione, non la qualita' strategica. Nessun deck avversario
viene modificato in assenza del benchmark informativo `Custom`; l'audit
dimostra compatibilita', non una necessita' di potenziamento.

Verifica Multiplayer: verdi `multiplayer-end-to-end`,
`multiplayer-passo-comune` e `multiplayer-protocollo-obbligatorio`. Verdi
anche i tre spec mirati delle nuove regole e carte. Suite completa non
eseguita.
