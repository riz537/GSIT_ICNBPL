sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("com.ui5.lly.icnpbl.icnpblapp.controller.IcNpblReq", {
        onInit() {
            this.billingTypes = {
                "FINANCIAL": "Financial",
                "COST_CENTER": "Cost Center",
                "FIXED_ASSET": "Fixed Asset"
            };
            this.viewModel = new JSONModel();
            this.getView().setModel(this.viewModel, "viewModel");
            this.requestModel = new JSONModel();
            this.getView().setModel(this.requestModel, "requestModel");
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

        onOpenDashboard: function () {

            this.getOwnerComponent()
                .getRouter()
                .navTo("RouteDashboard");

        },

        onOpenPO: function () {

            try {

                const oModel = this.getView().getModel();
                const oOperation = oModel.bindContext("/triggerPofetch(...)");

                oOperation.execute().then(() => {
                    const oContext = oOperation.getBoundContext();
                    const sresult = oContext.getValue();
                    console.log("success", sresult);

                });

                return "success";
            } catch (error) {
                console.error(error);
            }

        },

        async onSelBillingType(oEvent) {
            try {
                const sBillingType = this.billingTypes[oEvent.getSource().getSelectedKey()];
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
            this.byId("oIpBillCE").setShowValueHelp(false); this.byId("oIpRecCE").setShowValueHelp(false);
            this.byId("oIpBillCE").setValue(""); this.byId("oIpRecCE").setValue("");

            var oSelItem = oEvent.getSource().getSelectedItem();
            var object = oSelItem.getBindingContext("viewModel").getObject();
            if (object.ceSelection === "FIXED") {
                this.byId("oIpBillCE").setValue(object.costElement);
                this.byId("oIpRecCE").setValue(object.costElement);
            } else if (object.ceSelection === "USER_SELECT") {
                this.byId("oIpBillCE").setShowValueHelp(true); this.byId("oIpRecCE").setShowValueHelp(true);
                var aCEs = object.allowedCostElements.split("|");
                var aCEObjects = aCEs.map(function (value) {
                    return {
                        costElement: value
                    }
                });
                this.viewModel.setProperty("/aCostElements", aCEObjects);
            }

        },
        getCostCenterDetails: async function (sCostCenter) {
            try {
                const oModel = this.getView().getModel();
                const oBinding = oModel.bindList(
                    "/CostCenter",
                    undefined,
                    undefined,
                    new sap.ui.model.Filter({
                        path: "CostCenter",
                        operator: sap.ui.model.FilterOperator.EQ,
                        value1: sCostCenter
                    })
                );
                const aContexts = await oBinding.requestContexts();
                if (aContexts.length > 0) {
                    const oData = aContexts[0].getObject();
                    console.log(oData);
                    return oData;
                }
                return null;
            } catch (err) {
                console.error(err);
            }
        },
        onEnterCC: async function (oEvent) {
            sap.ui.core.BusyIndicator.show(0);
            this.Input = oEvent.getSource();
            if (this.Input.getId().includes("CostCenter2")) {
                this.byId("oIpCompCode2").setValue("");
                this.byId("oIpCountryCode2").setValue("");
                this.byId("oIpCustomerCurrency").setValue("");

            } else {
                this.byId("oIpCompCode").setValue("");
                this.byId("oIpCountryCode").setValue("");
                this.byId("oIpLocalCurrency").setValue("");
            }
            var object = await this.getCostCenterDetails(this.Input.getValue());
            if (object) {
                if (this.Input.getId().includes("CostCenter2")) {
                    this.byId("oIpCompCode2").setValue(object ? object.CompanyCode : "");
                } else {
                    this.byId("oIpCompCode").setValue(object ? object.CompanyCode : "");
                }
                var result = await this.getCountryCode(object.CompanyCode);
                if (result) {
                    if (this.Input.getId().includes("CostCenter2")) {
                        this.byId("oIpCountryCode2").setValue(result.countryCode ? result.countryCode : "");
                        this.byId("oIpCustomerCurrency").setValue(result.localCurrency ? result.localCurrency : "");
                    } else {
                        this.byId("oIpCountryCode").setValue(result.countryCode ? result.countryCode : "");
                        this.byId("oIpLocalCurrency").setValue(result.localCurrency ? result.localCurrency : "");
                    }
                } else {
                    MessageBox.error("No Country data maintained against this company code");
                }

            } else {
                MessageBox.error("Not a valid cost center");
            }
            sap.ui.core.BusyIndicator.hide();

        },
        onPressCEF4Help: function (oEvent) {
            this.ceInput = oEvent.getSource();
            if (!this.ceDialog) {
                this.ceDialog = sap.ui.xmlfragment(this.getView().getId(), "com.ui5.lly.icnpbl.icnpblapp.Fragments.CEF4Help", this);
                this.getView().addDependent(this.ceDialog);
            }
            this.ceDialog.open();
        },
        onCloseCEDialog: function () {
            this.ceDialog.close();
        },
        onPressCEItem:function(oEvent){
            var ce = oEvent.getSource().getBindingContext("viewModel").getObject("costElement");
            this.ceInput.setValue(ce);
            this.ceDialog.close();
        },
        onPressCCF4Help: function (oEvent) {
            console.log("Data is coming from S4HANA-ICNPB-POC");
            this.Input = oEvent.getSource();
            if (!this.ccDialog) {
                this.ccDialog = sap.ui.xmlfragment(this.getView().getId(), "com.ui5.lly.icnpbl.icnpblapp.Fragments.CCF4Help", this);
                this.getView().addDependent(this.ccDialog);
            }
            this.ccDialog.open();
        },
        onCloseCCDialog: function () {
            this.ccDialog.close();
        },
        onPressCCItem: async function (oEvent) {
            var object = oEvent.getSource().getBindingContext().getObject();
            this.Input.setValue(object.CostCenter);
            if (this.Input.getId().includes("CostCenter2")) {
                this.byId("oIpCompCode2").setValue(object.CompanyCode);
            } else {
                this.byId("oIpCompCode").setValue(object.CompanyCode);
            }
            var countryCode = await this.getCountryCode(object.CompanyCode);
            if (this.Input.getId().includes("CostCenter2")) {
                this.byId("oIpCountryCode2").setValue(countryCode);
                this.byId("oIpCustomerCurrency").setValue(countryCode);
            } else {
                this.byId("oIpCountryCode").setValue(countryCode);
                this.byId("oIpLocalCurrency").setValue(countryCode);
            }
            this.ccDialog.close();
        },
        onChangeMarkup: async function () {
            sap.ui.core.BusyIndicator.show(0);
            var markup = this.byId("oSIMarkup").getValue();
            var actualAmount = this.byId("oIpActualAmount").getValue();
            var markupAmount = actualAmount * (markup / 100);
            var totalActualAmount = parseFloat(actualAmount) + parseFloat(markupAmount);
            this.byId("oIpMarkupAmount").setValue(markupAmount);
            this.byId("oIpTotalActualAmount").setValue(totalActualAmount);
            var localCurrency = this.byId("oIpLocalCurrency").getValue();
            var customerCurrency = this.byId("oIpCustomerCurrency").getValue();
            const amount = parseFloat(this.byId("oIpTotalActualAmount").getValue()) || 0;
            //const result = await this.getExchangeRate(10, "EUR", "USD");

            if (localCurrency === customerCurrency) {
                this.byId("oIpTotalAmountCustomer").setValue(totalActualAmount);
            } else {
                //call and get the amount in custmer currency
                const convertedAmount = await this.getExchangeRate(amount, localCurrency, customerCurrency);
                this.byId("oIpTotalAmountCustomer").setValue(convertedAmount);
            }
            if (localCurrency === "USD") {
                this.byId("oIpTotalAmountUSD").setValue(totalActualAmount);
            } else if (customerCurrency === "USD") {
                this.byId("oIpTotalAmountUSD").setValue(this.byId("oIpTotalAmountCustomer").getValue());
            } else {
                const convertedAmount = await this.getExchangeRate(amount, localCurrency, "USD");
                this.byId("oIpTotalAmountUSD").setValue(convertedAmount);
            }
            sap.ui.core.BusyIndicator.hide();
        },
        async getExchangeRate(amount, sourceCurrency, targetCurrency) {
            try {

                const oModel = this.getView().getModel();
                const oFunction = oModel.bindContext("/getExchangeRate(...)");
                oFunction.setParameter("sourceAmount", amount);
                oFunction.setParameter("sourceCurrency", sourceCurrency);
                oFunction.setParameter("targetCurrency", targetCurrency);
                await oFunction.execute();
                const convertedAmount = oFunction.getBoundContext().getObject().value;
                console.log("Converted Amount", convertedAmount);
                console.log(oFunction.getBoundContext().getObject());
                //this.byId("oIpCustomerAmount").setValue(convertedAmount);
                return convertedAmount;
            } catch (error) {
                console.error(error);
            }
        },
        async getCountryCode(CompanyCode) {
            try {
                const oModel = this.getView().getModel();
                const oFunction = oModel.bindContext("/getCountryCode(...)");
                oFunction.setParameter("companyCode", CompanyCode);
                await oFunction.execute();
                const oData = oFunction.getBoundContext().getObject();
                return oData;
                console.log(oData);
            } catch (err) {
                console.error(err);
            }
        },
        onPressContactF4: function (oEvent) {
            this.contactInput = oEvent.getSource();
            if (!this.contactDialog) {
                this.contactDialog = sap.ui.xmlfragment(this.getView().getId(), "com.ui5.lly.icnpbl.icnpblapp.Fragments.ContactF4", this);
                this.getView().addDependent(this.contactDialog);
            }
            this.contactDialog.open();
            if (this.contactInput.getId().includes("2")) {
                this.contactDialog.setTitle("Select Receiving Contact");
            } else {
                this.contactDialog.setTitle("Billing Contact");
            }
            this.bindContactTable(this.contactInput.getId());
        },
        onCloseContactF4: function () {
            this.contactDialog.close();
        },
        bindContactTable: function (contactInputID) {
            var oContactTable = this.byId("oContactTable");
            oContactTable.removeAllColumns();
            oContactTable.unbindItems();
            if (contactInputID.includes("oIpRecContact")) {
                oContactTable.addColumn(
                    new sap.m.Column({
                        header: new sap.m.Text({
                            text: "Customer"
                        })
                    })
                );
                oContactTable.addColumn(
                    new sap.m.Column({
                        header: new sap.m.Text({
                            text: "Customer Name"
                        })
                    })
                );
                // Template
                var oCustTemplate = new sap.m.ColumnListItem({
                    type: "Active",
                    press: this.onPressContactItem.bind(this),
                    cells: [
                        new sap.m.Text({
                            text: "{Customer}"
                        }),
                        new sap.m.Text({
                            text: "{CustomerName}"
                        })
                    ]
                });
                // Binding
                oContactTable.bindItems({
                    path: "/ICCustomer",
                    template: oCustTemplate,
                    events: {
                        dataRequested: function () {
                            sap.ui.core.BusyIndicator.show(0);
                        },

                        dataReceived: function () {
                            sap.ui.core.BusyIndicator.hide();
                        }
                    }
                });
            } else {
                oContactTable.addColumn(
                    new sap.m.Column({
                        header: new sap.m.Text({
                            text: "Supplier"
                        })
                    })
                );
                oContactTable.addColumn(
                    new sap.m.Column({
                        header: new sap.m.Text({
                            text: "Supplier Name"
                        })
                    })
                );
                // Template
                var oVendTemplate = new sap.m.ColumnListItem({
                    type: "Active",
                    press: this.onPressContactItem.bind(this),
                    cells: [
                        new sap.m.Text({
                            text: "{Supplier}"
                        }),
                        new sap.m.Text({
                            text: "{SupplierName}"
                        })
                    ]
                });
                // Binding
                oContactTable.bindItems({
                    path: "/ICVendor",
                    template: oVendTemplate,
                    events: {
                        dataRequested: function () {
                            sap.ui.core.BusyIndicator.show(0);
                        },

                        dataReceived: function () {
                            sap.ui.core.BusyIndicator.hide();
                        }
                    }
                });
            }
        },
        onPressContactItem: function (oEvent) {
            if (this.contactInput.getId().includes("oIpRecContact")) {
                this.contactInput.setValue(oEvent.getSource().getBindingContext().getObject().CustomerName);
            } else {
                this.contactInput.setValue(oEvent.getSource().getBindingContext().getObject().SupplierName);
            }
            this.contactDialog.close();
        },
        onFileSelect: function (oEvent) {
            this._selectedFile = oEvent.getParameter("files")[0];
        },
        _readFileAsBase64: function (file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const base64 =
                        e.target.result.split(",")[1];
                    resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        },
        uploadAttachment: async function (requestId) {
            if (!this._selectedFile) {
                return;
            }
            const file = this._selectedFile;
            const base64Content = await this._readFileAsBase64(file);
            const payload = {
                request_ID: requestId,
                fileName: file.name,
                mimeType: file.type,
                fileContent: base64Content,
                uploadedAt: new Date().toISOString(),
            };
            const oModel = this.getView().getModel();
            try {
                const oBinding = oModel.bindList("/ICNPBAttachment");
                const oContext = oBinding.create(payload);
                await oContext.created();
            } catch (oError) {
                console.error(oError);
                sap.m.MessageBox.error("Upload Failed");
            }

        },
        saveRequest: async function () {
            var payload = this.getView().getModel("requestModel").getData();
            var oModel = this.getView().getModel();
            payload.specialInstructionsFlag = this.byId("oChBSpclInstr").getSelected() ? 'Y' : 'N';
            if (this.byId("oRBGBillTiming").getSelectedIndex() === 0) {
                payload.billAtDate = new Date().toISOString().split("T")[0];
                payload.billingTiming = "IMMEDIATE";
            } else {
                payload.billAtDate = this.byId("oDPBillingDate").getDateValue()?.toISOString().split("T")[0];
                payload.billingTiming = "LATER";
            }
            const oListBinding = oModel.bindList("/ICNPBRequest");
            const oContext = oListBinding.create(payload);
            await oContext.created();
            const requestId = oContext.getProperty("ID");
            this._requestId = requestId;
            await this.uploadAttachment(requestId);
            return requestId;

        },
        onPressSave: async function () {
            try {
                await this.saveRequest();
                sap.m.MessageBox.success("Request Saved Successfully");
            } catch (oError) {
                console.error(oError);
                sap.m.MessageBox.error("Save Failed");
            }
        },
        onPressSubmit: async function () {
            sap.ui.core.BusyIndicator.show(0);
            try {
                const requestId = await this.saveRequest();
                const oModel = this.getView().getModel();
                const oAction = oModel.bindContext("/submitForApproval(...)");
                oAction.setParameter("requestId", requestId);
                await oAction.execute();
                sap.m.MessageBox.success("Submitted for Approval");
                sap.ui.core.BusyIndicator.hide();
            } catch (oError) {
                console.error(oError);
                sap.m.MessageBox.error("Submission Failed");
            }
        }



    });
});