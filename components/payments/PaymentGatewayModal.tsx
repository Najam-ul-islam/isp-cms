"use client";

import { useState } from "react";
import { CreditCard, X, Check } from "lucide-react";

interface PaymentGatewayModalProps {
  onClose: () => void;
  onSelect: (gateway: string) => void;
  amount: number;
}

export default function PaymentGatewayModal({
  onClose,
  onSelect,
  amount,
}: PaymentGatewayModalProps) {
  const [selectedGateway, setSelectedGateway] = useState<string>("");

  const gateways = [
    {
      id: "stripe",
      name: "Stripe",
      description: "Pay securely with credit/debit card",
      icon: "💳",
      color: "border-purple-200 bg-purple-50",
      supported: true,
    },
    {
      id: "jazzcash",
      name: "JazzCash",
      description: "Pay via JazzCash mobile wallet",
      icon: "📱",
      color: "border-red-200 bg-red-50",
      supported: true,
    },
    {
      id: "easypaisa",
      name: "EasyPaisa",
      description: "Pay via EasyPaisa mobile wallet",
      icon: "📲",
      color: "border-green-200 bg-green-50",
      supported: true,
    },
  ];

  const handleProceed = () => {
    if (selectedGateway) {
      onSelect(selectedGateway);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Select Payment Method
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Amount: PKR {amount.toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3 mb-6">
          {gateways.map((gateway) => (
            <button
              key={gateway.id}
              onClick={() => setSelectedGateway(gateway.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all ${
                selectedGateway === gateway.id
                  ? gateway.color
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-3xl">{gateway.icon}</div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{gateway.name}</p>
                  {selectedGateway === gateway.id && (
                    <Check className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {gateway.description}
                </p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={!selectedGateway}
            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            Proceed to Pay
          </button>
        </div>
      </div>
    </div>
  );
}
