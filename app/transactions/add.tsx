import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Switch,
  Modal
} from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTransactions } from '../../context/TransactionContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatCurrency } from '../../utils/formatters';
import { TransactionType, TransactionFrequency, CATEGORIES } from '../../constants/Categories';
import { sanitizeString, sanitizeNumber } from '../../utils/securityUtils';
import { PaymentMethod } from '../../types/TransactionTypes';

// Filtrar categorias por tipo (despesa ou receita)
const EXPENSE_CATEGORIES = CATEGORIES.filter(cat => 
  ['food', 'transport', 'leisure', 'games', 'health', 'clothing', 'electronics', 'housing', 'subscriptions', 'education', 'bank', 'misc'].includes(cat.id)
);

// Categorias para receitas
const INCOME_CATEGORIES = CATEGORIES.filter(cat => 
  ['salary', 'bonus', 'food_voucher', 'investment'].includes(cat.id)
);

export default function AddTransactionScreen() {
  const { user } = useAuth();
  const { accounts, paymentMethods, loadAccounts, loadPaymentMethods, addTransaction } = useTransactions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [isLoading, setIsLoading] = useState(false);
  const [isIncome, setIsIncome] = useState(false);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);
  
  const [useInstallments, setUseInstallments] = useState(false);
  const [installments, setInstallments] = useState(1);
  
  // Adicionar novos estados para controle de compras parceladas retroativas
  const [isPastPurchase, setIsPastPurchase] = useState(false);
  const [paidInstallments, setPaidInstallments] = useState(0);
  
  useEffect(() => {
    // Carregar contas e métodos de pagamento
    loadAccounts();
    loadPaymentMethods();
  }, []);
  
  // Função para gerar os dias do calendário
  const generateCalendarDays = () => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const days = [];
    
    // Add days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ date: null });
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(date.getFullYear(), date.getMonth(), i) });
    }
    
    // Add days to fill the last row
    const remainingCells = 42 - days.length; // 6 rows * 7 days
    for (let i = 0; i < remainingCells; i++) {
      days.push({ date: null });
    }
    
    return days;
  };
  
  // Formatar o valor
  const handleAmountChange = (text: string) => {
    // Remover qualquer caracter que não seja número ou vírgula
    let value = text.replace(/[^0-9,]/g, '');
    
    // Permitir apenas uma vírgula
    const commaCount = (value.match(/,/g) || []).length;
    if (commaCount > 1) {
      const parts = value.split(',');
      value = parts[0] + ',' + parts.slice(1).join('');
    }
    
    setAmount(value);
  };
  
  // Converter string para número
  const parseAmount = (amountStr: string): number => {
    return parseFloat(amountStr.replace(',', '.')) || 0;
  };
  
  // Alternar entre receita e despesa
  const toggleTransactionType = () => {
    setIsIncome(!isIncome);
    setSelectedCategory(''); // Resetar categoria ao mudar o tipo
  };
  
  // Lidar com a mudança de data
  const handleDateChange = (selectedDate: Date) => {
    setShowDatePicker(false);
    setDate(selectedDate);
  };
  
  // Função de salvar transação
  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    
    // Validar campos obrigatórios
    if (!description.trim()) {
      Alert.alert('Erro', 'Descrição é obrigatória');
      return;
    }
    
    // Sanitizar dados
    const sanitizedDescription = sanitizeString(description);
    const sanitizedAmount = sanitizeNumber(amount);
    const sanitizedNotes = notes ? sanitizeString(notes) : '';
    
    // Verificar se valor é maior que zero
    if (sanitizedAmount <= 0) {
      Alert.alert('Erro', 'Valor deve ser maior que zero');
      return;
    }
    
    if (!selectedCategory) {
      Alert.alert('Erro', 'Selecione uma categoria para a transação.');
      return;
    }
    
    // Verificar se o método de pagamento selecionado é VR/Vale Alimentação
    const isVoucherPayment = !isIncome && selectedPaymentMethod && 
      paymentMethods.find(m => m.id === selectedPaymentMethod)?.type === 'food';
    
    // Verificar se é uma receita que precisa de conta (salário, bônus, investimento)
    const isIncomeRequiringAccount = isIncome && 
      ['salary', 'bonus', 'investment'].includes(selectedCategory);
    
    // Exigir conta para despesas normais e receitas específicas
    if ((!isIncome && !isVoucherPayment && !selectedAccount) || 
        (isIncomeRequiringAccount && !selectedAccount)) {
      Alert.alert('Erro', isIncome 
        ? 'Selecione uma conta para depositar esta receita.'
        : 'Selecione uma conta para a transação.');
      return;
    }
    
    if (!isIncome && !selectedPaymentMethod) {
      Alert.alert('Erro', 'Selecione um método de pagamento para a despesa.');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Verificar se é uma transação parcelada
      const isInstallmentTransaction = 
        !isIncome && 
        useInstallments && 
        installments > 1 && 
        paymentMethods.find(m => m.id === selectedPaymentMethod)?.type === 'credit';
      
      const parsedAmount = parseAmount(amount);
      
      // Criar dados da transação
      const baseTransactionData = {
        title: sanitizedDescription,
        description: sanitizedDescription,
        amount: parsedAmount,
        type: isIncome ? TransactionType.INCOME : TransactionType.EXPENSE,
        categoryId: selectedCategory,
        accountId: isVoucherPayment ? null : 
                  (isIncome && !['salary', 'bonus', 'investment'].includes(selectedCategory)) ? null : 
                  selectedAccount,
        paymentMethodId: isIncome ? null : (selectedPaymentMethod || null),
        date: date,
        frequency: TransactionFrequency.VARIABLE,
        notes: sanitizedNotes
      };
      
      if (isInstallmentTransaction) {
        // Valor de cada parcela
        const installmentAmount = parsedAmount / installments;
        
        // Para compras retroativas, garantir que a data original seja preservada
        // mesmo que a parcela atual seja maior que 1
        const startDate = date; // Preserva a data original da compra
        
        if (isPastPurchase && paidInstallments > 0) {
          // Caso seja uma compra retroativa com parcelas já pagas
          if (paidInstallments >= installments) {
            Alert.alert('Erro', 'O número de parcelas pagas não pode ser maior ou igual ao total de parcelas');
            setIsLoading(false);
            return;
          }
          
          // Calcular a parcela atual (próxima a ser paga)
          const currentInstallment = paidInstallments + 1;
          
          // Dados da próxima parcela
          const installmentData = {
            ...baseTransactionData,
            amount: installmentAmount,
            installment: {
              current: currentInstallment,
              total: installments,
              originalAmount: parsedAmount,
              startDate: startDate // Usar a data original da compra
            }
          };
          
          // Log para depuração
          console.log('Adicionando compra parcelada retroativa:', {
            description: sanitizedDescription,
            parcela: `${currentInstallment}/${installments}`,
            valorParcela: installmentAmount,
            valorTotal: parsedAmount,
            dataCompra: startDate.toISOString(),
          });
          
          // Usar a função addTransaction do contexto em vez de addDoc diretamente
          await addTransaction(installmentData);
          
          Alert.alert(
            'Sucesso', 
            `Transação parcelada (${currentInstallment}/${installments}) registrada com sucesso! As próximas parcelas serão geradas automaticamente.`
          );
        } else {
          // Caso normal - primeira parcela
          const installmentData = {
            ...baseTransactionData,
            amount: installmentAmount,
            installment: {
              current: 1,
              total: installments,
              originalAmount: parsedAmount,
              startDate: startDate // Usar a data original da compra
            }
          };
          
          // Usar a função addTransaction do contexto em vez de addDoc diretamente
          await addTransaction(installmentData);
          
          Alert.alert(
            'Sucesso', 
            `Transação parcelada (1/${installments}) registrada com sucesso! As próximas parcelas serão geradas automaticamente.`
          );
        }
      } else {
        // Usar a função addTransaction do contexto em vez de addDoc diretamente
        console.log('📊 Detalhes da transação antes de salvar:', {
          title: baseTransactionData.title,
          amount: baseTransactionData.amount,
          type: baseTransactionData.type,
          categoryId: baseTransactionData.categoryId,
          accountId: baseTransactionData.accountId,
          paymentMethodId: baseTransactionData.paymentMethodId,
          isIncome: isIncome,
          isReceita: baseTransactionData.type === TransactionType.INCOME,
          categoriaEspecial: ['salary', 'bonus', 'investment'].includes(baseTransactionData.categoryId)
        });
        
        await addTransaction(baseTransactionData);
        Alert.alert('Sucesso', 'Transação registrada com sucesso!');
      }
      
      router.back();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      Alert.alert('Erro', 'Não foi possível salvar a transação.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Categorias disponíveis com base no tipo de transação
  const categories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  
  // Encontrar informações da categoria selecionada
  const selectedCategoryInfo = categories.find(cat => cat.id === selectedCategory);
  
  // Encontrar informações da conta selecionada
  const selectedAccountInfo = accounts.find(acc => acc.id === selectedAccount);
  
  // Encontrar informações do método de pagamento selecionado
  const selectedPaymentMethodInfo = paymentMethods.find(method => method.id === selectedPaymentMethod);
  
  // Modificar completamente o componente de seleção de parcelas
  const InstallmentSelector = () => {
    const availableInstallments = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const currentInstallments = Array.from({ length: installments }, (_, i) => i + 1);

    return (
      <>
        <View style={styles.formRow}>
          <Text style={[styles.label, { color: colors.text }]}>Número de Parcelas</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.installmentScrollView}>
            {availableInstallments.map(num => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.installmentNumberOption,
                  installments === num && { backgroundColor: colors.primary },
                  { borderColor: colors.border }
                ]}
                onPress={() => {
                  setInstallments(num);
                  // Ajustar as parcelas pagas para não exceder o total
                  if (paidInstallments >= num) {
                    setPaidInstallments(0);
                  }
                }}
              >
                <Text
                  style={[
                    styles.installmentNumberText,
                    { color: installments === num ? '#fff' : colors.text }
                  ]}
                >
                  {num}x
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <Text style={[styles.installmentInfo, { color: colors.muted, marginTop: 10 }]}>
            {installments > 1
              ? `${installments}x de ${formatCurrency(parseAmount(amount) / installments)}`
              : 'Pagamento à vista'
            }
          </Text>
        </View>

        <View style={styles.formRow}>
          <View style={styles.switchContainer}>
            <Text style={[styles.label, { color: colors.text }]}>É uma compra retroativa?</Text>
            <Switch
              value={isPastPurchase}
              onValueChange={(value) => {
                setIsPastPurchase(value);
                if (!value) setPaidInstallments(0);
              }}
              trackColor={{ false: colors.border, true: `${colors.primary}80` }}
              thumbColor={isPastPurchase ? colors.primary : '#f4f3f4'}
            />
          </View>
          <Text style={[styles.helperText, { color: colors.muted }]}>
            Ative para compras anteriores com parcelas em andamento
          </Text>
        </View>

        {isPastPurchase && (
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Qual parcela está pagando agora?</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.installmentScrollView}>
              {currentInstallments.map(num => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.installmentNumberOption,
                    (paidInstallments + 1) === num && { backgroundColor: colors.primary },
                    { borderColor: colors.border }
                  ]}
                  onPress={() => setPaidInstallments(num - 1)}
                >
                  <Text
                    style={[
                      styles.installmentNumberText,
                      { color: (paidInstallments + 1) === num ? '#fff' : colors.text }
                    ]}
                  >
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <Text style={[styles.installmentInfo, { color: colors.muted, marginTop: 10 }]}>
              Registrando a parcela {paidInstallments + 1} de {installments}
            </Text>
          </View>
        )}
      </>
    );
  };
  
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isIncome ? 'Nova Receita' : 'Nova Despesa'}
        </Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.content}>
        {/* Toggle para alternar entre receita e despesa */}
        <View style={[styles.toggleContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              !isIncome && { backgroundColor: colors.primary }
            ]}
            onPress={() => setIsIncome(false)}
          >
            <Text
              style={[
                styles.toggleText,
                { color: !isIncome ? '#fff' : colors.text }
              ]}
            >
              Despesa
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              isIncome && { backgroundColor: colors.primary }
            ]}
            onPress={() => setIsIncome(true)}
          >
            <Text
              style={[
                styles.toggleText,
                { color: isIncome ? '#fff' : colors.text }
              ]}
            >
              Receita
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Formulário */}
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          {/* Valor */}
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Valor (R$)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0,00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
          </View>
          
          {/* Descrição */}
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: Compras no supermercado"
              placeholderTextColor={colors.muted}
            />
          </View>
          
          {/* Data */}
          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={[styles.label, { color: colors.text }]}>Data</Text>
            <View style={[styles.datePickerButton, { borderColor: colors.border }]}>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {date.toLocaleDateString()}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.muted} />
            </View>
          </TouchableOpacity>
          
          {/* Categoria */}
          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
            <View style={[styles.pickerButton, { borderColor: colors.border }]}>
              {selectedCategoryInfo ? (
                <View style={styles.selectedItem}>
                  <MaterialCommunityIcons
                    name={selectedCategoryInfo.icon as any}
                    size={20}
                    color={colors.primary}
                    style={styles.selectedItemIcon}
                  />
                  <Text style={[styles.selectedItemText, { color: colors.text }]}>
                    {selectedCategoryInfo.name}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.placeholderText, { color: colors.muted }]}>
                  Selecione uma categoria
                </Text>
              )}
              <Ionicons name="chevron-down" size={20} color={colors.muted} />
            </View>
          </TouchableOpacity>
          
          {/* Campo Conta */}
          {(!isIncome || (isIncome && ['salary', 'bonus', 'investment'].includes(selectedCategory))) 
            && !(selectedPaymentMethodInfo && selectedPaymentMethodInfo.type === 'food') && (
            <TouchableOpacity
              style={styles.formRow}
              onPress={() => setShowAccountPicker(true)}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                {isIncome ? 'Conta para Depósito' : 'Conta'}
              </Text>
              <View style={[styles.pickerButton, { borderColor: colors.border }]}>
                {selectedAccountInfo ? (
                  <View style={styles.selectedItem}>
                    <Text style={[styles.selectedItemText, { color: colors.text }]}>
                      {selectedAccountInfo.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.placeholderText, { color: colors.muted }]}>
                    Selecione uma conta
                  </Text>
                )}
                <Ionicons name="chevron-down" size={20} color={colors.muted} />
              </View>
            </TouchableOpacity>
          )}
          
          {/* Método de Pagamento (apenas para despesas) */}
          {!isIncome && (
            <TouchableOpacity
              style={styles.formRow}
              onPress={() => setShowPaymentMethodPicker(true)}
            >
              <Text style={[styles.label, { color: colors.text }]}>Método de Pagamento</Text>
              <View style={[styles.pickerButton, { borderColor: colors.border }]}>
                {selectedPaymentMethodInfo ? (
                  <View style={styles.selectedItem}>
                    <Text style={[styles.selectedItemText, { color: colors.text }]}>
                      {selectedPaymentMethodInfo.name}
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.placeholderText, { color: colors.muted }]}>
                    Selecione um método de pagamento
                  </Text>
                )}
                <Ionicons name="chevron-down" size={20} color={colors.muted} />
              </View>
            </TouchableOpacity>
          )}
          
          {/* Adicionar controle de parcelas quando o método de pagamento for cartão de crédito */}
          {!isIncome && 
            selectedPaymentMethodInfo && 
            selectedPaymentMethodInfo.type === 'credit' && (
            <>
              <View style={styles.formRow}>
                <Text style={[styles.label, { color: colors.text }]}>Parcelamento</Text>
                <View style={styles.installmentRow}>
                  <TouchableOpacity
                    style={[
                      styles.installmentOption,
                      !useInstallments && { backgroundColor: colors.primary },
                      { borderColor: colors.border }
                    ]}
                    onPress={() => setUseInstallments(false)}
                  >
                    <Text 
                      style={[
                        styles.installmentOptionText, 
                        { color: !useInstallments ? '#fff' : colors.text }
                      ]}
                    >
                      À vista
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.installmentOption,
                      useInstallments && { backgroundColor: colors.primary },
                      { borderColor: colors.border }
                    ]}
                    onPress={() => setUseInstallments(true)}
                  >
                    <Text 
                      style={[
                        styles.installmentOptionText, 
                        { color: useInstallments ? '#fff' : colors.text }
                      ]}
                    >
                      Parcelado
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              {useInstallments && <InstallmentSelector />}
            </>
          )}
        </View>
        
        {/* Botão Salvar */}
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {/* Modal de Picker de Categorias */}
      {showCategoryPicker && (
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Selecione uma categoria
            </Text>
            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.modalItem,
                  { borderBottomColor: colors.border }
                ]}
                onPress={() => {
                  setSelectedCategory(category.id);
                  setShowCategoryPicker(false);
                }}
              >
                <MaterialCommunityIcons
                  name={category.icon as any}
                  size={22}
                  color={colors.primary}
                  style={styles.modalItemIcon}
                />
                <Text style={[styles.modalItemText, { color: colors.text }]}>
                  {category.name}
                </Text>
                {selectedCategory === category.id && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      {/* Modal de Picker de Contas */}
      {showAccountPicker && (
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Selecione uma conta
            </Text>
            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.border }
                  ]}
                  onPress={() => {
                    setSelectedAccount(account.id);
                    setShowAccountPicker(false);
                  }}
                >
                  <View
                    style={[
                      styles.accountColor,
                      { backgroundColor: account.color || colors.primary }
                    ]}
                  />
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {account.name}
                  </Text>
                  {selectedAccount === account.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.muted }]}>
                  Nenhuma conta cadastrada.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyStateButton, { borderColor: colors.primary }]}
                  onPress={() => {
                    setShowAccountPicker(false);
                    router.push('/accounts' as any);
                  }}
                >
                  <Text style={[styles.emptyStateButtonText, { color: colors.primary }]}>
                    Adicionar Conta
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
      
      {/* Modal de Picker de Métodos de Pagamento */}
      {showPaymentMethodPicker && (
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Selecione um método de pagamento
            </Text>
            <TouchableOpacity onPress={() => setShowPaymentMethodPicker(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {paymentMethods.length > 0 ? (
              paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method.id}
                  style={[
                    styles.modalItem,
                    { borderBottomColor: colors.border }
                  ]}
                  onPress={() => {
                    setSelectedPaymentMethod(method.id);
                    setShowPaymentMethodPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>
                    {method.name}
                    {method.lastDigits ? ` (Final ${method.lastDigits})` : ''}
                  </Text>
                  {selectedPaymentMethod === method.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyStateText, { color: colors.muted }]}>
                  Nenhum método de pagamento cadastrado.
                </Text>
                <TouchableOpacity
                  style={[styles.emptyStateButton, { borderColor: colors.primary }]}
                  onPress={() => {
                    setShowPaymentMethodPicker(false);
                    router.push('/payments' as any);
                  }}
                >
                  <Text style={[styles.emptyStateButtonText, { color: colors.primary }]}>
                    Adicionar Método de Pagamento
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      )}
      
      {/* Date Picker */}
      {showDatePicker && (
        <Modal
          transparent={true}
          visible={showDatePicker}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.datePickerModal}>
            <View style={[styles.datePickerContainer, { backgroundColor: colors.card }]}>
              <View style={styles.datePickerHeader}>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>
                  Selecione a data
                </Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.calendarContainer}>
                {/* Implementação simples de um calendário */}
                <View style={styles.monthSelector}>
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(date);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setDate(newDate);
                  }}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.monthText, { color: colors.text }]}>
                    {date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </Text>
                  
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(date);
                    newDate.setMonth(newDate.getMonth() + 1);
                    if (newDate <= new Date()) {
                      setDate(newDate);
                    }
                  }}>
                    <Ionicons name="chevron-forward" size={24} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.daysContainer}>
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, index) => (
                    <Text key={day} style={[styles.dayHeader, { color: colors.muted }]}>
                      {day}
                    </Text>
                  ))}
                  
                  {generateCalendarDays().map((day, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dayButton,
                        day.date && day.date.getDate() === date.getDate() && 
                        day.date.getMonth() === date.getMonth() &&
                        day.date.getFullYear() === date.getFullYear()
                          ? { backgroundColor: colors.primary }
                          : null,
                        !day.date || day.date > new Date()
                          ? { opacity: 0.3 }
                          : null
                      ]}
                      onPress={() => day.date && day.date <= new Date() ? handleDateChange(day.date) : null}
                      disabled={!day.date || day.date > new Date()}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          day.date && day.date.getDate() === date.getDate() && 
                          day.date.getMonth() === date.getMonth() &&
                          day.date.getFullYear() === date.getFullYear()
                            ? { color: '#fff' }
                            : { color: colors.text }
                        ]}
                      >
                        {day.date ? day.date.getDate() : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={[styles.todayButton, { borderColor: colors.primary }]}
                  onPress={() => handleDateChange(new Date())}
                >
                  <Text style={[styles.todayButtonText, { color: colors.primary }]}>
                    Hoje
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.confirmButtonText}>
                    Confirmar
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  formRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  datePickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
  },
  pickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedItemIcon: {
    marginRight: 8,
  },
  selectedItemText: {
    fontSize: 16,
  },
  accountColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  saveButton: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    padding: 16,
    zIndex: 1000,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalItemIcon: {
    marginRight: 16,
  },
  modalItemText: {
    flex: 1,
    fontSize: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerContainer: {
    width: '80%',
    height: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  calendarContainer: {
    flex: 1,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dayButton: {
    width: '14.28%',
    padding: 8,
  },
  dayText: {
    fontSize: 16,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  todayButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  installmentScrollView: {
    marginTop: 10,
    marginBottom: 10,
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  installmentOption: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  installmentOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  installmentNumberOption: {
    width: 60,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  installmentNumberText: {
    fontSize: 16,
    fontWeight: '500',
  },
  installmentInfo: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
}); 