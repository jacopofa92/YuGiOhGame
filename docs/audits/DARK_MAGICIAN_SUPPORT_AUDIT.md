# Audit supporti moderni Mago Nero

Stato: primo pacchetto implementato e testato in isolamento; economia e deck
avversari non ancora modificati.

## Primo pacchetto

| id | Carta | Effetto coperto | Stato |
|---:|---|---|---|
| 1254 | Bastone del Mago | ricerca all'Evocazione Normale; recupero dal Cimitero nel turno avversario offrendo un Incantatore | test isolato verde |
| 1255 | Cerchio Magico Oscuro | guarda le prime 3 e aggiunge una carta idonea; bandisce quando Mago Nero viene Evocato | test isolato verde |
| 1256 | Anima Eterna | Evoca Mago Nero o cerca le due Magie classiche; immunità dagli effetti avversari; distruzione dei propri mostri quando lascia il Terreno | test isolato verde |

Testi, statistiche e illustrazioni sono stati verificati il 2026-10-14
tramite YGOPRODeck. Le carte sono collocate prima del blocco WW1 senza
rinumerare gli id esistenti.

## Scelte tecniche

- `cardMentionsName` permette anche alle carte custom di dichiarare
  `mentionsNames`, senza dipendere dalla lingua o da una sottostringa fragile.
- L'immunità di Anima Eterna è per istanza e conserva il controllore: blocca
  soltanto gli effetti dell'avversario, non costi, battaglia o carte proprie.
- Il nuovo hook dal Cimitero è separato dagli effetti sul Terreno: soltanto
  chi dichiara `onCardActivatedWhileInGraveyard` può reagire da quella zona.
- Il Cerchio conserva l'ordine relativo delle carte non scelte. La libertà di
  riordinarle manualmente richiederebbe un nuovo picker ordinabile e viene
  rinviata alla fase di rifinitura UI, senza alterare quali carte si vedono o
  quale carta si può aggiungere.
- Starter, Structure, deck avversari, limiti copie e fonti economiche restano
  invariati fino all'audit comparativo 1/2/3 copie.

## Prossimo checkpoint

## Audit 1/2/3 copie

Eseguito con `tools/audit-supporti-mago-nero.js`: 50 semi contro ciascuno dei
cinque avversari Hard Joey, Kaiba, Pegasus, Mako e Bakura, quindi 250 duelli
per variante e 3.250 complessivi. Ogni variante usa Yami Yugi Hard come base
e sostituisce carte non centrali senza toccare Mago Nero, Maga Oscura,
Fusioni/Rituali, Slifer o le carte dedicate già presenti. Dati grezzi:
`reports/archetypes/DARK_MAGICIAN_SUPPORT_1_2_3.json`.

| Variante | Vittorie Yami Yugi | Turni medi |
|---|---:|---:|
| baseline | 48,4% | 17,06 |
| Bastone 1 / 2 / 3 | 42,4% / 44,0% / 44,8% | 16,30 / 15,72 / 16,48 |
| Cerchio 1 / 2 / 3 | 40,0% / 39,6% / 32,8% | 16,79 / 15,77 / 17,42 |
| Anima 1 / 2 / 3 | 40,0% / 40,4% / 37,2% | 16,55 / 15,95 / 17,15 |
| pacchetto 1 / 2 / 3 | 38,0% / 39,6% / 32,0% | 17,28 / 15,49 / 15,12 |

Le carte vengono realmente raggiunte: con tre copie il tasso di osservazione
è 73,2% per Bastone, 63,6% per Cerchio e 73,6% per Anima; nel pacchetto da
tre sale rispettivamente a 67,2%, 69,6% e 79,6%. Il calo non è quindi dovuto
a carte mai pescate, ma al costo di togliere nove carte autonome per una
linea che dispone ancora di un solo Mago Nero canonico.

Decisione: nessuna modifica ai deck Yami Yugi Facile/Medio/Difficile. Limite
provvisorio consigliato per il giocatore: 2 copie per ciascuna carta, per
ridurre le mani ridondanti e conservarne la rarità. Il limite non viene
ancora scritto nei dati: ottenibilità e limiti entrano insieme nella fase
economica. Il deck personale Custom resta una metrica separata del più ampio
`tools/audit-archetipi-classici.js`; non guida questo confronto, che deve
isolare il nucleo Mago Nero.

## Prossimo checkpoint

Proseguire con Salvation, Soul Servant, Secrets of Dark Magic e il boss
Fusione; poi ripetere il confronto, perché un secondo pacchetto completo può
cambiare sia il valore di Cerchio/Anima sia il limite copie definitivo.
