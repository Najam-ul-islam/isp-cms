type FinancialData = {
  internetPackage?: number;
  router?: number;
  cable?: number;
  installation?: number;
  clientPaid?: number;
  inventoryPurchase?: number;
  inventoryPaid?: number;
  productCostPrice?: number;
  productSalePrice?: number;
};

type FinancialSummary = {
  totalPayable: number;
  totalReceivable: number;
  totalExpenses: number;
  pendingRecovery: number;
  otherIncome: number;
};

function calculateFinancialSummary(data: FinancialData): FinancialSummary {
  // Normalize undefined values to 0
  const internetPackage = data.internetPackage || 0;
  const router = data.router || 0;
  const cable = data.cable || 0;
  const installation = data.installation || 0;
  const clientPaid = data.clientPaid || 0;
  const inventoryPurchase = data.inventoryPurchase || 0;
  const inventoryPaid = data.inventoryPaid || 0;
  const productSalePrice = data.productSalePrice || 0;

  // Calculate total one-time charges
  const totalOneTime = router + cable + installation;

  // Initialize variables for client billing allocation
  let paid = clientPaid;
  let pendingRecovery = 0;
  let receivableFromBilling = 0;
  let otherIncome = 0;

  // Payment allocation logic
  if (paid >= internetPackage) {
    // Fully settle internet package
    paid -= internetPackage;

    // Allocate remaining payment to one-time charges
    if (paid >= totalOneTime) {
      otherIncome = totalOneTime;
      // Overpayment goes to total receivable
      receivableFromBilling = paid - totalOneTime;
    } else {
      otherIncome = paid;
      receivableFromBilling = totalOneTime - paid;
    }
  } else {
    // Partially settle internet package
    pendingRecovery = internetPackage - paid;
    paid = 0;
    // All one-time charges remain unpaid
    receivableFromBilling = totalOneTime;
  }

  // Inventory purchase logic
  const totalExpenses = inventoryPaid;
  const totalPayable = Math.max(0, inventoryPurchase - inventoryPaid);

  // Product sale logic
  const receivableFromSale = Math.max(0, productSalePrice - clientPaid);

  // Aggregate total receivable
  const totalReceivable = receivableFromBilling + receivableFromSale;

  return {
    totalPayable,
    totalReceivable,
    totalExpenses,
    pendingRecovery,
    otherIncome,
  };
}