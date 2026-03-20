import React from "react"

interface FinanceCardProps {
  title: string
  amount: number
  type: "income" | "due" | "upcoming"
  icon: React.ReactNode
  onClick?: () => void
}

export default function FinCard({
  title,
  amount,
  type,
  icon,
  onClick
}: FinanceCardProps) {

  const styles = {
    income: "text-emerald-600 bg-emerald-50",
    due: "text-red-600 bg-red-50",
    upcoming: "text-amber-600 bg-amber-50"
  }

  return (
    <div
      className={`p-5 bg-white rounded-xl border shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] transition-transform' : ''}`}
      onClick={onClick}
    >

      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-slate-500">{title}</p>

        <div className={`p-2 rounded-lg ${styles[type]}`}>
          {icon}
        </div>
      </div>

      <div className="text-2xl font-bold">
        Rs {amount.toLocaleString("en-PK")}
      </div>

    </div>
  )
}