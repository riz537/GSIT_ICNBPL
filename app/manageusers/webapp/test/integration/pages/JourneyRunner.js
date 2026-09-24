sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/ui5/lly/icnpbl/manageusers/test/integration/pages/UsersList.gen",
	"com/ui5/lly/icnpbl/manageusers/test/integration/pages/UsersObjectPage.gen"
], function (JourneyRunner, UsersListGenerated, UsersObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/ui5/lly/icnpbl/manageusers') + '/test/flp.html#app-preview',
        pages: {
			onTheUsersListGenerated: UsersListGenerated,
			onTheUsersObjectPageGenerated: UsersObjectPageGenerated
        },
        async: true
    });

    return runner;
});

