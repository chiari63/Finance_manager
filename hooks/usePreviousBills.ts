import { useMemo } from 'react';
import { TransactionType } from '@/constants/Categories';
import { Transaction, PaymentMethod } from '@/types/TransactionTypes';

// Interface para representar uma fatura do mês anterior
interface BillSummary {
  id: string;
  name: string;
  lastDigits?: string;
  color?: string;
  total: number;
  manualExists: boolean;
}

/**
 * Hook personalizado para obter faturas do mês anterior
 * 
 * @param creditCards Lista de cartões de crédito
 * @param transactions Lista de transações
 * @param currentMonth Mês e ano atuais
 * @param forceUpdate Timestamp para forçar atualização dos dados
 */
export const usePreviousBills = (
  creditCards: PaymentMethod[],
  transactions: Transaction[],
  currentMonth: { month: number; year: number },
  forceUpdate?: number
) => {
  // Memo para armazenar as faturas do mês anterior
  const previousMonthBills = useMemo(() => {
    // Se não tiver transações ou cartões, retorna lista vazia
    if (transactions.length === 0 || creditCards.length === 0) {
      return [];
    }
    
    // Obter o mês e ano anteriores
    let prevMonth = currentMonth.month - 1;
    let prevYear = currentMonth.year;
    
    if (prevMonth < 0) {
      prevMonth = 11; // Dezembro
      prevYear -= 1;
    }
    
    // Inicializar o resultado com todos os cartões
    const result: BillSummary[] = creditCards.map(card => ({
      id: card.id,
      name: card.name,
      lastDigits: card.lastDigits,
      color: card.color,
      total: 0,
      manualExists: false
    }));
    
    // Buscar faturas manuais (pré-filtro para otimização)
    const manualBills = transactions.filter(t => {
      // Verificar se a data é um objeto Date ou tem método toDate()
      const date = t.date instanceof Date ? t.date : (t.date as any).toDate();
      return t.isManualBill === true &&
             date.getMonth() === prevMonth &&
             date.getFullYear() === prevYear &&
             t.type === TransactionType.EXPENSE;
    });
    
    let countProcessed = 0;
    let countManualFound = 0;
    let countRegularFound = 0;
    
    // Processar as transações
    transactions.forEach(transaction => {
      // Verificar se a transação é uma despesa
      if (transaction.type !== TransactionType.EXPENSE) {
        return;
      }
      
      countProcessed++;
      
      // Obter a data da transação
      const transactionDate = transaction.date instanceof Date ? 
        transaction.date : (transaction.date as any).toDate();
      
      // Verificar se é do mês anterior
      const isCorrectMonth = transactionDate.getMonth() === prevMonth;
      const isCorrectYear = transactionDate.getFullYear() === prevYear;
      
      if (!isCorrectMonth || !isCorrectYear) {
        return;
      }
      
      // Obter o método de pagamento da transação
      const paymentMethodId = transaction.paymentMethodId;
      const isManualBill = transaction.isManualBill === true || 
                          (transaction.title && transaction.title.toLowerCase().includes('fatura manual'));
      
      // Tentar encontrar o cartão correspondente
      const billIndex = result.findIndex(b => b.id === paymentMethodId);
      
      // Se encontrou um cartão correspondente
      if (billIndex >= 0) {
        // Atualizar o total da fatura
        result[billIndex].total += transaction.amount;
        
        // Verificar se é uma fatura manual
        if (isManualBill) {
          result[billIndex].manualExists = true;
          countManualFound++;
        } else {
          countRegularFound++;
        }
      }
    });
    
    // Filtrar para retornar apenas faturas com valor > 0
    return result.filter(bill => bill.total > 0);
  }, [creditCards, transactions, currentMonth, forceUpdate]);
  
  // Calcular o total de todas as faturas
  const totalPreviousBill = useMemo(() => {
    return previousMonthBills.reduce((sum, bill) => sum + bill.total, 0);
  }, [previousMonthBills]);
  
  return { previousMonthBills, totalPreviousBill };
}; 