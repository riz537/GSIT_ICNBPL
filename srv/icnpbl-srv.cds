using {icnpbl as db} from '../db/schema';
using {masterdata_edmx as md} from './external/masterdata.edmx';


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
    function getBillingSubTypes(billingType: String) returns array of BillingSubTypeDerivation;
    function getCountryCode(companyCode: String)     returns AffiliateMaster;

}
