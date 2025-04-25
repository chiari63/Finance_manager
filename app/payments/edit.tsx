import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { calculateUsedLimit } from '@/utils/creditCardUtils';
import { PaymentMethod } from '@/types/TransactionTypes';

// Lista de tipos de pagamento
const PAYMENT_TYPES = [
  { id: 'credit', label: 'Cartão de Crédito', icon: 'credit-card', color: '#3498db' },
  { id: 'debit', label: 'Cartão de Débito', icon: 'credit-card-outline', color: '#2ecc71' },
  { id: 'pix', label: 'PIX', icon: 'qrcode', color: '#9b59b6' },
  { id: 'food', label: 'Vale-Refeição (VR)', icon: 'food', color: '#f39c12' },
  { id: 'digital', label: 'Carteira Digital', icon: 'wallet', color: '#f39c12' },
  { id: 'other', label: 'Outro', icon: 'cash', color: '#e74c3c' }
];

// Lista de bandeiras de cartão
const CARD_BRANDS = [
  { id: 'visa', label: 'Visa' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'elo', label: 'Elo' },
  { id: 'amex', label: 'American Express' },
  { id: 'hipercard', label: 'Hipercard' },
  { id: 'other', label: 'Outra' }
];

type PaymentType = 'credit' | 'debit' | 'pix' | 'digital' | 'food' | 'other';

// Interface para transações
interface Transaction {
  id: string;
  amount: number;
  date: Date;
  type: string;
  paymentMethodId: string;
  title?: string;
  description?: string;
  installment?: {
    current: number;
    total: number;
    originalAmount: number;
    startDate: Date;
  }
}

export default function EditPaymentMethodScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const methodId = params.id;
  const isEditing = !!methodId;
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showBrandPicker, setShowBrandPicker] = useState(false);
  const [cardTransactions, setCardTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  
  // Estado para o método de pagamento
  const [method, setMethod] = useState<PaymentMethod>({
    id: '',
    name: '',
    type: 'credit',
    color: PAYMENT_TYPES.find(t => t.id === 'credit')?.color || '',
    isDefault: false,
    lastUpdate: new Date(),
    creditLimit: 0,
    usedLimit: 0
  });
  
  // Calcular o total das transações para este cartão (limite usado)
  const usedLimit = useMemo(() => {
    if (cardTransactions.length === 0) return 0;
    
    // Usar a função utilitária para calcular o limite usado
    const calculatedLimit = calculateUsedLimit(cardTransactions);
    
    // Log para diagnóstico
    console.log("Calculando limite usado para cartão:", methodId);
    console.log(`Total de transações: ${cardTransactions.length}`);
    console.log(`Limite usado calculado: ${calculatedLimit}`);
    
    return calculatedLimit;
  }, [cardTransactions, methodId]);
  
  useEffect(() => {
    if (isEditing && user) {
      fetchPaymentMethod();
    }
  }, [methodId, user]);
  
  useEffect(() => {
    if (isEditing && user && methodId && method.type === 'credit') {
      fetchCardTransactions();
    }
  }, [methodId, user, method.type]);
  
  const fetchPaymentMethod = async () => {
    if (!user || !methodId) return;
    
    try {
      setLoading(true);
      const methodDoc = await getDoc(doc(db, `users/${user.id}/paymentMethods/${methodId}`));
      
      if (methodDoc.exists()) {
        const methodData = methodDoc.data() as PaymentMethod;
        setMethod({
          id: methodId,
          name: methodData.name || '',
          type: methodData.type || 'credit',
          color: methodData.color || PAYMENT_TYPES.find(t => t.id === 'credit')?.color || '',
          lastDigits: methodData.lastDigits || '',
          dueDate: methodData.dueDate || undefined,
          isDefault: methodData.isDefault || false,
          lastUpdate: methodData.lastUpdate ? 
            (methodData.lastUpdate instanceof Date ? 
              methodData.lastUpdate : 
              (methodData.lastUpdate.toDate ? methodData.lastUpdate.toDate() : new Date())
            ) : new Date(),
          creditLimit: methodData.creditLimit || 0,
          usedLimit: methodData.usedLimit || 0
        });
      } else {
        Alert.alert('Erro', 'Método de pagamento não encontrado.');
        router.back();
      }
    } catch (error) {
      console.error('Erro ao buscar método de pagamento:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do método de pagamento.');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCardTransactions = async () => {
    if (!user || !methodId) return;
    
    try {
      setTransactionsLoading(true);
      console.log("Buscando transações para o cartão:", methodId);
      
      // Buscar transações que usam este cartão de crédito (despesas)
      const transactionsRef = collection(db, `users/${user.id}/transactions`);
      const transactionsSnapshot = await getDocs(transactionsRef);
      
      console.log(`Total de transações encontradas: ${transactionsSnapshot.docs.length}`);
      
      const transactions = transactionsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          
          // Log de depuração para ver dados brutos
          if (data.installment) {
            console.log(`Dados brutos da parcela:`, JSON.stringify(data.installment));
          }
          
          // Certificar que os dados da parcela são processados corretamente
          const installment = data.installment 
            ? {
                current: data.installment.current || 1,
                total: data.installment.total || 1,
                originalAmount: data.installment.originalAmount || data.amount,
                startDate: data.installment.startDate?.toDate() || new Date(data.date?.toDate() || new Date())
              } 
            : undefined;
            
          return {
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            amount: data.amount || 0,
            type: data.type || 'expense',
            paymentMethodId: data.paymentMethodId || '',
            date: data.date?.toDate() || new Date(),
            installment
          };
        })
        .filter(transaction => {
          // Filtrar apenas despesas com este método de pagamento
          const isExpense = transaction.type === 'expense';
          const hasMatchingPaymentMethod = transaction.paymentMethodId === methodId;
          
          // Log para depuração
          if (isExpense && hasMatchingPaymentMethod && transaction.installment) {
            console.log(`Transação de cartão com parcela encontrada: ${transaction.title || transaction.description}`);
          }
          
          return isExpense && hasMatchingPaymentMethod;
        });
        
      console.log(`Encontradas ${transactions.length} transações para este cartão`);
      
      // Para depuração: mostrar detalhes de transações parceladas
      const installmentTransactions = transactions.filter(t => t.installment);
      if (installmentTransactions.length > 0) {
        console.log(`Encontradas ${installmentTransactions.length} transações parceladas:`);
        installmentTransactions.forEach(t => {
          // Agora sabemos que t.installment existe porque filtramos acima
          const installment = t.installment!;
          console.log(`- ${t.title || t.description}: Parcela ${installment.current}/${installment.total}, Valor Original: ${installment.originalAmount}, Valor da parcela: ${t.amount}, Data início: ${installment.startDate.toISOString()}`);
        });
      } else {
        console.log("Nenhuma transação parcelada encontrada para este cartão");
      }
        
      setCardTransactions(transactions);
    } catch (error) {
      console.error('Erro ao buscar transações do cartão:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    
    // Validação dos campos
    if (!method.name.trim()) {
      Alert.alert('Erro', 'Informe um nome para o método de pagamento.');
      return;
    }
    
    // Validações específicas para cartões
    const isCard = method.type === 'credit' || method.type === 'debit';
    if (isCard) {
      if (!method.lastDigits?.trim()) {
        Alert.alert('Erro', 'Informe os últimos 4 dígitos do cartão.');
        return;
      }
      
      if (!method.dueDate || method.dueDate < 1 || method.dueDate > 31) {
        Alert.alert('Erro', 'Informe um dia válido do vencimento do cartão.');
        return;
      }
    }
    
    try {
      setSaving(true);
      
      // Se for definido como padrão, precisamos atualizar os outros métodos
      if (method.isDefault) {
        const methodsCollection = collection(db, `users/${user.id}/paymentMethods`);
        const methodsSnapshot = await getDocs(methodsCollection);
        
        const batch = writeBatch(db);
        methodsSnapshot.forEach((docRef) => {
          if (docRef.id !== methodId) {
            batch.update(docRef.ref, { isDefault: false });
          }
        });
        await batch.commit();
      }
      
      // Dados a salvar
      const methodData: Record<string, any> = {
        name: method.name,
        type: method.type,
        color: method.color,
        isDefault: method.isDefault,
        lastUpdate: new Date()
      };
      
      // Adicionar campos específicos para cartões
      if (isCard) {
        methodData.lastDigits = method.lastDigits;
        methodData.dueDate = method.dueDate;
        
        // Adicionar dados do limite apenas para cartões de crédito
        if (method.type === 'credit') {
          methodData.creditLimit = method.creditLimit || 0;
        }
      }
      
      if (isEditing && methodId) {
        // Atualizando método existente
        await updateDoc(doc(db, `users/${user.id}/paymentMethods/${methodId}`), methodData);
        Alert.alert('Sucesso', 'Método de pagamento atualizado com sucesso!');
      } else {
        // Criando novo método
        await addDoc(collection(db, `users/${user.id}/paymentMethods`), methodData);
        Alert.alert('Sucesso', 'Método de pagamento adicionado com sucesso!');
      }
      
      router.back();
    } catch (error) {
      console.error('Erro ao salvar método de pagamento:', error);
      Alert.alert('Erro', 'Não foi possível salvar o método de pagamento.');
    } finally {
      setSaving(false);
    }
  };
  
  const formatCardNumber = (text: string) => {
    // Remove todos os caracteres não-numéricos
    const cleaned = text.replace(/\D/g, '');
    
    // Formatar como XXXX XXXX XXXX XXXX
    let formatted = '';
    for (let i = 0; i < cleaned.length; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += cleaned[i];
    }
    
    return formatted.slice(0, 19); // Limitar a 16 dígitos + 3 espaços
  };
  
  const formatExpiryDate = (text: string) => {
    // Remove todos os caracteres não-numéricos
    const cleaned = text.replace(/\D/g, '');
    
    // Formatar como MM/AA
    if (cleaned.length > 0) {
      const month = cleaned.slice(0, 2);
      const year = cleaned.slice(2, 4);
      
      if (cleaned.length > 2) {
        return `${month}/${year}`;
      } else {
        return month;
      }
    }
    
    return cleaned;
  };
  
  const renderTypePicker = () => {
    return (
      <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Tipo de Pagamento</Text>
          <TouchableOpacity onPress={() => setShowTypePicker(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.pickerList}>
          {PAYMENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.pickerItem,
                { borderBottomColor: colors.border }
              ]}
              onPress={() => {
                setMethod({ ...method, type: type.id as PaymentType });
                setShowTypePicker(false);
              }}
            >
              <View style={styles.pickerItemContent}>
                <MaterialCommunityIcons name={type.icon as any} size={24} color={colors.primary} />
                <Text style={[styles.pickerItemText, { color: colors.text }]}>
                  {type.label}
                </Text>
              </View>
              
              {method.type === type.id && (
                <Ionicons name="checkmark" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  const renderBrandPicker = () => {
    return (
      <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.pickerHeader, { borderBottomColor: colors.border }]}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Bandeira do Cartão</Text>
          <TouchableOpacity onPress={() => setShowBrandPicker(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.pickerList}>
          {CARD_BRANDS.map((brand) => (
            <TouchableOpacity
              key={brand.id}
              style={[
                styles.pickerItem,
                { borderBottomColor: colors.border }
              ]}
              onPress={() => {
                setMethod({ ...method, brand: brand.id });
                setShowBrandPicker(false);
              }}
            >
              <Text style={[styles.pickerItemText, { color: colors.text }]}>
                {brand.label}
              </Text>
              
              {method.brand === brand.id && (
                <Ionicons name="checkmark" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  const isCard = method.type === 'credit' || method.type === 'debit';
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Carregando...</Text>
      </View>
    );
  }
  
  // Encontrar o tipo atual para exibir
  const currentType = PAYMENT_TYPES.find(t => t.id === method.type);
  const currentBrand = CARD_BRANDS.find(b => b.id === method.brand);
  
  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? 'Editar Pagamento' : 'Novo Pagamento'}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content}>
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={method.name}
              onChangeText={(text) => setMethod({ ...method, name: text })}
              placeholder="Ex: Cartão Principal"
              placeholderTextColor={colors.muted}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.formRow, styles.pickerButton]}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
            <View style={[styles.pickerValueContainer, { borderColor: colors.border }]}>
              <View style={styles.pickerSelected}>
                <MaterialCommunityIcons 
                  name={PAYMENT_TYPES.find(t => t.id === method.type)?.icon as any} 
                  size={20} 
                  color={colors.primary} 
                  style={styles.pickerIcon} 
                />
                <Text style={[styles.pickerValue, { color: colors.text }]}>
                  {PAYMENT_TYPES.find(t => t.id === method.type)?.label || 'Selecione'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </View>
          </TouchableOpacity>
          
          {(method.type === 'credit' || method.type === 'debit') && (
            <>
              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.text }]}>Últimos 4 dígitos</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={method.lastDigits}
                  onChangeText={(text) => setMethod({ ...method, lastDigits: text.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="XXXX"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  maxLength={4}
                />
              </View>
              
              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.text }]}>Dia do vencimento</Text>
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                  value={method.dueDate?.toString() || ''}
                  onChangeText={(text) => {
                    const day = parseInt(text.replace(/\D/g, ''));
                    if (day >= 1 && day <= 31) {
                      setMethod({ ...method, dueDate: day });
                    } else if (text === '') {
                      setMethod({ ...method, dueDate: undefined });
                    }
                  }}
                  placeholder="Ex: 15"
                  placeholderTextColor={colors.muted}
                  keyboardType="numeric"
                  maxLength={2}
                />
              </View>
              
              {method.type === 'credit' && (
                <>
                  <View style={styles.formRow}>
                    <Text style={[styles.label, { color: colors.text }]}>Limite Total (R$)</Text>
                    <TextInput
                      style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                      value={method.creditLimit ? method.creditLimit.toString() : ''}
                      onChangeText={(text) => {
                        const limit = parseFloat(text.replace(/[^\d]/g, ''));
                        setMethod({ ...method, creditLimit: isNaN(limit) ? 0 : limit });
                      }}
                      placeholder="Ex: 5000"
                      placeholderTextColor={colors.muted}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.formInfoRow}>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Limite Usado:</Text>
                    <Text style={[styles.infoValue, { color: colors.expense }]}>
                      {isEditing ? (
                        transactionsLoading ? 
                          "Calculando..." : 
                          `R$ ${usedLimit.toFixed(2)}`
                      ) : (
                        'R$ 0.00'
                      )}
                    </Text>
                  </View>
                  
                  <View style={styles.formInfoRow}>
                    <Text style={[styles.infoLabel, { color: colors.text }]}>Limite Disponível:</Text>
                    <Text style={[styles.infoValue, { 
                      color: ((method.creditLimit || 0) - usedLimit) < 0 ? colors.expense : colors.income 
                    }]}>
                      {isEditing ? (
                        transactionsLoading ? 
                          "Calculando..." : 
                          `R$ ${((method.creditLimit || 0) - usedLimit).toFixed(2)}`
                      ) : (
                        `R$ ${((method.creditLimit || 0)).toFixed(2)}`
                      )}
                    </Text>
                  </View>
                  
                  {isEditing && !transactionsLoading && ((method.creditLimit || 0) - usedLimit) < 0 && (
                    <View style={styles.warningContainer}>
                      <MaterialCommunityIcons 
                        name="alert-circle" 
                        size={20} 
                        color={colors.expense} 
                      />
                      <Text style={[styles.warningText, { color: colors.expense }]}>
                        Limite ultrapassado em R$ {Math.abs((method.creditLimit || 0) - usedLimit).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </>
          )}
          
          <View style={[styles.formRow, styles.switchRow]}>
            <Text style={[styles.label, { color: colors.text }]}>Definir como padrão</Text>
            <Switch
              value={method.isDefault}
              onValueChange={(value) => setMethod({ ...method, isDefault: value })}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={method.isDefault ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>
        
        <TouchableOpacity 
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Atualizar' : 'Adicionar'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {showTypePicker && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          {renderTypePicker()}
        </View>
      )}
      
      {showBrandPicker && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          {renderBrandPicker()}
        </View>
      )}
    </KeyboardAvoidingView>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  formRow: {
    marginBottom: 16,
  },
  formRowGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  formRowHalf: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  pickerButton: {
    
  },
  pickerValueContainer: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerSelected: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerIcon: {
    marginRight: 8,
  },
  pickerValue: {
    fontSize: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  pickerContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 400,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  pickerList: {
    
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerItemText: {
    fontSize: 16,
    marginLeft: 12,
  },
  formInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  warningText: {
    marginLeft: 8,
  },
}); 