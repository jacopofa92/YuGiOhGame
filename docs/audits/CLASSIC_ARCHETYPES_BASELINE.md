# Baseline supporti archetipi classici

Data: 2026-10-14. Dati grezzi:
`reports/archetypes/CLASSIC_ARCHETYPES_BASELINE.json`.

## Metodo

Ogni versione Facile/Media/Difficile dei sei avversari ha affrontato cinque
campioni fissi (Yami Yugi, Joey, Pegasus, Mako e Bakura), pilotati dall'IA
Difficile. Sono stati usati 50 semi uguali per livello: 250 duelli per riga,
4.500 totali. La percentuale indica le vittorie dell'avversario esaminato.

Le carte firma non sono cercate nel testo del registro: il simulatore osserva
direttamente campo, zona Magie/Trappole, Cimitero e carte bandite del solo
avversario. Questo evita di attribuirgli una carta usata dal campione.

## Risultati

| Duellante | Facile | Medio | Difficile | Firma F/M/D |
|---|---:|---:|---:|---|
| Joey | 21,2% | 48,0% | 49,6% | Drago Nero 49,6 / 32,8 / 26,0% |
| Yami Yugi | 24,4% | 43,2% | 47,6% | Mago Nero 57,6 / 34,0 / 32,8%; Slifer 0 / 0,8 / 20,4% |
| Kaiba | 26,0% | 46,8% | 50,8% | Drago Bianco 48,8 / 27,2 / 23,6% |
| Pegasus | 34,4% | 50,0% | 50,4% | Mondo Toon 61,2 / 74,4 / 79,6%; Mille Occhi 0 / 1,6 / 8,0% |
| Strings | 6,8% | 9,2% | 20,0% | Slifer 0 / 0 / 39,2% |
| Marik | 26,8% | 55,2% | 58,0% | Ra 0 / 0 / 11,6% |

Nessun duello e' rimasto incompleto. Il salto principale e' quasi sempre tra
Facile e Medio; Medio e Difficile sono vicini per Joey, Yami Yugi, Kaiba,
Pegasus e Marik. Strings e' debole in assoluto, ma Hard si distingue e mette
realmente in gioco Slifer.

La frequenza inferiore di Drago Nero, Mago Nero e Drago Bianco nelle liste piu'
forti non dimostra da sola un difetto: quei duelli durano meno e le liste
cambiano. E' pero' una metrica da sorvegliare, perche' i nuovi supporti devono
rafforzare l'identita' senza produrre soltanto piu' vittorie anonime.

## Benchmark Custom

Non ancora eseguito: serve il file `save_yugioh.json` esportato dal Profilo
che contiene il deck chiamato `Custom`, oppure una specifica deck JSON. Il
risultato sara' aggiunto come sezione separata e non cambiera' retroattivamente
questa baseline ufficiale.

