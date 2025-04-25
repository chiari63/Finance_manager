import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTransactions } from '@/context/TransactionContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TransactionType, CATEGORIES, getCategoryById } from '@/constants/Categories';
import { formatCurrency } from '@/utils/formatters';
import { calculateUsedLimit } from '@/utils/creditCardUtils';

export default function CreditCardDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { 
    transactions, 
    paymentMethods, 
    currentMonth,
    isLoading 
  } = useTransactions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Obter o cartão de crédito selecionado
  const creditCard = useMemo(() => {
    return paymentMethods.find(method => method.id === id);
  }, [paymentMethods, id]);

  // Obter transações deste cartão no mês atual
  const cardTransactions = useMemo(() => {
    if (!creditCard) return [];
    
    // Filtrar transações deste cartão
    const filtered = transactions.filter(transaction => 
      transaction.type === TransactionType.EXPENSE &&
      transaction.paymentMethodId === creditCard.id
    );
    
    // Ordenar por data (mais recentes primeiro)
    return filtered.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [transactions, creditCard]);

  // Calcular o total da fatura (apenas parcelas)
  const totalBill = useMemo(() => {
    return cardTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [cardTransactions]);

  // Calcular o limite usado (usando valor TOTAL das compras parceladas)
  const usedLimit = useMemo(() => {
    return calculateUsedLimit(cardTransactions);
  }, [cardTransactions]);

  // Cálculo do limite disponível deve ser o limite total menos o limite usado
  const availableLimit = useMemo(() => {
    // Se não há limite ou o valor é 0, retorna 0
    if (!creditCard || !creditCard.creditLimit) return 0;
    
    // O disponível é o limite total menos o que foi usado
    return creditCard.creditLimit - usedLimit;
  }, [creditCard, usedLimit]);

  // Calcular estatísticas
  const statistics = useMemo(() => {
    if (cardTransactions.length === 0) {
      return {
        totalTransactions: 0,
        averageAmount: 0,
        highestAmount: 0,
        installmentCount: 0
      };
    }
    
    const highest = Math.max(...cardTransactions.map(t => t.amount));
    const installments = cardTransactions.filter(t => t.installment).length;
    
    return {
      totalTransactions: cardTransactions.length,
      averageAmount: totalBill / cardTransactions.length,
      highestAmount: highest,
      installmentCount: installments
    };
  }, [cardTransactions, totalBill]);

  // Agrupar transações por categoria
  const transactionsByCategory = useMemo(() => {
    const categories: Record<string, { total: number, count: number, color: string, name: string }> = {};
    
    cardTransactions.forEach(transaction => {
      const categoryId = transaction.categoryId;
      
      if (!categories[categoryId]) {
        // Buscar a categoria usando a função getCategoryById
        const category = getCategoryById(categoryId);
        
        categories[categoryId] = { 
          total: 0, 
          count: 0, 
          color: category?.color || '#757575', // Usar a cor da categoria ou cinza como fallback
          name: category?.name || 'Categoria Desconhecida'
        };
      }
      
      categories[categoryId].total += transaction.amount;
      categories[categoryId].count += 1;
    });
    
    return Object.entries(categories)
      .map(([categoryId, data]) => {
        return {
          categoryId,
          name: data.name,
          total: data.total,
          count: data.count,
          color: data.color,
          percentage: (data.total / totalBill) * 100
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [cardTransactions, totalBill]);

  // Função para formatar o mês e ano
  const getFormattedMonth = () => {
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return `${monthNames[currentMonth.month]} ${currentMonth.year}`;
  };

  // Lógica para pagar a fatura
  const handlePayBill = () => {
    if (!creditCard) return;
    
    Alert.alert(
      'Pagar Fatura',
      `Deseja marcar a fatura de ${creditCard.name} (${formatCurrency(totalBill)}) como paga?`,
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
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!creditCard) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Cartão não encontrado
          </Text>
        </View>
        
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="credit-card-off" 
            size={64} 
            color={colors.muted} 
          />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Cartão não encontrado
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.muted }]}>
            O cartão solicitado não existe ou foi removido
          </Text>
          <TouchableOpacity
            style={[styles.backToCardsButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/credit-cards' as any)}
          >
            <Text style={styles.backToCardsButtonText}>
              Voltar para Cartões
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Detalhes do Cartão
        </Text>
      </View>
      
      {/* Card de informações do cartão */}
      <View style={[styles.cardInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardNameContainer}>
            <Text style={[styles.cardName, { color: colors.text }]}>
              {creditCard.name}
            </Text>
            {creditCard.lastDigits && (
              <Text style={[styles.cardNumber, { color: colors.muted }]}>
                •••• {creditCard.lastDigits}
              </Text>
            )}
          </View>
          <View 
            style={[styles.cardIconContainer, { backgroundColor: creditCard.color || '#5E35B1' }]}
          >
            <MaterialCommunityIcons name="credit-card" size={24} color="#fff" />
          </View>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.billingInfo}>
          <View style={styles.billingItem}>
            <Text style={[styles.billingLabel, { color: colors.muted }]}>
              Fatura Atual
            </Text>
            <Text style={[styles.billingAmount, { color: '#F44336' }]}>
              {formatCurrency(totalBill)}
            </Text>
          </View>
          
          <View style={styles.billingItem}>
            <Text style={[styles.billingLabel, { color: colors.muted }]}>
              Período
            </Text>
            <Text style={[styles.billingPeriod, { color: colors.text }]}>
              {getFormattedMonth()}
            </Text>
          </View>
          
          {creditCard.dueDate && (
            <View style={styles.billingItem}>
              <Text style={[styles.billingLabel, { color: colors.muted }]}>
                Vencimento
              </Text>
              <Text style={[styles.billingDueDate, { color: colors.text }]}>
                Dia {creditCard.dueDate}
              </Text>
            </View>
          )}

          {/* Informações do limite */}
          {creditCard.creditLimit && (
            <View style={styles.billingItem}>
              <Text style={[styles.billingLabel, { color: colors.muted }]}>
                Limite
              </Text>
              <Text style={[styles.billingLimit, { color: colors.text }]}>
                {formatCurrency(creditCard.creditLimit)}
              </Text>
            </View>
          )}
          
          {/* Limite usado */}
          {creditCard.creditLimit && (
            <View style={styles.billingItem}>
              <Text style={[styles.billingLabel, { color: colors.muted }]}>
                Limite Usado
              </Text>
              <Text style={[styles.billingLimit, { color: colors.expense }]}>
                {formatCurrency(usedLimit)}
              </Text>
            </View>
          )}
          
          <View style={styles.billingItem}>
            <Text style={[styles.billingLabel, { color: colors.muted }]}>
              Disponível
            </Text>
            <Text style={[styles.billingAvailable, { color: '#4CAF50' }]}>
              {formatCurrency(availableLimit)}
            </Text>
          </View>
        </View>
        
        {/* Botão de pagar fatura */}
        <TouchableOpacity 
          style={[styles.payButton, { backgroundColor: colors.primary }]}
          onPress={handlePayBill}
        >
          <Text style={styles.payButtonText}>Pagar Fatura</Text>
        </TouchableOpacity>
      </View>
      
      {/* Gastos por categoria */}
      <View style={[styles.categoriesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Gastos por Categoria
        </Text>
        
        {transactionsByCategory.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nenhuma transação neste mês
          </Text>
        ) : (
          transactionsByCategory.map((category, index) => (
            <View 
              key={category.categoryId}
              style={[
                styles.categoryItem, 
                index < transactionsByCategory.length - 1 && styles.categoryDivider
              ]}
            >
              <View style={styles.categoryHeader}>
                <View style={styles.categoryNameContainer}>
                  <View 
                    style={[styles.categoryDot, { backgroundColor: category.color }]}
                  />
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {category.name}
                  </Text>
                </View>
                <Text style={[styles.categoryCount, { color: colors.muted }]}>
                  {category.count} {category.count === 1 ? 'transação' : 'transações'}
                </Text>
              </View>
              
              <View style={styles.categoryDetails}>
                <View style={styles.percentageBar}>
                  <View 
                    style={[
                      styles.percentageFill, 
                      { 
                        backgroundColor: category.color,
                        width: `${Math.min(100, category.percentage)}%` 
                      }
                    ]} 
                  />
                </View>
                
                <View style={styles.categoryAmounts}>
                  <Text style={[styles.categoryPercentage, { color: colors.muted }]}>
                    {category.percentage.toFixed(1)}%
                  </Text>
                  <Text style={[styles.categoryAmount, { color: colors.text }]}>
                    {formatCurrency(category.total)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
      
      {/* Transações recentes */}
      <View style={[styles.transactionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.transactionsHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Transações Recentes
          </Text>
          <TouchableOpacity
            onPress={() => {
              // Implementar navegação para ver todas as transações
            }}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>
              Ver todas
            </Text>
          </TouchableOpacity>
        </View>
        
        {cardTransactions.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            Nenhuma transação neste mês
          </Text>
        ) : (
          cardTransactions.slice(0, 5).map((transaction, index) => (
            <TouchableOpacity
              key={transaction.id}
              style={[
                styles.transactionItem,
                index < Math.min(cardTransactions.length, 5) - 1 && styles.transactionDivider
              ]}
              onPress={() => router.push({
                pathname: '/transactions/details',
                params: { id: transaction.id }
              } as any)}
            >
              <View style={styles.transactionContent}>
                <View style={styles.transactionInfo}>
                  <Text style={[styles.transactionTitle, { color: colors.text }]}>
                    {transaction.title || transaction.description}
                  </Text>
                  <Text style={[styles.transactionDate, { color: colors.muted }]}>
                    {new Date(transaction.date).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                
                <View style={styles.transactionAmount}>
                  <Text style={[styles.transactionValue, { color: '#F44336' }]}>
                    {formatCurrency(transaction.amount)}
                  </Text>
                  {transaction.installment && (
                    <Text style={[styles.installmentInfo, { color: colors.muted }]}>
                      {transaction.installment.current}/{transaction.installment.total}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
      
      {/* Ações adicionais */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push({
            pathname: '/payments/edit',
            params: { id: creditCard.id }
          } as any)}
        >
          <MaterialCommunityIcons name="credit-card-edit" size={24} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Editar Cartão
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            // Implementar histórico de faturas
          }}
        >
          <MaterialCommunityIcons name="history" size={24} color={colors.text} />
          <Text style={[styles.actionText, { color: colors.text }]}>
            Faturas Anteriores
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Rodapé com espaço */}
      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  cardInfo: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardNameContainer: {
    flex: 1,
  },
  cardName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 14,
  },
  cardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 16,
  },
  billingInfo: {
    padding: 16,
  },
  billingItem: {
    marginBottom: 12,
  },
  billingLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  billingAmount: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  billingPeriod: {
    fontSize: 16,
    fontWeight: '500',
  },
  billingDueDate: {
    fontSize: 16,
    fontWeight: '500',
  },
  billingLimit: {
    fontSize: 16,
    fontWeight: '500',
  },
  billingAvailable: {
    fontSize: 16,
    fontWeight: '500',
  },
  payButton: {
    margin: 16,
    marginTop: 8,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  categoriesCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  categoryItem: {
    marginVertical: 8,
  },
  categoryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 16,
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 12,
  },
  categoryDetails: {
    marginTop: 4,
  },
  percentageBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  percentageFill: {
    height: '100%',
    borderRadius: 4,
  },
  categoryAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryPercentage: {
    fontSize: 12,
  },
  categoryAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionsCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  transactionItem: {
    paddingVertical: 12,
  },
  transactionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
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
  actionsContainer: {
    flexDirection: 'row',
    margin: 16,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  footer: {
    height: 40,
  },
  emptyContainer: {
    flex: 1,
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
  backToCardsButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToCardsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 