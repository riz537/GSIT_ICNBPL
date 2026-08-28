sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("com.ui5.lly.icnpbl.icnpblapp.controller.Dashboard", {
        onInit() {
            this.billingTypes = {
                "FINANCIAL": "Financial",
                "COST_CENTER": "Cost Center",
                "FIXED_ASSET": "Fixed Asset"
            };

            // var oModel = new sap.ui.model.json.JSONModel({
            //     submitted: 160,
            //     approved: 116,
            //     rejected: 9
            // });

            var oModel = new sap.ui.model.json.JSONModel();

            this.getView().setModel(oModel, "dashboard");

            const oModel1 = this.getOwnerComponent().getModel();

            const oContext = oModel1.bindContext("/getCounts()");

            // const oData = oContext.requestObject();

            // this.getView().setModel(
            //     new sap.ui.model.json.JSONModel(oData),
            //     "dashboard"
            // );

            oContext.requestObject().then((oData)=>{
                oModel.setData(oData);
            }).catch((oError)=>{
                console.error("error");
            });


            this.viewModel = new JSONModel();
            this.getView().setModel(this.viewModel, "viewModel");
            this.requestModel = new JSONModel();
            this.getView().setModel(this.requestModel, "requestModel");
        },

        onSubmittedPress() {
            this._filterTable("SUBMITTED");
        },

        onApprovedPress() {
            this._filterTable("APPROVED");
        },


        onRequestPress: function (oEvent) {

            const sId =
                oEvent.getSource()
                    .getBindingContext()
                    .getProperty("ID");

            this.getOwnerComponent()
                .getRouter()
                .navTo("RequestDetail", {
                    id: sId
                });
        },

        onApprovedPress() {
            this._filterStatus("APPROVED");
        },

        _filterStatus(status) {

            const oBinding =
                this.byId("requestTable")
                    .getBinding("items");

            oBinding.filter([
                new sap.ui.model.Filter(
                    "Status",
                    sap.ui.model.FilterOperator.EQ,
                    status
                )
            ]);
        },
        onRejectedPress() {
            this._filterTable("REJECTED");
        },



        _filterTable(sStatus) {

            const oTable = this.byId("requestTable");

            const oBinding = oTable.getBinding("items");

            oBinding.filter([
                new sap.ui.model.Filter(
                    "status",
                    sap.ui.model.FilterOperator.EQ,
                    sStatus
                )
            ]);
        },


    });
});