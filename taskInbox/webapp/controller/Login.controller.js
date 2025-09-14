sap.ui.define([
    "sap/ui/core/mvc/Controller",
], function (
    Controller,
) {
    "use strict";
    return Controller.extend("taskInbox.controller.Login", {
        /**
         * @override
         * @returns {void|undefined}
         */
        onInit: function () {

        },

        onLoginPress: async function () {
            const oModel = this.getView().getModel("user");
            const oError = this.getView().getModel("error");
            const oLoginError = oError.getProperty("/login");
            const { email, name, password } = oModel.getData();
            const oRouter = this.getOwnerComponent().getRouter();

            try {
                const res = await fetch('http://localhost:3000/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, name, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    oLoginError.loginError = data.error;
                    oLoginError.showLoginError = true;
                    oError.setProperty("/login", oLoginError);
                    return;
                }

                oLoginError.loginError = "";
                oLoginError.showLoginError = false;
                oError.setProperty("/login", oLoginError);

                oModel.setData({
                    ...oModel.getData(),
                    ...data.user
                });

                data.user.role === "MANAGER" ? oRouter.navTo("manager") : oRouter.navTo("manager");

                console.log("Login response:", data);

            } 
            catch (err) {
                console.error("Login error:", err);
                oLoginError.loginError = "Unable to login. Please try again.";
                oLoginError.showLoginError = true;
                oError.setProperty("/login", oLoginError);
            }
        }

    });
});