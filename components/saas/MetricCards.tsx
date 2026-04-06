"use client";

interface MetricCardsProps {
  metrics: {
    totalCompanies: number;
    activeCompanies: number;
    totalClients: number;
    activeClients: number;
    expiredClients: number;
    totalRevenue: number;
  };
}

export default function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      title: "Total Companies",
      value: metrics.totalCompanies.toString(),
      subtitle: `${metrics.activeCompanies} active`,
      color: "bg-blue-50 border-blue-200",
      valueColor: "text-blue-600",
    },
    {
      title: "Total Clients",
      value: metrics.totalClients.toString(),
      subtitle: `${metrics.activeClients} active, ${metrics.expiredClients} expired`,
      color: "bg-green-50 border-green-200",
      valueColor: "text-green-600",
    },
    {
      title: "Total Revenue",
      value: `PKR ${metrics.totalRevenue.toLocaleString()}`,
      subtitle: "Across all companies",
      color: "bg-purple-50 border-purple-200",
      valueColor: "text-purple-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`p-6 rounded-lg border ${card.color}`}
        >
          <h3 className="text-sm font-medium text-gray-600">{card.title}</h3>
          <p className={`text-3xl font-bold mt-2 ${card.valueColor}`}>
            {card.value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{card.subtitle}</p>
        </div>
      ))}
    </div>
  );
}
