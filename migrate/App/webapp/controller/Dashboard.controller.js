sap.ui.define([
	"sap/ui/core/mvc/Controller"
], function(
	Controller
) {
	"use strict";

	return Controller.extend("App.controller.Dashboard", {
        onInit: function () {
            this.oSplitApp = null;
        },
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