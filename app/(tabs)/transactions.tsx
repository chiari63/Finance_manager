import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  RefreshControl 
} from 'react-native';
import { router } from 'expo-router';
import { useTransactions } from '@/context/TransactionContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { TransactionType, getCategoryById } from '@/constants/Categories';
import { formatCurrency } from '@/utils/formatters';

export default function TransactionsScreen() {
  const { 
    transactions, 
    isLoading, 
    currentMonth, 
    changeMonth,
    financialSummary
  } = useTransactions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [refreshing, setRefreshing] = useState(false);

  // Função para agrupar transações por data
  const groupedTransactions = useMemo(() => {
    const grouped = transactions.reduce((acc, transaction) => {
      const date = transaction.date;
      const dateStr = date.toISOString().split('T')[0];
      
      if (!acc[dateStr]) {
        acc[dateStr] = [];
      }
      
      acc[dateStr].push(transaction);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Converter para array e ordenar por data (mais recente primeiro)
    return Object.entries(grouped)
      .map(([date, transactions]) => ({
        date: new Date(date),
        transactions: transactions.sort((a, b) => {
          // Receitas primeiro, depois despesas; dentro de cada grupo por valor (maior primeiro)
          if (a.type !== b.type) {
            return a.type === TransactionType.INCOME ? -1 : 1;
          }
          return b.amount - a.amount;
        })
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions]);

  // Mês anterior
  const handlePreviousMonth = () => {
    let newMonth = currentMonth.month - 1;
    let newYear = currentMonth.year;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    }
    
    changeMonth(newMonth, newYear);
  };

  // Próximo mês
  const handleNextMonth = () => {
    let newMonth = currentMonth.month + 1;
    let newYear = currentMonth.year;
    
    if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    
    // Não permitir selecionar meses futuros
    const now = new Date();
    if (newYear > now.getFullYear() || 
       (newYear === now.getFullYear() && newMonth > now.getMonth())) {
      return;
    }
    
    changeMonth(newMonth, newYear);
  };

  // Função para formatar o mês e ano
  const getFormattedMonth = () => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return `${monthNames[currentMonth.month]} ${currentMonth.year}`;
  };

  // Para atualizar os dados quando puxar para baixo
  const onRefresh = async () => {
    setRefreshing(true);
    // Esperar um momento para simular carregamento
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Renderizar um item de transação
  const renderTransactionItem = ({ item }: { item: any }) => {
    const isIncome = item.type === TransactionType.INCOME;
    const category = getCategoryById(item.categoryId);
    
    return (
      <TouchableOpacity 
        style={[styles.transactionItem, { backgroundColor: colors.card }]}
        onPress={() => router.push({
          pathname: '/transactions/details',
          params: { id: item.id }
        } as any)}
      >
        <View style={styles.transactionIcon}>
          {isIncome ? (
            <MaterialCommunityIcons name="arrow-down-circle" size={26} color="#4CAF50" />
          ) : (
            <MaterialCommunityIcons name="arrow-up-circle" size={26} color="#F44336" />
          )}
        </View>
        
        <View style={styles.transactionInfo}>
          <Text style={[styles.transactionTitle, { color: colors.text }]}>
            {item.title || item.description}
          </Text>
          <Text style={[styles.transactionCategory, { color: colors.muted }]}>
            {category.name}
          </Text>
        </View>
        
        <View style={styles.transactionAmount}>
          <Text 
            style={[
              styles.amount, 
              { color: isIncome ? '#4CAF50' : '#F44336' }
            ]}
          >
            {isIncome ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar um grupo de transações por data
  const renderDateGroup = ({ item }: { item: any }) => {
    const date = item.date;
    const dayOfWeek = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    
    // Calcular o total do dia (receitas - despesas)
    const dayTotal = item.transactions.reduce((sum: number, transaction: any) => {
      return sum + (transaction.type === TransactionType.INCOME 
        ? transaction.amount 
        : -transaction.amount);
    }, 0);
    
    const isPositive = dayTotal >= 0;
    
    return (
      <View style={styles.dateGroup}>
        <View style={styles.dateHeader}>
          <View>
            <Text style={[styles.dayOfWeek, { color: colors.muted }]}>
              {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}
            </Text>
            <Text style={[styles.date, { color: colors.text }]}>
              {formattedDate}
            </Text>
          </View>
          
          <Text 
            style={[
              styles.dayTotal, 
              { color: isPositive ? '#4CAF50' : '#F44336' }
            ]}
          >
            {isPositive ? '+' : ''}{formatCurrency(dayTotal)}
          </Text>
        </View>
        
        {item.transactions.map((transaction: any) => (
          <View key={transaction.id}>
            {renderTransactionItem({ item: transaction })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Transações</Text>
      </View>
      
      {/* Resumo do mês */}
      <View style={[styles.summary, { backgroundColor: colors.card }]}>
        <View style={styles.monthSelector}>
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={handlePreviousMonth}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.monthTitle, { color: colors.text }]}>
            {getFormattedMonth()}
          </Text>
          
          <TouchableOpacity 
            style={styles.monthNavButton}
            onPress={handleNextMonth}
          >
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.monthTotals}>
          <View style={styles.monthTotalItem}>
            <Text style={[styles.monthTotalLabel, { color: colors.muted }]}>Receitas</Text>
            <Text style={[styles.monthTotalValue, { color: '#4CAF50' }]}>
              +{formatCurrency(financialSummary.monthlyIncome)}
            </Text>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.monthTotalItem}>
            <Text style={[styles.monthTotalLabel, { color: colors.muted }]}>Despesas</Text>
            <Text style={[styles.monthTotalValue, { color: '#F44336' }]}>
              -{formatCurrency(financialSummary.monthlyExpenses)}
            </Text>
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.monthTotalItem}>
            <Text style={[styles.monthTotalLabel, { color: colors.muted }]}>Saldo</Text>
            <Text 
              style={[
                styles.monthTotalValue, 
                { 
                  color: financialSummary.monthlyIncome - financialSummary.monthlyExpenses >= 0 
                    ? '#4CAF50' 
                    : '#F44336' 
                }
              ]}
            >
              {financialSummary.monthlyIncome - financialSummary.monthlyExpenses >= 0 ? '+' : ''}
              {formatCurrency(financialSummary.monthlyIncome - financialSummary.monthlyExpenses)}
            </Text>
          </View>
        </View>
      </View>
      
      {/* Lista de transações */}
      {isLoading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={groupedTransactions}
          keyExtractor={(item) => item.date.toISOString()}
          renderItem={renderDateGroup}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cash-remove" size={64} color={colors.muted} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                Nenhuma transação encontrada
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.muted }]}>
                As transações que você adicionar aparecerão aqui
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  summary: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  monthNavButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthTotals: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  monthTotalItem: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  monthTotalLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  monthTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    width: 1,
    marginVertical: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 100,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dayOfWeek: {
    fontSize: 14,
  },
  date: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  dayTotal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  transactionIcon: {
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionCategory: {
    fontSize: 14,
  },
  transactionAmount: {
    marginLeft: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 