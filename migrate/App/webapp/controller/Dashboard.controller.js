sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (
    Controller
) {
    "use strict";

    return Controller.extend("App.controller.Dashboard", {
        onInit: function () {
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
        onPrioritySelect: function (oEvent) {
            const priority = oEvent.getParameter("selectedItem").getKey();
            console.log("Priority selected: ", priority);
        },
        onTypeSelect: function (oEvent) {
            const type = oEvent.getParameter("selectedItem").getKey();
            console.log("Type selected: ", type);
        }
    });
});