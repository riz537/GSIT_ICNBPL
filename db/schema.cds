namespace icnpbl;

using {
    cuid,
    managed
} from '@sap/cds/common';

/* =========================
   ENUMS
   ========================= */

type BillingType             : String enum {
    FINANCIAL;
    COST_CENTER;
    FIXED_ASSET;
}

type BillingOption           : String enum {
    SINGLE;
    RECURRING;
    BILL_LATER;
}

type BillingTiming           : String enum {
    IMMEDIATE;
    LATER;
}

type PassThroughFlag         : String enum {
    YES;
    NO;
    PASSTHROUGH_ONLY;
}

type RequestStatus           : String enum {
    DRAFT;
    PENDING_APPROVAL;
    APPROVED;
    POSTED;
    AWAITING_MANUAL_STEP;
    ERROR;
    REJECTED;
}

type ExceptionApprovalStatus : String enum {
    GRANTED;
    REFUSED;
    NOT_APPLICABLE;
}

type RecurringFrequency      : String enum {
    MONTHLY;
    QUARTERLY;
}

type RecurringAmountType     : String enum {
    FIXED;
    VARIABLE;
    YTD_SWEEP;
}

type ApprovalAction          : String enum {
    SUBMITTED;
    APPROVED;
    REJECTED;
    EXCEPTION_GRANTED;
    EXCEPTION_REFUSED;
}

type AuthorizationType       : String enum {
    REQUESTOR;
    FINANCIAL_REQUESTOR;
    RECEIVING_AFFILIATE_APPROVER;
    ZONE_APPROVER;
    TAX_SUBMITTER;
    SUPPORT;
    AUDITOR;
}

type DerivationBillingType   : String enum {
    ASSET;
    COST_CENTER;
    FINANCIAL;
}

type SAPEnablementStatus     : String enum {
    FULL;
    FI_NON;
    FI_PO;
    FI_JV;
    NON;
}
type SalesOrderResponse {
    status           : String;
    salesOrderNumber : String;
    ICARDocument     : String;
    ICAPDocument     : String;
    errorMessage     : String;
}
type ActionResponse {
    status       : String;
    value        : String;
    errorMessage : String;
}

/* =========================
   ROOT ENTITY
   ========================= */

entity ICNPBRequest : cuid, managed {

    requestNumber                 : String(20);

    billingType                   : BillingType;
    billingOption                 : BillingOption;

    billingSubType                : String;

    billingDescription            : String(500);

    billingTiming                 : BillingTiming;
    billAtDate                    : Date;

    isCredit                      : String;
    creditReference               : String;

    passThroughFlag               : PassThroughFlag;

    billingAffiliateCompanyCode   : String(4);
    billingAffiliateCountryCode   : String(3);
    billingAffiliateContact       : String(120);

    billingAffiliateCostCenter    : String(10);
    billingAffiliateCostElement   : String(10);
    billingAffiliateGLAccount     : String(10);

    receivingAffiliateCompanyCode : String(4);
    receivingAffiliateCountryCode : String(3);
    receivingAffiliateContact     : String(120);

    receivingAffiliateCostCenter  : String(10);
    receivingAffiliateCostElement : String(10);
    receivingAffiliateGLAccount   : String(10);

    receivingAffiliateWBSNumber   : String(24);
    receivingAffiliateAssetNumber : String(12);

    netBookValueLC                : Decimal(15, 2);
    fairMarketValueLC             : Decimal(15, 2);

    currencyLocal                 : String(3);

    actualAmountLocal             : Decimal(15, 2);

    markupPercent                 : Decimal(5, 2);
    markupAmount                  : Decimal(15, 2);

    totalAmountLocal              : Decimal(15, 2);

    currencyCustomer              : String(3);
    totalAmountCustomer           : Decimal(15, 2);

    totalAmountUSD                : Decimal(15, 2);
    exchangeRateUsed              : Decimal(9, 5);

    specialInstructionsFlag       : String;

    comments                      : LargeString;

    status                        : RequestStatus default 'DRAFT';

    lateSubmissionFlag            : String;

    exceptionApprovalStatus       : ExceptionApprovalStatus;

    recurringFrequency            : RecurringFrequency;
    recurringAmountType           : RecurringAmountType;

    purchaseOrderNumber           : String(10);
    salesOrderNumber              : String(10);

    fiJournalVoucherNumber        : String(10);
    billingReqNumber              : String(10);
    ICARDocument                  : String(10);
    ICAPDocument                    : String(10);
    fiFiscalYear                  : String(4);


    accountingExceptionNote       : String(500);
    errorMessage                  : String(500);

    attachments                   : Composition of many ICNPBAttachment
                                        on attachments.request = $self;

    approvalHistory               : Composition of many ICNPBApprovalHistory
                                        on approvalHistory.request = $self;
    workflowInstanceId            : String(100);
    taskId : String(100);
    userId: String(100);
}

/* =========================
   ATTACHMENTS
   ========================= */

entity ICNPBAttachment : cuid {

    request          : Association to ICNPBRequest;
    fileContent      : LargeBinary  @Core.MediaType: mimeType  @Core.ContentDisposition.Filename: fileName  @Core.ContentDisposition.Type: 'attachment';
    fileName         : String(255);
    mimeType         : String(100)  @Core.IsMediaType: true;
    uploadUrl        : LargeString;
    storageRef       : String(500);
    ocrExtractedText : LargeString;
    uploadedBy       : String(255);
    uploadedAt       : Timestamp;
}

entity POTrackingLocal {

    key PurchaseOrder     : String(20);
        PurchaseOrderType : String(20);
        CompanyCode            : String(20);
        CreationDate      : String(30);

}

/* =========================
   APPROVAL HISTORY
   ========================= */

entity ICNPBApprovalHistory : cuid {

    request   : Association to ICNPBRequest;

    action    : ApprovalAction;

    actor     : String(120);

    actorRole : AuthorizationType;

    comments  : LargeString;

    timestamp : Timestamp;
}


entity Users {
    key userId           : String(50);
        displayName      : String(255);
        emailId          : String(255);
        isTaxSubmitter   : String;
        financeRequestor : String;
        isActive         : String;
        isApprover       : String;
     key   zone          : String;
}

entity BillingTypes {
    key billingType        : String(40);
        description        : String(255);
        requiresCostCenter : String;
        requiresFixedAsset : String;
}

entity BillingSubTypeDerivation {
    key ID                    : UUID;
        billingType           : String(40);
        billingSubType        : String(100);
        sapMaterial           : String(100);
        description           : String(255);
        ceSelection           : String(40);
        costElement           : String(50);
        allowedCostElements   : LargeString;
        threshold             : Integer;
        passThroughControlled : String;
        inScope               : String;
}

entity AffiliateMaster {
    key companyCode   : String(10);
        companyName   : String(255);
        countryCode   : String(10);
        countryName   : String(100);
        postingPath   : String(40);
        sdFiNot       : String(40);
        sapForSD      : String;
        sapForFIN     : String;
        purchasingOrg : String(20);
        aVend         : String(20);
        pVend         : String(20);
        plant         : String(20);
        salesOrg      : String(20);
        aCust         : String(20);
        localCurrency : String(10);
        custCurrency  : String(10);
        taxCode       : String(10);
        icoTaxAgr     : String(10);
        euFlag        : String;
        businessArea  : String(10);
        zone          : Integer;
        isActive      : String;
        dataComplete  : String;
}

entity MarkupDerivation {
    key ID             : UUID;
        billingSubType : String(100);
        sapMaterial    : String(100);
        fb01Debit      : String(20);
        fb01Credit     : String(20);
        poMe21n        : String(20);
        markUpMaterial : String(100);
        markUpPercent  : String(40);
        markUpDisplay  : String(40);
        fb01MarkUp     : String(20);
        poMarkUp       : String(20);
        markupSource   : String(100);
        inScope        : String;
}
