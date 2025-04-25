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
  manualExists?: boolean; // Flag para indicar se uma fatura manual foi encontrada
};

type PreviousBillCardProps = {
  totalAmount: number;
  cardsCount: number;
  cards: CardData[];
  onViewAllPress?: () => void;
  onCardPress?: (id: string) => void;
  onAddManualBill?: () => void;
};

export const PreviousBillCard = memo(({
  totalAmount,
  cardsCount,
  cards,
  onViewAllPress,
  onCardPress,
  onAddManualBill
}: PreviousBillCardProps) => {
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

  const handleAddManualBill = () => {
    if (onAddManualBill) {
      onAddManualBill();
    } else {
      router.push('/credit-cards/add-manual-bill' as any);
    }
  };

  // Verificar se há alguma fatura manual cadastrada
  const hasManualBills = cards.some(card => card.manualExists);

  return (
    <View style={styles.container}>
      <View style={styles.headerRight}>
        <TouchableOpacity onPress={handleAddManualBill} style={styles.addButton}>
          <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
          <Text style={[styles.addButtonText, { color: colors.primary }]}>
            {hasManualBills ? 'Editar' : 'Adicionar'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {cards.length > 0 ? (
          <>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryHeader}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>
                  Fatura do Mês Anterior
                </Text>
                <MaterialCommunityIcons 
                  name={hasManualBills ? "credit-card-check" : "credit-card-clock"} 
                  size={24} 
                  color={hasManualBills ? colors.income : colors.primary}
                />
              </View>
              <Text style={[styles.totalAmount, { color: colors.expense }]}>
                {formatCurrency(totalAmount)}
              </Text>
              <View style={styles.detailsContainer}>
                <Text style={[styles.detailsText, { color: colors.muted }]}>
                  {cardsCount} {cardsCount === 1 ? 'cartão utilizado' : 'cartões utilizados'}
                </Text>
                {hasManualBills && (
                  <View style={styles.manualBadgeContainer}>
                    <MaterialCommunityIcons name="check-circle" size={14} color={colors.income} style={{marginRight: 4}} />
                    <Text style={[styles.manualBadgeText, { color: colors.income }]}>
                      Cadastrado manualmente
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
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
                        <MaterialCommunityIcons 
                          name={card.manualExists ? "credit-card-check" : "credit-card"} 
                          size={16} 
                          color="#fff" 
                        />
                      </View>
                      <View>
                        <Text style={[styles.cardName, { color: colors.text }]}>
                          {card.name}
                          {card.lastDigits && ` (${card.lastDigits})`}
                        </Text>
                        {card.manualExists && (
                          <Text style={[styles.cardBadge, { color: colors.income }]}>
                            Adicionada manualmente
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  <Text style={[styles.cardAmount, { color: colors.expense }]}>
                    {formatCurrency(card.total)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity 
              style={[styles.historyButton, { borderColor: colors.primary }]}
              onPress={onViewAllPress}
            >
              <MaterialCommunityIcons name="history" size={16} color={colors.primary} style={styles.historyButtonIcon} />
              <Text style={[styles.historyButtonText, { color: colors.primary }]}>
                Ver histórico completo
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="credit-card-clock-outline" 
              size={48} 
              color={colors.muted} 
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Nenhuma fatura anterior
            </Text>
            <Text style={[styles.emptySubText, { color: colors.muted }]}>
              Adicione manualmente a fatura do mês anterior para acompanhar seus gastos com cartão de crédito
            </Text>
            <TouchableOpacity 
              style={[styles.addManualButton, { backgroundColor: colors.primary }]}
              onPress={handleAddManualBill}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.addManualButtonText}>
                Adicionar Fatura Manual
              </Text>
            </TouchableOpacity>
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
  headerRight: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
  detailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 12,
    marginRight: 8,
  },
  manualBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  manualBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardsList: {
    marginTop: 8,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '500',
  },
  cardBadge: {
    fontSize: 11,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  historyButtonIcon: {
    marginRight: 8,
  },
  historyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center'
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
    lineHeight: 20
  },
  addManualButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonIcon: {
    marginRight: 8
  },
  addManualButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 