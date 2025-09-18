sap.ui.define(
  [
    "sap/ui/core/mvc/Controller"
  ],
  function (BaseController) {
    "use strict";

    return BaseController.extend("App.controller.App", {
      onInit: function () {
        this.getOwnerComponent().getRouter().navTo("login");
      }
    });
  }
);
