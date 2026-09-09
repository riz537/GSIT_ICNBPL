using {icnpbl as db} from '../db/schema';
using {masterdata_edmx as md} from './external/masterdata.edmx';
using {API_PURCHASEORDER_PROCESS_SRV_edmx as PO} from './external/API_PURCHASEORDER_PROCESS_SRV.edmx';


service IcNpblService {
    entity ICNPBRequest             as projection on db.ICNPBRequest;
    entity ICNPBAttachment          as projection on db.ICNPBAttachment;
    entity Users                    as projection on db.Users;
    entity BillingTypes             as projection on db.BillingTypes;
    entity BillingSubTypeDerivation as projection on db.BillingSubTypeDerivation;
    entity AffiliateMaster          as projection on db.AffiliateMaster;
    entity MarkupDerivation         as projection on db.MarkupDerivation;
    entity CostCenter               as projection on md.CostCenter;
    entity ICCustomer               as projection on md.ICCustomer;
    entity ICVendor                 as projection on md.ICVendor;
    entity A_PurchaseOrder          as projection on PO.A_PurchaseOrder;


    //====================================================
    // Utility Functions
    //====================================================
    function getBillingSubTypes(billingType: String)        returns array of BillingSubTypeDerivation;
    function getCountryCode(companyCode: String)            returns AffiliateMaster;

    function getExchangeRate(sourceAmount: Decimal(15, 2),
                             sourceCurrency: String(5),
                             targetCurrency: String(5))     returns Decimal(15, 2);

    function getCounts()                                    returns {
        total            : Integer;
        approved         : Integer;
        rejected         : Integer;
        posted           : Integer;
        error            : Integer;
        pending_approval : Integer;
    };

    //====================================================
    // UI Actions
    //====================================================
    action   validateSubmitter()                            returns String;
    action   submitForApproval(requestId: UUID)             returns String;

    //====================================================
    // Generic Request Update Action. BPA can call this at any stage
    //====================================================
    action updateRequest(
        requestId    : UUID,
        status       : String,
        poNumber     : String,
        soNumber     : String,
        fiNumber     : String,
        ICARDocument : String,
        ICAPDocument : String,
        errorMessage : String
    ) returns String;

    //====================================================
    // SAP Integration Actions
    //====================================================

    action createPurchaseOrder(requestId : UUID ) returns String;
    action getSalesOrder(poNumber : String) returns db.SalesOrderResponse;
    action createFinanceDocument(requestId : UUID) returns String;

    //====================================================
    // Email Actions
    //====================================================

    action   sendSubmitterEmail(requestId: UUID)            returns String;
    action   sendApproverEmail(requestId: UUID)             returns String;
    action   sendApprovalEmail(requestId: UUID)             returns String;
    action   sendRejectionEmail(requestId: UUID)            returns String;
    action   sendPOEmail(requestId: UUID, poNumber: String) returns String;

}
