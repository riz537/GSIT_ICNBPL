using {icnpbl as db} from '../db/schema';

service TableMaintnsService {
    @odata.draft.enabled
    entity AffiliateMaster          as projection on db.AffiliateMaster;

    @odata.draft.enabled
    entity BillingSubTypeDerivation as projection on db.BillingSubTypeDerivation;

    @odata.draft.enabled
    entity BillingTypes             as projection on db.BillingTypes;

    @odata.draft.enabled
    entity MarkupDerivation         as projection on db.MarkupDerivation;

    @odata.draft.enabled
    entity Users                    as projection on db.Users;

}
