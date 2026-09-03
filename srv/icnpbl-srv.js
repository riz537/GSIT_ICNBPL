const cds = require('@sap/cds');
const { SELECT } = require('@sap/cds/lib/ql/cds-ql');

module.exports = class IcNpblService extends cds.ApplicationService {
  async init() {

    const { A_PurchaseOrder, ICNPBAttachment, ICCustomer, ICVendor, ExchangeRateConversion, CostCenter, ICNPBRequest, Users, BillingTypes, BillingSubTypeDerivation, AffiliateMaster, MarkupDerivation } = cds.entities('IcNpblService')

    const mdSrv = await cds.connect.to('masterdata_edmx');
    const poSrv = await cds.connect.to('API_PURCHASEORDER_PROCESS_SRV_edmx');
    const emailSrv = await cds.connect.to("email_iflow");
    const trackingSrv = await cds.connect.to("ZI_PO_DOC_TRACKING_edmx");




    this.on('READ', [ICCustomer, ICVendor, CostCenter], async req => {
      console.log("Inside READ --> req.query below");
      console.log(JSON.stringify(req.query, null, 2));
      return mdSrv.run(req.query);
    });

    // this.on('READ', [POTracking], async req => {
    //   console.log("Inside READ --> req.query below");
    //   console.log(JSON.stringify(req.query, null, 2));
    //   const result = await getpoSrv.run(req.query);
    //   await INSERT.into('POTrackingLocal').entries(result);
    //   return result;
    // });

    this.on('CREATE', A_PurchaseOrder, async req => {
      console.log("Inside CREATE --> A_PurchaseOrder");
      console.log(JSON.stringify(req.query, null, 2));
      return poSrv.run(req.query);
    });

    // this.on('triggerPofetch', async req => {

    //   const data = await getpoSrv.run(SELECT.from('PurchaseOrderDocTracking').limit(5))
    //   await UPSERT.into('POTrackingLocal').entries(data);
    //   console.log("complete fetch:",JSON.stringify(data, null, 2));
    //   return "success";
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
        req.error(404, 'Request not found');
      }
      //is user exist
      const loggedInUser = req.user.id;
      const user = await SELECT.one.from(Users).where({ emailId: loggedInUser });
      if (!user) {
        req.error(
          403,
          "You are not authorized to raise an ICNPB request."
        );
      }
      const billingSubTypeInfo = await SELECT.one
        .from(BillingSubTypeDerivation)
        .where({
          billingSubType: request.billingSubType
        });

      const threshold = Number(billingSubTypeInfo.threshold || 0);

      const requestAmount =
        Number(request.totalAmountLocal || 0);

      if (requestAmount <= threshold) {
        req.error(
          400,
          `IC NPB Billing requests can only be submitted when the request amount exceeds the configured threshold amount of ${threshold}.`
        );
      }
      // BPA payload

      const payload = {
        "definitionId": "us10.lly-sbx.icnpb.iCNPBProcess",
        "context": {
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
      } catch (error) {
        console.log("inside error");
        console.log(error);
        if (error.reason?.response) {
          console.log("HTTP Status code:" + error.reason.response.status);
          console.log("Response Details:" + error.reason.response.data);
        }

      }
      //email trigger
      const { submitterName, approverName } = await getUserNames(request);
      try {
        // Email to Submitter
        await sendEmail(
          request.createdBy,
          `ICNPB Request Submitted - ${request.requestNumber}`,
          buildSubmitEmail(request, submitterName)
        );
        // Email to Approver
        await sendEmail(
          request.receivingAffiliateContact,
          `Approval Required - ${request.requestNumber}`,
          buildApproverEmail(request, approverName)
        );
      } catch (emailError) {
        console.error("Email Error --->");
        console.error(emailError);
      }


    });
    this.on('updateRequestStatus', async req => {
      const { requestId, status } = req.data;
      const count = await UPDATE(ICNPBRequest)
        .set({
          status: status
        })
        .where({
          ID: requestId
        });

      if (count === 0) {
        return "ERROR";
      }

      const request = await SELECT.one
        .from(ICNPBRequest)
        .where({
          ID: requestId
        });
      const { submitterName } = await getUserNames(request);
      try {
        if (status === "APPROVED") {
          await sendEmail(
            request.createdBy,
            `ICNPB Request-${request.requestNumber} Approved`,
            buildApprovalEmail(request, submitterName)
          );
        }
        if (status === "REJECTED") {
          await sendEmail(
            request.createdBy,
            `ICNPB Request-${request.requestNumber} Rejected`,
            buildRejectionEmail(request, submitterName)
          );
        }
      } catch (emailError) {
        console.error(emailError);
      }
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
      var poNumber, soNumber;
      try {
        const result = await poSrv.send({
          method: 'POST',
          path: '/A_PurchaseOrder',
          data: payload
        });
        console.log("PO CREATION Response---->");
        console.log(result);

        poNumber = result.PurchaseOrder;
        if (!poNumber) {
          throw new Error("PO Number not returned from S4");
        }
        await UPDATE(ICNPBRequest)
          .set({
            purchaseOrderNumber: poNumber,
            status: 'POSTED'
          })
          .where({
            ID: requestId
          });
        //return "SUCCESS";
      } catch (error) {
        console.error("PO CREATION FAILED");
        console.error(error);
        await UPDATE(ICNPBRequest)
          .set({
            status: 'ERROR',
            errorMessage:
              error.message?.substring(0, 500) ||
              'PO Creation Failed'
          })
          .where({
            ID: requestId
          });
        return "ERROR";
      }
      //trigger an SO call to get the SO number 
      console.log("before set time out -->");

      await new Promise(resolve =>
        setTimeout(resolve, 5000)
      );
      console.log("after time out and before SO Trigger Response -->");
      try {
        const soResult = await trackingSrv.send({
          method: 'GET',
          path:
            `/SalesDebitMemoFlow?$filter=PurchaseOrder eq '${poNumber}'`
        });

        console.log("SO Response -->");
        console.log(JSON.stringify(soResult));
        soNumber = soResult?.[0]?.SalesOrder;
        await UPDATE(ICNPBRequest)
          .set({
            salesOrderNumber: soResult?.[0]?.SalesOrder,
            status: 'POSTED'
          })
          .where({
            ID: requestId
          });
      } catch (error) {
        console.error("SO CREATION FAILED");
        console.error(error);
        await UPDATE(ICNPBRequest)
          .set({
            status: 'ERROR',
            errorMessage:
              error.message?.substring(0, 500) ||
              'SO Creation Failed'
          })
          .where({
            ID: requestId
          });
        return "ERROR";
      }
      //send email code below
      const { submitterName } = await getUserNames(request);
      try {
        await sendEmail(
          request.createdBy,
          `Purchase Order Created - ${poNumber}`,
          buildPOEmail(request, submitterName, poNumber)
        );
      } catch (emailError) {
        console.log("emailErrorafter posting to sap");
        console.error(emailError);
      }
      return "SUCCESS";
    });



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
        A Purchase Order has been created successfully for your ICNPB request.
        </p>

        <p>
        <b>Request Number:</b> ${request.requestNumber}<br>
        <b>Purchase Order:</b> ${poNumber}<br>
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
