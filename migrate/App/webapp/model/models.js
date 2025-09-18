sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {

        createUserModel: function () {
            return new JSONModel({
                email: "",
                name: "",
                password: "",
                role: "",
                id: "",
                isManager: false,
                absences: [],
                managedAbsences: [],
                pendingApproval: [],
                ActivityLog: [],
                validation: {
                    emailState: "None",
                    emailMessage: "",
                    nameState: "None",
                    nameMessage: "",
                    passwordState: "None",
                    passwordMessage: ""
                }
            });
        },
        createPageModel: function() {
            return new JSONModel({
                pageTitle: ""
            })
        },

        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        }
    };
});
