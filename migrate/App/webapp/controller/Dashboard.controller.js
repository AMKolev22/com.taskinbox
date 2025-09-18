sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("App.controller.Dashboard", {
        onInit: function () {
            this.oSplitApp = null;
            var oData = {
                taskStats: [
                    { value: "12", label: "Total Tasks" },
                    { value: "8", label: "Pending" },
                    { value: "3", label: "Urgent" }
                ]
            };
        
            var oModel = new sap.ui.model.json.JSONModel(oData);
            this.getView().setModel(oModel, "stats");
        },
	});
});