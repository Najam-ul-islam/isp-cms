'use client';

import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartDataPoint {
  label: string;
  revenue: number;
  expenses: number;
  newUsers: number;
}

interface ChartCardProps {
  title: string;
  type: 'line' | 'bar';
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    tension?: number;
  }[];
}

export default function ChartCard({ title, type, labels, datasets }: ChartCardProps) {
  const chartData = {
    labels,
    datasets: datasets.map((dataset, index) => ({
      label: dataset.label,
      data: dataset.data,
      backgroundColor: dataset.backgroundColor || `rgba(${100 + index * 50}, 99, 132, 0.2)`,
      borderColor: dataset.borderColor || `rgba(${100 + index * 50}, 99, 132, 1)`,
      borderWidth: 2,
      tension: dataset.tension !== undefined ? dataset.tension : 0.4,
      fill: type === 'line',
    }))
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">{title}</h3>
      {type === 'line' ? (
        <Line data={chartData} options={options} />
      ) : (
        <Bar data={chartData} options={options} />
      )}
    </div>
  );
}