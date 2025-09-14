/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "taskInbox/model/models",
    "taskInbox/model/LoginModel",
    "taskInbox/model/ErrorModel",
],
    function (UIComponent, Device, models, LoginModel, ErrorModel) {
        "use strict";

        return UIComponent.extend("taskInbox.Component", {
            metadata: {
                manifest: "json"
            },

            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * @public
             * @override
             */
            init: function () {
                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");
                this.setModel(LoginModel.createUserModel(), "user");
                this.setModel(ErrorModel.createErrorModel(), "error");
            }
        });
    }
);