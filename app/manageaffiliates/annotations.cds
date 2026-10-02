using TableMaintnsService as service from '../../srv/tablemaintns-srv';

annotate service.AffiliateMaster with @(
    UI.FieldGroup #GeneratedGroup: {
        $Type: 'UI.FieldGroupType',
        Data : [
            {
                $Type: 'UI.DataField',
                Label: 'companyCode',
                Value: companyCode,
            },
            {
                $Type: 'UI.DataField',
                Label: 'companyName',
                Value: companyName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'countryCode',
                Value: countryCode,
            },
            {
                $Type: 'UI.DataField',
                Label: 'countryName',
                Value: countryName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'postingPath',
                Value: postingPath,
            },
            {
                $Type: 'UI.DataField',
                Label: 'sdFiNot',
                Value: sdFiNot,
            },
            {
                $Type: 'UI.DataField',
                Label: 'sapForSD',
                Value: sapForSD,
            },
            {
                $Type: 'UI.DataField',
                Label: 'sapForFIN',
                Value: sapForFIN,
            },
            {
                $Type: 'UI.DataField',
                Label: 'purchasingOrg',
                Value: purchasingOrg,
            },
            {
                $Type: 'UI.DataField',
                Label: 'aVend',
                Value: aVend,
            },
            {
                $Type: 'UI.DataField',
                Label: 'pVend',
                Value: pVend,
            },
            {
                $Type: 'UI.DataField',
                Label: 'plant',
                Value: plant,
            },
            {
                $Type: 'UI.DataField',
                Label: 'salesOrg',
                Value: salesOrg,
            },
            {
                $Type: 'UI.DataField',
                Label: 'aCust',
                Value: aCust,
            },
            {
                $Type: 'UI.DataField',
                Label: 'localCurrency',
                Value: localCurrency,
            },
            {
                $Type: 'UI.DataField',
                Label: 'custCurrency',
                Value: custCurrency,
            },
            {
                $Type: 'UI.DataField',
                Label: 'taxCode',
                Value: taxCode,
            },
            {
                $Type: 'UI.DataField',
                Label: 'icoTaxAgr',
                Value: icoTaxAgr,
            },
            {
                $Type: 'UI.DataField',
                Label: 'euFlag',
                Value: euFlag,
            },
            {
                $Type: 'UI.DataField',
                Label: 'businessArea',
                Value: businessArea,
            },
            {
                $Type: 'UI.DataField',
                Label: 'zone',
                Value: zone,
            },
            {
                $Type: 'UI.DataField',
                Label: 'isActive',
                Value: isActive,
            },
            {
                $Type: 'UI.DataField',
                Label: 'dataComplete',
                Value: dataComplete,
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
            Value: companyCode,
        },
        {
            $Type: 'UI.DataField',
            Value: companyName,
        },
        {
            $Type: 'UI.DataField',
            Value: countryCode,
        },
        {
            $Type: 'UI.DataField',
            Value: countryName,
        },
        {
            $Type: 'UI.DataField',
            Value: postingPath,
        },
    ],
    UI.SelectionFields           : [
        companyCode,
        companyName,
        countryCode,
        countryName,
        businessArea,
        postingPath,
        pVend,
        aVend,
        aCust,
    ],
);

annotate service.AffiliateMaster with {
    companyCode  @Common.Label: 'Company Code';
    companyName  @Common.Label: 'Company Name';
    countryCode  @Common.Label: 'Country Code';
    countryName  @Common.Label: 'Country Name';
    businessArea @Common.Label: 'Business Area';
    postingPath  @Common.Label: 'Posting Path';
    pVend        @Common.Label: 'pVend';
    aVend        @Common.Label: 'aVend';
    aCust        @Common.Label: 'aCust';
};
