define([
    'underscore',
    'backbone',
    'eventbus',
    'config'
], function (_, Backbone, EventBus, Config) {

    /**
     *
     */
    var Print = Backbone.Model.extend({
        defaults: {
            spec: {}, // JSON die an den Druckdienst geschickt wird
            layerToPrint: [],   // die sichtbaren Layer
            gfiToPrint: [],  // die sichtbaren GFIs
            currentMapScale: Config.view.scale, // akuteller Maßstab
            currentMapCenter: Config.view.center    // aktuelle Zentrumkoordinate
        },
        url: Config.proxyURL + "?url=" + Config.printURL + 'master/info.json',
        initialize: function () {

            // get print config
            this.fetch({
                cache: false,
                async: false
            });

            EventBus.on('layerForPrint', this.setLayerToPrint, this);
            EventBus.on('gfiForPrint', this.setGFIToPrint, this);
            EventBus.on('currentMapCenter', this.setCurrentMapCenter, this);
        },
        updatePrintPage: function () {
            EventBus.trigger('updatePrintPage', this.get('active'));
            this.set('currentMapScale', $('#scaleField').val());
        },
        setCurrentMapCenter: function (center) {
            this.set('currentMapCenter', center);
        },
        /**
         *
         */
        getLayersForPrint: function () {
            EventBus.trigger('getLayersForPrint');
        },
        /**
         * [[Description]]
         * @param {Array} values - values[0] = GFIs(Object), values[1] = Sichbarkeit GFIPopup(boolean)
         */
        setGFIToPrint: function (values) {
            this.set('gfiParams', _.pairs(values[0]));
            this.set('hasPrintGFIParams', values[1]);
            if (this.get('hasPrintGFIParams') === true) {
                switch (this.get('gfiParams').length) {
                    case 4:
                        this.set('createURL', 'http://wscd0096:8680/mapfish_print_2.0/master_gfi_4/create.json');
                        break;
                    case 5:
                        this.set('createURL', 'http://wscd0096:8680/mapfish_print_2.0/master_gfi_5/create.json');
                        break;
                    case 6:
                        this.set('createURL', 'http://wscd0096:8680/mapfish_print_2.0/master_gfi_6/create.json');
                        break;
                }
            }
            else {
                this.set('createURL', 'http://wscd0096:8680/mapfish_print_2.0/master/create.json');
            }
        },
        /**
         *
         */
        setLayerToPrint: function (layers) {
            _.each(layers, function (layer) {
                this.get('layerToPrint').push({
                    type: layer.get('typ'),
                    layers: layer.get('layers').split(),
                    baseURL: layer.get('url'),
                    format: "image/png",
                    opacity: layer.get('opacity')
                });
            }, this);
            this.setSpec();
        },
        /**
         *
         */
        setSpec: function () {
            this.set('spec', {
                layout: $('#layoutField option:selected').html(),
                srs: "EPSG:25832",
                units: "m",
                outputFilename: "test",
                outputFormat: "pdf",
                layers: this.get('layerToPrint'),
                pages: [
                    {
                        center: this.get('currentMapCenter'),
                        scale:  this.get('currentMapScale'),
                        dpi: 96,
                        mapTitle: 'test'
                    }
                ]
            });

            if (this.get('hasPrintGFIParams') === true) {
                _.each(_.flatten(this.get('gfiParams')), function (element, index) {
                    this.get('spec').pages[0]["attr_" + index] = element;
                }, this);
            }

            $.ajax({
                url: Config.proxyURL + "?url=" + this.get("createURL"),
                type: 'POST',
                data: JSON.stringify(this.get('spec')),
                headers: {
                    "Content-Type": "application/json; charset=UTF-8"
                },
                success: function (data) {
                    window.open(data.getURL);
                    $('#loader').hide();
                },
                error: function (err) {
                    $('#loader').hide();
                }
            });
        }
    });

    return new Print();
});
