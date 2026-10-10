# Audit dei Duellanti di Forbidden Memories

Data: 10 ottobre 2026.

## Perimetro e metodo

Sono stati controllati tutti i 21 avversari della serie `forbiddenMemories`,
da Simon Muran a DarkNite. Starter e Structure non sono stati modificati.

- cinque deck campione (`yamiYugi`, `joey`, `pegasus`, `mako`, `bakura`),
  sempre pilotati dall'IA Difficile;
- 50 semi per ogni coppia campione/livello;
- 250 duelli per livello e 750 per personaggio: 15.750 duelli nella matrice
  principale;
- stessi semi per Facile, Medio e Difficile;
- interruzione immediata in presenza di errori carta o invarianti rotti;
- controllo separato delle Fusioni realmente eseguite, non soltanto delle
  carte dichiarate nelle liste.

I dati grezzi sono in `FORBIDDEN_MEMORIES_AUDIT.json`,
`FORBIDDEN_MEMORIES_REPEATABLE_IMPACT.json` e
`FORBIDDEN_MEMORIES_STRATEGY_AUDIT.json`.

## Risultati

| Duellante | Facile | Medio | Difficile |
| --- | ---: | ---: | ---: |
| Simon Muran | 16,4% | 47,2% | 60,4% |
| Jono | 13,2% | 30,0% | 41,2% |
| Teana | 20,8% | 44,0% | 65,6% |
| Sacerdote Seto | 30,4% | 57,2% | 71,2% |
| Shadi | 19,6% | 34,4% | 48,0% |
| Sacerdotessa Isis | 15,6% | 26,8% | 50,8% |
| Ocean Mage | 12,0% | 41,2% | 56,4% |
| High Mage Secmeton | 28,0% | 61,6% | 70,4% |
| Forest Mage | 10,8% | 39,2% | 55,6% |
| High Mage Anubisius | 5,2% | 33,6% | 39,6% |
| Mountain Mage | 16,8% | 46,4% | 68,0% |
| High Mage Atenza | 16,4% | 55,6% | 54,0% |
| Desert Mage | 26,8% | 50,8% | 58,4% |
| High Mage Martis | 19,2% | 42,8% | 60,0% |
| Meadow Mage | 17,2% | 50,0% | 56,4% |
| High Mage Kepura | 26,8% | 48,8% | 54,8% |
| Labyrinth Mage | 8,4% | 30,8% | 44,8% |
| Sebek | 9,6% | 56,4% | 65,2% |
| Neku | 15,6% | 56,4% | 67,2% |
| Heishin | 34,4% | 67,6% | 73,2% |
| DarkNite | 14,4% | 54,0% | 62,4% |

Le quattro righe influenzate dagli effetti continui ripetibili (Shadi,
Desert Mage, Martis e Labyrinth Mage) riportano il controllo successivo al
fix; le altre provengono dalla matrice principale.

Venti curve su ventuno sono monotone. L'unica eccezione è High Mage Atenza:
Hard è 1,6 punti sotto Medio. Il calo è piccolo e distribuito uniformemente
sui cinque campioni. Non è un errore strategico: Hard realizza Drago Nero
Meteora nel 7% dei duelli contro il 2% di Medio, ma il suo piano più
ambizioso e Drago Bianco possono anche appesantire la mano. Il mazzo resta
invariato: togliere le carte simboliche per inseguire 1,6 punti sarebbe un
peggioramento della fedeltà.

## Problemi trovati e corretti

1. `Controllore Nemico` usava una vecchia variabile `decl` fuori scope nel
   ramo che cambia Posizione. Sacerdote Seto poteva quindi saltare l'effetto
   con un `ReferenceError`. Ora usa il bersaglio già dichiarato dal picker e
   uno spec copre il caso senza mostro da offrire.
2. L'IA Difficile non interrogava le Magie/Trappole scoperte marcate
   `repeatableWhileContinuous`. Ora lo fa genericamente: la soluzione vale
   anche per carte future/custom che espongono lo stesso contratto.
3. Labyrinth Mage prepara `Muro del Labirinto` scoperto in Difesa quando ha
   `Labirinto Magico`, e Hard ha una seconda copia della Magia al posto della
   generica `Armatura Sakuretsu`. Uno spec verifica sia l'ingresso sia il
   secondo passo della combo.
4. `Giltia il Cavaliere D.` era presente nell'Extra Deck di Labyrinth Mage
   senza Fusione né materiali e non apparteneva al suo piano. È stato rimosso
   da tutti e tre i livelli; il vero boss del deck resta Wall Shadow.

## Fusioni osservate

Su 100 duelli per livello, il registro completo conferma che l'IA realizza:

- Drago Bianco Definitivo di Sacerdote Seto: 2% Medio, 2% Hard;
- Drago Nero Meteora di Atenza: 2% Medio, 7% Hard;
- Gaia di Meadow Mage: 8% Medio, 9% Hard;
- le Fusioni di Kepura: 7% Medio, 12% Hard;
- Drago Nero del Teschio di Heishin: 9% Medio, 12% Hard;
- le due Fusioni di DarkNite: 7% Medio, 4% Hard.

Sono linee secondarie rare, come è corretto per combinazioni che richiedono
più carte specifiche; non sono carte morte. Labyrinth Mage non viene contato
qui perché Wall Shadow è una Special Summon dal Deck, non una Fusione.

