import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { formatCurrency } from '@/utils/formatters';

type CardData = {
  id: string;
  name: string;
  lastDigits?: string;
  color?: string;
  total: number;
  creditLimit?: number;
  usedLimit?: number;
  currentBill?: number;
};

type CreditCardSummaryCardProps = {
  totalAmount: number;
  cardsCount: number;
  cards: CardData[];
  onCardPress?: (id: string) => void;
  onViewAllPress?: () => void;
};

export const CreditCardSummaryCard = memo(({
  totalAmount,
  cardsCount,
  cards,
  onCardPress,
  onViewAllPress
}: CreditCardSummaryCardProps) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleCardPress = (id: string) => {
    if (onCardPress) {
      onCardPress(id);
    } else {
      router.push({
        pathname: '/credit-cards/details',
        params: { id }
      } as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Cartões de Crédito</Text>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>Ver todos</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <Text style={[styles.summaryTitle, { color: colors.text }]}>
              Fatura Total
            </Text>
            <MaterialCommunityIcons name="credit-card-multiple" size={24} color={colors.primary} />
          </View>
          <Text style={[styles.totalAmount, { color: colors.expense }]}>
            {formatCurrency(totalAmount)}
          </Text>
          <Text style={[styles.detailsText, { color: colors.muted }]}>
            {cardsCount} {cardsCount === 1 ? 'cartão ativo' : 'cartões ativos'}
          </Text>
        </View>
        
        {cards.length > 0 && (
          <View style={styles.cardsList}>
            {cards.map((card) => (
              <TouchableOpacity 
                key={card.id} 
                style={[styles.cardItem, { borderBottomColor: colors.border }]}
                onPress={() => handleCardPress(card.id)}
              >
                <View style={styles.cardItemContent}>
                  <View style={styles.cardItemHeader}>
                    <View 
                      style={[
                        styles.cardIcon, 
                        { backgroundColor: card.color || colors.primary }
                      ]}
                    >
                      <MaterialCommunityIcons name="credit-card" size={16} color="#fff" />
                    </View>
                    <Text style={[styles.cardName, { color: colors.text }]}>
                      {card.name}
                      {card.lastDigits && ` (${card.lastDigits})`}
                    </Text>
                  </View>
                  
                  {(card.creditLimit !== undefined && card.creditLimit > 0) && (
                    <View style={styles.limitContainer}>
                      <View style={styles.limitBarContainer}>
                        <View 
                          style={[
                            styles.limitBar, 
                            { 
                              width: `${Math.min(100, ((card.usedLimit || 0) / card.creditLimit) * 100)}%`,
                              backgroundColor: ((card.usedLimit || 0) / card.creditLimit) > 0.8 ? colors.expense : colors.primary,
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.limitText, { color: colors.muted }]}>
                        {formatCurrency(card.usedLimit || 0)} / {formatCurrency(card.creditLimit)}
                        {(card.usedLimit || 0) > card.creditLimit && (
                          ` (Ultrapassou ${formatCurrency((card.usedLimit || 0) - card.creditLimit)})`
                        )}
                      </Text>
                    </View>
                  )}
                </View>
                
                <Text style={[styles.cardAmount, { color: colors.expense }]}>
                  {formatCurrency(card.total)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsText: {
    fontSize: 12,
  },
  cardsList: {
    marginTop: 8,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cardItemContent: {
    flex: 1,
    marginRight: 8,
  },
  cardItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  limitContainer: {
    marginLeft: 38,
    marginBottom: 4,
  },
  limitBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  limitBar: {
    height: '100%',
    borderRadius: 3,
  },
  limitText: {
    fontSize: 11,
  },
}); 