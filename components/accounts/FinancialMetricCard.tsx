interface FinancialMetricCardProps {
  title: string;
  value: number;
  icon: string;
  color: "green" | "blue" | "purple" | "orange" | "red" | "cyan";
  description: string;
}

const colorMap = {
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-600",
    label: "text-green-700",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-600",
    label: "text-blue-700",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-600",
    label: "text-purple-700",
  },
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-600",
    label: "text-orange-700",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-600",
    label: "text-red-700",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    text: "text-cyan-600",
    label: "text-cyan-700",
  },
};

export default function FinancialMetricCard({
  title,
  value,
  icon,
  color,
  description,
}: FinancialMetricCardProps) {
  const colors = colorMap[color];

  return (
    <div className={`p-6 rounded-lg border ${colors.border} ${colors.bg}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.label}`}>{title}</p>
          <p className={`text-3xl font-bold mt-2 ${colors.text}`}>
            PKR {value.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">{description}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
