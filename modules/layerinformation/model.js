define([
    "backbone",
    "backbone.radio",
    "eventbus",
    "config",
    "moment",
    "modules/core/util"
], function (Backbone, Radio, EventBus, Config, moment, Util) {

    var LayerInformation = Backbone.Model.extend({
        defaults: {
            cswID: "1"
        },

        url: function () {
            var resp;

            if (_.has(Config, "csw")) {
                resp = Radio.request("RestReader", "getServiceById", Config.csw.id);
            }
            else {
                resp = Radio.request("RestReader", "getServiceById", this.get("cswID"));
            }

            if (resp[0] && resp[0].get("url")) {
                return Util.getProxyURL(resp[0].get("url"));
            }
        },
        initialize: function () {
            this.listenTo(EventBus, {
                "layerinformation:add": this.setAttributes
            });
        },

        setAttributes: function (attrs) {
            this.set(attrs);
            if (!_.isUndefined(this.get("metaID"))) {
                this.fetchData({id: this.get("metaID")});
            }
            else {
                this.trigger("sync");
            }
        },

        fetchData: function (data) {
            Util.showLoader();
            this.fetch({
                data: data,
                dataType: "xml",
                error: function () {
                    Util.hideLoader();
                    EventBus.trigger("alert", {
                        text: "Informationen zurzeit nicht verfügbar",
                        kategorie: "alert-warning"
                    });
                },
                success: function () {
                    Util.hideLoader();
                }
            });
        },

        parse: function (xmlDoc) {
            return {
                "abstractText": function () {
                    var abstractText = $("gmd\\:abstract,abstract", xmlDoc)[0].textContent;

                    if (abstractText.length > 1000) {
                        return abstractText.substring(0, 600) + "...";
                    }
                    else {
                        return abstractText;
                    }
                }(),
                "date": function () {

                    var dates = $("gmd\\:CI_Date,CI_Date", xmlDoc),
                    datetype,revisionDateTime,publicationDateTime,
                    dateTime;
                    if (dates.length === 1) {
                        dateTime = $("gco\\:DateTime,DateTime, gco\\:Date,Date", xmlDoc)[0].textContent;
                    }
                    else {
                        dates.each(function (index, element) {
                            datetype = $("gmd\\:CI_DateTypeCode,CI_DateTypeCode", element);
                            if ($(datetype).attr("codeListValue") === "revision") {
                                revisionDateTime = $("gco\\:DateTime,DateTime", element)[0].textContent;
                            }
                            else if ($(datetype).attr("codeListValue") === "publication") {
                                publicationDateTime = $("gco\\:DateTime,DateTime", element)[0].textContent;
                            }
                            else{
                                dateTime = $("gco\\:DateTime,DateTime", element)[0].textContent;
                            }
                        });
                    }
                    if (revisionDateTime){
                        dateTime=revisionDateTime;
                    }
                    else if (publicationDateTime) {
                        dateTime=publicationDateTime;
                    }
                    return moment(dateTime).format("DD.MM.YYYY");
                }()
            };
        }
    });

    return LayerInformation;
});
