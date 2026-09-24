using TableMaintnsService as service from '../../srv/tablemaintns-srv';

annotate service.Users with @(
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Value: userId,
            },
            {
                $Type: 'UI.DataField',
                Value: displayName,
            },
            {
                $Type: 'UI.DataField',
                Value: emailId,
            },
            {
                $Type: 'UI.DataField',
                Value: isTaxSubmitter,
            },
            {
                $Type: 'UI.DataField',
                Value: financeRequestor,
            },
            {
                $Type: 'UI.DataField',
                Value: isActive,
            },
            {
                $Type: 'UI.DataField',
                Value: isApprover,
            },
            {
                $Type: 'UI.DataField',
                Value: zone,
            },
        ],
    },
    UI.Facets                    : [{
        $Type : 'UI.ReferenceFacet',
        ID    : 'GeneratedFacet1',
        Label : 'General Information',
        Target: '@UI.FieldGroup#GeneratedGroup',
    }, ],
    UI.LineItem                  : [
        {
            $Type: 'UI.DataField',
            Value: userId,
        },
        {
            $Type: 'UI.DataField',
            Value: displayName,
        },
        {
            $Type: 'UI.DataField',
            Value: emailId,
        },
        {
            $Type: 'UI.DataField',
            Value: isTaxSubmitter,
        },
        {
            $Type: 'UI.DataField',
            Value: financeRequestor,
        },
        {
            $Type: 'UI.DataField',
            Value: isActive,
        },
        {
            $Type: 'UI.DataField',
            Value: isApprover,
        },
        {
            $Type: 'UI.DataField',
            Value: zone,
        },
    ],
    UI.SelectionFields           : [
        userId,
        displayName,
        emailId,
        isTaxSubmitter,
        financeRequestor,
        isActive,
        isApprover,
        zone,
    ],
    UI.HeaderInfo : {
        TypeName : 'User',
        TypeNamePlural : 'Users',
        Title : {
            $Type : 'UI.DataField',
            Value : userId,
        },
        Description : {
            $Type : 'UI.DataField',
            Value : displayName,
        },
        TypeImageUrl : 'sap-icon://employee',
    },
);

annotate service.Users with {
    userId           @Common.Label: 'User ID';
    emailId          @Common.Label: 'Email ID';
    displayName      @Common.Label: 'Display Name';
    isTaxSubmitter   @Common.Label: 'Is TaxSubmitter';
    financeRequestor @Common.Label: 'FinanceRequestor';
    isActive         @Common.Label: 'Is Active';
    isApprover       @Common.Label: 'Is Approver';
    zone             @Common.Label: 'Zone'
};



