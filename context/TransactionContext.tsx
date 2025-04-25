import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
  Transaction, 
  FinancialSummary, 
  CategorySummary, 
  MonthlyData, 
  BalanceAccount,
  ManualBill
} from '@/types/TransactionTypes';
import { 
  TransactionFrequency, 
  TransactionType, 
  CATEGORIES,
  Category
} from '@/constants/Categories';
import { PaymentMethod } from '@/types/TransactionTypes';
import { auth, db } from '@/config/firebase';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  Timestamp, 
  serverTimestamp,
  onSnapshot,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

interface TransactionContextProps {
  currentMonth: { month: number; year: number };
  transactions: Transaction[];
  financialSummary: FinancialSummary;
  categorySummaries: CategorySummary[];
  accounts: BalanceAccount[];
  installedPayments: Transaction[];
  paymentMethods: PaymentMethod[];
  isLoading: boolean;
  error: string | null;
  
  // Ações
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  filterTransactionsByCategory: (categoryId: string) => Transaction[];
  filterTransactionsByType: (type: TransactionType) => Transaction[];
  filterTransactionsByFrequency: (frequency: TransactionFrequency) => Transaction[];
  changeMonth: (month: number, year: number) => void;
  addAccount: (account: Omit<BalanceAccount, 'id'>) => Promise<void>;
  updateAccount: (account: BalanceAccount) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  loadAccounts: () => Promise<unknown>;
  loadPaymentMethods: () => Promise<unknown>;
  clearTransactions: () => Promise<void>;
  addManualBill: (bills: ManualBill[]) => Promise<void>;
}

// Resumo financeiro inicial vazio
const initialSummary: FinancialSummary = {
  totalBalance: 0,
  monthlyExpenses: 0,
  monthlyIncome: 0,
  cashBalance: 0,
  foodVoucherBalance: 0,
  fixedExpenses: 0,
  variableExpenses: 0,
  foodVoucherExpenses: 0
};

// Dados de exemplo para modo offline/desenvolvimento
const mockTransactions: any[] = [
  {
    id: 'mock-transaction-1',
    title: 'Salário',
    amount: 3000,
    type: TransactionType.INCOME,
    categoryId: 'salary',
    category: CATEGORIES.find(c => c.id === 'salary'),
    date: new Date(),
    paymentMethodId: 'transfer',
    account: {
      id: 'mock-account-1',
      name: 'Conta Corrente',
      type: 'bank'
    },
    frequency: TransactionFrequency.FIXED,
    description: 'Salário mensal',
    createdAt: new Date()
  },
  {
    id: 'mock-transaction-2',
    title: 'Mercado',
    amount: 250,
    type: TransactionType.EXPENSE,
    categoryId: 'food',
    category: CATEGORIES.find(c => c.id === 'food'),
    date: new Date(),
    paymentMethodId: 'credit',
    account: {
      id: 'mock-account-1',
      name: 'Conta Corrente',
      type: 'bank'
    },
    frequency: TransactionFrequency.VARIABLE,
    description: 'Compras da semana',
    createdAt: new Date()
  }
];

const mockAccounts: BalanceAccount[] = [
  {
    id: 'mock-account-1',
    name: 'Conta Corrente',
    balance: 2750,
    type: 'bank',
    color: '#2196F3',
    icon: 'bank'
  },
  {
    id: 'mock-account-2',
    name: 'Carteira',
    balance: 150,
    type: 'cash',
    color: '#4CAF50',
    icon: 'wallet'
  },
  {
    id: 'mock-account-3',
    name: 'Vale-Alimentação',
    balance: 300,
    type: 'voucher',
    color: '#FF9800',
    icon: 'food'
  }
];

const TransactionContext = createContext<TransactionContextProps | undefined>(undefined);

// Helpers para converter do Firestore
const convertFirestoreTimestampToDate = (timestamp: any): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(timestamp.seconds * 1000);
};

// Converter documento do Firestore para Transaction
const convertToTransaction = (doc: any): Transaction => {
  const data = doc.data();
  const category = CATEGORIES.find(c => c.id === data.categoryId);
  
  return {
    id: doc.id,
    title: data.title,
    amount: data.amount,
    type: data.type as TransactionType,
    categoryId: data.categoryId,
    paymentMethodId: data.paymentMethodId || '',
    date: convertFirestoreTimestampToDate(data.date),
    frequency: data.frequency as TransactionFrequency,
    description: data.description || '',
    installment: data.installment ? {
      ...data.installment,
      startDate: convertFirestoreTimestampToDate(data.installment.startDate)
    } : undefined,
    isManualBill: data.isManualBill || false,
  };
};

// Converter documento do Firestore para BalanceAccount
const convertToAccount = (doc: any): BalanceAccount => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    balance: data.balance,
    type: data.type,
    color: data.color,
    icon: data.icon
  };
};

export function TransactionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState<{ month: number; year: number }>({
    month: new Date().getMonth(),
    year: new Date().getFullYear()
  });
  
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>(initialSummary);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [accounts, setAccounts] = useState<BalanceAccount[]>([]);
  const [installedPayments, setInstalledPayments] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar dados de mock para modo de desenvolvimento (offline)
  const loadMockData = useCallback(() => {
    console.log('📱 Carregando dados de exemplo para modo offline');
    setTransactions(mockTransactions);
    setAccounts(mockAccounts);
    updateSummaries(mockTransactions);
    updateAccountBalances(mockAccounts);
    setIsLoading(false);
  }, []);

  // Carregar contas do usuário
  const loadAccounts = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Carregando contas do Firebase');
      const accountsCollectionRef = collection(db, 'users', user.id, 'bankAccounts');
      
      // Usar onSnapshot para atualização em tempo real
      return onSnapshot(accountsCollectionRef, (snapshot) => {
        const accountsList = snapshot.docs.map(convertToAccount);
        setAccounts(accountsList);
        
        // Atualizar o resumo financeiro com base nas contas
        updateAccountBalances(accountsList);
      }, (error) => {
        console.error('Erro ao observar contas:', error);
      });
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  }, [user]);

  // Definir loadInstallments antes de ser usado em loadTransactions
  const loadInstallments = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Carregando parcelas do Firebase');
      const transactionsCollectionRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsCollectionRef,
        where('installment', '!=', null)
      );
      
      const querySnapshot = await getDocs(q);
      const installmentsList = querySnapshot.docs.map(convertToTransaction);
      setInstalledPayments(installmentsList);
    } catch (error) {
      console.error('Erro ao carregar pagamentos parcelados:', error);
    }
  }, [user]);

  // Carregar transações baseadas no mês atual
  const loadTransactions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      console.log('🔄 Carregando transações do Firebase');
      const startOfMonth = new Date(currentMonth.year, currentMonth.month, 1);
      const endOfMonth = new Date(currentMonth.year, currentMonth.month + 1, 0, 23, 59, 59);
      
      const transactionsCollectionRef = collection(db, 'users', user.id, 'transactions');
      const q = query(
        transactionsCollectionRef,
        where('date', '>=', Timestamp.fromDate(startOfMonth)),
        where('date', '<=', Timestamp.fromDate(endOfMonth))
      );
      
      // Usar onSnapshot para atualização em tempo real
      return onSnapshot(q, (snapshot) => {
        const transactionsList = snapshot.docs.map(convertToTransaction);
        setTransactions(transactionsList);
        
        // Atualizar resumos baseados nas transações
        updateSummaries(transactionsList);
        
        // Obter pagamentos parcelados
        loadInstallments();
        
        setIsLoading(false);
      }, (error) => {
        console.error('Erro ao observar transações:', error);
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setIsLoading(false);
    }
  }, [user, currentMonth, loadInstallments]);

  // Carregar métodos de pagamento
  const loadPaymentMethods = useCallback(async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Carregando métodos de pagamento do Firebase');
      const methodsCollectionRef = collection(db, 'users', user.id, 'paymentMethods');
      
      // Usar onSnapshot para atualização em tempo real
      return onSnapshot(methodsCollectionRef, (snapshot) => {
        const methodsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PaymentMethod[];
        
        setPaymentMethods(methodsList);
      }, (error) => {
        console.error('Erro ao observar métodos de pagamento:', error);
      });
    } catch (error) {
      console.error('Erro ao carregar métodos de pagamento:', error);
    }
  }, [user]);

  // Efeito para carregar dados quando o usuário ou mês mudar
  useEffect(() => {
    let unsubscribeTransactions: () => void;
    let unsubscribeAccounts: () => void;
    
    if (user) {
      const loadData = async () => {
        try {
          const unsubTrans = await loadTransactions();
          const unsubAccounts = await loadAccounts();
          const unsubPaymentMethods = await loadPaymentMethods();
          
          if (unsubTrans) unsubscribeTransactions = unsubTrans;
          if (unsubAccounts) unsubscribeAccounts = unsubAccounts;
          if (unsubPaymentMethods) unsubscribeAccounts = unsubPaymentMethods;
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
          setIsLoading(false);
        }
      };
      
      loadData();
    } else {
      // Resetar estados se não houver usuário
      setTransactions([]);
      setAccounts([]);
      setFinancialSummary(initialSummary);
      setCategorySummaries([]);
      setPaymentMethods([]);
    }
    
    // Cleanup
    return () => {
      if (unsubscribeTransactions) unsubscribeTransactions();
      if (unsubscribeAccounts) unsubscribeAccounts();
    };
  }, [user, currentMonth, loadTransactions, loadAccounts, loadPaymentMethods]);

  // Atualizar resumos baseados nas transações
  const updateSummaries = useCallback((transactionsList: Transaction[]) => {
    // Resumo financeiro
    let monthlyIncome = 0;
    let monthlyExpenses = 0;
    let fixedExpenses = 0;
    let variableExpenses = 0;
    let foodVoucherExpenses = 0;  // Adicionar para rastrear despesas com VR
    
    // Categoria summaries
    const categorySummaryMap = new Map<string, Partial<CategorySummary> & {count: number, category?: Category}>();
    
    transactionsList.forEach(transaction => {
      // Atualizando resumo financeiro
      if (transaction.type === TransactionType.INCOME) {
        monthlyIncome += transaction.amount;
      } else if (transaction.type === TransactionType.EXPENSE) {
        monthlyExpenses += transaction.amount;
        
        // Verificar se é despesa com Vale Refeição/Food
        const paymentMethod = paymentMethods.find(m => m.id === transaction.paymentMethodId);
        if (paymentMethod && paymentMethod.type === 'food') {
          foodVoucherExpenses += transaction.amount;
        }
        
        if (transaction.frequency === TransactionFrequency.FIXED) {
          fixedExpenses += transaction.amount;
        } else {
          variableExpenses += transaction.amount;
        }
      }
      
      // Atualizando resumo por categoria
      const categoryId = transaction.categoryId;
      const category = CATEGORIES.find(c => c.id === categoryId);
      
      const categorySummary = categorySummaryMap.get(categoryId) || {
        categoryId,
        amount: 0,
        count: 0,
        category
      };
      
      categorySummary.amount = (categorySummary.amount || 0) + 
        (transaction.type === TransactionType.INCOME ? transaction.amount : -transaction.amount);
      categorySummary.count = (categorySummary.count || 0) + 1;
      
      categorySummaryMap.set(categoryId, categorySummary);
    });
    
    // Atualizar o resumo financeiro
    setFinancialSummary(prev => ({
      ...prev,
      monthlyIncome,
      monthlyExpenses,
      fixedExpenses,
      variableExpenses,
      foodVoucherExpenses  // Adicionar despesas com VR ao resumo
    }));
    
    // Calcular percentagens e converter o mapa para array
    const total = Math.max(1, Array.from(categorySummaryMap.values())
      .reduce((sum, item) => sum + Math.abs(item.amount || 0), 0));
    
    const categorySummaries: CategorySummary[] = Array.from(categorySummaryMap.values())
      .map(item => ({
        categoryId: item.categoryId || '',
        amount: item.amount || 0,
        percentage: Math.abs(item.amount || 0) / total * 100
      }));
    
    setCategorySummaries(categorySummaries);
  }, [paymentMethods]);

  // Adiciona uma nova transação
  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const transactionsCollectionRef = collection(db, 'users', user.id, 'transactions');
      
      // Preparar dados para o Firestore
      const transactionData = {
        ...transaction,
        date: Timestamp.fromDate(transaction.date),
        createdAt: serverTimestamp(),
        installment: transaction.installment ? {
          ...transaction.installment,
          startDate: Timestamp.fromDate(transaction.installment.startDate)
        } : null
      };
      
      await addDoc(transactionsCollectionRef, transactionData);
      
      // As atualizações serão feitas pelo listener onSnapshot
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Atualiza uma transação existente
  const updateTransaction = async (transaction: Transaction) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const transactionRef = doc(db, 'users', user.id, 'transactions', transaction.id);
      
      // Preparar dados para o Firestore
      await updateDoc(transactionRef, {
        title: transaction.title,
        amount: transaction.amount,
        type: transaction.type,
        categoryId: transaction.categoryId,
        date: Timestamp.fromDate(transaction.date),
        paymentMethodId: transaction.paymentMethodId,
        frequency: transaction.frequency,
        description: transaction.description,
        installment: transaction.installment ? {
          ...transaction.installment,
          startDate: Timestamp.fromDate(transaction.installment.startDate)
        } : null
      });
      
      // As atualizações serão feitas pelo listener onSnapshot
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Exclui uma transação
  const deleteTransaction = async (id: string) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const transactionRef = doc(db, 'users', user.id, 'transactions', id);
      await deleteDoc(transactionRef);
      
      // As atualizações serão feitas pelo listener onSnapshot
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Adicionar conta
  const addAccount = async (account: Omit<BalanceAccount, 'id'>) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const accountsCollectionRef = collection(db, 'users', user.id, 'bankAccounts');
      
      await addDoc(accountsCollectionRef, {
        ...account,
        createdAt: serverTimestamp()
      });
      
      // As atualizações serão feitas pelo listener onSnapshot
    } catch (error) {
      console.error('Erro ao adicionar conta:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar conta
  const updateAccount = async (account: BalanceAccount) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const accountRef = doc(db, 'users', user.id, 'bankAccounts', account.id);
      
      await updateDoc(accountRef, {
        name: account.name,
        balance: account.balance,
        type: account.type,
        color: account.color,
        icon: account.icon
      });
      
      // As atualizações serão feitas pelo listener onSnapshot
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Excluir conta
  const deleteAccount = async (id: string) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      const accountRef = doc(db, 'users', user.id, 'bankAccounts', id);
      await deleteDoc(accountRef);
      
      // As atualizações serão feitas pelo listener onSnapshot
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Filtros
  const filterTransactionsByCategory = (categoryId: string) => {
    return transactions.filter(t => t.categoryId === categoryId);
  };

  const filterTransactionsByType = (type: TransactionType) => {
    return transactions.filter(t => t.type === type);
  };

  const filterTransactionsByFrequency = (frequency: TransactionFrequency) => {
    return transactions.filter(t => t.frequency === frequency);
  };

  // Mudar mês atual
  const changeMonth = (month: number, year: number) => {
    setCurrentMonth({ month, year });
  };

  // Atualizar o resumo financeiro com base nas contas
  const updateAccountBalances = (accountsList: BalanceAccount[]) => {
    let cashBalance = 0;
    let foodVoucherBalance = 0;
    let totalBalance = 0;
    
    accountsList.forEach(account => {
      totalBalance += account.balance;
      
      if (account.type === 'cash' || account.type === 'bank') {
        cashBalance += account.balance;
      } else if (account.type === 'voucher') {
        foodVoucherBalance += account.balance;
      }
    });
    
    // Atualizar o saldo do Vale Refeição considerando as despesas
    if (financialSummary.foodVoucherExpenses) {
      foodVoucherBalance -= financialSummary.foodVoucherExpenses;
    }
    
    setFinancialSummary(prev => ({
      ...prev,
      totalBalance,
      cashBalance,
      foodVoucherBalance
    }));
  };

  // Limpar todas as transações (apenas para fins de teste/desenvolvimento)
  const clearTransactions = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log('🗑️ Limpando todas as transações...');
      
      const transactionsCollectionRef = collection(db, 'users', user.id, 'transactions');
      const querySnapshot = await getDocs(transactionsCollectionRef);
      
      // Excluir cada documento de transação
      const deletePromises = querySnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      
      // Recarregar os dados após a limpeza
      setTransactions([]);
      updateSummaries([]);
      console.log('✅ Transações excluídas com sucesso!');
    } catch (error) {
      console.error('Erro ao limpar transações:', error);
      setError('Falha ao limpar transações');
    } finally {
      setIsLoading(false);
    }
  };

  // Adicionar uma nova fatura manual
  const addManualBill = async (bills: ManualBill[]) => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      console.log('Iniciando o salvamento de faturas manuais:', bills.length);
      bills.forEach(bill => {
        console.log(`Fatura de ${bill.id}:`, bill.amount, `para ${bill.reference.month + 1}/${bill.reference.year}`);
      });
      
      // Em vez de criar uma nova coleção, usaremos a coleção 'transactions' existente
      const transactionsCollectionRef = collection(db, 'users', user.id, 'transactions');
      
      // Criar uma transação para cada fatura manual
      const savePromises = bills
        .filter(bill => bill.amount > 0)
        .map(bill => {
          // Data de referência (primeiro dia do mês anterior)
          const billDate = new Date(bill.reference.year, bill.reference.month, 1);
          
          // Encontrar o cartão correspondente
          const card = paymentMethods.find(method => method.id === bill.id);
          console.log(`Salvando fatura manual para cartão: ${card?.name || 'Desconhecido'}, valor: ${bill.amount}`);
          
          const transactionData = {
            title: `Fatura manual: ${card?.name || 'Cartão'}`,
            amount: bill.amount,
            type: TransactionType.EXPENSE,
            categoryId: 'bank', // Categoria mudada para 'bank' que é mais apropriada para faturas de cartão
            date: Timestamp.fromDate(billDate),
            paymentMethodId: bill.id,
            frequency: TransactionFrequency.VARIABLE,
            description: `Fatura manual adicionada para ${bill.reference.month + 1}/${bill.reference.year}`,
            isManualBill: true, // Marcar como fatura manual
            createdAt: serverTimestamp()
          };
          
          console.log('Dados da transação a ser salva:', JSON.stringify(transactionData));
          return addDoc(transactionsCollectionRef, transactionData);
        });
      
      if (savePromises.length === 0) {
        throw new Error('Nenhuma fatura com valor válido para salvar');
      }
      
      const results = await Promise.all(savePromises);
      
      console.log(`✅ Salvas ${results.length} faturas manuais como transações com IDs:`);
      results.forEach((docRef, index) => {
        console.log(`Fatura #${index + 1} ID: ${docRef.id}`);
      });

      // Verificar se as faturas foram salvas corretamente
      const checkPromises = results.map(async (docRef) => {
        const docSnap = await getDoc(docRef);
        console.log(`Verificando documento ${docRef.id}:`, docSnap.exists() ? 'Existe' : 'Não existe');
        if (docSnap.exists()) {
          const data = docSnap.data();
          console.log(`Documento ${docRef.id} dados:`, {
            title: data.title,
            amount: data.amount,
            isManualBill: data.isManualBill === true ? 'true' : 'false ou undefined',
            date: data.date?.toDate?.() || data.date,
            paymentMethodId: data.paymentMethodId
          });
          
          // Se isManualBill não estiver definido, vamos corrigir
          if (data.isManualBill !== true) {
            console.log(`Corrigindo isManualBill para ${docRef.id}`);
            await updateDoc(docRef, { isManualBill: true });
          }
        }
      });
      
      await Promise.all(checkPromises);
      console.log('Verificação de documentos concluída');

      // Recarregar todas as transações após adicionar faturas manuais
      // Este passo é importante para garantir que as novas faturas sejam exibidas
      await reloadAllTransactions();
      
    } catch (error) {
      console.error('Erro ao adicionar fatura manual:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Função auxiliar para recarregar todas as transações (incluindo meses anteriores)
  const reloadAllTransactions = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Recarregando todas as transações para atualizar faturas manuais...');
      const transactionsCollectionRef = collection(db, 'users', user.id, 'transactions');
      
      // Buscar todas as transações sem filtro de data
      const snapshot = await getDocs(transactionsCollectionRef);
      const allTransactions = snapshot.docs.map(convertToTransaction);
      
      console.log(`Total de transações carregadas: ${allTransactions.length}`);
      
      // Filtrar transações do mês atual para atualizar o estado
      const startOfMonth = new Date(currentMonth.year, currentMonth.month, 1);
      const endOfMonth = new Date(currentMonth.year, currentMonth.month + 1, 0, 23, 59, 59);
      
      const currentMonthTransactions = allTransactions.filter(transaction => {
        const transactionDate = transaction.date;
        return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
      });
      
      // Filtrar transações do mês anterior para debug
      const prevMonth = currentMonth.month - 1 < 0 ? 11 : currentMonth.month - 1;
      const prevYear = currentMonth.month - 1 < 0 ? currentMonth.year - 1 : currentMonth.year;
      const startOfPrevMonth = new Date(prevYear, prevMonth, 1);
      const endOfPrevMonth = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59);
      
      const prevMonthTransactions = allTransactions.filter(transaction => {
        const transactionDate = transaction.date;
        return transactionDate >= startOfPrevMonth && transactionDate <= endOfPrevMonth;
      });
      
      // Verificando faturas manuais do mês anterior
      const manualBills = prevMonthTransactions.filter(t => t.isManualBill === true);
      console.log(`Encontradas ${manualBills.length} faturas manuais do mês anterior após recarga`);
      manualBills.forEach(bill => {
        console.log(`Fatura manual: ID: ${bill.id}, título: ${bill.title}, valor: ${bill.amount}, data: ${bill.date.toLocaleDateString()}, método: ${bill.paymentMethodId}, isManualBill: ${bill.isManualBill}`);
      });
      
      // Armazenar todas as transações em uma variável de contexto para acesso global
      if (window) {
        (window as any).__allTransactions = allTransactions;
        console.log('Todas as transações foram armazenadas na variável global __allTransactions para debug');
      }
      
      // Atualizar o estado das transações do mês atual
      setTransactions(currentMonthTransactions);
      
      // Atualizar resumos baseados nas transações
      updateSummaries(currentMonthTransactions);
      
      console.log('✅ Transações recarregadas com sucesso');
      
      return allTransactions;
    } catch (error) {
      console.error('Erro ao recarregar transações:', error);
      throw error;
    }
  };

  return (
    <TransactionContext.Provider value={{
      currentMonth,
      transactions,
      financialSummary,
      categorySummaries,
      accounts,
      installedPayments,
      paymentMethods,
      isLoading,
      error,
      addTransaction,
      updateTransaction,
      deleteTransaction,
      filterTransactionsByCategory,
      filterTransactionsByType,
      filterTransactionsByFrequency,
      changeMonth,
      addAccount,
      updateAccount,
      deleteAccount,
      loadAccounts,
      loadPaymentMethods,
      clearTransactions,
      addManualBill
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions deve ser usado dentro de um TransactionProvider');
  }
  return context;
}; 