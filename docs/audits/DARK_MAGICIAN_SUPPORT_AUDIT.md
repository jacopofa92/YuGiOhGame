# Audit supporti moderni Mago Nero

Stato: primo pacchetto implementato e testato in isolamento; economia e deck
avversari non ancora modificati.

## Primo pacchetto

| id | Carta | Effetto coperto | Stato |
|---:|---|---|---|
| 1254 | Bastone del Mago | ricerca all'Evocazione Normale; recupero dal Cimitero nel turno avversario offrendo un Incantatore | test isolato verde |
| 1255 | Cerchio Magico Oscuro | guarda le prime 3 e aggiunge una carta idonea; bandisce quando Mago Nero viene Evocato | test isolato verde |
| 1256 | Anima Eterna | Evoca Mago Nero o cerca le due Magie classiche; immunità dagli effetti avversari; distruzione dei propri mostri quando lascia il Terreno | test isolato verde |

## Secondo pacchetto

| id | Carta | Effetto coperto | Stato |
|---:|---|---|---|
| 1257 | Salvezza del Mago | Posiziona Anima Eterna dal Deck; richiama dal Cimitero il membro mancante della coppia Mago Nero/Maga Oscura | test isolato verde |
| 1258 | Servitore dell'Anima | colloca in cima una carta idonea da mano/Deck/Cimitero; dal Cimitero si bandisce e pesca per i nomi diversi presenti | test isolato verde |
| 1259 | Segreti della Magia Oscura | scelta reale tra Evocazione Fusione e Rituale, con Mago Nero/Maga Oscura obbligatorio tra i materiali | test isolato verde |
| 1260 | I Maghi Neri | materiali flessibili; pesca e Posizionamento; richiamo congiunto di Mago Nero e Maga Oscura quando distrutto | test isolato verde |

`I Maghi Neri` è stato scelto come boss perché chiude il piano condiviso
delle sette carte di supporto senza introdurre una negazione generica o una
meccanica Extra Deck successiva. Il motore Fusione ora accetta anche
`fusionMaterialMatchers` per requisiti per categoria; tutte le Fusioni
storiche continuano a usare l'array di id `fusionMaterials` invariato.

Per `Servitore dell'Anima`, nel dataset corrente non esistono ancora mostri
Palladio: il conteggio è già generico per nome e li includerà senza modifiche
al motore quando verranno eventualmente aggiunti.

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
- Starter, Structure, limiti copie e fonti economiche restano invariati fino
  alla fase economica comune.

## Audit 1/2/3 copie

Eseguito con `tools/audit-supporti-mago-nero.js`: 50 semi contro ciascuno dei
cinque avversari Hard Joey, Kaiba, Pegasus, Mako e Bakura, quindi 250 duelli
per variante. Il report completo contiene 25 varianti e 6.250 duelli; le due
composizioni IA finali aggiungono altri 500 duelli. Ogni variante usa Yami
Yugi Hard come base e sostituisce carte non centrali senza toccare Mago Nero,
Maga Oscura, Fusioni/Rituali, Slifer o le carte dedicate già presenti. Dati:
`reports/archetypes/DARK_MAGICIAN_SUPPORT_1_2_3.json` e
`reports/archetypes/DARK_MAGICIAN_SUPPORT_IA_CURATED.json`.

| Variante | Vittorie Yami Yugi | Turni medi |
|---|---:|---:|
| baseline | 41,2% | 16,95 |
| Bastone 1 / 2 / 3 | 46,4% / 49,6% / 50,4% | 16,57 / 16,78 / 16,66 |
| Cerchio 1 / 2 / 3 | 42,0% / 42,8% / 37,2% | 15,92 / 16,51 / 16,55 |
| Anima 1 / 2 / 3 | 42,8% / 46,4% / 43,2% | 16,33 / 16,25 / 16,62 |
| Salvezza 1 / 2 / 3 | 40,0% / 42,4% / 37,2% | 16,32 / 16,19 / 16,99 |
| Servitore 1 / 2 / 3 | 40,4% / 38,0% / 35,6% | 15,89 / 15,93 / 16,48 |
| Segreti 1 / 2 / 3 | 42,0% / 42,4% / 40,0% | 16,36 / 16,25 / 17,10 |
| Boss Extra Deck 1 / 2 / 3 | 41,6% / 42,4% / 41,6% | 16,70 / 16,61 / 16,96 |
| pacchetto leggero / mirato / doppio | 39,2% / 36,8% / 30,0% | 16,50 / 14,76 / 14,32 |
| pacchetto IA equilibrato | 47,6% | 15,98 |
| pacchetto IA spinto | 42,4% | 15,22 |

Triplicare o raddoppiare tutto è nettamente controproducente: troppe carte di
setup sottraggono corpi autonomi a una lista con un solo Mago Nero canonico.
La composizione selettiva funziona invece: 2 Bastoni, 1 Cerchio, 2 Anime,
1 Segreti e 1 boss nell'Extra Deck salgono dal 41,2% al 47,6%. Portare
Bastone a 3 riduce di nuovo il risultato al 42,4%, nonostante Bastone isolato
sia la carta più positiva: le sinergie non vanno lette come somma lineare.

Limiti provvisori consigliati per il giocatore: Bastone 2, Cerchio 2, Anima
2, Salvezza 1, Servitore 1, Segreti 2, I Maghi Neri 1. Sono limiti di
prudenza e rarità, non ancora scritti nei dati: verranno applicati insieme
all'ottenibilità nella fase economica.

Facile e Medio restano invariati. La sola composizione candidata per Yami
Yugi Difficile è il pacchetto IA equilibrato sopra; prima della promozione
definitiva va confrontato anche col deck personale `Custom`. Il relativo
strumento esiste (`tools/audit-archetipi-classici.js`), ma il salvataggio con
la lista Custom non è presente nel repository e quindi la metrica resta
correttamente separata e non inventata.

## Prossimo checkpoint

Acquisire un export del salvataggio che contenga il deck `Custom`; eseguire
il benchmark informativo; soltanto dopo decidere se il pacchetto IA
equilibrato entra davvero in Yami Yugi Difficile. Economia e missioni restano
una fase successiva comune a tutti gli archetipi.
