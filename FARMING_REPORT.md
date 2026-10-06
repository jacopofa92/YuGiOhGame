# Audit farming carte speciali — 2026-10-06

Comando ripetibile:

```text
node tools/simula-farming-carte.js 50000
```

La simulazione usa 50.000 profili, seme fisso `0x5EEDC0DE` e legge le
probabilità direttamente da `CardAcquisition.RULES`. Non sostituisce le
partite reali: misura il numero di vittorie, non la durata dei caricamenti,
del deck o dell'avversario. Le ore sotto assumono 8 minuti per duello.

## Exodia

| Percorso | Media primo set | Mediana | 90% entro | Ore medie | Media tre set |
|---|---:|---:|---:|---:|---:|
| Qualunque avversario, Facile | 1.175 | 1.250 | 1.250 | 156,7 h | 3.525 |
| Qualunque avversario, Normale | 1.043 | 1.057 | 1.250 | 139,1 h | 3.126 |
| Qualunque avversario, Difficile | 878 | 887 | 1.125 | 117,1 h | 2.641 |
| Seeker, Difficile | 48 | 50 | 50 | 6,4 h | 143 |

Il pity limita il caso peggiore del primo set generico a 1.250 vittorie.
Contro Seeker la garanzia ogni dieci vittorie porta il primo set entro 50 e
tre copie di ogni pezzo entro 150; i drop casuali anticipano leggermente la
media.

Valutazione: la probabilità generica è corretta come sorpresa passiva, ma non
come percorso da inseguire volontariamente. Il farming intenzionale deve
essere comunicato chiaramente come sfida a Seeker: 6-7 ore medie per il primo
set sono lunghe ma leggibili per la ricompensa più speciale del gioco. Non è
stato necessario cambiare le percentuali concordate.

## Traguardi deterministici

| Carta/traguardo | Vittorie richieste | Stima a 8 min |
|---|---:|---:|
| Destiny Board / Elefante Volante | 25 | 3,3 h |
| Prima carta firma | 50 | 6,7 h |
| Seconda soglia Kaiba/Yugi | 100 totali | 13,3 h totali |
| Slifer contro Strings | 50 | 6,7 h, oltre al capitolo |
| Ra contro Marik | 40 | 5,3 h, oltre a storia e 3 tornei |

Per Ra le dieci vittorie con perdita massima di 2000 LP sono comprese nelle
40: se il giocatore le manca, il tempo sale soltanto delle ulteriori partite
necessarie. Il costo dei tre tornei e della Storia è separato perché dipende
fortemente da sconfitte, rami e durata delle partite.

## Esito

- Le soglie 25/40/50 sono nella stessa fascia di impegno e hanno una
  progressione comprensibile.
- Le seconde copie firma a 100 vittorie sono obiettivi di lungo periodo.
- Exodia è proibitiva per caso generico ma raggiungibile tramite Seeker;
  questa differenza è intenzionale e ora documentata anche in Cartoteca.
- Il prossimo audit utile, dopo dati reali, è confrontare durata e tasso di
  vittoria a Difficile: la simulazione attuale assume che ogni tentativo sia
  una vittoria e quindi rappresenta il minimo effettivo.
