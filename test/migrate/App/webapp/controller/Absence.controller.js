sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "App/controller/Base.controller",
], function (
    Controller,
    MessageToast,
    JSONModel,
    MessageBox,
    Base,
) {
    "use strict";

    return Base.extend("App.controller.Absence", {
        onInit: function () {
            Base.prototype.onInit.call(this);
            this._editModel = this.getOwnerComponent().getModel("editModel");
            this._usersModel = new JSONModel({ managers: [], users: [] });

            this.getView().setModel(this._usersModel, "usersModel");
            this.getView().setModel(this._editModel);

            this.oRouter.getRoute("absence").attachMatched(this.onRouteMatched, this);
            this.oSplitApp = this.byId("absenceSplitApp");
        },

        onRouteMatched: async function () {
            const users = await this.loadUsers({});
            const managers = users.filter(user => user.role === "MANAGER");

            this._usersModel.setProperty("/managers", managers);
            this._usersModel.setProperty("/users", users);
            this.pageModel.setProperty("/pageTitle", this.getResourceBundle().getText("absenceTitle"));

            this.pageModel.setProperty("/navBackVisible", true);
            this.pageModel.setProperty("/logOutVisible", true);
        },

        onDateChange: function () {
            this._normaliseDates();
            this._editModel.setProperty("/validation/dateFromState", "None");
            this._editModel.setProperty("/validation/dateFromMessage", "");
            this._editModel.setProperty("/validation/dateToState", "None");
            this._editModel.setProperty("/validation/dateToMessage", "");
        },

        onAbsenceTypeChange: function () {
            this._editModel.setProperty("/validation/absenceTypeState", "None");
            this._editModel.setProperty("/validation/absenceTypeMessage", "");
        },

        onManagerChange: function () {
            this._editModel.setProperty("/validation/managerState", "None");
            this._editModel.setProperty("/validation/managerMessage", "");
        },

        onSubstituteChange: function () {
            this._editModel.setProperty("/validation/substituteState", "None");
            this._editModel.setProperty("/validation/substituteMessage", "");
        },

        onSubmit: function () {
            if (!this._validateForm()) {
                return;
            }
            const oData = this._editModel.getData();

            const oSubmissionData = {
                type: oData.type,
                dateFrom: new Date(oData.dateFrom).toISOString(),
                dateTo: new Date(oData.dateTo).toISOString(),
                userId: this.oModel.getProperty("/id"),
                managerId: parseInt(oData.managerId),
                paid: oData.paid,
                substituteId: oData.substituteId ? parseInt(oData.substituteId) : null,
                comment: oData.comment || null,
                confirmed: false
            };

            this._submitAbsenceRequest(oSubmissionData);
        },

        onCancel: function () {
            this.showCancelDialog();
        },

        _validateForm: function () {
            const oData = this._editModel.getData();

            let bIsValid = true;
            this._editModel.setProperty("/validation/absenceTypeState", "None");
            this._editModel.setProperty("/validation/dateFromState", "None");
            this._editModel.setProperty("/validation/dateToState", "None");
            this._editModel.setProperty("/validation/managerState", "None");
            this._editModel.setProperty("/validation/substituteState", "None");

            if (!oData.type) {
                this._editModel.setProperty("/validation/absenceTypeState", "Error");
                this._editModel.setProperty("/validation/absenceTypeMessage", this.getResourceBundle().getText("validation.selectAbsenceType"));
                bIsValid = false;
            }

            if (!oData.managerId) {
                this._editModel.setProperty("/validation/managerState", "Error");
                this._editModel.setProperty("/validation/managerMessage", this.getResourceBundle().getText("validation.selectManager"));
                bIsValid = false;
            }

            if (!oData.dateFrom) {
                this._editModel.setProperty("/validation/dateFromState", "Error");
                this._editModel.setProperty("/validation/dateFromMessage", this.getResourceBundle().getText("validation.selectStartDate"));
                bIsValid = false;
            }

            if (!oData.dateTo) {
                this._editModel.setProperty("/validation/dateToState", "Error");
                this._editModel.setProperty("/validation/dateToMessage", this.getResourceBundle().getText("validation.selectEndDate"));
                bIsValid = false;
            }

            if (oData.dateFrom && oData.dateTo) {
                const dFromDate = new Date(oData.dateFrom);
                const dToDate = new Date(oData.dateTo);

                if (dFromDate > dToDate) {
                    this._editModel.setProperty("/validation/dateToState", "Error");
                    this._editModel.setProperty("/validation/dateToMessage", this.getResourceBundle().getText("validation.endDateAfterStart"));
                    bIsValid = false;
                }

                if (oData.type === "PLANNED") {
                    const dToday = new Date();
                    dToday.setHours(0, 0, 0, 0);

                    if (dFromDate < dToday) {
                        this._editModel.setProperty("/validation/dateFromState", "Error");
                        this._editModel.setProperty("/validation/dateFromMessage", this.getResourceBundle().getText("validation.startDateNotPast"));
                        bIsValid = false;
                    }
                }
            }

            const iDurationDays = this.calculateDurationDays(oData.dateFrom, oData.dateTo);
            if (oData.type === "PLANNED" && iDurationDays > 3 && !oData.substituteId) {
                this._editModel.setProperty("/validation/substituteState", "Error");
                this._editModel.setProperty("/validation/substituteMessage", this.getResourceBundle().getText("validation.selectSubstitute"));
                bIsValid = false;
            }

            return bIsValid;
        },

        _normaliseDates: function () {
            const sDateFrom = this._editModel.getProperty("/dateFrom");
            const sDateTo = this._editModel.getProperty("/dateTo");

            if (sDateFrom && sDateTo) {
                const dFromDate = new Date(sDateFrom);
                const dToDate = new Date(sDateTo);

                if (dFromDate > dToDate) {
                    this._editModel.setProperty("/dateTo", sDateFrom);
                }
            }
        },


        _submitAbsenceRequest: async function (oData) {
            try {
                this.getView().setBusy(true);
                const res = await fetch("http://localhost:3000/absences", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(oData)
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.message || this.getResourceBundle().getText("absence.submitFailed"));
                }

                MessageToast.show(this.getResourceBundle().getText("absence.submitSuccess"));
                this.getView().setBusy(false);
            } catch (err) {
                MessageBox.show(this.getResourceBundle().getText("absence.submitError", [err.message]));
                this.getView().setBusy(false);
            }
        },


        formatShowPaidToggle: function (sType) {
            return sType === "PLANNED";
        },


        formatSubstituteRequired: function (sType, sDateFrom, sDateTo) {
            if (sType !== "PLANNED") {
                return false;
            }
            return this.calculateDurationDays(sDateFrom, sDateTo) > 3;
        },


        formatPaidValue: function (sType, bPaid) {
            if (sType === "SICK_LEAVE") {
                return true;
            }
            return bPaid;
        },

        formatShowSubstitute: function (sType, sDateFrom, sDateTo) {
            if (sType !== "PLANNED") {
                return false;
            }
            return this.calculateDurationDays(sDateFrom, sDateTo) > 3;
        },
    });
});