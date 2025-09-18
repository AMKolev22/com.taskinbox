sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "App/controller/Base.controller",
], function (Controller,
    MessageToast,
    MessageBox,
    Fragment,
    Base,
) {
    "use strict";
    return Base.extend("App.controller.UserAbsences", {

        onInit: function () {
            Base.prototype.onInit.call(this);
            this._userAbsenceViewModel = this.getOwnerComponent().getModel("userAbsenceViewModel");
            this.oRouter.getRoute("your-absences").attachMatched(this.onRouteMatched, this);
            this.oSplitApp = this.byId("userAbsencesSplitApp");
        },

        onRouteMatched: async function () {
            await this._loadAbsences()

            const users = await this.loadUsers({});
            const managers = users.filter(user => user.role === "MANAGER");

            this._userAbsenceViewModel.setProperty("/lookup/managers", managers);
            this._userAbsenceViewModel.setProperty("/lookup/substitutes", users);

            this.pageModel.setProperty("/pageTitle", this.getResourceBundle().getText("viewAbsencesTitle"));
            this.pageModel.setProperty("/navBackVisible", true);
            this.pageModel.setProperty("/logOutVisible", true);
        },

        // This is a local method - uses base controller method, setting it locally
        _loadAbsences: async function () {
            this._userAbsenceViewModel.setProperty("/ui/loading", true);

            try {
                const absences = await this.loadAbsences(this.oModel.getProperty("/id"), {
                    filterApproved: false
                });

                this._userAbsenceViewModel.setProperty("/table/absences", absences);
                this._userAbsenceViewModel.setProperty("/ui/loading", false);
            } catch (error) {
                MessageBox.show(this.getResourceBundle().getText("error.loadAbsencesFailed"));
                console.log(error);
            }
        },


        onEditAbsence: function (oEvent) {
            this.onShowEditDialog();
            const oBindingContext = oEvent.getSource().getBindingContext("userAbsenceViewModel");
            const absenceData = oBindingContext.getObject();
            this._openEditDialog(absenceData);
        },

        _openEditDialog: function (absenceData) {
            const editData = {
                id: absenceData.id,
                type: absenceData.type,
                dateFrom: this.formatDate(absenceData.dateFrom),
                dateTo: this.formatDate(absenceData.dateTo),
                duration: absenceData.duration,
                manager: absenceData.manager,
                status: absenceData.status,
                paid: absenceData.paid || false,
                substituteId: absenceData.substitute?.id || "",
                comment: absenceData.comment || "",
                validation: {
                    dateFromState: "None",
                    dateFromMessage: "",
                    dateToState: "None",
                    dateToMessage: "",
                    substituteState: "None",
                    substituteMessage: ""
                }
            };

            this._userAbsenceViewModel.setProperty("/edit", editData);
            this._userAbsenceViewModel.setProperty("/ui/editDialogOpen", true);
            this._resetValidation();
        },

        onCancelEdit: function () {
            this._userAbsenceViewModel.setProperty("/ui/editDialogOpen", false);
        },

        onEditDialogClosed: function () {
            this._userAbsenceViewModel.setProperty("/edit", {
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
            });
            this._resetValidation();
            this._userAbsenceViewModel.setProperty("/ui/editDialogOpen", false);
        },
        
        onDateChange: function () {
            this._validateDates();
        },

        _validateDates: function () {

            const dateFrom = this._userAbsenceViewModel.getProperty("/edit/dateFrom");
            const dateTo = this._userAbsenceViewModel.getProperty("/edit/dateTo");

            this._userAbsenceViewModel.setProperty("/edit/validation", {
                dateFromState: "None",
                dateFromMessage: "",
                dateToState: "None",
                dateToMessage: "",
            });

            if (!dateFrom) {
                this._userAbsenceViewModel.setProperty("/edit/validation/dateFromState", "Error");
                this._userAbsenceViewModel.setProperty("/edit/validation/dateFromMessage", this.getResourceBundle().getText("validation.fromDateRequired"));
            }

            if (!dateTo) {
                this._userAbsenceViewModel.setProperty("/edit/validation/dateToState", "Error");
                this._userAbsenceViewModel.setProperty("/edit/validation/dateToMessage", this.getResourceBundle().getText("validation.toDateRequired"));
            }

            if (dateFrom && dateTo && new Date(dateTo) < new Date(dateFrom)) {
                this._userAbsenceViewModel.setProperty("/edit/validation/dateToState", "Error");
                this._userAbsenceViewModel.setProperty("/edit/validation/dateToMessage", this.getResourceBundle().getText("validation.toDateAfterFrom"));
            }
        },

        onUpdateAbsence: function () {
            if (this._validateEditForm()) {
                this._updateAbsence();
            }
        },

        _validateEditForm: function () {
            this._validateDates();
            this._validateSubstitute();

            const hasErrors =
                this._userAbsenceViewModel.getProperty("/edit/validation/dateFromState") === "Error" ||
                this._userAbsenceViewModel.getProperty("/edit/validation/dateToState") === "Error" ||
                this._userAbsenceViewModel.getProperty("/edit/validation/substituteState") === "Error";

            if (hasErrors) {
                this._userAbsenceViewModel.setProperty("/ui/showValidationMessage", true);
                this._userAbsenceViewModel.setProperty("/ui/validationMessage", this.getResourceBundle().getText("validation.correctErrors"));
                return false;
            }

            this._userAbsenceViewModel.setProperty("/ui/showValidationMessage", false);
            this._userAbsenceViewModel.setProperty("/ui/validationMessage", "");
            return true;
        },

        _validateSubstitute: function () {

            const substituteRequired = this._userAbsenceViewModel.getProperty("/edit/ui/substituteRequired");
            const substituteId = this._userAbsenceViewModel.getProperty("/edit/substituteId");

            if (substituteRequired && !substituteId) {
                this._userAbsenceViewModel.setProperty("/edit/validation/substituteState", "Error");
                this._userAbsenceViewModel.setProperty("/edit/validation/substituteMessage", this.getResourceBundle().getText("validation.substituteRequired"));
            }
            else {
                this._userAbsenceViewModel.setProperty("/edit/validation/substituteState", "None");
                this._userAbsenceViewModel.setProperty("/edit/validation/substituteMessage", "");
            }
        },

        _resetValidation: function (bResetUI = true) {

            this._userAbsenceViewModel.setProperty("/edit/validation", {
                dateFromState: "None",
                dateFromMessage: "",
                dateToState: "None",
                dateToMessage: "",
                substituteState: "None",
                substituteMessage: ""
            });

            if (bResetUI) {
                this._userAbsenceViewModel.setProperty("/ui", {
                    showValidationMessage: false,
                    validationMessage: "",
                    showPaidToggle: false,
                    showSubstitute: false,
                    substituteRequired: false
                });
            }
        },

        _updateAbsence: async function () {

            const editData = this._userAbsenceViewModel.getProperty("/edit");
            const updateData = {
                dateFrom: editData.dateFrom,
                dateTo: editData.dateTo,
                paid: editData.paid,
                substituteId: editData.substituteId || null,
                comment: editData.comment || "",
                actorId: this.oModel.getProperty("/id")
            };

            try {
                const res = await fetch(`http://localhost:3000/absences/${editData.id}`, {
                    method: "PUT",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.err || this.getResourceBundle().getText("error.httpError", [res.status]));
                }

                MessageToast.show(this.getResourceBundle().getText("success.absenceUpdated"));
                this._userAbsenceViewModel.setProperty("/ui/editDialogOpen", false);
                this._loadAbsences();
            } catch (error) {
                MessageBox.error(this.getResourceBundle().getText("error.updateAbsenceFailed", [error]));
            }
        },

        onDeleteAbsence: function (oEvent) {

            const oBindingContext = oEvent.getSource().getBindingContext("userAbsenceViewModel");
            const absenceData = oBindingContext.getObject();

            MessageBox.confirm(
                this.getResourceBundle().getText("dialog.delete.message", [absenceData.type, this.formatDate(absenceData.dateFrom)]),
                {
                    title: this.getResourceBundle().getText("dialog.delete.title"),
                    onClose: (sAction) => {
                        if (sAction === MessageBox.Action.OK)
                            this._deleteAbsence(absenceData.id);
                    }
                }
            );
        },

        _deleteAbsence: async function (absenceId) {

            try {
                const res = await fetch(`http://localhost:3000/absences/${absenceId}`, {
                    method: "DELETE",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ actorId: this.oModel.getProperty("/id") })
                });

                if (!res.ok) {
                    MessageBox.show(this.getResourceBundle().getText("error.deleteAbsenceDefault"));
                    return;
                }

                MessageToast.show(this.getResourceBundle().getText("success.absenceDeleted"));
                this._loadAbsences();
            } catch (error) {
                const errorMessage = error.message || this.getResourceBundle().getText("error.unknownError");
                MessageBox.error(this.getResourceBundle().getText("error.deleteAbsenceFailed", [error.message || this.getResourceBundle().getText("error.unknownError")]));
            }
        },

        isEditable: function (status) {
            return status === false;
        },

        formatAbsenceType: function (sType) {
            if (sType && sType.toLowerCase().includes('sick_leave')) {
                return 'Sick Leave';
            } else if (sType && sType.toLowerCase().includes('planned')) {
                return 'Planned';
            }
        },
    });
});