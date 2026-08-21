using { icnpbl as db } from '../db/schema';
//using { icnpb_masterdata_edmx as md} from './external/icnpb_masterdata.edmx';


service IcNpblService {
    entity ICNPBRequest as projection on db.ICNPBRequest;
    entity Users as projection on db.Users;
    entity BillingTypes as projection on db.BillingTypes;
    entity BillingSubTypeDerivation as projection on db.BillingSubTypeDerivation;
    entity AffiliateMaster as projection on db.AffiliateMaster;
    entity MarkupDerivation as projection on db.MarkupDerivation;
    //entity CostCenter as projection on md.CostCenter;
    function getBillingSubTypes(billingType:String) returns array of BillingSubTypeDerivation;
    //function getCostCenters() returns array of LargeString;
}