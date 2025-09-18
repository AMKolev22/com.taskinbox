sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/layout/form/SimpleForm",
    "App/model/formatter",
], function (
    Controller,
	MessageBox,
	MessageToast,
	Fragment,
	SimpleForm,
	formatter
) {
    "use strict";

    return Controller.extend("App.controller.Base", {
        onInit: function () {
            this.oModel = this.getOwnerComponent().getModel("user");    
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oSplitApp = null;
        },


        getResourceBundle: function () {
            if (!this.oResourceBundle) {
                this.oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            }
            return this.oResourceBundle;
        },

         /**
         * Toggles the SplitApp master area visibility
         */
         onToggleMaster: function () {
            if (this.oSplitApp) {
                if (this.oSplitApp.isMasterShown()) {
                    this.oSplitApp.hideMaster();
                } else {
                    this.oSplitApp.showMaster();
                }
            }
        },

        /**
         * Shows the master area of the SplitApp
         */
        onShowMaster: function (oSplitApp) {
            if (this.oSplitApp) {
                this.oSplitApp.showMaster();
            }
        },

        /**
         * Hides the master area of the SplitApp
         */
        onHideMaster: function () {
            if (this.oSplitApp) {
                this.oSplitApp.hideMaster();
            }
        }

    });
});