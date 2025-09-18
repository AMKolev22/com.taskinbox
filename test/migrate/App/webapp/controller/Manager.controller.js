/* eslint-disable linebreak-style */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/format/DateFormat",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "App/controller/Base.controller",
], function (
    Controller,
    DateFormat,
    MessageBox,
    MessageToast,
    JSONModel,
    Base,
) {
    "use strict";

    return Base.extend("App.controller.Manager", {
        onInit: function () {
            Base.prototype.onInit.call(this);

            this._managerViewModel = new JSONModel({
                managedAbsences: [],
            });
            this.getView().setModel(this._managerViewModel, "managerViewModel");
            this.oRouter.getRoute("manager").attachMatched(this.onRouteMatched, this);
            this.oSplitApp = this.byId("managerSplitApp");
        },

        onRouteMatched: function () {
            this.refreshActivityLog();
            this.refreshPendingRequests();
            this.pageModel.setProperty("/pageTitle", this.getResourceBundle().getText("managerDashboardTitle"));
            this.pageModel.setProperty("/navBackVisible", false);
            this.pageModel.setProperty("/logOutVisible", true);
            if (this.oModel.getProperty("/role") !== "MANAGER"){
                this.oRouter.navTo("/user");
            }
        },

        refreshPendingRequests: async function () {
            try {

                const res = await fetch(`http://localhost:3000/pendingManaged/${this.oModel.getProperty("/id")}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) {
                    const data = await res.json();
                    this.oModel.setProperty("/pendingApproval", data.managedAbsences);
                    const managedAbsences = (data.managedAbsences || []).map(absence => {
                        const from = new Date(absence.dateFrom);
                        const to = new Date(absence.dateTo);

                        return {
                            ...absence,
                            dateFrom: from,
                            dateTo: to,
                            duration: Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1,
                            status: absence.confirmed
                        };
                    });

                    this._managerViewModel.setProperty("/managedAbsences", managedAbsences);

                    MessageToast.show(this.getResourceBundle().getText("pendingRequestsRefreshedSuccess"));
                } else {
                    MessageBox.show(this.getResourceBundle().getText("pendingRequestsRefreshError"));
                }
            } catch (error) {
                MessageToast.show(this.getResourceBundle().getText("pendingRequestsRefreshException", [error.message || error]));
            }
        },

        onAbsenceApproveButtonPress: async function (oEvent) {
            const oBindingContext = oEvent.getSource().getBindingContext("managerViewModel");
            if (!oBindingContext) {
                MessageBox.show(this.getResourceBundle().getText("absenceDataError"));
                return;
            }

            const absenceData = oBindingContext.getObject();

            try {
                const res = await this.editAbsence(absenceData.id, this.oModel.getProperty("/id"), "confirm");
                if (res.ok) {
                    MessageToast.show(this.getResourceBundle().getText("absenceApprovedSuccess"));
                    this.refreshActivityLog();
                    this.refreshPendingRequests();
                }
            } catch (error) {
                MessageBox.show(this.getResourceBundle().getText("absenceApproveError", [error.message]));
            }
        },

        onAbsenceRejectButtonPress: async function (oEvent) {
            const oBindingContext = oEvent.getSource().getBindingContext("managerViewModel");
            if (!oBindingContext) {
                MessageBox.show(this.getResourceBundle().getText("absenceDataError"));
                return;
            }

            const absenceData = oBindingContext.getObject();

            try {
                const res = await this.editAbsence(absenceData.id, this.oModel.getProperty("/id"), "reject")

                if (res.ok) {
                    MessageToast.show(this.getResourceBundle().getText("absenceRejectedSuccess"));
                    this.refreshActivityLog();
                    this.refreshPendingRequests();
                }
            } catch (error) {
                MessageBox.show(this.getResourceBundle().getText("absenceRejectError", [error.message]));
            }
        },

        editAbsence: async function (absenceId, managerId, action) {
            const res = await fetch(`http://localhost:3000/absences/${absenceId}/${action}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    actorId: managerId,
                })
            });
            if (!res.ok) {
                const data = await res.json();
                MessageBox.show(data.err);
            }
            return res;
        },
    });
});