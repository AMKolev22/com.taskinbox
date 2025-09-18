sap.ui.define([], function () {
    "use strict";

    return {
        formatAction: function (action, resourceBundle) {
            return resourceBundle.getText(`action${action}`);
        },

        formatTimestamp: function (timestamp, resourceBundle) {
            const date = new Date(timestamp);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) {
                return resourceBundle.getText("timeJustNow");
            }

            if (diffMins < 60) {
                return resourceBundle.getText("timeMinutesAgo", [diffMins]);
            }

            if (diffHours < 24) {
                return resourceBundle.getText("timeHoursAgo", [diffHours]);
            }

            if (diffDays < 7) {
                return resourceBundle.getText("timeDaysAgo", [diffDays]);
            }

            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        formatActivityDescription: function (details, action, absenceId, resourceBundle) {
            return absenceId ? resourceBundle.getText("activityDescriptionWithId", [details, absenceId]) : details;
        },

        // Date formatting functions

        // September 6, 2025
        formatDate: function (dateValue) {
            const date = new Date(dateValue);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        },

        formatStatusState: function (status, resourceBundle) {
            if (status === true) {
                return resourceBundle.getText("return.success");
            }
            return resourceBundle.getText("return.warning");
        },

        formatStatus: function (status, resourceBundle) {
            if (status === true) {
                return resourceBundle.getText("statusConfirmed");
            }
            return resourceBundle.getText("statusPending");
        },

        formatPaidText: function (paid, resourceBundle) {
            return paid ? resourceBundle.getText("text.yes") : resourceBundle.getText("text.no");
        },

        formatDuration: function (dateFrom, dateTo, resourceBundle) {
            if (!dateFrom || !dateTo) {
                return "";
            }

            const fromDate = new Date(dateFrom);
            const toDate = new Date(dateTo);

            if (toDate < fromDate) {
                return resourceBundle.getText("duration.invalidRange");
            }

            const dayDiff = this.calculateDurationDays(dateFrom, dateTo);

            return dayDiff === 1 ? resourceBundle.getText("duration.oneDay") : resourceBundle.getText("duration.multipleDays", [dayDiff]);
        },

        calculateDurationDays: function (sDateFrom, sDateTo) {
            const dFromDate = new Date(sDateFrom);
            const dToDate = new Date(sDateTo);
            return Math.ceil((dToDate - dFromDate) / (1000 * 60 * 60 * 24)) + 1;
        },


        isSubscribed: function (userId, subscriptions) {
            if (!subscriptions || !Array.isArray(subscriptions)) {
                return false;
            }
            return subscriptions.some(sub => String(sub.id) === String(userId));
        }
    };
});
