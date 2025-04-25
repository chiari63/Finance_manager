import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTransactions } from '@/context/TransactionContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/formatters';
import { usePreviousBills } from '@/hooks/usePreviousBills';
import { TransactionType } from '@/constants/Categories';
import { collection, getDocs, query, where, Timestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';

interface Transaction {
  id: string;
  amount: number;
  date: Date;
  type: TransactionType;
  paymentMethodId: string;
  title?: string;
  description?: string;
  isManualBill?: boolean;
  [key: string]: any; // Para outras propriedades
}

export default function CreditCardHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ refresh: string }>();
  const { paymentMethods, currentMonth, transactions, isLoading } = useTransactions();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [refreshing, setRefreshing] = useState(false);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  
  // Estado para forçar atualização
  const [updateKey, setUpdateKey] = useState(Date.now());
  
  useEffect(() => {
    if (params.refresh) {
      setUpdateKey(Date.now());
      fetchAllTransactions();
    }
  }, [params.refresh]);
  
  // Carregar todas as transações do Firestore
  useEffect(() => {
    fetchAllTransactions();
  }, []);
  
  // Função para buscar todas as transações (incluindo meses anteriores)
  const fetchAllTransactions = async () => {
    if (!user) return;
    
    try {
      setLoadingTransactions(true);
      
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
      
      setAllTransactions(fetchedTransactions);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as transações.');
    } finally {
      setLoadingTransactions(false);
    }
  };
  
  // Filtrar apenas os cartões de crédito
  const creditCards = useMemo(() => {
    return paymentMethods.filter(method => method.type === 'credit');
  }, [paymentMethods]);
  
  // Obter faturas do mês anterior usando o hook - passando todas as transações
  const { previousMonthBills, totalPreviousBill } = usePreviousBills(
    creditCards,
    allTransactions.length > 0 ? allTransactions : transactions,
    currentMonth,
    updateKey
  );
  
  // Mês de referência (mês anterior)
  const referenceMonth = useMemo(() => {
    let prevMonth = currentMonth.month - 1;
    let prevYear = currentMonth.year;
    
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear--;
    }
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return {
      name: `${monthNames[prevMonth]} ${prevYear}`,
      month: prevMonth,
      year: prevYear
    };
  }, [currentMonth]);
  
  // Função para navegar para a tela de adicionar fatura manual
  const handleAddManualBill = () => {
    router.push('/credit-cards/add-manual-bill');
  };
  
  // Função para atualizar a tela
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchAllTransactions();
    setUpdateKey(Date.now());
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);
  
  // Função para limpar todas as faturas manuais do mês anterior
  const handleClearManualBills = async () => {
    if (!user) return;
    
    Alert.alert(
      'Limpar Faturas Manuais',
      'Você tem certeza que deseja remover todas as faturas manuais do mês anterior? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpar', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingTransactions(true);
              
              // Obter o mês e ano anteriores
              let prevMonth = currentMonth.month - 1;
              let prevYear = currentMonth.year;
              
              if (prevMonth < 0) {
                prevMonth = 11; // Dezembro
                prevYear -= 1;
              }
              
              // Buscar todas as transações (sem filtro complexo para evitar necessidade de índice)
              const transactionsRef = collection(db, 'users', user.id, 'transactions');
              const querySnapshot = await getDocs(transactionsRef);
              
              // Filtrar manualmente as faturas manuais do mês anterior
              const manualBillsToDelete = querySnapshot.docs
                .map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  date: doc.data().date?.toDate ? doc.data().date.toDate() : new Date(doc.data().date)
                }))
                .filter(transaction => {
                  // Verificar se é do mês anterior
                  const transactionData = transaction as any;
                  return transactionData.date.getMonth() === prevMonth &&
                         transactionData.date.getFullYear() === prevYear &&
                         transactionData.isManualBill === true;
                });
              
              if (manualBillsToDelete.length === 0) {
                Alert.alert('Informação', 'Não foram encontradas faturas manuais para remover.');
                setLoadingTransactions(false);
                return;
              }
              
              // Excluir cada fatura manual
              const deletePromises = manualBillsToDelete.map(async (bill) => {
                await deleteDoc(doc(db, 'users', user.id, 'transactions', bill.id));
              });
              
              await Promise.all(deletePromises);
              
              Alert.alert(
                'Sucesso', 
                'Faturas manuais removidas com sucesso! Agora você pode adicionar novos valores.',
                [
                  { 
                    text: 'OK', 
                    onPress: () => {
                      // Atualizar os dados após excluir
                      fetchAllTransactions();
                      setUpdateKey(Date.now());
                    } 
                  }
                ]
              );
              
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível remover as faturas manuais. Tente novamente.');
            } finally {
              setLoadingTransactions(false);
            }
          }
        }
      ]
    );
  };
  
  if ((isLoading || loadingTransactions) && !refreshing) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 20 }}>Carregando...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Histórico de Faturas
        </Text>
        <TouchableOpacity onPress={handleAddManualBill}>
          <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
      >
        <View style={[styles.referenceCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.referenceTitle, { color: colors.text }]}>
            Mês de Referência
          </Text>
          <Text style={[styles.referenceMonth, { color: colors.primary }]}>
            {referenceMonth.name}
          </Text>
          
          <View style={styles.totalContainer}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>
              Total de Faturas:
            </Text>
            <Text style={[styles.totalAmount, { color: colors.expense }]}>
              {formatCurrency(totalPreviousBill)}
            </Text>
          </View>
          
          {/* Botão para limpar faturas manuais */}
          <TouchableOpacity 
            style={[styles.clearButton, { borderColor: colors.expense }]}
            onPress={handleClearManualBills}
          >
            <MaterialCommunityIcons name="delete-outline" size={18} color={colors.expense} style={styles.clearButtonIcon} />
            <Text style={[styles.clearButtonText, { color: colors.expense }]}>
              Limpar Faturas e Adicionar Novamente
            </Text>
          </TouchableOpacity>
        </View>
        
        {previousMonthBills.length > 0 ? (
          <View style={[styles.billsContainer, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Faturas por Cartão
            </Text>
            
            {previousMonthBills.map((bill, index) => (
              <View 
                key={bill.id}
                style={[
                  styles.billItem,
                  index < previousMonthBills.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border
                  }
                ]}
              >
                <View style={styles.billInfo}>
                  <View 
                    style={[
                      styles.cardIcon,
                      { backgroundColor: bill.color || colors.primary }
                    ]}
                  >
                    <MaterialCommunityIcons name="credit-card" size={16} color="#fff" />
                  </View>
                  <View>
                    <Text style={[styles.cardName, { color: colors.text }]}>
                      {bill.name}
                      {bill.lastDigits && ` (Final ${bill.lastDigits})`}
                    </Text>
                    {bill.manualExists && (
                      <Text style={[styles.manualBadge, { color: colors.primary }]}>
                        Adicionada manualmente
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={[styles.billAmount, { color: colors.expense }]}>
                  {formatCurrency(bill.total)}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons 
              name="credit-card-off" 
              size={64} 
              color={colors.muted} 
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              Nenhuma fatura encontrada
            </Text>
            <Text style={[styles.emptySubText, { color: colors.muted }]}>
              Adicione manualmente a fatura do mês anterior para acompanhar seus gastos
            </Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddManualBill}
            >
              <MaterialCommunityIcons name="plus" size={16} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.addButtonText}>
                Adicionar Fatura Manual
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  referenceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  referenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  referenceMonth: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  clearButtonIcon: {
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  billsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  billInfo: {
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
    fontSize: 16,
    fontWeight: '500',
  },
  manualBadge: {
    fontSize: 12,
    marginTop: 4,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 32,
    borderRadius: 16,
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
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
}); 