# Audit dei duellanti della serie principale

Ultimo aggiornamento: 2026-10-09.

## Metodo

Sono stati misurati i 31 duellanti della serie anime non compresi nei quattro
audit già conclusi (Yami Yugi, Seto Kaiba, Pegasus e Marik). Ogni livello di
ogni personaggio ha affrontato gli stessi cinque avversari campione — Yami
Yugi, Joey, Pegasus, Mako e Bakura — pilotati dall'IA Difficile, usando 50
semi uguali: **250 duelli per livello, 750 per personaggio, 23.250 duelli**.

La percentuale è quella di vittorie del duellante sottoposto ad audit. Non è
un obiettivo di forza assoluta: un amico inesperto, un Rare Hunter e un boss
non devono convergere sullo stesso numero. Si cercano invece una progressione
Facile → Medio → Difficile, un piano giocabile e liste coerenti con la lore.
Starter e Structure Deck del giocatore non sono stati modificati.

Lo strumento riproducibile è `tools/audit-duellanti-main.js`; i dati grezzi
sono nei file `MAIN_DUELISTS_AUDIT_*.json`.

## Regno dei Duellanti e protagonisti

| Duellante | Facile | Medio | Difficile | Valutazione |
|---|---:|---:|---:|---|
| Yugi Muto | 23,2% | 27,2% | 34,8% | Monotono; separazione contenuta ma reale |
| Joey | 19,6% | 45,2% | 49,6% | Medio molto distinto; Hard solo moderatamente superiore |
| Mai | 26,8% | 55,6% | 62,4% | Curva sana |
| Bakura | 13,6% | 48,0% | 52,4% | Curva sana; Hard poco sopra Medio |
| Mako | 18,0% | 50,8% | 68,8% | Curva molto netta, tema ACQUA aggressivo |
| Weevil | 7,6% | 16,4% | 32,4% | Debole in assoluto ma ben scalato |
| Rex | 28,0% | 44,4% | 54,4% | Curva sana e piano Dinosauro coerente |
| Bandit Keith | 20,8% | 49,2% | 57,6% | Curva sana |
| Panik | 12,4% | 39,6% | 48,4% | Curva sana |
| Bonz | 13,6% | 36,8% | 53,6% | Curva sana |
| Fratelli Paradosso | 33,6% | 42,8% | 58,8% | Curva sana |

Non sono emerse regressioni. Yugi, Joey e Bakura hanno un salto
Medio→Difficile piccolo, ma non abbastanza da giustificare carte estranee
alla loro lore o un potenziamento artificiale.

## Battle City e Rare Hunters

| Duellante | Facile | Medio | Difficile | Valutazione |
|---|---:|---:|---:|---|
| Odion | 16,4% | 22,4% | 37,2% | Corretto: ora prepara 1/2/3 Trappole secondo il livello |
| Ishizu | 12,4% | 32,4% | 50,4% | Curva sana |
| Espa Roba | 24,0% | 51,2% | 62,0% | Curva sana |
| Arkana | 16,4% | 24,0% | 48,8% | Medio moderato, Hard ben distinto |
| Seeker | 37,2% | 46,4% | 50,0% | Forte già a Facile; crescita comunque monotona |
| Strings | 6,8% | 8,0% | 24,0% | Tema Melma debole; Hard ora usa davvero Slifer |
| Lumis | 8,0% | 9,2% | 20,8% | Tema Maschera debole; Rituale presente e Hard distinto |
| Umbra | 13,2% | 12,4% | 22,8% | Scarto di 0,8 punti compatibile col rumore; non forzato |
| Duke | 23,2% | 37,2% | 57,6% | Curva sana |

Strings aveva due problemi oggettivi: Slifer veniva valutato come un mostro
0/0 e la Fusione Drago Verme Umanoide era nell'Extra Deck senza una Magia
Fusione nel Main Deck. Hard ora conserva i tre corpi e riconosce il valore
dinamico di Slifer; Medio/Hard possono eseguire la Fusione. Il livello Medio
resta vicino al Facile perché le carte Melma sono intrinsecamente poco
incisive, non perché la linea sia morta.

Odion era limitato dalla regola generica di una sola Trappola Settata per
turno. La sua identità ora consente un Set a Facile, due a Medio e tre a
Difficile. Nessun altro duellante eredita questa eccezione.

Lumis e Umbra sono deboli in assoluto, ma possiedono mostro, Rito e materiali
per La Bestia Mascherata. Non vengono riempiti di staple fuori tema per farli
convergere sulla forza di Ishizu o Espa Roba.

## Mondo Virtuale

| Duellante | Facile | Medio | Difficile | Valutazione |
|---|---:|---:|---:|---|
| Noah | 8,0% | 38,0% | 48,8% | Curva sana |
| Gozaburo | 18,8% | 26,8% | 35,6% | Corretto: Sepoltura prepara Exodia Necross |
| Gansley | 14,4% | 49,2% | 62,4% | Curva sana |
| Johnson | 17,2% | 40,4% | 60,8% | Curva sana |
| Nesbitt | 27,6% | 68,4% | 72,8% | Molto forte da Medio, ma monotono e coerente col boss |
| Crump | 15,2% | 42,4% | 71,2% | Curva molto netta |
| Lector | 24,0% | 40,8% | 48,4% | Curva sana |

Gozaburo era l'anomalia più chiara del roster: 35,6% / 30,4% / 37,6%. Il
deck conteneva correttamente i cinque pezzi, Sepoltura Sciocca, Patto con
Exodia ed Exodia Necross, ma la scelta automatica di Sepoltura mandava al
Cimitero il primo mostro casuale. Per la sola identità di Gozaburo vengono
ora scelti prima i pezzi mancanti nel Cimitero. La nuova curva è monotona e
il piano coincide con quello dell'anime; il vincolo generale “non Evocare i
pezzi di Exodia” rimane intatto.

Nesbitt è già molto forte a Medio. Non è stato indebolito: la lista Macchina
è coerente e Difficile resta superiore. Uniformarlo agli altri Big Five
renderebbe meno credibile il suo ruolo e toglierebbe identità ai matchup.

## Amici e duellanti minori

| Duellante | Facile | Medio | Difficile | Valutazione |
|---|---:|---:|---:|---|
| Tristan | 7,6% | 31,6% | 47,2% | Curva sana |
| Téa | 12,4% | 36,0% | 48,4% | Curva sana |
| Serenity | 11,2% | 35,6% | 55,6% | Curva sana |
| Solomon Muto | 18,0% | 37,6% | 54,8% | Curva sana |

## Difetti del motore trovati dall'audit

1. **Il Guardiano Affidabile** poteva leggere `uid` da uno slot di transito
   privo di carta. I bonus temporanei e l'effetto ora ignorano correttamente
   una fonte o un bersaglio non più presenti.
2. **Ninja d'Assalto** poteva lasciare il Terreno mentre il proprio Effetto
   Veloce era in Catena; alla risoluzione leggeva `.card` da uno slot nullo.
   Ora controlla la fonte prima di pagare il costo e si risolve a vuoto.

Entrambi i casi sono protetti da semi riproducibili del motore senza testa.

## Conclusione

Dopo le correzioni, 30 duellanti su 31 hanno una curva monotona nel campione;
l'unica eccezione è Umbra con −0,8 punti fra Facile e Medio, valore troppo
piccolo per distinguere un effetto reale dal rumore statistico. Tutti hanno
un Difficile superiore al Medio. I temi strutturalmente più deboli restano
Melma e Maschera, ma ora le loro condizioni caratteristiche sono eseguibili.

Il passo successivo sensato non è alzare indiscriminatamente le percentuali:
è osservare in gioco i pochi profili con separazione ridotta (Yugi Muto,
Joey, Bakura, Lumis/Umbra, Nesbitt) e intervenire soltanto se l'esperienza
visiva conferma un comportamento poco credibile.
