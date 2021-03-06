define(function (require) {

    var Backbone = require("backbone"),
        Radio = require("backbone.radio"),
        AlertingModel;

    AlertingModel = Backbone.Model.extend({
        defaults: {
            // http://getbootstrap.com/components/#alerts-examples
            category: "alert-info",
            // true wenn Close Button dargestellt werden soll
            isDismissable: true,
            // Position der Messages [top-center | center-center]
            position: "top-center",
            // letzte/aktuelle Alert Message
            message: ""
        },
        initialize: function () {
            var channel = Radio.channel("Alert");

            this.listenTo(channel, {
                "alert": this.setParams,
                "alert:remove": function () {
                    this.trigger("removeAll");
                }
            }, this);
        },

        /**
         * Wird ein String übergeben, handelt es sich dabei um die Alert Message
         * Ist es ein Objekt, werden die entsprechenden Attribute gesetzt
         * @param {String|Object} val
         */
        setParams: function (val) {
            if (_.isString(val)) {
                this.setMessage(val);
            }
            else if (_.isObject(val)) {
                this.setMessage(val.text);
                if (_.has(val, "kategorie") === true) {
                    this.setCategory(val.kategorie);
                }
                if (_.has(val, "dismissable") === true) {
                    this.setIsDismissalbe(val.dismissable);
                }
                if (_.has(val, "position") === true) {
                    this.setPosition(val.position);
                }
            }
            this.trigger("render");
        },

        setCategory: function (value) {
            this.set("category", value);
        },

        setIsDismissalbe: function (value) {
            this.set("dismissable", value);
        },

        setMessage: function (value) {
            this.set("message", value);
        },

        setPosition: function (value) {
            this.set("position", value);
        }
    });

    return AlertingModel;
});
