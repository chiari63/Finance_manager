import { useMemo } from 'react';
import { Transaction } from '@/types/TransactionTypes';
import { TransactionType } from '@/constants/Categories';
import { getTimestamp, isInMonth } from '@/utils/dateUtils';

export function useTransactionFilters(transactions: Transaction[]) {
  // Filtrar transações de receita
  const incomeTransactions = useMemo(() => {
    return transactions.filter(t => t.type === TransactionType.INCOME);
  }, [transactions]);
  
  // Filtrar transações de despesa
  const expenseTransactions = useMemo(() => {
    return transactions.filter(t => t.type === TransactionType.EXPENSE);
  }, [transactions]);
  
  // Ordenar transações por data (mais recentes primeiro)
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      return getTimestamp(b.date) - getTimestamp(a.date);
    });
  }, [transactions]);
  
  // Obter as transações mais recentes (limitadas a um número)
  const getRecentTransactions = (limit: number) => {
    return sortedTransactions.slice(0, limit);
  };
  
  // Filtrar transações por método de pagamento
  const filterByPaymentMethod = (methodId: string) => {
    return transactions.filter(t => t.paymentMethodId === methodId);
  };
  
  // Filtrar transações por categoria
  const filterByCategory = (categoryId: string) => {
    return transactions.filter(t => t.categoryId === categoryId);
  };
  
  // Filtrar transações por mês
  const filterByMonth = (month: number, year: number) => {
    return transactions.filter(t => isInMonth(t.date, month, year));
  };
  
  return {
    incomeTransactions,
    expenseTransactions,
    sortedTransactions,
    getRecentTransactions,
    filterByPaymentMethod,
    filterByCategory,
    filterByMonth
  };
} 