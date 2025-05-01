import React, { useRef, useMemo, useState, useEffect } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

import { Text } from '../../components/ui/Text';
import { Colors } from '../../constants/Colors';
import { useTransactions } from '../../context/TransactionContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TransactionType, getPaymentMethodById } from '../../constants/Categories';
import { calculateUsedLimit } from '../../utils/creditCardUtils';
import { CategorySummary, Transaction } from '../../types/TransactionTypes';
import { usePreviousBills } from '../../hooks/usePreviousBills';

// Componentes financeiros
import { 
  BalanceCard, 
  TransactionItem, 
  CategoryPercentageCard,
  CreditCardSummaryCard,
  IncomeBreakdownCard,
  ExpenseBreakdownCard,
  PreviousBillCard
} from '../../components/finance';

// Tipos para cartões de crédito
type CardBill = {
  card: any;
  total: number;
  usedLimit: number;
  transactionsCount: number;
  transactions: any[];
};

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { 
    transactions, 
    financialSummary, 
    paymentMethods, 
    currentMonth,
    isLoading,
    accounts
  } = useTransactions();
  const { user } = useAuth();
  const [updateKey, setUpdateKey] = useState(Date.now());
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loadingAllTransactions, setLoadingAllTransactions] = useState(false);

  // Função para buscar todas as transações (incluindo meses anteriores)
  const fetchAllTransactions = async () => {
    if (!user) return;
    
    try {
      setLoadingAllTransactions(true);
      
      const transactionsRef = collection(db, 'users', user.id, 'transactions');
      const snapshot = await getDocs(transactionsRef);
      
      const fetchedTransactions = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate ? data.date.toDate() : new Date(data.date)
        } as Transaction;
      });
      
      // Verificar faturas manuais
      let prevMonth = currentMonth.month - 1;
      let prevYear = currentMonth.year;
      
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
      }
      
      setAllTransactions(fetchedTransactions);
      setUpdateKey(Date.now()); // Forçar atualização do hook usePreviousBills
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      setLoadingAllTransactions(false);
    }
  };

  // Efeito para recarregar dados quando a tela recebe foco
  useFocusEffect(
    React.useCallback(() => {
      fetchAllTransactions();
      return () => {
        // cleanup code
      };
    }, [])
  );

  // Filtrar apenas os métodos de pagamento do tipo cartão de crédito
  const creditCards = useMemo(() => {
    return paymentMethods.filter(method => method.type === 'credit');
  }, [paymentMethods]);

  // Calcular faturas por cartão
  const creditCardBills = useMemo<CardBill[]>(() => {
    // Se não houver cartões, retornar uma lista vazia
    if (creditCards.length === 0) return [];

    // Para cada cartão, calcular a fatura
    return creditCards.map(card => {
      // Filtrar transações deste cartão no mês atual
      const cardTransactions = transactions.filter(transaction => 
        transaction.type === TransactionType.EXPENSE &&
        transaction.paymentMethodId === card.id
      );

      // Calcular o total da fatura (usando o valor das parcelas)
      const total = cardTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

      // Calcular o limite utilizado (em percentual)
      const usedLimit = calculateUsedLimit(cardTransactions);

      // Contar o número de transações
      const transactionsCount = cardTransactions.length;

      // Retornar um objeto com as informações da fatura
      return {
        card,
        total,
        usedLimit,
        transactionsCount,
        transactions: cardTransactions
      };
    });
  }, [creditCards, transactions, currentMonth]);
  
  // Calcular fatura total de todos os cartões
  const totalCreditCardBill = useMemo(() => {
    return creditCardBills.reduce((sum, bill) => sum + bill.total, 0);
  }, [creditCardBills]);

  // Obter faturas do mês anterior - USANDO TODAS AS TRANSAÇÕES igual à tela de histórico
  const { previousMonthBills, totalPreviousBill } = usePreviousBills(
    creditCards,
    allTransactions.length > 0 ? allTransactions : transactions,
    currentMonth,
    updateKey
  );

  // Função para navegar para o perfil
  const handleProfilePress = () => {
    router.push('/(tabs)/settings');
  };

  // Navegação para todas as transações
  const handleSeeAllTransactions = () => {
    router.push('/transactions');
  };

  // Navegação para a tela de cartões de crédito
  const handleCreditCardsPress = () => {
    router.push('/(tabs)/credit-cards');
  };

  // Navegação para detalhes da transação
  const handleTransactionPress = (id: string) => {
    router.push({
      pathname: '/transactions/details',
      params: { id }
    } as any);
  };

  // Navegação para a tela de adição de fatura manual
  const handleAddManualBill = () => {
    router.push('/credit-cards/add-manual-bill' as any);
  };

  // Mostrar as 5 transações mais recentes
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [transactions]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 20 }}>Carregando...</Text>
      </View>
    );
  }

  // Filtrar transações de receita
  const incomeTransactions = transactions.filter(t => t.type === TransactionType.INCOME);
  
  // Filtrar transações de despesa
  const expenseTransactions = transactions.filter(t => t.type === TransactionType.EXPENSE);

  return (
    <SafeAreaView edges={['right', 'left', 'top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.text }]}>
              Olá, {user?.name || 'Usuário'}!
            </Text>
            <Text style={[styles.date, { color: colors.muted }]}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
          </View>
          <View style={styles.profileContainer}>
            <MaterialCommunityIcons 
              name="bell-outline" 
              size={24} 
              color={colors.text} 
              style={styles.notificationIcon} 
            />
            <TouchableOpacity 
              style={[styles.profileIcon, { backgroundColor: colors.primary }]}
              onPress={handleProfilePress}
            >
              {user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
              ) : (
                <Text style={styles.profileText}>
                  {user?.name?.charAt(0) || 'U'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Saldos */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Saldos</Text>
        <View style={styles.balanceCardsContainer}>
          <View style={styles.balanceCardItem}>
            <BalanceCard 
              title="Saldo em Dinheiro" 
              value={formatCurrency(calculateCashBalance(incomeTransactions, expenseTransactions, creditCardBills, paymentMethods, previousMonthBills, totalPreviousBill))}
              type="neutral"
            />
          </View>
          <View style={styles.balanceCardItem}>
            <BalanceCard 
              title="Saldo VR" 
              value={formatCurrency(calculateVRBalance(incomeTransactions, expenseTransactions, paymentMethods))}
              type="neutral"
            />
          </View>
        </View>

        {/* Resumo de Rendas */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Fontes de Renda</Text>
        <IncomeBreakdownCard 
          incomeTransactions={incomeTransactions}
          title="Rendas do Mês"
          onViewAllPress={handleSeeAllTransactions}
        />

        {/* Resumo de Despesas */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumo de Despesas</Text>
        <ExpenseBreakdownCard 
          expenseTransactions={expenseTransactions}
          title="Despesas do Mês"
          onViewAllPress={handleSeeAllTransactions}
        />
        
        {/* Cartões de Crédito */}
        {creditCards.length > 0 && (
          <CreditCardSummaryCard
            totalAmount={totalCreditCardBill}
            cardsCount={creditCards.length}
            cards={creditCardBills.map(bill => ({
              id: bill.card.id,
              name: bill.card.name,
              lastDigits: bill.card.lastDigits,
              color: bill.card.color,
              total: bill.total,
              creditLimit: bill.card.creditLimit,
              usedLimit: bill.usedLimit
            }))}
            onViewAllPress={handleCreditCardsPress}
          />
        )}

        {/* Faturas do mês anterior - Movido para após o card de cartão de crédito */}
        <PreviousBillCard
          totalAmount={totalPreviousBill}
          cardsCount={previousMonthBills.length}
          cards={previousMonthBills}
          onAddManualBill={handleAddManualBill}
          onViewAllPress={() => router.push('/credit-cards/history' as any)}
        />
        
        {/* Resumo por categoria - Mostra todas as categorias com gastos */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Categorias de Despesas</Text>
          <CategoryPercentageCard 
            title="Todas as categorias" 
            limit={999} // Número alto para mostrar todas as categorias
            categorySummaries={
              transactions
                .filter(t => t.type === TransactionType.EXPENSE)
                .reduce((summaries, transaction) => {
                  // Encontrar se já existe um resumo para esta categoria
                  const existingSummary = summaries.find(s => s.categoryId === transaction.categoryId);
                  
                  if (existingSummary) {
                    // Atualizar o valor existente
                    existingSummary.amount += transaction.amount;
                  } else {
                    // Adicionar nova categoria ao resumo
                    summaries.push({
                      categoryId: transaction.categoryId,
                      amount: transaction.amount,
                      percentage: 0 // Será calculado pelo componente
                    });
                  }
                  
                  return summaries;
                }, [] as CategorySummary[])
            }
          />
        
        {/* Transações recentes - Movido para o final */}
        <View style={styles.transactionsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Transações Recentes</Text>
          <Text 
            style={[styles.seeAllText, { color: colors.primary }]}
            onPress={handleSeeAllTransactions}
          >
            Ver todas
          </Text>
        </View>
        
        <View style={styles.transactionsContainer}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map(transaction => (
              <TransactionItem
                key={transaction.id}
                title={transaction.title}
                date={formatDate(transaction.date)}
                amount={formatCurrency(transaction.amount, false)}
                categoryId={transaction.categoryId}
                paymentMethodId={transaction.paymentMethodId}
                type={transaction.type}
                onPress={() => handleTransactionPress(transaction.id)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="cash-remove" size={48} color={colors.muted} />
              <Text style={[styles.emptyStateText, { color: colors.muted }]}>
                Nenhuma transação encontrada
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Função para calcular saldo em dinheiro: (salário + bônus) - (pix + débito)
const calculateCashBalance = (incomeTransactions: any[], expenseTransactions: any[], creditCardBills: CardBill[], customPaymentMethods: any[], previousMonthBills: any[], totalPreviousBill: number) => {
  // Calcular receitas (salário + bônus + reembolso)
  const salaryIncome = incomeTransactions
    .filter(t => t.categoryId === 'salary' || t.categoryId === 'bonus' || t.categoryId === 'refund')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Função para encontrar o método de pagamento personalizado ou padrão
  const findPaymentMethod = (methodId: string | null | undefined) => {
    // Se o ID for nulo, retornar um método genérico
    if (!methodId) return { id: 'unknown', type: 'unknown', name: 'Desconhecido' };
    
    // Primeiro tenta encontrar no array de métodos carregados do Firestore
    const customMethod = customPaymentMethods.find(method => method.id === methodId);
    if (customMethod) return customMethod;
    
    // Se não encontrar, usa a função padrão que busca na lista estática
    return getPaymentMethodById(methodId);
  };
  
  // Calcular gastos em dinheiro (excluindo VR e crédito)
  const cashExpenses = expenseTransactions
    .filter(t => {
      const paymentMethod = findPaymentMethod(t.paymentMethodId);
      // Excluir apenas despesas com VR e cartão de crédito
      return paymentMethod && 
             paymentMethod.type !== 'food' && 
             paymentMethod.type !== 'credit';
    })
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Saldo = Receitas - Despesas (apenas pix/débito/dinheiro) - Faturas manuais do mês anterior
  return salaryIncome - cashExpenses - totalPreviousBill;
};

// Função para calcular saldo VR: VR recebido - gastos VR
const calculateVRBalance = (incomeTransactions: any[], expenseTransactions: any[], customPaymentMethods: any[]) => {
  // Calcular VR recebido
  const vrIncome = incomeTransactions
    .filter(t => t.categoryId === 'food_voucher')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Função para encontrar o método de pagamento personalizado ou padrão
  const findPaymentMethod = (methodId: string | null | undefined) => {
    // Se o ID for nulo, retornar um método genérico
    if (!methodId) return { id: 'unknown', type: 'unknown', name: 'Desconhecido' };
    
    // Primeiro tenta encontrar no array de métodos carregados do Firestore
    const customMethod = customPaymentMethods.find(method => method.id === methodId);
    if (customMethod) return customMethod;
    
    // Se não encontrar, usa a função padrão que busca na lista estática
    return getPaymentMethodById(methodId);
  };
  
  // Calcular gastos com VR
  const vrExpenses = expenseTransactions
    .filter(t => {
      const paymentMethod = findPaymentMethod(t.paymentMethodId);
      // Verificar se é método de pagamento tipo 'food' (Vale Refeição)
      return paymentMethod.type === 'food';
    })
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Saldo VR = VR recebido - gastos VR
  return vrIncome - vrExpenses;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
  },
  greeting: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 14,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    marginRight: 16,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
  },
  balanceCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceCardItem: {
    width: '48%', // Um pouco menos que 50% para ter espaço entre os cards
  },
  topRowCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  halfWidthCard: {
    width: '48%', // Um pouco menos que 50% para ter espaço entre os cards
  },
  fullWidthCard: {
    width: '100%',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionsContainer: {
    backgroundColor: 'transparent',
  },
  emptyState: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  }
});
