sap.ui.define([

], () => {
    "use strict";

    return {
        formatIcon: function (action) {
            if (action.includes("APPROVED")) {
                return "sap-icon://employee-approvals";
            } else if (action.includes("REJECTED")) {
                return "sap-icon://employee-rejections";
            }
            else if (action.includes("SUBMITTED")) {
                return "sap-icon://person-placeholder";
            } else if (action.includes("CREATED") || action.includes("FAILED")) {
                return "sap-icon://popup-window";
            }
        },
        formatColor: function (action) {
            if (action.includes("SUBMITTED")) {
                return "Information";
            } else if (action.includes("APPROVED")||action.includes("CREATED")) {
                return "Success";
            } else if (action.includes("REJECTED")||action.includes("FAILED")) {
                return "Error";
            }
        }
        


    };
});