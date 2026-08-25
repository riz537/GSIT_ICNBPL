const cds = require('@sap/cds')

module.exports = class IcNpblService extends cds.ApplicationService {
  async init() {

    const { ICCustomer, ICVendor, CostCenter, ICNPBRequest, Users, BillingTypes, BillingSubTypeDerivation, AffiliateMaster, MarkupDerivation } = cds.entities('IcNpblService')

    const mdSrv = await cds.connect.to('masterdata_edmx');

    this.on('READ', [ICCustomer, ICVendor, CostCenter], async req => {
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

    this.on('submitRequest', async req => {
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });

      if (!request) {
        req.error(404, 'Request not found');
      }
      // BPA payload
      const payload = {
        definitionId: "us10.lly-sbx.icnpb.iCNPBProcess",
        context: {
          billingType: request.billingType,
          billingOption: request.billingOption,
          billingSubType: request.billingSubType,
          billingDescription: request.billingDescription,
          billAtDate: request.billAtDate,
          billingAffiliateCostCenter: request.billingAffiliateCostCenter,
          billingAffiliateCostElement: request.billingAffiliateCostElement,
          billingTiming: request.billingTiming,
          billingAffiliateCompanyCode: request.billingAffiliateCompanyCode,
          billingAffiliateCountryCode: request.billingAffiliateCountryCode,
          billingAffiliateContact: request.billingAffiliateContact,
          receivingAffiliateCostCenter: request.receivingAffiliateCostCenter,
          receivingAffiliateCostElement: request.receivingAffiliateCostElement,
          receivingAffiliateCompanyCode: request.receivingAffiliateCompanyCode,
          receivingAffiliateCountryCode: request.receivingAffiliateCountryCode,
          receivingAffiliateContact: request.receivingAffiliateContact,
          currencyLocal: request.currencyLocal,
          actualAmountLocal: request.actualAmountLocal,
          markupPercent: request.markupPercent,
          markupAmount: request.markupAmount,
          totalAmountLocal: request.totalAmountLocal,
          currencyCustomer: request.currencyCustomer,
          totalAmountCustomer: request.totalAmountCustomer,
          totalAmountUSD: request.totalAmountUSD,
          comments: request.comments,
          specialInstructionsFlag: request.specialInstructionsFlag
        }
      };
      // BPA Call comes here
      try {
        const bpaAPI = await cds.connect.to("bpa_dest");
        const workFlowRes = await bpaAPI.post(
          "/workflow/rest/v1/workflow-instances",
          payload
        );
        console.log("WorkFlow triggered successfully " + workFlowRes);
        await UPDATE(ICNPBRequest)
          .set({
            status: 'SUBMITTED',
            workflowInstanceId:
              workFlowRes.data.id
          })
          .where({
            ID: requestId
          });
      } catch (error) {
        if (error.reason?.response) {
          console.log("HTTP Status code:" + error.reason.response.status);
          console.log("Response Details:" + error.reason.response.data);
        }

      }


    });



    return super.init()
  }
}
