sap.ui.define([
    "sap/ui/core/mvc/Controller",
     "sap/ui/model/json/JSONModel"
], (Controller,JSONModel) => {
    "use strict";

    return Controller.extend("com.ui5.lly.icnpbl.icnpblapp.controller.IcNpblReq", {
        onInit() {
            this.viewModel = new JSONModel();
            this.getView().setModel(this.viewModel, "viewModel");
        },
        onSelBilTiming: function (oEvent) {
            var bilTiming = oEvent.getParameter("selectedIndex");
            if (bilTiming === 1) {
                this.byId("oDPBillingDate").setVisible(true);
            } else {
                this.byId("oDPBillingDate").setVisible(false);
                this.byId("oDPBillingDate").setValue("");
            }
        },
        onThemeSwitch: function (oEvent) {
            var bState = oEvent.getParameter("state");
            if (bState) {
                sap.ui.getCore().applyTheme("sap_horizon_dark");
            } else {
                sap.ui.getCore().applyTheme("sap_horizon");
            }
        },
        async onSelBillingType(oEvent) {
            try {
                const sBillingType = oEvent.getSource().getSelectedKey();
                const oModel = this.getView().getModel();
                const oFunction = oModel.bindContext("/getBillingSubTypes(...)");
                oFunction.setParameter("billingType", sBillingType);
                await oFunction.execute();
                const oData = oFunction.getBoundContext().getObject();
                this.viewModel.setData(oData);
                console.log(oData);
            } catch (err) {
                console.error(err);
            }

        },
        onSelBillingSubType: function (oEvent) {
            var oSelItem = oEvent.getSource().getSelectedItem();
            var costElement = oSelItem.getBindingContext("viewModel").getObject().costElement;
            this.byId("oIpBillCE").setValue(costElement);
            this.byId("oIpRecCE").setValue(costElement);

        }
    });
});