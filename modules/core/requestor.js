define([
    "backbone",
    "eventbus",
    "openlayers",
    "modules/core/util",
    "config"
], function (Backbone, EventBus, ol, Util, Config) {

    var Requestor = Backbone.Model.extend({
        requestCount: 0,
        response: [],
        pContent: [],
        /**
         * params: [0] = Objekt mit name und url; [1] = Koordinate
         */
        requestFeatures: function (params) {
            Util.showLoader();
            // Anzeige der GFI und GF in alphabetischer Reihenfolge der Layernamen
            var sortedParams = _.sortBy(params[0], "name"),
                gfiContent,
                positionGFI = params[1];

            this.pContent = [];
            // Abfrage jedes Layers der von der map übermittelt wurde.
            _.each(sortedParams, function (visibleLayer) {
                gfiContent = null;
                switch (visibleLayer.ol_layer.get("typ")) {
                    case "WFS": {
                        gfiContent = this.translateGFI([visibleLayer.feature.getProperties()], visibleLayer.attributes);
                        this.pushGFIContent(gfiContent, visibleLayer);
                        break;
                    }
                    case "GeoJSON": {
                        gfiContent = this.setGeoJSONPopupContent(visibleLayer.feature);
                        this.pushGFIContent(gfiContent, visibleLayer);
                        break;
                    }
                }
            }, this);
            var containsWMS = false;

            _.each(sortedParams, function (visibleLayer) {
                if (visibleLayer.ol_layer.get("typ") === "WMS") {
                    containsWMS = true;
                }
             });
             if (containsWMS === true) {
                _.each(sortedParams, function (visibleLayer) {
                    if (visibleLayer.ol_layer.get("typ") === "WMS") {
                            gfiContent = this.setWMSPopupContent(visibleLayer, positionGFI);
                        }
                }, this);
            }
            else {
                this.buildTemplate(positionGFI);
            }

            return [this.pContent, positionGFI];
        },

        pushGFIContent: function (gfiContent, visibleLayer) {
            this.pContent.push({
                    content: gfiContent,
                    name: visibleLayer.name,
                    ol_layer: visibleLayer.ol_layer
                });
        },

        setGeoJSONPopupContent: function (feature) {
            var featureList = [];

            if (_.has(feature.getProperties(), "gfiAttributes")) {
                featureList.push(feature.getProperties().gfiAttributes);
            }
            else {
                _.each(feature.getProperties().features, function (feature) {
                    featureList.push(feature.get("gfiAttributes"));
                });
            }
            return featureList;
        },

        setWMSPopupContent: function (params, positionGFI) {
            var url,
                data = "FEATURE_COUNT=" + params.ol_layer.get("featureCount").toString(),
                pgfi = [];

            if (params.url.search(location.host) === -1) {
                url = Util.getProxyURL(params.url);
            }
            else {
                url = params.url;
            }

            ++this.requestCount;
            $.ajax({
                url: url,
                data: data,
                async: true,
                type: "GET",
                context: this, // das model
                success: function (data) {
                    var gfiList = [],
                        gfiFormat ,
                        gfiFeatures;

                    // handle non text/xml responses arriving as string
                    if (_.isString(data)) {
                        data = $.parseXML(data);
                    }

                    // parse result, try built-in ol-format first
                    gfiFormat = new ol.format.WMSGetFeatureInfo();
                    // das reverse wird fürs Planportal gebraucht SD 18.01.2016
                    gfiFeatures = gfiFormat.readFeatures(data, {
                        dataProjection: Config.view.proj
                    }).reverse();

                    // ESRI is not parsed by the ol-format
                    if (_.isEmpty(gfiFeatures)) {
                        if (data.getElementsByTagName("FIELDS")[0] !== undefined) {
                            _.each(data.getElementsByTagName("FIELDS"), function (element) {
                                var gfi = {};

                                _.each(element.attributes, function (attribute) {
                                    var key = attribute.localName;

                                    if (this.isValidValue(attribute.value)) {
                                        gfi[key] = attribute.value;
                                    }
                                    else if (this.isValidValue(attribute.textContent)) {
                                        gfi[key] = attribute.textContent;
                                    }
                                }, this);

                                gfiList.push(gfi);
                            }, this);
                        }
                    }
                    else { // OS (deegree, UMN, Geoserver) is parsed by ol-format
                        _.each(gfiFeatures, function (feature) {
                            gfiList.push(feature.getProperties());
                        });
                    }

                    if (gfiList) {
                        pgfi = this.translateGFI(gfiList, params.ol_layer.get("gfiAttributes"));
                    }
                    this.pushGFIContent(pgfi, params);
                },
                error: function (jqXHR, textStatus) {
                    alert("Ajax-Request " + textStatus);
                },
                complete: function () {
                     --this.requestCount;

                    if (this.requestCount === 0) {
                        this.buildTemplate(positionGFI);
                        Util.hideLoader();
                    }
                }
            });
        },
        buildTemplate: function (positionGFI) {
                EventBus.trigger("renderResults", [this.pContent, positionGFI]);
        },
        isValidKey: function (key) {
            var invalidKeys = ["BOUNDEDBY", "SHAPE", "SHAPE_LENGTH", "SHAPE_AREA", "OBJECTID", "GLOBALID", "GEOMETRY", "SHP", "SHP_AREA", "SHP_LENGTH"];

            if (_.indexOf(invalidKeys, key.toUpperCase()) !== -1) {
                return false;
            }
            return true;
        },
        /** helper function: check, if str has a valid value */
        isValidValue: function (str) {
            if (str && _.isString(str) && str !== "" && str.toUpperCase() !== "NULL") {
                return true;
            }
            return false;
        },
        /** helper function: first letter upperCase, _ becomes " " */
        beautifyString: function (str) {
            return str.substring(0, 1).toUpperCase() + str.substring(1).replace("_", " ");
        },
        translateGFI: function (gfiList, gfiAttributes) {
            var pgfi = [];

            _.each(gfiList, function (element) {
                var preGfi = {},
                    gfi = {};

                // get rid of invalid keys and keys with invalid values; trim values
                _.each(element, function (value, key) {
                    if (this.isValidKey(key) && this.isValidValue(value)) {
                        preGfi[key] = value.trim();
                    }
                }, this);
                if (gfiAttributes === "showAll") {
                    // beautify keys
                    _.each(preGfi, function (value, key) {
                        var key;

                        key = this.beautifyString(key);
                        gfi[key] = value;
                    }, this);
                    if (Util.isInternetExplorer() !== false) {
                        var keys=[],
                            values=[];
                        _.each (gfi,function(value,key){
                            keys.push(key);
                            values.push(value);
                        },this);
                        keys.reverse();
                        values.reverse();
                        gfi= _.object(keys, values);
                     }
                }
                else {
                    // map object keys to gfiAttributes from layer model
                    _.each(preGfi, function (value, key) {
                        key = gfiAttributes[key];
                        if (key) {
                            gfi[key] = value;
                        }
                    });
                }
                if (_.isEmpty(gfi) !== true) {
                    pgfi.push(gfi);
                }
            }, this);
            return pgfi;
    }
    });

    return new Requestor();
});
