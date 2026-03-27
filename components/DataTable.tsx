import React from 'react';

interface ResponsiveTableProps {
  headers: { key: string; label: string; className?: string }[];
  data: any[];
  renderRow: (item: any) => React.ReactNode;
  renderCell?: (item: any, key: string) => React.ReactNode;
  className?: string;
  onRowClick?: (item: any) => void;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  headers,
  data,
  renderRow,
  renderCell,
  className = '',
  onRowClick
}) => {
  return (
    <div className="w-full">
      {/* Desktop/Tablet View - Traditional Table */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-200">
        <table className={`min-w-full divide-y divide-gray-200 ${className}`}>
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={header.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${header.className || ''}`}
                >
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr
                key={index}
                className={`transition-colors hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(item)}
              >
                {renderRow(item)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Shows as cards on small screens */}
      <div className="sm:hidden grid grid-cols-1 gap-3">
        {data.map((item, index) => (
          <div
            key={index}
            className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
            onClick={() => onRowClick && onRowClick(item)}
          >
            <div className="space-y-2">
              {headers.map((header) => (
                <div key={header.key} className="flex justify-between items-start">
                  <span className="font-medium text-gray-700 text-sm">{header.label}:</span>
                  <span className="ml-2 text-gray-600 text-sm text-right flex-1 wrap-break-word pl-2">
                    {renderCell ? renderCell(item, header.key) : item[header.key]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};