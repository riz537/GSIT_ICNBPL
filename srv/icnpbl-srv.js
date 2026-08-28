const cds = require('@sap/cds')

module.exports = class IcNpblService extends cds.ApplicationService {
  async init() {

    const { A_PurchaseOrder, ICNPBAttachment, ICCustomer, ICVendor, ExchangeRateConversion, CostCenter, ICNPBRequest, Users, BillingTypes, BillingSubTypeDerivation, AffiliateMaster, MarkupDerivation } = cds.entities('IcNpblService')

    const mdSrv = await cds.connect.to('masterdata_edmx');
    const poSrv = await cds.connect.to('API_PURCHASEORDER_PROCESS_SRV_edmx');

    this.on('READ', [ICCustomer, ICVendor, CostCenter], async req => {
      console.log("Inside READ --> req.query below");
      console.log(JSON.stringify(req.query, null, 2));
      return mdSrv.run(req.query);
    });

    this.on('CREATE', A_PurchaseOrder, async req => {
      console.log("Inside CREATE --> A_PurchaseOrder");
      console.log(JSON.stringify(req.query, null, 2));
      return poSrv.run(req.query);
    });


    this.on('getExchangeRate', async req => {
      const { sourceAmount, sourceCurrency, targetCurrency } = req.data;
      const today = new Date().toISOString().split('T')[0];

      const result = await mdSrv.send({
        method: 'GET',
        path:
          `/ExchangeRateConversion(` +
          `p_SourceAmount=${sourceAmount}m,` +
          `p_SourceCurrency='${sourceCurrency}',` +
          `p_TargetCurrency='${targetCurrency}',` +
          `p_ExRateDate=datetime'${today}T00:00:00'` +
          `)/Set`
      });
      console.log("converted Amount");
      console.log(result);
      return result[0].ConvertedAmount;
    });

    this.before('CREATE', ICNPBRequest, async req => {
      req.data.requestNumber =
        Math.floor(100000000000 + Math.random() * 900000000000)
          .toString();

      req.data.status = 'DRAFT';
    });
    this.before('CREATE', ICNPBAttachment, async req => {
      req.data.uploadUrl = "https://lly-sbx-playground-gsit-icnpbl-srv.cfapps.us10.hana.ondemand.com/odata/v4/ic-npbl/ICNPBAttachment(" + req.data.ID + ")/fileContent";
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

    this.on("getCounts", async (req) => {


      const submitted = await SELECT.one.from(ICNPBRequest).columns('count(*) as CNT').where({ status: "SUBMITTED" });

      const approved = await SELECT.one.from(ICNPBRequest).columns('count(*) as CNT').where({ status: "APPROVED" });

      const rejected = await SELECT.one.from(ICNPBRequest).columns('count(*) as CNT').where({ status: "REJECTED" });

      const draft = await SELECT.one.from(ICNPBRequest).columns('count(*) as CNT').where({ status: "DRAFT" });

      return {
        submitted: submitted?.CNT || 0,
        approved: approved?.CNT || 0,
        rejected: rejected?.CNT || 0,
        draft: draft?.CNT || 0
      };
    });

    this.on('submitForApproval', async req => {
      console.log("inside submitForApproval");
      console.log(req.data);
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      const attachment = await SELECT.one.from(ICNPBAttachment).where({ request_ID: requestId });
      console.log("attachment");
      console.log(attachment);
      if (!request) {
        req.error(404, 'Request not found');
      }
      // BPA payload

      const payload = {
        "definitionId": "us10.lly-sbx.icnpb.iCNPBProcess",
        "context": {
          "requestId": requestId,
          "billingType": request.billingType,
          "billingOption": request.billingOption,
          "billingSubType": request.billingSubType,
          "billingDescription": request.billingDescription,
          "billAtDate": request.billAtDate,
          "billingAffiliateCostCenter": request.billingAffiliateCostCenter,
          "billingAffiliateCostElement": request.billingAffiliateCostElement,
          "billingTiming": request.billingTiming,
          "billingAffiliateCompanyCode": request.billingAffiliateCompanyCode,
          "billingAffiliateCountryCode": request.billingAffiliateCountryCode,
          "billingAffiliateContact": request.billingAffiliateContact,
          "receivingAffiliateCostCenter": request.receivingAffiliateCostCenter,
          "receivingAffiliateCostElement": request.receivingAffiliateCostElement,
          "receivingAffiliateCompanyCode": request.receivingAffiliateCompanyCode,
          "receivingAffiliateCountryCode": request.receivingAffiliateCountryCode,
          "receivingAffiliateContact": request.receivingAffiliateContact,
          "currencyLocal": request.currencyLocal,
          "actualAmountLocal": request.actualAmountLocal,
          "markupPercent": request.markupPercent,
          "markupAmount": request.markupAmount,
          "totalAmountLocal": request.totalAmountLocal,
          "currencyCustomer": request.currencyCustomer,
          "totalAmountCustomer": (request.totalAmountCustomer) ? request.totalAmountCustomer : "",
          "totalAmountUSD": (request.totalAmountUSD) ? request.totalAmountUSD : "",
          "comments": request.comments,
          "specialInstructionsFlag": request.specialInstructionsFlag,
          "currencyusd": "US",
          "uploadUrl": (attachment) ? attachment.uploadUrl : ""
        }
      }
      console.log("payload"); console.log(payload);
      // BPA Call comes here
      try {
        const bpaAPI = await cds.connect.to("bpa_dest");
        const workFlowRes = await bpaAPI.post(
          "/workflow/rest/v1/workflow-instances",
          payload
        );
        console.log("WorkFlow triggered successfully " + workFlowRes);
        console.log(workFlowRes);
        await UPDATE(ICNPBRequest)
          .set({
            status: 'PENDING_APPROVAL',
            workflowInstanceId:
              workFlowRes.id
          })
          .where({
            ID: requestId
          });
      } catch (error) {
        console.log("inside error");
        console.log(error);
        if (error.reason?.response) {
          console.log("HTTP Status code:" + error.reason.response.status);
          console.log("Response Details:" + error.reason.response.data);
        }

      }


    });

    this.on('updateRequestStatus', async req => {
      const { requestId, status } = req.data;
      var count = await UPDATE(ICNPBRequest)
        .set({
          status: status
        })
        .where({
          ID: requestId
        });
      //return `Request ${requestId} updated to ${status}`;
      console.log("updateRequestStatus --->" + count);
      if (count > 0) {
        return "SUCCESS";
      } else {
        return "ERROR";
      }

    });

    this.on('createPurchaseOrder', async req => {
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      if (!request) {
        req.error(404, 'Request not found');
      }

      const affiliateBilling = await SELECT.one.from(AffiliateMaster)
        .where({
          companyCode: request.billingAffiliateCompanyCode
        });

      const affiliateReceiving = await SELECT.one.from(AffiliateMaster)
        .where({
          companyCode: request.receivingAffiliateCompanyCode
        });

      const payload = {
        PurchaseOrder: "",
        CompanyCode: request.receivingAffiliateCompanyCode,
        PurchaseOrderType: "NB",
        Supplier: affiliateBilling?.pVend,
        PurchasingOrganization: affiliateReceiving?.purchasingOrg,
        PurchasingGroup: "4IB",
        PurchaseOrderDate: new Date().toISOString().split("T")[0] + "T00:00:00",
        DocumentCurrency: request.currencyCustomer,

        to_PurchaseOrderItem: [{
          PurchaseOrder: "",
          PurchaseOrderItem: "1",
          AccountAssignmentCategory: "K",
          TaxCode: "NA",
          PurchaseOrderItemText: request.billingDescription,
          Plant: affiliateReceiving?.purchasingOrg,
          SupplierMaterialNumber: request.billingSubType,
          OrderQuantity: "1.000",
          PurchaseOrderQuantityUnit: "SU",
          OrderPriceUnit: "SU",
          OrderPriceUnitToOrderUnitNmrtr: "1",
          OrdPriceUnitToOrderUnitDnmntr: "1",
          DocumentCurrency: request.currencyCustomer,
          NetPriceAmount: request.totalAmountCustomer,
          NetPriceQuantity: "1",
          Material: request.billingSubType,

          to_AccountAssignment: [{
            PurchaseOrder: "",
            PurchaseOrderItem: "1",
            AccountAssignmentNumber: "1",
            Quantity: "1.000",
            MultipleAcctAssgmtDistrPercent: "0.0",
            DocumentCurrency: request.currencyCustomer,
            PurgDocNetAmount: "0.00",
            GLAccount: request.receivingAffiliateCostElement,
            BusinessArea: "A",
            CostCenter: request.receivingAffiliateCostCenter
          }]
        }]
      };
      console.log("PO CREATION Payload ----->");
      console.log(payload);
      console.log("Stringyfied payload");
      console.log(JSON.stringify(payload));

      const result = await poSrv.send({
        method: 'POST',
        path: '/A_PurchaseOrder',
        data: payload
      });
      console.log("PO CREATION Response---->");
      console.log(result);

      return "SUCCESS";
    });


    return super.init()
  }
}
