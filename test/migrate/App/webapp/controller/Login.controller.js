sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "App/controller/Base.controller",
], function (
    Controller,
    Base,
) {
    "use strict";
    return Base.extend("App.controller.Login", {
        onInit: function () {
            Base.prototype.onInit.call(this);
            this.oRouter.getRoute("login").attachMatched(this.onRouteMatched, this);
        },

        onRouteMatched: function () {
            this.pageModel.setProperty("/pageTitle", this.getResourceBundle().getText("loginTitle"));
            this.pageModel.setProperty("/navBackVisible", false);
            this.pageModel.setProperty("/logOutVisible", false);
        },

        onLoginPress: async function () {
            this._resetValidation();

            if (!this._validateForm()) {
                return;
            }

            const { email, name, password } = this.oModel.getData();

            try {
                const res = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, name, password })
                });

                const data = await res.json();
                if (!res.ok) {
                    this._setFieldError("password", "login.invalidCredentials");
                } else {
                    if (data.user) {
                        const user = data.user;
                        user.managedAbsences = user.managedAbsences.filter(absence => !absence.confirmed);
                        this.oRouter.navTo("redirect");
                        this.oModel.setData({
                            ...user,
                            pendingApproval: user.managedAbsences,
                            isManager: user.role === "MANAGER"
                        });
                    }
                }
            } catch (error) {
                this._setFieldError("password", "login.networkError");
            }
        },

        _validateForm: function () {
            const { email, name, password } = this.oModel.getData();
            let isValid = true;

            if (!email || email.trim() === "") {
                this._setFieldError("email", "validation.emailRequired");
                isValid = false;
            } else if (!this._isValidEmail(email)) {
                this._setFieldError("email", "validation.emailInvalid");
                isValid = false;
            }

            if (!name || name.trim() === "") {
                this._setFieldError("name", "validation.nameRequired");
                isValid = false;
            }

            if (!password || password.trim() === "") {
                this._setFieldError("password", "validation.passwordRequired");
                isValid = false;
            }

            return isValid;
        },

        _resetValidation: function () {
            ["email", "name", "password"].forEach(field => {
                this._setValidationState(field);
            });
        },

        _setFieldError: function (field, messageKey) {
            const message = this.getResourceBundle().getText(messageKey);
            this._setValidationState(field, "Error", message);
        },

        _setValidationState: function (field, state = "None", message = "") {
            this.oModel.setProperty(`/validation/${field}State`, state);
            this.oModel.setProperty(`/validation/${field}Message`, message);
        },

        _isValidEmail: function (email) {
            const test = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return test.test(email);
        },

        onEmailChange: function () {
            this._setValidationState("email");
        },

        onNameChange: function () {
            this._setValidationState("name");
        },

        onPasswordChange: function () {
            this._setValidationState("password");
        }
    });
});