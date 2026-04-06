import crypto from "crypto";

export interface JazzCashPaymentInput {
  amount: number; // In paisa
  currency: string;
  description: string;
  orderId: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface JazzCashVerifyInput {
  txnid: string;
  amount: string;
  status: string;
}

export class JazzCashService {
  private merchantId = process.env.JAZZCASH_MERCHANT_ID || "";
  private password = process.env.JAZZCASH_PASSWORD || "";
  private hashKey = process.env.JAZZCASH_HASH_KEY || "";
  private apiUrl =
    process.env.JAZZCASH_API_URL ||
    "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchanttransaction/1.1/executeAPI/";

  async initiatePayment(input: JazzCashPaymentInput) {
    const txnRef = `JC_${input.orderId}_${Date.now()}`;
    const amount = (input.amount / 100).toFixed(2); // Convert to rupees
    const expiryDate = this.getExpiryDate();

    // Generate hash
    const hash = this.generateHash({
      amount,
      txnRef,
      expiryDate,
    });

    // For JazzCash, we return payment details for redirect
    // In production, this would call JazzCash API to generate payment URL
    return {
      sessionId: txnRef,
      url: `${this.apiUrl}?txnref=${txnRef}&amount=${amount}`,
      paymentUrl: this.generatePaymentUrl({
        ...input,
        txnRef,
        amount,
        expiryDate,
        hash,
      }),
    };
  }

  async verifyPayment(payload: JazzCashVerifyInput) {
    // Verify payment status with JazzCash API
    // In production, make API call to JazzCash to verify transaction

    if (payload.status !== "1") {
      throw new Error("Payment failed or cancelled");
    }

    // Verify hash
    const hash = this.generateVerifyHash({
      amount: payload.amount,
      txnRef: payload.txnid,
    });

    return {
      success: true,
      transactionId: payload.txnid,
      amount: parseFloat(payload.amount) * 100, // Convert back to paisa
      metadata: {},
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
    // Generate JazzCash payment URL
    // This is a placeholder - implement actual JazzCash integration
    return `${this.apiUrl}?${new URLSearchParams(params).toString()}`;
  }

  private generateHash(params: {
    amount: string;
    txnRef: string;
    expiryDate: string;
  }): string {
    const hashString = [
      this.hashKey,
      params.amount,
      "", // No description hash in sandbox
      "", // No currency info
      "", // No additional info
      params.amount, // Bill amount
      "", // No cashback
      this.merchantId,
      "", // No merchant reference
      params.txnRef,
      "", // No store code
      "", // No franchise code
      "", // No payment type
      "", // No customer email
      "", // No customer mobile
      "", // No wallet hash
      "", // No signature
      params.expiryDate,
    ].join("&");

    return crypto
      .createHmac("sha256", this.hashKey)
      .update(hashString)
      .digest("hex")
      .toUpperCase();
  }

  private generateVerifyHash(params: {
    amount: string;
    txnRef: string;
  }): string {
    const hashString = [
      this.hashKey,
      params.amount,
      "", // Currency
      params.amount, // Bill amount
      this.merchantId,
      "", // Additional info
      params.txnRef,
      "", // Signature
    ].join("&");

    return crypto
      .createHmac("sha256", this.hashKey)
      .update(hashString)
      .digest("hex")
      .toUpperCase();
  }

  private verifyWebhookSignature(body: any): boolean {
    // Verify webhook signature
    // In production, implement actual signature verification
    return true;
  }

  private getExpiryDate(): string {
    const date = new Date();
    date.setMinutes(date.getMinutes() + 15); // 15 minutes from now
    return date.toISOString().replace(/[-:]/g, "").slice(0, 14);
  }
}

export const jazzcashService = new JazzCashService();
