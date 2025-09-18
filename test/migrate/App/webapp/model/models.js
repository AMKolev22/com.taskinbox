sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device"
], function (JSONModel, Device) {
    "use strict";

    return {

        createEditModel: function () {
            return new JSONModel({
                type: "",
                dateFrom: null,
                dateTo: null,
                duration: "",
                durationDays: 0,
                managerId: "",
                paid: true,
                showPaidToggle: true,
                substituteId: "",
                showSubstitute: false,
                substituteRequired: false,
                comment: "",
                confirmed: false,
                validation: {
                    absenceTypeState: "None",
                    absenceTypeMessage: "",
                    dateFromState: "None",
                    dateFromMessage: "",
                    dateToState: "None",
                    dateToMessage: "",
                    managerState: "None",
                    managerMessage: "",
                    substituteState: "None",
                    substituteMessage: ""
                }
            });
        },

        createErrorModel: function () {
            return new JSONModel({
                login: {
                    loginError: "",
                    showLoginError: false
                }
            });
        },

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
        createUserAbsenceModel: function () {
            return new JSONModel({
                table: {
                    absences: []
                },
                edit: {
                    id: null,
                    type: "",
                    dateFrom: "",
                    dateTo: "",
                    duration: "",
                    manager: {},
                    status: "",
                    paid: false,
                    substituteId: "",
                    comment: "",
                    ui: {
                        showPaidToggle: false,
                        showSubstitute: false,
                        substituteRequired: false
                    },
                    validation: {
                        dateFromState: "None",
                        dateFromMessage: "",
                        dateToState: "None",
                        dateToMessage: "",
                        substituteState: "None",
                        substituteMessage: ""
                    }
                },
                detail: {},
                lookup: {
                    managers: [],
                    substitutes: []
                },
                ui: {
                    loading: false,
                    editDialogOpen: false,
                    detailsDialogOpen: false,
                    showValidationMessage: false,
                    validationMessage: "",
                    updateButtonEnabled: true
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
