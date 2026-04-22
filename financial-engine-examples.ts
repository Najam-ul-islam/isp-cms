// Example usage for the core client order scenario
const clientOrderData: FinancialData = {
  internetPackage: 1500,
  router: 4000,
  cable: 500,
  installation: 500,
  clientPaid: 2000,
};

const summary = calculateFinancialSummary(clientOrderData);
console.log(summary);
// Output: { totalPayable: 0, totalReceivable: 4500, totalExpenses: 0, pendingRecovery: 0, otherIncome: 500 }

// Example for inventory purchase case
const inventoryData: FinancialData = {
  inventoryPurchase: 100000,
  inventoryPaid: 50000,
};

const inventorySummary = calculateFinancialSummary(inventoryData);
console.log(inventorySummary);
// Output: { totalPayable: 50000, totalReceivable: 0, totalExpenses: 50000, pendingRecovery: 0, otherIncome: 0 }

// Example for product sale case
const productSaleData: FinancialData = {
  productSalePrice: 4000,
  clientPaid: 2000, // Assuming this is the payment for the sale
};

const productSummary = calculateFinancialSummary(productSaleData);
console.log(productSummary);
// Output: { totalPayable: 0, totalReceivable: 2000, totalExpenses: 0, pendingRecovery: 0, otherIncome: 0 }