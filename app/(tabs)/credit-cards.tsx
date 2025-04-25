import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Alert
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTransactions } from '../../context/TransactionContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TransactionType } from '../../constants/Categories';
import { formatCurrency } from '../../utils/formatters';

// Tipos para as faturas de cartão de crédito
type CardBill = {
  card: any; // Idealmente, use o tipo correto do seu PaymentMethod
  total: number;
  transactionsCount: number;
  transactions: any[]; // Idealmente, use o tipo correto da sua Transaction
  isTotal?: undefined;
};

type TotalBill = {
  isTotal: true;
  total: number;
  transactionsCount: number;
};

type CreditCardBill = CardBill | TotalBill;

export default function CreditCardsScreen() {
  const { 
    transactions, 
    paymentMethods, 
    currentMonth,
    changeMonth,
    isLoading 
  } = useTransactions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const searchParams = useLocalSearchParams();

  // Filtrar apenas os métodos de pagamento do tipo cartão de crédito
  const creditCards = useMemo(() => {
    return paymentMethods.filter(method => method.type === 'credit');
  }, [paymentMethods]);

  // Calcular faturas por cartão
  const creditCardBills = useMemo<CreditCardBill[]>(() => {
    // Se não houver cartões, retornar uma lista vazia
    if (creditCards.length === 0) return [];

    // Para cada cartão, calcular a fatura
    const bills = creditCards.map(card => {
      // Filtrar transações deste cartão no mês atual
      const cardTransactions = transactions.filter(transaction => 
        transaction.type === TransactionType.EXPENSE &&
        transaction.paymentMethodId === card.id
      );

      // Calcular o total da fatura (usando o valor das parcelas)
      const total = cardTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

      // Contar o número de transações
      const transactionsCount = cardTransactions.length;

      // Retornar um objeto com as informações da fatura
      return {
        card,
        total,
        transactionsCount,
        transactions: cardTransactions
      } as CardBill;
    });

    // Calcular a fatura total
    const totalBill = bills.reduce((sum, bill) => sum + bill.total, 0);
    const totalTransactionsCount = bills.reduce((sum, bill) => sum + bill.transactionsCount, 0);

    // Inserir na primeira posição o total de todos os cartões
    return [
      {
        isTotal: true,
        total: totalBill,
        transactionsCount: totalTransactionsCount
      } as TotalBill,
      ...bills
    ];
  }, [creditCards, transactions, currentMonth]);

  // Efeito para forçar recarga dos dados quando o parâmetro refresh estiver presente na URL
  useEffect(() => {
    if (searchParams && searchParams.refresh) {
      console.log('Detectado parâmetro refresh, recarregando dados:', searchParams.refresh);
      // Recarregar todos os dados aqui se necessário
    }
  }, [searchParams]);

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

  // Renderizar um cartão da fatura
  const renderBillCard = ({ item }: { item: CreditCardBill }) => {
    if ('isTotal' in item && item.isTotal) {
      // Renderizar o card de total de todos os cartões
      return (
        <View 
          style={[
            styles.totalCard, 
            { backgroundColor: colors.card, borderColor: colors.border }
          ]}
        >
          <View style={styles.totalCardHeader}>
            <Text style={[styles.totalTitle, { color: colors.text }]}>
              Fatura Total
            </Text>
            <View style={styles.totalBadge}>
              <Text style={[styles.totalBadgeText, { color: '#fff' }]}>
                {item.transactionsCount} transações
              </Text>
            </View>
          </View>
          
          <Text style={[styles.totalAmount, { color: colors.expense }]}>
            {formatCurrency(item.total)}
          </Text>
          
          <Text style={[styles.dueDate, { color: colors.muted }]}>
            Vencimentos diversos
          </Text>
        </View>
      );
    }
    
    // Renderizar um card de cartão
    const { card, total, transactionsCount } = item;
    const isSelected = selectedMethod === card.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.cardBill, 
          { 
            backgroundColor: colors.card,
            borderColor: isSelected ? colors.primary : colors.border,
          }
        ]}
        onPress={() => setSelectedMethod(isSelected ? null : card.id)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardName, { color: colors.text }]}>
              {card.name}
            </Text>
            {card.lastDigits && (
              <Text style={[styles.cardNumber, { color: colors.muted }]}>
                •••• {card.lastDigits}
              </Text>
            )}
          </View>
          
          <View 
            style={[styles.cardIconContainer, { backgroundColor: card.color || '#5E35B1' }]}
          >
            <MaterialCommunityIcons name="credit-card" size={20} color="#fff" />
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={[styles.billAmount, { color: colors.expense }]}>
            {formatCurrency(total)}
          </Text>
          
          <View style={styles.transactionCount}>
            <Text style={[styles.transactionCountText, { color: colors.muted }]}>
              {transactionsCount} transações
            </Text>
          </View>
        </View>
        
        {card.dueDate && (
          <Text style={[styles.dueDate, { color: colors.muted }]}>
            Vencimento: dia {card.dueDate}
          </Text>
        )}
        
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={[styles.payButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              Alert.alert(
                'Pagar Fatura',
                `Deseja marcar a fatura de ${card.name} (${formatCurrency(total)}) como paga?`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { 
                    text: 'Pagar', 
                    onPress: () => {
                      // Aqui implementar lógica para pagar a fatura
                      Alert.alert('Sucesso', 'Fatura paga com sucesso!');
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.payButtonText}>Pagar Fatura</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.detailsButton, { borderColor: colors.border }]}
            onPress={() => router.push({
              pathname: '/credit-cards/details',
              params: { id: card.id }
            } as any)}
          >
            <Text style={[styles.detailsButtonText, { color: colors.text }]}>
              Detalhes
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar uma transação individual quando um cartão está selecionado
  const renderTransaction = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity 
        style={[styles.transactionItem, { backgroundColor: colors.card }]}
        onPress={() => router.push({
          pathname: '/transactions/details',
          params: { id: item.id }
        } as any)}
      >
        <View style={styles.transactionContent}>
          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionTitle, { color: colors.text }]}>
              {item.title || item.description}
            </Text>
            <Text style={[styles.transactionDate, { color: colors.muted }]}>
              {new Date(item.date).toLocaleDateString('pt-BR')}
            </Text>
          </View>
          
          <View style={styles.transactionAmount}>
            <Text style={[styles.transactionValue, { color: colors.expense }]}>
              {formatCurrency(item.amount)}
            </Text>
            {item.installment && (
              <Text style={[styles.installmentInfo, { color: colors.muted }]}>
                {item.installment.current}/{item.installment.total}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Encontrar o cartão selecionado
  const selectedCard = selectedMethod 
    ? creditCardBills.find(bill => !('isTotal' in bill) && bill.card.id === selectedMethod) as CardBill | undefined
    : null;

  // Otimizar lista de transações do método de pagamento selecionado
  const selectedCardTransactions = useMemo(() => {
    if (!selectedMethod) return [];
    
    return transactions
      .filter(t => t.paymentMethodId === selectedMethod)
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [transactions, selectedMethod]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Cartões de Crédito</Text>
      </View>
      
      {/* Seletor de mês */}
      <View style={[styles.monthSelector, { backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={handlePreviousMonth}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.monthTitle, { color: colors.text }]}>
          {getFormattedMonth()}
        </Text>
        
        <TouchableOpacity onPress={handleNextMonth}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Lista de faturas */}
          <FlatList
            data={creditCardBills}
            keyExtractor={(item, index) => ('isTotal' in item && item.isTotal) ? 'total' : (item as CardBill).card.id}
            renderItem={renderBillCard}
            horizontal={false}
            contentContainerStyle={styles.billsContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialCommunityIcons 
                  name="credit-card-off" 
                  size={64} 
                  color={colors.muted} 
                />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  Nenhum cartão de crédito encontrado
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.muted }]}>
                  Adicione um cartão de crédito no seu perfil
                </Text>
                <TouchableOpacity
                  style={[styles.addCardButton, { backgroundColor: colors.primary }]}
                  onPress={() => router.push('/payments' as any)}
                >
                  <Text style={styles.addCardButtonText}>
                    Adicionar Cartão
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
          
          {/* Lista de transações do cartão selecionado */}
          {selectedCard && (
            <View style={[styles.transactionsContainer, { backgroundColor: colors.card }]}>
              <View style={styles.transactionsHeader}>
                <Text style={[styles.transactionsTitle, { color: colors.text }]}>
                  Transações de {selectedCard.card.name}
                </Text>
                <TouchableOpacity onPress={() => setSelectedMethod(null)}>
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={selectedCard.transactions}
                keyExtractor={(item) => item.id}
                renderItem={renderTransaction}
                contentContainerStyle={styles.transactionsList}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    Nenhuma transação neste mês
                  </Text>
                }
              />
            </View>
          )}
          
          {/* Lista de transações */}
          {selectedMethod && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Transações Recentes
                </Text>
              </View>
              
              {selectedCardTransactions.length > 0 ? (
                selectedCardTransactions.map(transaction => renderTransaction({item: transaction}))
              ) : (
                <View style={styles.emptyTransactions}>
                  <Text style={[styles.emptyText, { color: colors.muted }]}>
                    Nenhuma transação para este cartão neste mês
                  </Text>
                </View>
              )}
            </View>
          )}
        </>
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
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  billsContainer: {
    padding: 16,
  },
  totalCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  totalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dueDate: {
    fontSize: 14,
  },
  cardBill: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 14,
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    marginBottom: 12,
  },
  billAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transactionCount: {
    marginBottom: 8,
  },
  transactionCountText: {
    fontSize: 14,
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  payButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  payButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  detailsButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginLeft: 8,
  },
  detailsButtonText: {
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  addCardButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addCardButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  transactionsContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionsList: {
    padding: 8,
  },
  transactionItem: {
    borderRadius: 12,
    marginVertical: 4,
    padding: 12,
  },
  transactionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  installmentInfo: {
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    margin: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyTransactions: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
}); 