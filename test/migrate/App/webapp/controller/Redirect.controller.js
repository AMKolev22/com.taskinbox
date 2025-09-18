sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "App/controller/Base.controller",
], function(
	Controller,
    Base
) {
	"use strict";

	return Base.extend("App.controller.Redirect", {
        /**
         * @override
         * @returns {void|undefined}
         */
        onInit: function() {
            Base.prototype.onInit.call(this);
            this.oRouter.getRoute("redirect").attachMatched(this.onRouteMatched, this);
        },
        onRouteMatched: function () {
            const role = this.oModel.getProperty("/role");
            role === "MANAGER" ? this.oRouter.navTo("manager") : this.oRouter.navTo("user");
        }
	});
});