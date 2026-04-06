interface TopExpensesListProps {
  data: {
    description: string;
    total: number;
    count: number;
    account: string;
  }[];
}

export default function TopExpensesList({ data }: TopExpensesListProps) {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Top Expenses
        </h3>
        <div className="text-center py-12">
          <p className="text-sm text-gray-500">No expense data available</p>
        </div>
      </div>
    );
  }

  const maxExpense = Math.max(...data.map((d) => d.total));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Top Expenses
      </h3>
      <div className="space-y-3">
        {data.map((expense, index) => {
          const percentage = maxExpense > 0 ? (expense.total / maxExpense) * 100 : 0;
          const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
          return (
            <div key={index} className="flex items-center gap-4">
              <div className="text-2xl">{medals[index]}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {expense.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {expense.count} transaction(s)
                    </p>
                  </div>
                  <span className="text-sm text-gray-600 font-medium">
                    PKR {expense.total.toLocaleString()}
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
