'use client';

import { useState } from 'react';
import { X, Shield, ShieldCheck, UserCheck } from 'lucide-react';

interface ChangeRoleModalProps {
  adminName: string;
  currentRole: string;
  onClose: () => void;
  onChangeRole: (newRole: string) => Promise<void>;
}

export default function ChangeRoleModal({
  adminName,
  currentRole,
  onClose,
  onChangeRole,
}: ChangeRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      value: 'SUPER_ADMIN',
      label: 'Super Admin',
      icon: ShieldCheck,
      description: 'Full access to all companies and settings',
      color: 'amber' as const,
    },
    {
      value: 'ADMIN',
      label: 'Admin',
      icon: Shield,
      description: 'Full access to their own company',
      color: 'blue' as const,
    },
    {
      value: 'EMPLOYEE',
      label: 'Employee',
      icon: UserCheck,
      description: 'Limited access, view-only for most features',
      color: 'green' as const,
    },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onChangeRole(selectedRole);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: 'amber' | 'blue' | 'green', isSelected: boolean) => {
    const colorMap = {
      amber: isSelected
        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
        : 'border-gray-200 dark:border-gray-700 hover:border-amber-300',
      blue: isSelected
        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300',
      green: isSelected
        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
        : 'border-gray-200 dark:border-gray-700 hover:border-green-300',
    };
    return colorMap[color];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Change Role
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Update permissions for {adminName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {roles.map((role) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.value;
            const borderClasses = getColorClasses(role.color, isSelected);

            return (
              <button
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${borderClasses}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      isSelected
                        ? `bg-${role.color}-100 dark:bg-${role.color}-900/40`
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        isSelected
                          ? `text-${role.color}-600 dark:text-${role.color}-400`
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {role.label}
                      </span>
                      {isSelected && (
                        <div
                          className={`w-5 h-5 rounded-full bg-${role.color}-500 flex items-center justify-center`}
                        >
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {role.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || selectedRole === currentRole}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                Update Role
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
