import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { useTransactions } from '@/context/TransactionContext';
import { getCategoryById, CATEGORIES } from '@/constants/Categories';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CategorySummary } from '@/types/TransactionTypes';
import { formatCurrency } from '@/utils/formatters';

interface CategoryPercentageCardProps {
  title?: string;
  categorySummaries?: CategorySummary[];
  limit?: number;
}

export const CategoryPercentageCard = ({
  title = 'Top 5 Categorias',
  categorySummaries: propCategorySummaries,
  limit = 5
}: CategoryPercentageCardProps) => {
  const { categorySummaries: contextCategorySummaries } = useTransactions();
  const categorySummaries = propCategorySummaries || contextCategorySummaries || [];
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Log para debug
  useEffect(() => {
    console.log('Categorias disponíveis:', CATEGORIES.map(c => ({ id: c.id, name: c.name })));
    console.log('Resumos de categorias:', categorySummaries);
  }, [categorySummaries]);
  
  // Calculando o total dos valores absolutos para determinar a proporção
  const totalAmount = categorySummaries.reduce((sum, summary) => sum + Math.abs(summary.amount), 0);
  
  // Calcular o percentual para cada categoria corretamente
  const processedCategories = categorySummaries.map(summary => {
    // Calcular o percentual baseado no total
    const percentage = totalAmount > 0 ? (Math.abs(summary.amount) / totalAmount) * 100 : 0;
    return { ...summary, percentage };
  });
  
  // Ordenar por valor (decrescente)
  const sortedCategories = [...processedCategories]
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, limit); // Top N categorias
  
  if (sortedCategories.length === 0) {
    return (
      <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.categoryCardTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyCategoriesText, { color: colors.muted }]}>
          Nenhuma categoria para mostrar
        </Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.categoryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.categoryCardTitle, { color: colors.text }]}>{title}</Text>
      
      {sortedCategories.map((summary, index) => {
        // Buscar categoria pelo ID ou usar a função de fallback
        const category = getCategoryById(summary.categoryId);
        
        // Debug para ver o que está sendo retornado
        console.log(`Categoria ${index}:`, summary.categoryId, '→', category ? category.name : 'Não encontrada');
        console.log(`   Valor: ${summary.amount}, Percentual: ${summary.percentage.toFixed(1)}%`);
        
        // Garantir que o percentual está entre 0 e 100
        const safePercentage = Math.min(Math.max(0, summary.percentage || 0), 100);
        
        return (
          <View key={`${summary.categoryId}-${index}`} style={styles.categoryRow}>
            <View style={styles.categoryNameContainer}>
              <MaterialCommunityIcons 
                name={(category?.icon || 'help-circle') as any} 
                size={16} 
                color={category?.color || colors.primary} 
              />
              <Text style={[styles.categoryName, { color: colors.text }]}>
                {category?.name || `Categoria (${summary.categoryId})`}
              </Text>
            </View>
            <View style={styles.categoryValueContainer}>
              <View style={styles.percentageBarContainer}>
                <View 
                  style={[
                    styles.percentageBar, 
                    { 
                      width: `${safePercentage}%`, 
                      backgroundColor: category?.color || colors.primary,
                      maxWidth: '100%'
                    }
                  ]} 
                />
              </View>
              <View style={styles.valueTextContainer}>
                <Text style={[styles.valueText, { color: colors.expense }]}>
                  {formatCurrency(Math.abs(summary.amount))}
                </Text>
                <Text style={[styles.percentageText, { color: colors.text }]}>
                  {safePercentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  categoryCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
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
    width: '35%',
  },
  categoryName: {
    marginLeft: 8,
    fontSize: 14,
  },
  categoryValueContainer: {
    flex: 1,
  },
  percentageBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    flex: 1,
    marginBottom: 4,
  },
  percentageBar: {
    height: '100%',
    borderRadius: 4,
  },
  valueTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 12,
    textAlign: 'right',
  },
  valueText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'left',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  emptyCategoriesText: {
    textAlign: 'center',
    marginVertical: 16,
    fontSize: 14,
  },
}); 