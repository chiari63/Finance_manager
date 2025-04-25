/**
 * Tipagem para transações financeiras
 * Baseado nas informações da planilha do usuário
 */

import { TransactionFrequency, TransactionType } from '@/constants/Categories';

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: Date;
  categoryId: string;
  paymentMethodId: string;
  type: TransactionType;
  frequency: TransactionFrequency;
  description?: string;
  installment?: Installment;
  isManualBill?: boolean;
}

export interface Installment {
  current: number;
  total: number;
  originalAmount: number;
  startDate: Date;
}

export interface FinancialSummary {
  totalBalance: number;
  monthlyExpenses: number;
  monthlyIncome: number;
  cashBalance: number;
  foodVoucherBalance: number;
  fixedExpenses: number;
  variableExpenses: number;
  foodVoucherExpenses: number;
}

export interface CategorySummary {
  categoryId: string;
  amount: number;
  percentage: number;
}

export interface MonthlyData {
  month: number;
  year: number;
  transactions: Transaction[];
  summary: FinancialSummary;
  categorySummaries: CategorySummary[];
}

export interface BalanceAccount {
  id: string;
  name: string;
  balance: number;
  type: 'cash' | 'bank' | 'voucher' | 'investment';
  color?: string;
  icon?: string;
}

export interface ManualBill {
  id: string;
  amount: number;
  reference: {
    month: number;
    year: number;
  };
}

/**
 * Interface unificada para métodos de pagamento
 */
export interface PaymentMethod {
  id: string;
  name: string;
  type: 'credit' | 'debit' | 'pix' | 'digital' | 'food' | 'money' | 'transfer' | 'other';
  color: string;
  icon?: string;
  lastDigits?: string;
  dueDate?: number;
  isDefault?: boolean;
  lastUpdate?: Date | { toDate: () => Date } | null;
  creditLimit?: number;
  usedLimit?: number;
  brand?: string;
} 