module.exports = {
    name: 'Ambienti field: firme visive distinte e pulizia al cambio arena',
    async run(t) {
        await t.page.waitForFunction(() => window.FieldAmbience && window.VideoQuality && window.gsap);
        const result = await t.evaluate(() => {
            VideoQuality.set('alti');
            const prova = (field, classe) => {
                FieldAmbience.avvia(field);
                return !!document.querySelector('.' + classe);
            };
            const firme = [
                prova('campoForesta.jpg', 'fa-firma-lucciole'),
                prova('campoPrato.jpg', 'fa-firma-pollini'),
                prova('torreCastelloPegasus.jpg', 'fa-firma-petali'),
                prova('campoGhiaccio.jpg', 'fa-firma-cristalli'),
                prova('campoAcquatico.jpg', 'fa-firma-onde'),
                prova('arenaCastelloPegasus.jpg', 'fa-firma-fiamme'),
                prova('torreDeiDuelliShadow.jpg', 'fa-firma-vortice'),
                prova('mondoVirtualeArenaGozaburo.jpg', 'fa-firma-scariche')
            ];
            FieldAmbience.avvia('campoForesta.jpg');
            const prima = document.querySelectorAll('.fa-firma-lucciole').length;
            FieldAmbience.avvia('campoPrato.jpg');
            const vecchiaDopoCambio = document.querySelectorAll('.fa-firma-lucciole').length;
            const nuovaDopoCambio = document.querySelectorAll('.fa-firma-pollini').length;
            VideoQuality.set('normali');
            return {
                firme,
                prima,
                vecchiaDopoCambio,
                nuovaDopoCambio,
                residui: document.querySelectorAll('[class*="fa-firma-"]').length
            };
        });

        t.assert(result.firme.every(Boolean),
            'Ogni famiglia campione deve montare la firma specifica del proprio luogo');
        t.assert(result.prima === 1 && result.vecchiaDopoCambio === 0 && result.nuovaDopoCambio === 1,
            'Cambiare field deve rimuovere la firma precedente e montare solo quella nuova');
        t.assert(result.residui === 0,
            'Dettagli Normali deve eliminare anche tutti gli accenti specifici aggiunti');
    }
};
