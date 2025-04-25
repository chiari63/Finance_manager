import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatCurrency } from '@/utils/formatters';
import { getPaymentMethodById, CATEGORIES } from '@/constants/Categories';
import { Transaction } from '@/types/TransactionTypes';
import { useTransactions } from '@/context/TransactionContext';

interface ExpenseBreakdownProps {
  expenseTransactions: Transaction[];
  title?: string;
  onViewAllPress?: () => void;
}

export const ExpenseBreakdownCard: React.FC<ExpenseBreakdownProps> = ({
  expenseTransactions,
  title = "Despesas do Mês",
  onViewAllPress
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { paymentMethods } = useTransactions();

  // Calcular total das despesas
  const totalExpense = expenseTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  // Função para buscar método de pagamento personalizado ou usar o padrão
  const findPaymentMethod = (methodId: string) => {
    // Primeiro tenta encontrar no array de métodos carregados do Firestore
    const customMethod = paymentMethods.find(method => method.id === methodId);
    if (customMethod) return customMethod;
    
    // Se não encontrar, usa a função padrão que busca na lista estática
    return getPaymentMethodById(methodId);
  };

  // Agrupar transações por TIPO de método de pagamento (credit, debit, transfer, etc.)
  const expenseByPaymentType = expenseTransactions.reduce((acc, transaction) => {
    // Obter o método de pagamento completo
    const paymentMethod = findPaymentMethod(transaction.paymentMethodId);
    
    // Determinar o tipo de pagamento
    let paymentType = paymentMethod.type;
    
    // Tratamento especial para PIX (que pode ser considerado um tipo de transferência)
    if (paymentMethod.id === 'pix') {
      paymentType = 'transfer'; // Usar 'transfer' como tipo, mas mostrar como PIX
    }
    
    // Chave única para agrupar os pagamentos
    const paymentKey = paymentMethod.id === 'pix' ? 'pix' : paymentType;
    
    if (!acc[paymentKey]) {
      acc[paymentKey] = { 
        total: 0, 
        count: 0, 
        type: paymentType,
        icon: paymentMethod.id === 'pix' ? 'qrcode' : getPaymentTypeIcon(paymentType),
        name: paymentMethod.id === 'pix' ? 'PIX' : getPaymentTypeName(paymentType),
        color: paymentMethod.id === 'pix' ? '#FFAA44' : getPaymentTypeColor(paymentType)
      };
    }
    acc[paymentKey].total += transaction.amount;
    acc[paymentKey].count += 1;
    return acc;
  }, {} as Record<string, {
    total: number, 
    count: number, 
    type: string,
    icon: string,
    name: string,
    color: string
  }>);

  // Converter para array para facilitar a renderização
  const paymentTypeSummaries = Object.values(expenseByPaymentType).map(data => {
    // Calcular a porcentagem
    const percentage = totalExpense > 0 ? (data.total / totalExpense) * 100 : 0;
    
    return {
      ...data,
      percentage: percentage
    };
  });

  // Ordenar por valor (decrescente)
  paymentTypeSummaries.sort((a, b) => b.total - a.total);

  // Função para obter o ícone para cada tipo de método
  function getPaymentTypeIcon(type: string): string {
    switch (type) {
      case 'credit': return 'credit-card';
      case 'debit': return 'credit-card-outline';
      case 'transfer': return 'bank-transfer';
      case 'pix': return 'qrcode';
      case 'money': return 'cash';
      case 'food': return 'food';
      default: return 'cash';
    }
  }

  // Função para obter o nome para cada tipo de método
  function getPaymentTypeName(type: string): string {
    switch (type) {
      case 'credit': return 'Cartão de Crédito';
      case 'debit': return 'Cartão de Débito';
      case 'transfer': return 'Transferência';
      case 'pix': return 'PIX';
      case 'money': return 'Dinheiro';
      case 'food': return 'Vale Alimentação';
      default: return 'Outro';
    }
  }

  // Função para obter a cor para cada tipo de método
  function getPaymentTypeColor(type: string): string {
    switch (type) {
      case 'credit': return '#4F44FF';  // Azul
      case 'debit': return '#44BB44';   // Verde
      case 'transfer': return '#44FFFF'; // Ciano
      case 'pix': return '#FFAA44';     // Laranja
      case 'money': return '#8844FF';   // Roxo
      case 'food': return '#FF9800';    // Amarelo
      default: return '#888888';        // Cinza
    }
  }

  if (expenseTransactions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>Ver tudo</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.totalContainer}>
        <Text style={[styles.totalLabel, { color: colors.muted }]}>Total em Despesas</Text>
        <Text style={[styles.totalValue, { color: colors.expense }]}>{formatCurrency(totalExpense)}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {paymentTypeSummaries.map((summary, index) => {
        const safePercentage = Math.min(Math.max(0, summary.percentage), 100);
        
        return (
          <View key={`${summary.type}-${index}`} style={styles.categoryRow}>
            <View style={styles.categoryNameContainer}>
              <MaterialCommunityIcons 
                name={summary.icon as any} 
                size={16} 
                color={summary.color} 
              />
              <Text 
                style={[styles.categoryName, { color: colors.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {summary.name}
              </Text>
            </View>

            <View style={styles.categoryPercentContainer}>
              <View style={styles.percentageBarContainer}>
                <View 
                  style={[
                    styles.percentageBar, 
                    { 
                      width: `${safePercentage}%`, 
                      backgroundColor: summary.color,
                      maxWidth: '100%'
                    }
                  ]} 
                />
              </View>
              
              <Text style={[styles.percentageText, { color: colors.text }]}>
                {Math.round(safePercentage)}%
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalContainer: {
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  categoryNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%',
    flexShrink: 0,
  },
  categoryName: {
    marginLeft: 8,
    fontSize: 14,
    flexShrink: 1,
  },
  categoryPercentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  percentageBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
    marginRight: 8,
  },
  percentageBar: {
    height: '100%',
    borderRadius: 4,
  },
  percentageText: {
    width: 40,
    fontSize: 12,
    textAlign: 'right',
  }
}); 