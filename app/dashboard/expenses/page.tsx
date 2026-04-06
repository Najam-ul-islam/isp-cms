'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, Plus, Search, Calendar, FileText, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description?: string;
  receipt?: string;
}

const ITEMS_PER_PAGE = 15;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const router = useRouter();

  const categories = [
    'Electricity', 'Rent', 'Equipment', 'Maintenance', 'Salaries',
    'Marketing', 'Transportation', 'Software', 'Office Supplies', 'Other'
  ];

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        const authCheck = await fetch('/api/auth/check', {
          method: 'GET',
          credentials: 'include'
        });

        if (authCheck.status === 401) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/expenses', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setExpenses(data);
        } else if (response.status === 401) {
          router.push('/login');
        }
      } catch (error) {
        console.error('Error fetching expenses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [router]);

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredExpenses.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedExpenses = filteredExpenses.slice(startIndex, endIndex);

  const totalExpenses = paginatedExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handleAddExpense = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        const response = await fetch(`/api/expenses/${id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          setExpenses(expenses.filter(expense => expense.id !== id));
        } else if (response.status === 401) {
          router.push('/login');
        } else {
          alert('Failed to delete expense');
        }
      } catch (error) {
        console.error('Error deleting expense:', error);
        alert('Failed to delete expense');
      }
    }
  };

  const handleSaveExpense = async (expenseData: Partial<Expense>) => {
    try {
      if (editingExpense) {
        const response = await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expenseData),
        });

        if (response.ok) {
          const updatedExpense = await response.json();
          setExpenses(expenses.map(exp =>
            exp.id === editingExpense.id ? updatedExpense : exp
          ));
          setShowForm(false);
        } else if (response.status === 401) {
          router.push('/login');
        } else {
          alert('Failed to update expense');
        }
      } else {
        const response = await fetch('/api/expenses', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(expenseData),
        });

        if (response.ok) {
          const newExpense = await response.json();
          setExpenses([...expenses, newExpense]);
          setShowForm(false);
        } else if (response.status === 401) {
          router.push('/login');
        } else {
          alert('Failed to add expense');
        }
      }
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Failed to save expense');
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  if (loading) {
    return <ExpensesSkeleton />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold bg-linear-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Expenses
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track and manage your business expenses
          </p>
        </div>
        <button
          onClick={handleAddExpense}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/25 transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-500">Page Total</p>
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold">
            Rs {totalExpenses.toLocaleString("en-PK")}
          </div>
          <p className="text-xs text-slate-400 mt-1">{paginatedExpenses.length} items</p>
        </div>

        <div className="p-4 bg-white rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-500">Total Records</p>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold">
            {filteredExpenses.length}
          </div>
          <p className="text-xs text-slate-400 mt-1">Page {currentPage} of {totalPages || 1}</p>
        </div>

        <div className="p-4 bg-white rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs text-slate-500">Avg. Expense</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold">
            Rs {paginatedExpenses.length ? Math.round(totalExpenses / paginatedExpenses.length).toLocaleString("en-PK") : '0'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="relative sm:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-linear-to-r from-purple-50/50 to-transparent">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <DollarSign className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800 text-sm">All Expenses</h2>
              <p className="text-xs text-slate-500">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredExpenses.length)} of {filteredExpenses.length}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/80">
              <tr className="text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3 hidden lg:table-cell">Description</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedExpenses.length > 0 ? (
                paginatedExpenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 text-sm">{expense.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {new Date(expense.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-rose-600 text-sm">
                        Rs {expense.amount.toLocaleString("en-PK")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm hidden lg:table-cell">
                      {expense.description || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleEditExpense(expense)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit expense"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <div className="p-3 bg-slate-100 rounded-full">
                        <DollarSign className="w-10 h-10 opacity-50" />
                      </div>
                      <div>
                        <p className="font-semibold">No expenses found</p>
                        <p className="text-sm mt-0.5">
                          {searchTerm ? `No results for "${searchTerm}"` : 'Add your first expense'}
                        </p>
                      </div>
                      {!searchTerm && (
                        <button
                          onClick={handleAddExpense}
                          className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium text-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Expense
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-200 hover:bg-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              {filteredExpenses.length} total
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Expense Modal */}
      {showForm && (
        <ExpenseFormModal
          expense={editingExpense}
          onClose={() => setShowForm(false)}
          onSave={handleSaveExpense}
          categories={categories}
        />
      )}
    </div>
  );
}

// Expense Form Modal Component
function ExpenseFormModal({
  expense,
  onClose,
  onSave,
  categories
}: {
  expense: Expense | null;
  onClose: () => void;
  onSave: (data: Partial<Expense>) => void;
  categories: string[];
}) {
  const [formData, setFormData] = useState({
    title: expense?.title || '',
    amount: expense?.amount || 0,
    category: expense?.category || categories[0],
    date: expense?.date || new Date().toISOString().split('T')[0],
    description: expense?.description || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? Number(value) : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {expense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Enter expense title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
              placeholder="Enter expense description (optional)"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
            >
              {expense ? 'Update' : 'Add'} Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ==================== SKELETON LOADING ==================== */

function ExpensesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-72 bg-slate-100 dark:bg-gray-800 rounded" />
        </div>
        <div className="h-10 w-40 bg-slate-200 dark:bg-gray-700 rounded-xl" />
      </div>

      {/* Stats Skeleton */}
      <div className="grid md:grid-cols-3 gap-5">
        {[1, 2, 3].map((item) => (
          <div key={item} className="p-5 bg-white dark:bg-gray-800 rounded-xl border">
            <div className="flex justify-between items-center mb-3">
              <div className="h-4 w-24 bg-slate-100 dark:bg-gray-700 rounded" />
              <div className="w-10 h-10 bg-slate-100 dark:bg-gray-700 rounded-xl" />
            </div>
            <div className="h-8 w-16 bg-slate-200 dark:bg-gray-600 rounded" />
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-slate-200 dark:border-gray-700">
        <div className="flex gap-4">
          <div className="flex-1 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-48 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-40 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
          <div className="w-40 h-10 bg-slate-100 dark:bg-gray-900 rounded-xl" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700">
          <div className="h-5 w-40 bg-slate-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-100 dark:bg-gray-900 rounded" />
                <div className="h-3 w-24 bg-slate-50 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-4 w-20 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-4 w-24 bg-slate-100 dark:bg-gray-900 rounded" />
              <div className="h-8 w-20 bg-slate-100 dark:bg-gray-900 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}