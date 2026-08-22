const cds = require('@sap/cds')

module.exports = class IcNpblService extends cds.ApplicationService {
  async init() {

    const {CostCenter, ICNPBRequest, Users, BillingTypes, BillingSubTypeDerivation, AffiliateMaster, MarkupDerivation } = cds.entities('IcNpblService')

    const mdSrv = await cds.connect.to('masterdata_edmx');

    this.on('READ', CostCenter, async req => {
      console.log("Inside READ of Cost Center");
      return mdSrv.run(req.query);
    });

    this.on('getBillingSubTypes', async (req) => {
      console.log("I am inside the getBillingSubTypes");
      console.log(req.data);
      const { billingType } = req.data;
      console.log(req.data);
      if (!billingType) {
        req.error(400, 'billingType is mandatory');
      }
      const result = await cds.tx(req).run(
        SELECT.from(BillingSubTypeDerivation)
          .where({ billingType })
      );
      console.log("result")
      console.log(result);
      return result;

    });


    return super.init()
  }
}
