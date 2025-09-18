sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "App/controller/Base.controller",
], function (
    Controller,
    MessageBox,
    MessageToast,
    JSONModel,
    Filter,
    FilterOperator,
    Base,
) {
    "use strict";

    return Base.extend("App.controller.User", {
        onInit: function () {
            Base.prototype.onInit.call(this);
            this._userViewModel = new JSONModel({
                subscriptions: [],
                users: [],
                searchQuery: ""
            });
            this.getView().setModel(this._userViewModel, "userViewModel");
            this.oRouter.getRoute("user").attachMatched(this.onRouteMatched, this);
            this.oSplitApp = this.byId("userSplitApp");

        },

        onRouteMatched: async function () {

                await this.loadUsers({ model: this._userViewModel, property: "/users" });
                const subscriptions = await this.loadSubscriptions(this.oModel.getProperty("/id"), { model: this._userViewModel, property: "/subscriptions" });
                
                await this.loadColleagueCalendars(subscriptions);
                this.refreshActivityLog();
                
                this._userAbsences = structuredClone(await this.loadAbsences(this.oModel.getProperty("/id"), { model: this._userViewModel, property: "/absences" }));
                this.setupMainCalendar(this._userAbsences);
                
                this.pageModel.setProperty("/pageTitle", this.getResourceBundle().getText("userDashboardTitle"));
                this.pageModel.setProperty("/navBackVisible", false);
                this.pageModel.setProperty("/logOutVisible", true);
        },

        
        // Main calendar is user's own calendar
        setupMainCalendar: function (absences) {
            const oCalendar = this.byId("absenceCalendar");
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
            this.configureCalendarWithAbsences(oCalendar, absences);
        },


        loadColleagueCalendars: async function (subscriptions) {
            const oCalendarHBox = this.byId("calendarHBox");
            if (!oCalendarHBox) {
                return;
            }
    
            this.clearColleagueCalendars(oCalendarHBox);
            this._colleagueAbsences = {};
        
            if (!subscriptions || subscriptions.length === 0) {
                return;
            }
        
            for (const sub of subscriptions) {
                try {
                    const confirmedAbsences = await this.loadAbsences(sub.id);
                    this._colleagueAbsences[sub.id] = confirmedAbsences;
        
                    const calendarVBox = this.createColleagueCalendarContainer(
                        sub.name,
                        confirmedAbsences,
                        "absenceCalendar_" + sub.id,
                        sub.id
                    );
        
                    oCalendarHBox.addItem(calendarVBox);
                    
                } catch (err) {
                    MessageBox.error(`Error loading calendar for ${sub.name}: ${err.message}`);
                }
            }
        },

        createColleagueCalendarContainer: function (titleText, absences, calendarId, userId) {
            let oCalendar = sap.ui.getCore().byId(calendarId);
            if (!oCalendar){
                oCalendar = this.createCalendar(calendarId, userId);
            }

            this.configureCalendarWithAbsences(oCalendar, absences);
            return this.createCalendarContainer(titleText, oCalendar);
        },

        clearColleagueCalendars: function (oHBox) {
            const items = oHBox.getItems();
            for (let i = items.length - 1; i > 1; i--) {
                const item = items[i];
                oHBox.removeItem(item);
            }
        },

        onColleagueSelect: async function (oEvent) {
            try {
                const bSelected = oEvent.getParameter("selected");
                const oCtx = oEvent.getSource().getBindingContext("userViewModel");
                const userId = oCtx.getProperty("id");

                const bIsCurrentlySubscribed = this._userViewModel.getProperty("/subscriptions").some(s => {
                    const match = String(s.id) === String(userId);
                    return match;
                });

                if (bSelected && !bIsCurrentlySubscribed) {
                    const res = await fetch(`http://localhost:3000/subscribe/${userId}`, {
                        method: "PUT",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ currentUserId: this.oModel.getProperty("/id") })
                    });

                    if (!res.ok) {
                        MessageBox.error(res.err);
                    }

                } else if (!bSelected && bIsCurrentlySubscribed) {
                    const res = await fetch("http://localhost:3000/unsubscribe", {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            currentUserId: this.oModel.getProperty("/id"),
                            subscribedToId: userId
                        })
                    });

                    if (!res.ok) {
                        MessageBox.error(res.err);
                    }
                }

                const currentSubs = this._userViewModel.getProperty("/subscriptions") || [];
                let updatedSubs;

                if (bSelected) {
                    const newSub = { id: userId, name: oCtx.getProperty("name") };
                    updatedSubs = [...currentSubs, newSub];
                } else {
                    updatedSubs = currentSubs.filter(s => String(s.id) !== String(userId));
                }

                this._userViewModel.setProperty("/subscriptions", structuredClone(updatedSubs));
                await this.loadColleagueCalendars(updatedSubs);

            } catch (err) {
                MessageBox.show(this.getResourceBundle().getText("subscriptionUpdateError"));
            }
        },

        onColleaguesSearch: function (oEvent) {
            const sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            this._userViewModel.setProperty("/searchQuery", sQuery);
            
            // Get the list binding and apply the filter
            const oList = this.byId("colleaguesList");
            const oBinding = oList.getBinding("items");
            
            if (oBinding) {
                let aFilters = [];
                
                if (sQuery && sQuery.length > 0) {
                    const oFilter = new Filter("name", FilterOperator.Contains, sQuery);
                    aFilters.push(oFilter);
                }
                
                oBinding.filter(aFilters);
            }
        },

    });
});