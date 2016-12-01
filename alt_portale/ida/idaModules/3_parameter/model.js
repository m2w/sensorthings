define([
    "backbone",
    "eventbus"
], function (Backbone, EventBus) {
    "use strict";
    var ParameterModel = Backbone.Model.extend({
        defaults: {
            brwList: [],
            requestedParams: {},
            params: {},
            nutzung: "",
            produkt: "",
            lage: ""
        },
        initialize: function () {
        },
        paramChanged: function (obj) {
            if (obj.type === "number") {
                var waehrungsfaktor = obj.waehrung && obj.waehrung === "DM" ? 1.95583 : 1,
                    eurValue = obj.value / waehrungsfaktor,
                    mincheck = obj.minCheck && Number(eurValue) < Number(obj.minCheck) ? false : true,
                    maxcheck = obj.maxCheck && Number(eurValue) > Number(obj.maxCheck) ? false : true;

                if (mincheck === true && maxcheck == true) {
                    this.trigger("switchToValid", obj.id);
                    _.extend(this.get("params"), _.object([obj.id], [eurValue.toString()]));
                }
                else {
                    this.trigger("switchToInvalid", obj.id);
                }
            }
            else {
                _.extend(this.get("params"), _.object([obj.id], [obj.value]));
            }
        },
        calcDefaultsForTemplate: function () {
            var brwList = this.get("brwList"),
                aktBRW = _.filter(brwList, {art: "Akt.BRW"})[0],
                defaultFlae = aktBRW && aktBRW.brwValues.flae ? aktBRW.brwValues.flae : 1000,
                defaultBauw = aktBRW && aktBRW.brwValues.bauw ? aktBRW.brwValues.bauw : "",
                defaultWGFZ = aktBRW && aktBRW.brwValues.wgfz ? aktBRW.brwValues.wgfz : 1.0,
                defaultStadtteil = this.get("brwList").length > 0 ? this.get("brwList")[0].brwLage.stadtteil : "";

            this.set("defaultFlae", defaultFlae);
            this.set("defaultStadtteil", defaultStadtteil);
            this.set("defaultBauw", defaultBauw);
            this.set("defaultWGFZ", defaultWGFZ);
        }
    });

    return new ParameterModel();
});