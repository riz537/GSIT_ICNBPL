const cds = require('@sap/cds');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');

module.exports = class IcNpblService extends cds.ApplicationService {
  async init() {

    const { ICNPBAttachment, ICCustomer, ICVendor, CostCenter, ICNPBRequest, Users, BillingTypes, BillingSubTypeDerivation, AffiliateMaster, MarkupDerivation } = cds.entities('IcNpblService')

    const mdSrv = await cds.connect.to('masterdata_edmx');
    const poSrv = await cds.connect.to('API_PURCHASEORDER_PROCESS_SRV_edmx');
    const emailSrv = await cds.connect.to("email_iflow");
    const trackingSrv = await cds.connect.to("ZI_PO_DOC_TRACKING_edmx");
    const financeSrv = await cds.connect.to("FI_API_edmx");

    this.on('READ', [ICCustomer, ICVendor, CostCenter], async req => {
      console.log("Inside READ --> req.query below");
      console.log(JSON.stringify(req.query, null, 2));
      return mdSrv.run(req.query);
    });

    // this.on('CREATE', A_PurchaseOrder, async req => {
    //   console.log("Inside CREATE --> A_PurchaseOrder");
    //   console.log(JSON.stringify(req.query, null, 2));
    //   return poSrv.run(req.query);
    // });

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

    this.on('validateSubmitter', async req => {
      const user = await SELECT.one.from(Users).where({ emailId: req.user.id });
      if (!user) {
        return req.reject(
          403,
          "You are not authorized to raise an ICNPB request."
        );
      }
      return "SUCCESS";
    });
    this.before('CREATE', ICNPBRequest, async req => {
      const year = new Date().getFullYear();
      const lastRequest = await SELECT.one.from(ICNPBRequest).columns('requestNumber').orderBy({ createdAt: 'desc' });
      let nextNumber = 1;
      if (lastRequest?.requestNumber && lastRequest.requestNumber.startsWith(`ICNBP-${year}-`)) {
        const currentNumber = parseInt(lastRequest.requestNumber.split('-')[2]);
        nextNumber = currentNumber + 1;
      }
      req.data.requestNumber = `ICNBP-${year}-${String(nextNumber).padStart(6, '0')}`;
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
      const posted = await SELECT.one.from(ICNPBRequest).columns('count(*) as CNT').where({ status: "POSTED" });
      const error = await SELECT.one.from(ICNPBRequest).columns('count(*) as CNT').where({ status: "ERROR" });
      const pending_approval = await SELECT.one.from(ICNPBRequest).columns('count(*) as CNT').where({ status: "PENDING_APPROVAL" });
      return {
        submitted: submitted?.CNT || 0,
        approved: approved?.CNT || 0,
        rejected: rejected?.CNT || 0,
        draft: draft?.CNT || 0,
        posted: posted?.CNT || 0,
        error: error?.CNT || 0,
        pending_approval: pending_approval?.CNT || 0
      };
    });

    this.on('submitForApproval', async req => {
      console.log("inside submitForApproval");
      console.log(req.data);
      console.log("user information ---->");
      console.log(JSON.stringify(req.user));

      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      const attachment = await SELECT.one.from(ICNPBAttachment).where({ request_ID: requestId });
      console.log("attachment");
      console.log(attachment);
      if (!request) {
        req.reject(404, 'Request not found');
      }

      const billingSubTypeInfo = await SELECT.one
        .from(BillingSubTypeDerivation)
        .where({
          billingSubType: request.billingSubType
        });

      const threshold = Number(billingSubTypeInfo.threshold || 0);

      const requestAmount = Number(request.totalAmountLocal || 0);


      if (requestAmount <= threshold) {
        req.reject(
          400,
          `IC NPB Billing request amount can not be less than the threshold amount - ${threshold}.`
        );
      }

      const submitterUser = await SELECT.one.from(Users).where({ emailId: request.createdBy });
      const autoApprove = submitterUser?.taxSubmitter === "Yes" && isEOMMinus5ToEOM();
      console.log("Auto Approve Flag --->", autoApprove);


      // BPA payload
      const payload = {
        "definitionId": "us10.lly-sbx.icnpb.iCNPBProcess",
        "context": {
          "autoApprove": autoApprove,
          "requestId": requestId,
          "requestNumber": request.requestNumber,
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
        return "SUCCESS";
      } catch (error) {
        console.log("inside error");
        console.log(error);
        if (error.reason?.response) {
          console.log("HTTP Status code:" + error.reason.response.status);
          console.log("Response Details:" + error.reason.response.data);
          return "ERROR";
        }
      }
    });
    this.on("updateRequest", async req => {
      const { requestId, status, poNumber, soNumber, fiNumber, errorMessage } = req.data;
      const payload = {};
      if (status) payload.status = status;
      if (poNumber) payload.purchaseOrderNumber = poNumber;
      if (soNumber) payload.salesOrderNumber = soNumber;
      if (fiNumber) payload.fiNumber = fiNumber;
      if (errorMessage) payload.errorMessage = errorMessage;
      await UPDATE(ICNPBRequest).set(payload).where({ ID: requestId });
      return "SUCCESS";
    });

    this.on('createPurchaseOrder', async req => {
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      if (!request) {
        req.error(404, 'Request not found');
      }
      const billingSubTypeInfo = await SELECT.one.from(BillingSubTypeDerivation)
        .where({
          billingSubType: request.billingSubType
        });
      const affiliateBilling = await SELECT.one.from(AffiliateMaster)
        .where({
          companyCode: request.billingAffiliateCompanyCode
        });

      const affiliateReceiving = await SELECT.one.from(AffiliateMaster)
        .where({
          companyCode: request.receivingAffiliateCompanyCode
        });
      const sapMaterial = billingSubTypeInfo.sapMaterial;
      const payload = {
        PurchaseOrder: "",
        CompanyCode: request.receivingAffiliateCompanyCode,
        PurchaseOrderType: "ZA",
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
          Plant: affiliateReceiving?.plant,
          SupplierMaterialNumber: sapMaterial,
          OrderQuantity: "1.000",
          PurchaseOrderQuantityUnit: "SU",
          OrderPriceUnit: "SU",
          OrderPriceUnitToOrderUnitNmrtr: "1",
          OrdPriceUnitToOrderUnitDnmntr: "1",
          DocumentCurrency: request.currencyCustomer,
          NetPriceAmount: request.totalAmountCustomer,
          NetPriceQuantity: "1",
          Material: sapMaterial,

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
      try {
        const result = await poSrv.send({
          method: 'POST',
          path: '/A_PurchaseOrder',
          data: payload
        });
        console.log("PO CREATION Response---->");
        console.log(result);

        const poNumber = result.PurchaseOrder;
        if (!poNumber) return "ERROR";
        return poNumber;
      } catch (error) {
        console.error("PO CREATION FAILED");
        console.error(error);
        return "ERROR";
      }
    });
    this.on("getSalesOrder", async req => {
      const { poNumber } = req.data;
      if (!poNumber) return "ERROR";
      await new Promise(resolve => setTimeout(resolve, 8000));
      try {
        console.log("Before SO Trigger --->");
        const soResult = await trackingSrv.send({
          method: "GET",
          path: `/SalesDebitMemoFlow?$filter=PurchaseOrder eq '${poNumber}'`
        });
        console.log("SO Response --->");
        console.log(JSON.stringify(soResult));
        const soNumber = soResult?.[0]?.SalesOrder;
        if (!soNumber) return "ERROR";
        return soNumber;
      } catch (error) {
        console.error("SO FETCH FAILED");
        console.error(error);
        return "ERROR";
      }
    });
    this.on("createFinanceDocument", async req => {
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      if (!request) return "ERROR";
      
      const markupInfo = await SELECT.one.from(MarkupDerivation).where({ billingSubType: request.billingSubType });
      const billDate = new Date(request.billAtDate);
      const yyyy = billDate.getFullYear().toString();
      const mm = String(billDate.getMonth() + 1).padStart(2, "0");
      const dd = String(billDate.getDate()).padStart(2, "0");
      const sapDate = `${yyyy}${mm}${dd}`;
      const payload = {
        Username: "ICOUSER",
        HeaderTxt: request.billingDescription,
        CompCode: request.billingAffiliateCompanyCode,
        DocDate: sapDate,
        PstngDate: sapDate,
        TransDate: sapDate,
        FiscYear: yyyy,
        FisPeriod: mm,
        DocType: "S6",
        RefDocNo: "BGI",
        ToAccountGL: [
          {
            ItemnoAcc: "0000000001",
            GlAccount: leftPad(markupInfo.fb01Debit, 10),
            ItemText: request.billingDescription,
            BusArea: "A",
            TradeId: leftPad(request.receivingAffiliateCompanyCode,6),
            SalesOrd: leftPad(request.salesOrderNumber, 10),
            SOrdItem: "000010"
          },
          {
            ItemnoAcc: "0000000002",
            GlAccount: leftPad(request.billingAffiliateCostElement, 10),
            ItemText: request.billingDescription,
            BusArea: "A",
            TradeId: leftPad(request.receivingAffiliateCompanyCode,6),
            CostCenter: leftPad(request.billingAffiliateCostCenter, 10)
          }
        ],
        ToCurrencyAmount: [
          {
            ItemnoAcc: "0000000001",
            Currency: request.currencyLocal,
            AmtDoccur: Number(request.actualAmountLocal ).toFixed(3)
          },
          {
            ItemnoAcc: "0000000002",
            Currency: request.currencyLocal,
            AmtDoccur: ( Number(request.actualAmountLocal) * -1).toFixed(3)
          }
        ]
      };
      console.log("FI Payload --->");
      console.log(JSON.stringify(payload));
      try {
        const result = await financeSrv.send({
          method: "POST",
          path: "/PostHeaderSet",
          data: payload
        });
        console.log("FI Response --->");
        console.log(JSON.stringify(result, null, 2));

        const fiNumber = result?.ObjKey || result?.d?.ObjKey;
        if (!fiNumber) return "ERROR";
        return fiNumber;
      } catch (error) {
        console.error("FINANCE POSTING FAILED");
        console.error(error);
        return "ERROR";
      }
    });

    this.on("sendSubmitterEmail", async req => {
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      if (!request) return "ERROR";
      const { submitterName } = await getUserNames(request);
      try {
        await sendEmail(
          request.createdBy,
          `ICNPB Request Submitted - ${request.requestNumber}`,
          buildSubmitEmail(request, submitterName)
        );
        return "SUCCESS";
      } catch (error) {
        console.error(error);
        return "ERROR";
      }
    });
    this.on("sendApproverEmail", async req => {
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      if (!request) return "ERROR";
      const { approverName } = await getUserNames(request);
      try {
        await sendEmail(
          request.receivingAffiliateContact,
          `Approval Required - ${request.requestNumber}`,
          buildApproverEmail(request, approverName)
        );
        return "SUCCESS";
      } catch (error) {
        console.error(error);
        return "ERROR";
      }
    });
    this.on("sendApprovalEmail", async req => {
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      if (!request) return "ERROR";
      const { submitterName } = await getUserNames(request);
      try {
        await sendEmail(
          request.createdBy,
          `ICNPB Request-${request.requestNumber} Approved`,
          buildApprovalEmail(request, submitterName)
        );
        return "SUCCESS";
      } catch (error) {
        console.error(error);
        return "ERROR";
      }
    });
    this.on("sendRejectionEmail", async req => {
      const { requestId } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      if (!request) return "ERROR";
      const { submitterName } = await getUserNames(request);
      try {
        await sendEmail(
          request.createdBy,
          `ICNPB Request-${request.requestNumber} Rejected`,
          buildRejectionEmail(request, submitterName)
        );
        return "SUCCESS";
      } catch (error) {
        console.error(error);
        return "ERROR";
      }
    });
    this.on("sendPOEmail", async req => {
      const { requestId, poNumber } = req.data;
      const request = await SELECT.one.from(ICNPBRequest).where({ ID: requestId });
      if (!request) return "ERROR";
      const { submitterName } = await getUserNames(request);
      try {
        await sendEmail(
          request.createdBy,
          `Purchase Order Created - ${poNumber}`,
          buildPOEmail(request, submitterName, poNumber)
        );
        return "SUCCESS";
      } catch (error) {
        console.error(error);
        return "ERROR";
      }
    });
    const leftPad = (value, length) => String(value).padStart(length, "0");
    //reusable function to trigger email
    const sendEmail = async (to, subject, body) => {
      const payload = [{
        TO: to,
        Subject: subject,
        Body: body
      }];

      console.log("Email Payload --->");
      console.log(JSON.stringify(payload, null, 2));

      const response = await emailSrv.send({
        method: "POST",
        path: "/http/emailnotify",
        data: payload
      });
      console.log("Email Response --->");
      console.log(response);
      return response;
    };
    const isEOMMinus5ToEOM = () => {
      const today = new Date();
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const eomMinus5 =
        new Date(lastDayOfMonth);

      eomMinus5.setDate(
        lastDayOfMonth.getDate() - 5
      );

      return (
        today >= eomMinus5 &&
        today <= lastDayOfMonth
      );
    };
    function buildSubmitEmail(request, submitterName) {
      return `
            <p>Hi ${submitterName},</p>

            <p>
            Your ICNPB request has been submitted successfully and is currently pending approval.
            </p>

            <p>
            <b>Request Number:</b> ${request.requestNumber}<br>
            <b>Billing Type:</b> ${request.billingType}<br>
            <b>Billing Sub Type:</b> ${request.billingSubType}<br>
            <b>Description:</b> ${request.billingDescription}<br>
            <b>Amount:</b> ${request.totalAmountCustomer} ${request.currencyCustomer}
            </p>

            <p>
            You will receive another notification once the approval process is completed.
            </p>

            <p>
            Thanks,<br>
            ICNPB Support Team
            </p>
            `;
    };
    function buildApproverEmail(request, approverName) {
      return `
              <p>Hi ${approverName},</p>

              <p>
              An ICNPB request requires your review and approval.
              </p>

              <p>
              <b>Request Number:</b> ${request.requestNumber}<br>
              <b>Billing Type:</b> ${request.billingType}<br>
              <b>Billing Sub Type:</b> ${request.billingSubType}<br>
              <b>Description:</b> ${request.billingDescription}<br>
              <b>Billing Affiliate:</b> ${request.billingAffiliateCompanyCode}<br>
              <b>Receiving Affiliate:</b> ${request.receivingAffiliateCompanyCode}<br>
              <b>Amount:</b> ${request.totalAmountCustomer} ${request.currencyCustomer}
              </p>

              <p>
              Please review the request in My Inbox.
              </p>

              <p>
              Thanks,<br>
              ICNPB Support Team
              </p>
              `;
    };
    function buildApprovalEmail(request, submitterName) {
      return `
            <p>Hi ${submitterName},</p>

            <p>
            Your ICNPB request has been approved.
            </p>

            <p>
            <b>Request Number:</b> ${request.requestNumber}<br>
            <b>Status:</b> Approved
            </p>

            <p>
            Thanks,<br>
            ICNPB Support Team
            </p>
            `;
    };
    function buildRejectionEmail(request, submitterName) {
      return `
          <p>Hi ${submitterName},</p>

          <p>
          Your ICNPB request has been rejected.
          </p>

          <p>
          <b>Request Number:</b> ${request.requestNumber}<br>
          <b>Status:</b> Rejected
          </p>

          <p>
          Please contact the approver for additional clarification.
          </p>

          <p>
          Thanks,<br>
          ICNPB Support Team
          </p>
          `;
    };
    function buildPOEmail(request, submitterName, poNumber) {
      return `
        <p>Hi ${submitterName},</p>

        <p>
        The following has been created successfully for your ICNPB request.
        </p>

        <p>
        <b>Request Number:</b> ${request.requestNumber}<br>
        <b>Purchase Order:</b> ${poNumber}<br>
        <b>Sales Order:</b> ${request.salesOrderNumber}<br>
        <b>FI Journal Voucher Number:</b> ${request.fiJournalVoucherNumber}<br>
        <b>Amount:</b> ${request.totalAmountCustomer} ${request.currencyCustomer}
        </p>

        <p>
        Thanks,<br>
        ICNPB Support Team
        </p>
    `;
    };
    const getUserNames = async (request) => {

      const submitter = await SELECT.one
        .from(Users)
        .where({
          emailId: request.createdBy
        });

      const approver = await SELECT.one
        .from(Users)
        .where({
          emailId: request.receivingAffiliateContact
        });

      return {
        submitterName:
          submitter?.displayName || request.createdBy,

        approverName:
          approver?.displayName || request.receivingAffiliateContact
      };
    };
    return super.init()
  }
}
