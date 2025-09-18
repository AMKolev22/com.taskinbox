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
            this.pageModel = this.getOwnerComponent().getModel("pageModel");
            this.oSplitApp = null;
        },


        getResourceBundle: function () {
            if (!this.oResourceBundle) {
                this.oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            }
            return this.oResourceBundle;
        },

        // REFERSH ACTIVITY 
        refreshActivityLog: async function () {
            try {

                const res = await fetch(`http://localhost:3000/activity/${this.oModel.getProperty("/id")}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (res.ok) {
                    const activities = await res.json();
                    this.oModel.setProperty("/ActivityLog", activities.data.reverse());
                    this.oModel.refresh();

                    MessageToast.show(this.getResourceBundle().getText("activityLogRefreshedSuccess"));
                } else {
                    MessageBox.error(this.getResourceBundle().getText("activityLogRefreshError"));
                }
            } catch (error) {
                MessageBox.error(this.getResourceBundle().getText("activityLogRefreshException", [error.message || error]));
            }
        },

        // LOADER FUNCTIONS

        loadUsers: async function (additionalData = {}) {
            const { model = null, property = null } = additionalData;
            try {
                const res = await fetch("http://localhost:3000/users", {
                    method: "GET",
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!res.ok) {
                    MessageBox.error(`Failed to load users: ${res.status} ${res.statusText}`);
                    return;
                }

                const resUsers = await res.json();

                const currentUserId = this.oModel.getProperty("/id");
                const users = currentUserId ?
                    resUsers.filter(u => String(u.id) !== String(currentUserId)) :
                    resUsers;

                if (model && property) {
                    model.setProperty(property, users);
                    model.refresh();
                }

                return users;
            } catch (error) {
                console.error("Error loading users:", error);
                MessageBox.error(`Error loading users: ${error.message}`);
                return [];
            }
        },

        loadSubscriptions: async function (userId, additionalData = {}) {
            const { model = null, property = null } = additionalData;
            const res = await fetch(`http://localhost:3000/subscriptions/${userId}`, {
                method: "GET",
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                MessageBox.error(res.err);
            }

            const subsRes = await res.json();
            let subscriptionsData = [];
            if (Array.isArray(subsRes)) {
                subscriptionsData = subsRes;
            } else if (subsRes.data && Array.isArray(subsRes.data)) {
                subscriptionsData = subsRes.data;
            } else if (subsRes.subscriptions && Array.isArray(subsRes.subscriptions)) {
                subscriptionsData = subsRes.subscriptions;
            }

            if (model && property) {
                model.setProperty(property, subscriptionsData);
                model.refresh();
            }

            return subscriptionsData;
        },

        loadAbsences: async function (userId, options = {}) {
            const { model = null, property = null, filterApproved = true } = options;
            const res = await fetch(`http://localhost:3000/absences/user/${userId}`, {
                method: "GET",
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) {
                throw new Error(`Failed to load absences: ${res.statusText}`);
            }

            let absences = await res.json();
            absences = absences.map(absence => {
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

            if (filterApproved) {
                absences = absences.filter(absence =>
                    absence.confirmed === true || absence.status === 'APPROVED' || absence.status === 'CONFIRMED'
                );
            }

            if (model && property) {
                model.setProperty(property, absences);
                model.refresh();
            }

            return absences;
        },

        // nav helper function to reroute user to last opened page
        onNavBack: function () {
            const sPreviousHash = sap.ui.core.routing.History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            }
        },


        // loading fragments
        onShowEditDialog: function () {
            if (!this._editDialog) {
                Fragment.load({
                    id: this.getView().getId(),
                    name: "App.view.fragments.EditAbsenceDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    this._editDialog = oDialog;
                    oDialog.open();
                }.bind(this));
            } else {
                this._editDialog.open();
            }
        },


        showCancelDialog: function () {
            if (!this._cancelDialog) {
                this._cancelDialog = new sap.m.Dialog({
                    title: this.getResourceBundle().getText("dialog.cancel.title"),
                    content: new sap.m.Text({
                        text: this.getResourceBundle().getText("dialog.cancel.message")
                    }),
                    beginButton: new sap.m.Button({
                        text: this.getResourceBundle().getText("dialog.cancel.yes"),
                        type: "Emphasized",
                        press: function () {
                            this._cancelDialog.close();
                            this.onNavBack();
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: this.getResourceBundle().getText("dialog.cancel.no"),
                        press: function () {
                            this._cancelDialog.close();
                        }.bind(this)
                    }),
                });
                this.getView().addDependent(this._cancelDialog);
            }

            this._cancelDialog.open();
        },


        // Calendar utility methods
        createCalendar: function (calendarId, userId) {
            const oCalendar = new sap.ui.unified.Calendar({
                id: calendarId,
                intervalSelection: false,
                showWeekNumbers: false,
            });
            
            oCalendar.attachSelect(async function (oEvent) {
                const oCalendar = oEvent.getSource();
                const selectedDate = oCalendar.getSelectedDates()[0]?.getStartDate();
                selectedDate.setHours(0, 0, 0, 0);

                const selectedAbsence = absences.filter(absence => {
                    const from = new Date(absence.dateFrom);
                    const to = new Date(absence.dateTo);
                    from.setHours(0, 0, 0, 0);
                    to.setHours(0, 0, 0, 0);
        
                    return selectedDate >= from && selectedDate <= to;
                });
                const dialog = this.createAbsenceDialog(selectedAbsence[0]);
                this.getView().addDependent(dialog);
                dialog.open();
            }.bind(this));

            if (userId) {
                oCalendar.data("userId", userId);
            }

            return oCalendar;
        },

        configureCalendarWithAbsences: function (oCalendar, absences) {
            oCalendar.removeAllSpecialDates();

            absences.forEach((absence) => {
                try {
                    const startDate = new Date(absence.dateFrom);
                    const endDate = new Date(absence.dateTo);

                    let type;
                    switch (absence.type) {
                        case "SICK_LEAVE":
                            type = sap.ui.unified.CalendarDayType.Type05; // Red
                            break;
                        case "PLANNED":
                            type = sap.ui.unified.CalendarDayType.Type04; // Blue
                            break;
                        default:
                            type = sap.ui.unified.CalendarDayType.Type01; // Default
                    }

                    const dateRange = new sap.ui.unified.DateTypeRange({
                        startDate: startDate,
                        endDate: endDate,
                        type: type
                    });

                    oCalendar.addSpecialDate(dateRange);
                } catch (error) {
                    console.error("Error adding absence to calendar:", error, absence);
                    MessageBox.show(error);
                }
            });

            oCalendar.invalidate();
        },


        createCalendarContainer: function (titleText, oCalendar) {
            return new sap.m.VBox({
                items: [
                    new sap.m.Title({
                        text: titleText,
                        level: sap.ui.core.TitleLevel.H3,
                        class: "sapUiSmallMarginBottom"
                    }),
                    oCalendar
                ],
                class: "sapUiSmallMarginEnd sapUiSmallMarginBottom",
                width: "300px"
            });
        },

        createAbsenceDialog: function (absenceData) {
            const formatDate = date => date ? date.toLocaleDateString() : "-";
            let dialog = sap.ui.getCore().byId("absenceDetailsId");
            
            const dialogData = {
                type: absenceData.type || "-",
                dateFrom: formatDate(absenceData.dateFrom),
                dateTo: formatDate(absenceData.dateTo),
                duration: (absenceData.duration || 0) + " days",
                paid: absenceData.paid ? "Yes" : "No",
                status: absenceData.status === true ? "Confirmed" : (absenceData.status || "-"),
                manager: absenceData.manager?.name || "-",
                substitute: absenceData.substitute?.name || "-",
                comment: absenceData.comment || "No comment"
            };
            
            if (!dialog) {
                dialog = new sap.m.Dialog("absenceDetailsId", {
                    title: "Absence Details",
                    contentWidth: "400px",
                    content: [
                        new SimpleForm({
                            editable: false,
                            layout: "ResponsiveGridLayout",
                            labelSpanXL: 4,
                            labelSpanL: 4,
                            labelSpanM: 4,
                            labelSpanS: 12,
                            emptySpanXL: 0,
                            emptySpanL: 0,
                            emptySpanM: 0,
                            emptySpanS: 0,
                            columnsXL: 1,
                            columnsL: 1,
                            columnsM: 1,
                            singleContainerFullSize: false,
                            content: [
                                new sap.m.Label({ text: "Type" }),
                                new sap.m.Text({ text: "{/type}" }),
                
                                new sap.m.Label({ text: "Date From" }),
                                new sap.m.Text({ text: "{/dateFrom}" }),
                
                                new sap.m.Label({ text: "Date To" }),
                                new sap.m.Text({ text: "{/dateTo}" }),
                
                                new sap.m.Label({ text: "Duration" }),
                                new sap.m.Text({ text: "{/duration}" }),
                
                                new sap.m.Label({ text: "Paid" }),
                                new sap.m.Text({ text: "{/paid}" }),
                
                                new sap.m.Label({ text: "Status" }),
                                new sap.m.Text({ text: "{/status}" }),
                
                                new sap.m.Label({ text: "Manager" }),
                                new sap.m.Text({ text: "{/manager}" }),
                
                                new sap.m.Label({ text: "Substitute" }),
                                new sap.m.Text({ text: "{/substitute}" }),
                
                                new sap.m.Label({ text: "Comment" }),
                                new sap.m.Text({ text: "{/comment}" })
                            ]
                        })
                    ],  
                    beginButton: new sap.m.Button({
                        text: "Close",
                        press: function () {
                            dialog.close();
                        }
                    }),
                });
            }
            
            const model = new sap.ui.model.json.JSONModel(dialogData);
            dialog.setModel(model);
            return dialog;
        },


        //helper function to route using xml custom data
        onPressRoute: function (oEvent) {
            const sRoute = oEvent.getSource().data("route");
            this.oRouter.navTo(sRoute);
        },

        // formatter functions
        formatAction: function (action) {
            return formatter.formatAction(action, this.getResourceBundle());
        },

        formatTimestamp: function (timestamp) {
            return formatter.formatTimestamp(timestamp, this.getResourceBundle());
        },

        formatActivityDescription: function (details, action, absenceId) {
            return formatter.formatActivityDescription(details, action, absenceId, this.getResourceBundle());
        },

        formatDate: function (dateValue) {
            return formatter.formatDate(dateValue);
        },

        formatStatusState: function (status) {
            return formatter.formatStatusState(status, this.getResourceBundle());
        },

        formatStatus: function (status) {
            return formatter.formatStatus(status, this.getResourceBundle());
        },

        formatPaidText: function (paid) {
            return formatter.formatPaidText(paid, this.getResourceBundle());
        },

        formatDuration: function (dateFrom, dateTo) {
            return formatter.formatDuration(dateFrom, dateTo, this.getResourceBundle());
        },

        calculateDurationDays: function (sDateFrom, sDateTo) {
            return formatter.calculateDurationDays(sDateFrom, sDateTo);
        },

        isSubscribed: function (userId, subscriptions) {
            return formatter.isSubscribed(userId, subscriptions);
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