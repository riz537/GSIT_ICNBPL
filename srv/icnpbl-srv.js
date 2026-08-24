const cds = require('@sap/cds')

module.exports = class IcNpblService extends cds.ApplicationService {
  async init() {

    const {ICCustomer,ICVendor,CostCenter, ICNPBRequest, Users, BillingTypes, BillingSubTypeDerivation, AffiliateMaster, MarkupDerivation } = cds.entities('IcNpblService')

    const mdSrv = await cds.connect.to('masterdata_edmx');

    this.on('READ', [ICCustomer,ICVendor,CostCenter], async req => {
      console.log("Inside READ of Cost Center");
      return mdSrv.run(req.query);
    });

     this.before('CREATE', ICNPBRequest, async req => {
        req.data.requestNumber =
            Math.floor(100000000000 + Math.random() * 900000000000)
            .toString();

        req.data.status = 'DRAFT';
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
    //get country code basing on company code
    this.on('getCountryCode', async (req) => {
      console.log("inside the getCountryCode");
      console.log(req.data);
      const { companyCode } = req.data;
      console.log(req.data);
      if (!companyCode) {
        req.error(400, 'companyCode is mandatory');
      }
      const result = await cds.tx(req).run(
        SELECT.from(AffiliateMaster)
          .where({ companyCode })
      );
      console.log("result")
      console.log(result);
      return result;
    });


    return super.init()
  }
}
