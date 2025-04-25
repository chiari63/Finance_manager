import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTransactions } from '@/context/TransactionContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { formatCurrency } from '@/utils/formatters';

export default function AddManualBillScreen() {
  const router = useRouter();
  const { paymentMethods, addManualBill } = useTransactions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Estado de loading local
  const [loading, setLoading] = useState(false);
  
  // Filtrar apenas os cartões de crédito
  const creditCards = useMemo(() => {
    return paymentMethods.filter(method => method.type === 'credit');
  }, [paymentMethods]);
  
  // Estado para armazenar dados da fatura manual
  const [manualBills, setManualBills] = useState<{
    id: string;
    amount: string;
    reference: {
      month: number;
      year: number;
    };
  }[]>(creditCards.map(card => ({
    id: card.id,
    amount: '',
    reference: {
      month: new Date().getMonth() - 1 < 0 ? 11 : new Date().getMonth() - 1,
      year: new Date().getMonth() - 1 < 0 ? new Date().getFullYear() - 1 : new Date().getFullYear()
    }
  })));
  
  // Mês de referência (mês anterior)
  const referenceMonth = useMemo(() => {
    const now = new Date();
    let month = now.getMonth() - 1;
    let year = now.getFullYear();
    
    if (month < 0) {
      month = 11;
      year--;
    }
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return {
      name: `${monthNames[month]} ${year}`,
      month,
      year
    };
  }, []);
  
  // Atualizar o valor de um cartão específico
  const handleAmountChange = (id: string, value: string) => {
    // Remover qualquer caractere que não seja número
    const numericValue = value.replace(/[^0-9]/g, '');
    
    console.log(`Valor digitado: "${value}", valor numérico: "${numericValue}"`);
    
    setManualBills(prev => 
      prev.map(bill => 
        bill.id === id 
          ? { ...bill, amount: numericValue } 
          : bill
      )
    );
  };
  
  // Formatar para exibição no input
  const formatAmount = (value: string) => {
    if (!value) return '';
    
    // Converter para centavos
    const cents = parseInt(value);
    if (isNaN(cents)) return '';
    
    // Converter para reais com duas casas decimais
    return formatCurrency(cents / 100);
  };
  
  // Salvar todas as faturas
  const handleSave = async () => {
    // Filtrar apenas os cartões que possuem valor
    const billsToSave = manualBills
      .filter(bill => bill.amount.trim() !== '')
      .map(bill => {
        // Converter string para número (em reais)
        const amountCents = parseInt(bill.amount);
        const amountReais = amountCents / 100;
        
        console.log(`Fatura ${bill.id} - valor em centavos: ${amountCents}, valor em reais: ${amountReais}`);
        
        return {
          id: bill.id,
          amount: amountReais, // Converter de centavos para reais
          reference: bill.reference
        };
      }).filter(bill => bill.amount > 0); // Garantir que apenas valores positivos sejam salvos
    
    if (billsToSave.length === 0) {
      Alert.alert('Erro', 'Adicione pelo menos um valor de fatura para continuar.');
      return;
    }
    
    // Depuração
    console.log('Faturas a serem salvas:', billsToSave.length);
    billsToSave.forEach((bill, index) => {
      console.log(`Fatura #${index + 1}:`);
      console.log(`- ID: ${bill.id}`);
      console.log(`- Valor: ${bill.amount}`);
      console.log(`- Mês de referência: ${bill.reference.month}`);
      console.log(`- Ano de referência: ${bill.reference.year}`);
      
      const card = creditCards.find(c => c.id === bill.id);
      console.log(`- Cartão: ${card ? card.name : 'Desconhecido'}`);
    });
    
    try {
      // Mostrar feedback de carregamento
      setLoading(true);
      
      // Essa função agora salva como transações
      await addManualBill(billsToSave);
      
      Alert.alert(
        'Sucesso', 
        'Faturas anteriores adicionadas com sucesso! Você será redirecionado para a tela de histórico de faturas.',
        [{ 
          text: 'OK', 
          onPress: () => {
            // Navegar para a tela de histórico de faturas com parâmetro de refresh
            router.push(`/credit-cards/history?refresh=${Date.now()}`);
          } 
        }]
      );
    } catch (error) {
      console.error('Erro ao salvar faturas:', error);
      Alert.alert('Erro', 'Não foi possível salvar as faturas. Verifique os valores e tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Adicionar Fatura Manual
          </Text>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={[styles.referenceCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.referenceTitle, { color: colors.text }]}>
              Mês de Referência
            </Text>
            <Text style={[styles.referenceMonth, { color: colors.primary }]}>
              {referenceMonth.name}
            </Text>
            <Text style={[styles.referenceInfo, { color: colors.muted }]}>
              Adicione os valores da fatura do mês anterior para cada cartão
            </Text>
          </View>
          
          {creditCards.length > 0 ? (
            <View style={[styles.cardsContainer, { backgroundColor: colors.card }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Valores de Fatura por Cartão
              </Text>
              
              {creditCards.map((card, index) => {
                const billData = manualBills.find(bill => bill.id === card.id);
                
                return (
                  <View 
                    key={card.id} 
                    style={[
                      styles.cardItem,
                      index < creditCards.length - 1 && { 
                        borderBottomWidth: 1, 
                        borderBottomColor: colors.border 
                      }
                    ]}
                  >
                    <View style={styles.cardInfo}>
                      <View 
                        style={[
                          styles.cardIcon, 
                          { backgroundColor: (card as any).color || colors.primary }
                        ]}
                      >
                        <MaterialCommunityIcons name="credit-card" size={16} color="#fff" />
                      </View>
                      <View>
                        <Text style={[styles.cardName, { color: colors.text }]}>
                          {card.name}
                        </Text>
                        {(card as any).lastDigits && (
                          <Text style={[styles.cardNumber, { color: colors.muted }]}>
                            •••• {(card as any).lastDigits}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.inputContainer}>
                      <Text style={[styles.currencySymbol, { color: colors.text }]}>R$</Text>
                      <TextInput
                        style={[
                          styles.amountInput, 
                          { color: colors.expense, borderBottomColor: colors.border }
                        ]}
                        value={formatAmount(billData?.amount || '')}
                        onChangeText={(value) => handleAmountChange(card.id, value.replace(/[^0-9.,]/g, ''))}
                        placeholder="0,00"
                        placeholderTextColor={colors.muted}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
              <MaterialCommunityIcons 
                name="credit-card-off" 
                size={48} 
                color={colors.muted} 
              />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                Nenhum cartão de crédito cadastrado
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
          )}
          
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Faturas</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  content: {
    flex: 1,
    padding: 16,
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
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  referenceInfo: {
    fontSize: 14,
  },
  cardsContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  cardInfo: {
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
  cardNumber: {
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 4,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 80,
    textAlign: 'right',
    borderBottomWidth: 1,
    paddingBottom: 4,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  addCardButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addCardButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 16,
    marginBottom: 24,
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 