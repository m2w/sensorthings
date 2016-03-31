define([
    "backbone",
    "text!modules/treeMobile/templateFolder.html",
    "text!modules/treeMobile/templateFolderLeaf.html"
], function () {

    var Backbone = require("backbone"),
        FolderTemplate = require("text!modules/treeMobile/templateFolder.html"),
        FolderLeafTemplate = require("text!modules/treeMobile/templateFolderLeaf.html"),
        FolderView;

    FolderView = Backbone.View.extend({
        tagName: "li",
        className: "list-group-item",
        template: _.template(FolderTemplate),
        templateLeaf: _.template(FolderLeafTemplate),
        events: {
            "click .folder-item": "changeMenuById",
            "click .checked-all-item": "toggleIsChecked"
        },
        initialize: function () {
            this.listenTo(this.model, {
                 "change:isVisible": this.render,
                 "change:isChecked": this.render
            });
        },
        render: function () {
            if (this.model.getIsVisible() === true && this.model.getIsExpanded() === true) {
                var attr = this.model.toJSON();

                $(this.model.get("targetElement")).append(this.$el.html(this.templateLeaf(attr)));
                this.delegateEvents(this.events);
            }
            else if (this.model.getIsVisible() === true) {
                var attr = this.model.toJSON();

                $(this.model.get("targetElement")).append(this.$el.html(this.template(attr)));
                this.delegateEvents(this.events);
            }
            else {
                this.$el.remove();
            }
        },
        changeMenuById: function () {
            this.model.setIsExpanded(true);
            this.model.changeMenuById(this.model.getId());
        },
        toggleIsChecked: function () {
            this.model.toggleIsChecked();
        }
    });

    return FolderView;
});
