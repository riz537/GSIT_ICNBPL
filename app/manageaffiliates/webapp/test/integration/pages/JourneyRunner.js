sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/ui5/lly/icnpb/manageaffiliates/test/integration/pages/AffiliateMasterList.gen",
	"com/ui5/lly/icnpb/manageaffiliates/test/integration/pages/AffiliateMasterObjectPage.gen"
], function (JourneyRunner, AffiliateMasterListGenerated, AffiliateMasterObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/ui5/lly/icnpb/manageaffiliates') + '/test/flp.html#app-preview',
        pages: {
			onTheAffiliateMasterListGenerated: AffiliateMasterListGenerated,
			onTheAffiliateMasterObjectPageGenerated: AffiliateMasterObjectPageGenerated
        },
        async: true
    });

    return runner;
});

