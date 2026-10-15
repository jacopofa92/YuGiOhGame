# Audit fattoriale Custom: Kaiba e Pegasus

Data: 2026-10-15. Dati grezzi:
`reports/archetypes/CUSTOM_DIFFICULTY_FACTORIAL.json`.

## Domanda

Nel benchmark principale `Custom` vinceva piu' spesso contro Kaiba e Pegasus
Difficili che contro le rispettive versioni Medie. Questo audit separa le due
variabili che normalmente cambiano insieme: livello dell'IA e versione del
deck avversario.

La matrice incrocia IA Media/Difficile e deck Medio/Difficile. Ogni cella usa
gli stessi 50 semi `231000-231049` del benchmark Custom. Una correzione al
simulatore costruisce il deck scelto prima della prima mescolata: specificare
esplicitamente lo stesso livello riproduce ora esattamente la partita naturale.

## Risultati

La percentuale indica le vittorie di `Custom`.

| Avversario | Deck | IA Media | IA Difficile |
|---|---|---:|---:|
| Kaiba | Medio | 76% | 78% |
| Kaiba | Difficile | 80% | 88% |
| Pegasus | Medio | 76% | 80% |
| Pegasus | Difficile | 88% | 88% |

L'IA Difficile non e' la causa del calo. A deck fisso non peggiora in modo
materiale e con Kaiba Hard migliora l'esito dell'avversario di otto punti.
La perdita di efficacia nasce soprattutto dalla composizione dei deck Hard.

## Kaiba

Rispetto al Medio, il deck Hard toglie un Signore dei D., un Flauto per
Evocare Draghi e tre mostri semplici; inserisce Obelisk, Paladino/Rituale del
Drago Bianco, Buco Trappola e Armatura Sakuretsu.

- Obelisk compare sul Terreno soltanto nel 2% delle partite e rimane in mano
  nel 31,8% delle sconfitte.
- Paladino e Rituale restano in mano rispettivamente nel 22,7% e 15,9% delle
  sconfitte: due slot che richiedono di trovarsi insieme.
- Il Drago Bianco resta in mano nel 70,5% delle sconfitte Hard.
- Buco Trappola e Armatura Sakuretsu vengono invece usate davvero e non
  risultano carte morte: il problema non e' il pacchetto difensivo.

Diagnosi: Hard somma tre piani costosi (Drago Bianco, Rituale, Obelisk) ma
riduce proprio la consistenza Signore/Flauto. L'IA Hard usa correttamente cio'
che riesce a mettere in moto; non puo' compensare mani strutturalmente pesanti.

## Pegasus

Il deck Hard aggiunge una seconda copia di Fusione, Abbandonato, Idolo dai
Mille Occhi e Riavvolgimento Toon, piu' Forza dello Specchio e Occhio della
Verita'. Per farlo rimuove Buco Trappola, Capro Espiatorio, Armatura
Sakuretsu, Nega Attacco e due corpi evocabili.

- La seconda Fusione aumenta la carta in mano iniziale dal 10% al 16%, ma
  resta in mano nel 54,5% delle sconfitte Hard e viene usata solo nell'8%
  delle partite.
- Abbandonato resta in mano nel 36,4% delle sconfitte Hard.
- Idolo dai Mille Occhi viene usato nel 66% delle partite Hard: il materiale
  non e' il collo di bottiglia; lo sono Fusione e l'accesso coerente alla
  combinazione completa.
- Le quattro difese rimosse dal Medio venivano tutte realmente utilizzate;
  Capro Espiatorio, in particolare, sviluppava anche Tributi e tempo.

Diagnosi: il deck Hard sovraccarica la linea Mille Occhi senza abbastanza
ricerca e paga il costo rimuovendo difese affidabili. Anche qui l'IA non e'
la causa primaria.

## Decisione sicura successiva

Non va indebolita o riscritta l'IA Difficile. Il prossimo esperimento deve
confrontare, senza ancora promuoverle nel gioco:

- Kaiba Hard: conservare Obelisk e le difese, ma alleggerire o rendere piu'
  coerente il pacchetto Rituale e ripristinare consistenza Drago;
- Pegasus Hard: una sola Fusione e un solo Abbandonato, conservando la linea
  Mille Occhi ma restituendo almeno due strumenti difensivi lore-friendly.

Le varianti vanno provate contro campioni ufficiali e `Custom` con gli stessi
semi. Starter, Structure, Facile e Medio restano invariati.

