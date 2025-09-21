/* eslint-disable no-console */
/* eslint-disable linebreak-style */
sap.ui.define([
    "sap/ui/core/mvc/Controller"
], function (
    Controller
) {
    "use strict";

    return Controller.extend("App.controller.Dashboard", {
        onInit: function () {
            var oStatsData = {
                taskStats: [
                    { value: "12", label: "Total Tasks" },
                    { value: "8", label: "Pending" },
                    { value: "3", label: "Urgent" }
                ]
            };
            var oStatsModel = new sap.ui.model.json.JSONModel(oStatsData);
            this.getView().setModel(oStatsModel, "stats");
            this.SplitApp = this.byId("dashboardSplitApp");
            this.oMainData = {
                vacationRequests: [
                    {
                        id: "1",
                        type: "VACATION",
                        typeState: "Success",
                        title: "Summer Vacation Request",
                        priority: "HIGH",
                        priorityState: "Error",
                        employee: {
                            name: "John Smith",
                            email: "john.smith@company.com"
                        },
                        startDate: "Jul 1, 2024",
                        requestDate: "Jun 15, 2024",
                        duration: "2 weeks",
                        status: "Pending"
                    },
                    {
                        id: "2",
                        type: "EQUIPMENT",
                        typeState: "Warning",
                        title: "Medical Leave Request",
                        priority: "MEDIUM",
                        priorityState: "Warning",
                        employee: {
                            name: "Jane Doe",
                            email: "jane.doe@company.com"
                        },
                        startDate: "Aug 15, 2024",
                        requestDate: "Aug 10, 2024",
                        duration: "3 days",
                        status: "Approved"
                    }
                ]
            };
            this.oFilters = {
                type: null,
                searchQuery: "",
                priority: null
            };

            this.oFilteredModel = new sap.ui.model.json.JSONModel(structuredClone(this.oMainData));
            this.getView().setModel(this.oFilteredModel);
            this.SplitApp.setMasterButtonText(" ");

        },

        _applyFilters: function () {
            let filteredRequests = this.oMainData.vacationRequests;
            if (this.oFilters.type && this.oFilters.type !== "") {
                filteredRequests = filteredRequests.filter(request =>
                    request.type === this.oFilters.type
                );
            }

            if (this.oFilters.priority && this.oFilters.priority !== "") {
                filteredRequests = filteredRequests.filter(request =>
                    request.priority === this.oFilters.priority
                );
            }

            if (this.oFilters.searchQuery) {
                filteredRequests = filteredRequests.filter(request =>
                    request.title.toLowerCase().includes(this.oFilters.searchQuery.toLowerCase())
                );
            }
            this.oFilteredModel.setProperty("/vacationRequests", filteredRequests);
        },
        onPrioritySelect: function (oEvent) {
            const priority = oEvent.getParameter("selectedItem").getKey();
            this.oFilters.priority = priority;
            this._applyFilters();
        },
        onTypeSelect: function (oEvent) {
            const type = oEvent.getParameter("selectedItem").getKey();
            this.oFilters.type = type;
            this._applyFilters();
        },
        onSearchFieldChange: function (oEvent) {
            const query = oEvent.getParameter("newValue");
            this.oFilters.searchQuery = query;
            this._applyFilters();
        }
    });

});