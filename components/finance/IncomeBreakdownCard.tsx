import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatCurrency } from '@/utils/formatters';
import { getCategoryById } from '@/constants/Categories';
import { Transaction } from '@/types/TransactionTypes';

interface IncomeBreakdownProps {
  incomeTransactions: Transaction[];
  title?: string;
  onViewAllPress?: () => void;
}

export const IncomeBreakdownCard: React.FC<IncomeBreakdownProps> = ({
  incomeTransactions,
  title = "Fontes de Renda",
  onViewAllPress
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Calcular total das rendas
  const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  // Agrupar transações por categoria
  const incomeByCategory = incomeTransactions.reduce((acc, transaction) => {
    const categoryId = transaction.categoryId;
    if (!acc[categoryId]) {
      acc[categoryId] = { total: 0, count: 0 };
    }
    acc[categoryId].total += transaction.amount;
    acc[categoryId].count += 1;
    return acc;
  }, {} as Record<string, {total: number, count: number}>);

  // Converter para array para facilitar a renderização
  const categorySummaries = Object.entries(incomeByCategory).map(([categoryId, data]) => {
    // Calcular a porcentagem
    const percentage = totalIncome > 0 ? (data.total / totalIncome) * 100 : 0;
    
    return {
      categoryId,
      total: data.total,
      count: data.count,
      percentage: percentage
    };
  });

  // Ordenar por valor (decrescente)
  categorySummaries.sort((a, b) => b.total - a.total);

  if (incomeTransactions.length === 0) {
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
        <Text style={[styles.totalLabel, { color: colors.muted }]}>Total Recebido</Text>
        <Text style={[styles.totalValue, { color: colors.income }]}>{formatCurrency(totalIncome)}</Text>
      </View>

      <View style={styles.divider} />

      {categorySummaries.map(summary => {
        const category = getCategoryById(summary.categoryId);
        const safePercentage = Math.min(Math.max(0, summary.percentage), 100);
        
        return (
          <View key={summary.categoryId} style={styles.categoryRow}>
            <View style={styles.categoryLeftSection}>
              <View style={[styles.categoryIcon, { backgroundColor: category.color }]}>
                <MaterialCommunityIcons name={category.icon as any} size={18} color="#FFF" />
              </View>
              <View style={styles.categoryInfo}>
                <Text style={[styles.categoryName, { color: colors.text }]}>{category.name}</Text>
                <Text style={[styles.categoryCount, { color: colors.muted }]}>
                  {summary.count} {summary.count === 1 ? 'transação' : 'transações'}
                </Text>
              </View>
            </View>
            
            <View style={styles.categoryRightSection}>
              <Text style={[styles.categoryAmount, { color: colors.income }]}>
                {formatCurrency(summary.total)}
              </Text>
              <Text style={[styles.categoryPercentage, { color: colors.muted }]}>
                {safePercentage.toFixed(1)}%
              </Text>
            </View>
          </View>
        );
      })}
      
      {/* Gráfico de barras para visualização das proporções */}
      <View style={styles.barChartContainer}>
        {categorySummaries.map(summary => {
          const category = getCategoryById(summary.categoryId);
          const safePercentage = Math.min(Math.max(0, summary.percentage), 100);
          
          return (
            <View key={`bar-${summary.categoryId}`} style={styles.barChartRow}>
              <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.barFill, 
                    { 
                      width: `${safePercentage}%`, 
                      backgroundColor: category.color 
                    }
                  ]} 
                />
              </View>
            </View>
          );
        })}
      </View>
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
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 12,
  },
  categoryRightSection: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  categoryPercentage: {
    fontSize: 12,
    marginTop: 2,
  },
  barChartContainer: {
    marginTop: 16,
  },
  barChartRow: {
    marginVertical: 4,
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
}); 