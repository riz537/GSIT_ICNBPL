sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, Filter, FilterOperator, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("com.ui5.lly.icnpbl.icnpblappdashboard.controller.Dashboard", {
        onInit() {



            var oModel = new sap.ui.model.json.JSONModel();

            this.getView().setModel(oModel, "dashboard");

            const oModel1 = this.getOwnerComponent().getModel();

            const oContext = oModel1.bindContext("/getCounts()");


            oContext.requestObject().then((oData) => {
                oModel.setData(oData);
            }).catch((oError) => {
                console.error("error");
            });


            this.viewModel = new JSONModel();
            this.getView().setModel(this.viewModel, "viewModel");
            this.requestModel = new JSONModel();
            this.getView().setModel(this.requestModel, "requestModel");




            const oViewModel = new sap.ui.model.json.JSONModel({
                totalCount: 0
            });

            this.getView().setModel(oViewModel, "view");

            const oTable = this.byId("requestTable");

            oTable.attachUpdateFinished((oEvent) => {
                this.getView()
                    .getModel("view")
                    .setProperty(
                        "/totalCount",
                        oEvent.getParameter("total")
                    );
            });


        },

        onAfterRendering: function () {

            this.byId("submittedCard").$()
                .css("cursor", "pointer")
                .on("click", () => this._filterByStatus("SUBMITTED"));

            this.byId("approvedCard").$()
                .css("cursor", "pointer")
                .on("click", () => this._filterByStatus("APPROVED"));

            this.byId("rejectedCard").$()
                .css("cursor", "pointer")
                .on("click", () => this._filterByStatus("REJECTED"));

            this.byId("pendingCard").$()
                .css("cursor", "pointer")
                .on("click", () => this._filterByStatus("DRAFT"));

            this.byId("postedCard").$()
                .css("cursor", "pointer")
                .on("click", () => this._filterByStatus("POSTED"));

            this.byId("errorCard").$()
                .css("cursor", "pointer")
                .on("click", () => this._filterByStatus("ERROR"));

            this.byId("pendingApprovalCard").$()
                .css("cursor", "pointer")
                .on("click", () => this._filterByStatus("PENDING_APPROVAL"));
        },

        _filterByStatus: function (sStatus) {

            this.byId("requestTable")
                .getBinding("items")
                .filter([
                    new sap.ui.model.Filter(
                        "status",
                        sap.ui.model.FilterOperator.EQ,
                        sStatus
                    )
                ]);
        },

        // onDateFilter: function (oEvent) {

        //     const dDate = oEvent.getSource().getDateValue();

        //     this.byId("requestTable")
        //         .getBinding("items")
        //         .filter([
        //             new Filter(
        //                 "billAtDate",
        //                 FilterOperator.Contains,
        //                 dDate
        //             )
        //         ]);
        // },

        onSearch: function (oEvent) {
            const sValue = oEvent.getParameter("newValue") ||
                oEvent.getParameter("query");

            const oTable = this.byId("requestTable");
            const oBinding = oTable.getBinding("items");

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            const aFilters = [
                new sap.ui.model.Filter("purchaseOrderNumber", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("salesOrderNumber", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("fiJournalVoucherNumber", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("billingType", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("billingTiming", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("billingOption", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("status", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("billingSubType", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("billingAffiliateCompanyCode", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("receivingAffiliateCompanyCode", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase()),
                new sap.ui.model.Filter("billingAffiliateContact", sap.ui.model.FilterOperator.Contains, sValue.toUpperCase())

            ];

            const oDate = new Date(sValue);

            if (/^\d{4}-\d{2}-\d{2}$/.test(sValue)) {

                oBinding.filter([
                    new Filter(
                        "billAtDate",
                        FilterOperator.EQ,
                        sValue
                    )
                ]);

                return;
            }


            oBinding.filter(new Filter({
                filters: aFilters,
                and: false
            }));
        },


        onCardPress: function (oEvent) {

            const sStatus = oEvent.getSource().data("status");

            const oBinding = this.byId("requestTable")
                .getBinding("items");

            oBinding.filter([
                new Filter(
                    "Status",
                    FilterOperator.EQ,
                    sStatus.toUpperCase()
                )
            ]);

        },

        onSubmittedPress() {
            this._filterTable("SUBMITTED");
        },

        onApprovedPress() {
            this._filterTable("APPROVED");
        },

        onAllPress: function () {
            this.byId("requestTable")
                .getBinding("items")
                .filter([]);
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