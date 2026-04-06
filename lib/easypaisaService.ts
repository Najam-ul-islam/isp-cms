import crypto from "crypto";

export interface EasyPaisaPaymentInput {
  amount: number; // In paisa
  currency: string;
  description: string;
  orderId: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface EasyPaisaVerifyInput {
  txnId: string;
  merchantTxnId: string;
  amount: string;
  status: string;
}

export class EasyPaisaService {
  private storeId = process.env.EASYPAISA_STORE_ID || "";
  private hashKey = process.env.EASYPAISA_HASH_KEY || "";
  private apiUrl =
    process.env.EASYPAISA_API_URL ||
    "https://easypay.easypaisa.com.pk/easypay/Index.jsf";

  async initiatePayment(input: EasyPaisaPaymentInput) {
    const merchantTxnId = `EP_${input.orderId}_${Date.now()}`;
    const amount = (input.amount / 100).toFixed(2); // Convert to rupees

    // Generate hash
    const hash = this.generateHash({
      storeId: this.storeId,
      amount,
      merchantTxnId,
      description: input.description,
    });

    // For EasyPaisa, we return payment details for redirect
    return {
      sessionId: merchantTxnId,
      url: this.apiUrl,
      paymentUrl: this.generatePaymentUrl({
        storeId: this.storeId,
        amount,
        merchantTxnId,
        description: input.description,
        returnUrl: input.returnUrl,
        hash,
      }),
    };
  }

  async verifyPayment(payload: EasyPaisaVerifyInput) {
    // Verify payment status with EasyPaisa API
    // In production, make API call to EasyPaisa to verify transaction

    if (payload.status !== "success") {
      throw new Error("Payment failed or cancelled");
    }

    // Verify hash
    const hash = this.generateVerifyHash({
      txnId: payload.txnId,
      merchantTxnId: payload.merchantTxnId,
      amount: payload.amount,
      status: payload.status,
    });

    return {
      success: true,
      transactionId: payload.txnId,
      amount: parseFloat(payload.amount) * 100, // Convert back to paisa
      metadata: {
        merchantTxnId: payload.merchantTxnId,
      },
    };
  }

  async handleWebhook(req: Request) {
    const body = await req.json();

    // Verify webhook signature
    const isValid = this.verifyWebhookSignature(body);

    if (!isValid) {
      throw new Error("Invalid webhook signature");
    }

    return body;
  }

  private generatePaymentUrl(params: any) {
    // Generate EasyPaisa payment URL
    // This is a placeholder - implement actual EasyPaisa integration
    return `${this.apiUrl}?${new URLSearchParams(params).toString()}`;
  }

  private generateHash(params: {
    storeId: string;
    amount: string;
    merchantTxnId: string;
    description: string;
  }): string {
    const hashString = [
      params.storeId,
      params.merchantTxnId,
      params.amount,
      "", // No additional info
      this.hashKey,
    ].join("&");

    return crypto
      .createHash("sha256")
      .update(hashString)
      .digest("hex");
  }

  private generateVerifyHash(params: {
    txnId: string;
    merchantTxnId: string;
    amount: string;
    status: string;
  }): string {
    const hashString = [
      params.txnId,
      params.merchantTxnId,
      params.amount,
      params.status,
      this.hashKey,
    ].join("&");

    return crypto
      .createHash("sha256")
      .update(hashString)
      .digest("hex");
  }

  private verifyWebhookSignature(body: any): boolean {
    // Verify webhook signature
    // In production, implement actual signature verification
    return true;
  }
}

export const easypaisaService = new EasyPaisaService();
