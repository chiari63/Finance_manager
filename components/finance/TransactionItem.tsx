import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { TransactionType } from '@/constants/Categories';
import { getCategoryById, getPaymentMethodById } from '@/constants/Categories';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useTransactions } from '@/context/TransactionContext';

interface TransactionItemProps {
  title: string; 
  date: string; 
  amount: string; 
  categoryId: string;
  paymentMethodId: string;
  type: TransactionType;
  onPress?: () => void;
}

export const TransactionItem = ({ 
  title, 
  date, 
  amount, 
  categoryId, 
  paymentMethodId,
  type,
  onPress
}: TransactionItemProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const category = getCategoryById(categoryId);
  const { paymentMethods } = useTransactions();
  
  // Buscar o método de pagamento personalizado ou usar o padrão
  const findPaymentMethod = (methodId: string) => {
    // Primeiro tenta encontrar no array de métodos carregados do Firestore
    const customMethod = paymentMethods.find(method => method.id === methodId);
    if (customMethod) return customMethod;
    
    // Se não encontrar, usa a função padrão que busca na lista estática
    return getPaymentMethodById(methodId);
  };
  
  const paymentMethod = findPaymentMethod(paymentMethodId);
  
  // Corrigir o ID específico para PIX
  const displayPaymentMethod = paymentMethod.id === 'pix' || paymentMethod.type === 'pix' 
    ? { ...paymentMethod, name: 'PIX' } 
    : paymentMethod;
  
  return (
    <View 
      style={[styles.transactionItem, { borderBottomColor: colors.border }]}
      onTouchEnd={onPress}
    >
      <View style={[styles.transactionIcon, { backgroundColor: `${category.color}20` }]}>
        <MaterialCommunityIcons 
          name={category.icon as any} 
          size={18} 
          color={category.color} 
          style={styles.iconContainer}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={[styles.transactionTitle, { color: colors.text }]}>{title}</Text>
        <View style={styles.transactionMeta}>
          <Text style={[styles.transactionCategory, { color: colors.muted }]}>{category.name}</Text>
          <Text style={[styles.transactionDot, { color: colors.muted }]}>•</Text>
          <Text style={[styles.transactionDate, { color: colors.muted }]}>{date}</Text>
          <Text style={[styles.transactionDot, { color: colors.muted }]}>•</Text>
          <View style={styles.paymentMethod}>
            <MaterialCommunityIcons name={displayPaymentMethod.icon as any} size={12} color={colors.muted} />
            <Text style={[styles.paymentMethodText, { color: colors.muted }]}>{displayPaymentMethod.name}</Text>
          </View>
        </View>
      </View>
      <Text 
        style={[
          styles.transactionAmount, 
          { color: type === TransactionType.INCOME ? colors.income : colors.expense }
        ]}
      >
        {type === TransactionType.INCOME ? '+' : '-'}{amount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconContainer: {
    textAlign: 'center',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  transactionCategory: {
    fontSize: 12,
  },
  transactionDot: {
    marginHorizontal: 4,
    fontSize: 12,
  },
  transactionDate: {
    fontSize: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  paymentMethodText: {
    fontSize: 12,
    marginLeft: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 