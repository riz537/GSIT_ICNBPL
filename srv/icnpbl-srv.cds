using {icnpbl as db} from '../db/schema';
using {masterdata_edmx as md} from './external/masterdata.edmx';
using {API_PURCHASEORDER_PROCESS_SRV_edmx as PO} from './external/API_PURCHASEORDER_PROCESS_SRV.edmx';
using {ZI_PO_DOC_TRACKING as POTrack} from './external/ZI_PO_DOC_TRACKING';

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
    entity POTracking               as projection on POTrack.PurchaseOrderDocTracking;

    action   triggerPofetch()                                                                                    returns String;

    function getBillingSubTypes(billingType: String)                                                             returns array of BillingSubTypeDerivation;
    function getCountryCode(companyCode: String)                                                                 returns AffiliateMaster;
    function getExchangeRate(sourceAmount: Decimal(15, 2), sourceCurrency: String(5), targetCurrency: String(5)) returns Decimal(15, 2);


    action   submitForApproval(requestId: UUID)                                                                  returns String;
    action   updateRequestStatus(requestId: UUID, status: String)                                                returns String;
    action   createPurchaseOrder(requestId: UUID)                                                                returns String;

    function getCounts()                                                                                         returns {
        submitted        : Integer;
        approved         : Integer;
        rejected         : Integer;
        draft            : Integer;
        posted           : Integer;
        error            : Integer;
        pending_approval : Integer;
    };
    

// annotate IcNpblService.POTracking with @(UI.LineItem:
// [{ $Type: 'UI.DataField', Value: PurchaseOrder},
// { $Type: 'UI.DataField', Value: CompanyCode},
// { $Type: 'UI.DataField', Value: CreationDate},
// { $Type: 'UI.DataFieldForAction', Action: 'IcNpblService.triggerPofetch',Label: 'fetch external data'}])


}
