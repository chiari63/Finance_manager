import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTransactions } from '../../context/TransactionContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TransactionType, CATEGORIES, getCategoryById, getPaymentMethodById } from '../../constants/Categories';
import { formatCurrency } from '../../utils/formatters';

// Filtrar categorias por tipo
const categoryGroups = {
  income: CATEGORIES.filter(cat => ['salary', 'bonus', 'food_voucher', 'investment', 'refund'].includes(cat.id)),
  expense: CATEGORIES.filter(cat => 
    ['food', 'transport', 'leisure', 'games', 'health', 'clothing', 'electronics', 'housing', 'subscriptions', 'education', 'bank', 'misc'].includes(cat.id)
  )
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions, updateTransaction, deleteTransaction, accounts, paymentMethods } = useTransactions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estados para edição
  const [editedDescription, setEditedDescription] = useState('');
  const [editedAmount, setEditedAmount] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedDate, setEditedDate] = useState<Date>(new Date());
  const [editedPaymentMethod, setEditedPaymentMethod] = useState<string | null>('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState(false);
  
  // Função para gerar os dias do calendário
  const generateCalendarDays = () => {
    const firstDay = new Date(editedDate.getFullYear(), editedDate.getMonth(), 1);
    const lastDay = new Date(editedDate.getFullYear(), editedDate.getMonth() + 1, 0);
    
    const days = [];
    
    // Add days from previous month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push({ date: null });
    }
    
    // Add days from current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(editedDate.getFullYear(), editedDate.getMonth(), i) });
    }
    
    // Add days to fill the last row
    const remainingCells = 42 - days.length; // 6 rows * 7 days
    for (let i = 0; i < remainingCells; i++) {
      days.push({ date: null });
    }
    
    return days;
  };
  
  // Lidar com a mudança de data
  const handleDateChange = (selectedDate: Date) => {
    setEditedDate(selectedDate);
    setShowDatePicker(false);
  };
  
  // Carregar transação quando a tela for montada
  useEffect(() => {
    if (id) {
      const foundTransaction = transactions.find(t => t.id === id);
      if (foundTransaction) {
        setTransaction(foundTransaction);
        // Inicializar os campos de edição
        setEditedDescription(foundTransaction.description || '');
        setEditedAmount(String(foundTransaction.amount));
        setEditedCategory(foundTransaction.categoryId || '');
        setEditedDate(foundTransaction.date ? new Date(foundTransaction.date) : new Date());
        
        // Garantir que o método de pagamento seja tratado adequadamente
        setEditedPaymentMethod(foundTransaction.paymentMethodId || null);
        
        console.log('Método de pagamento carregado:', foundTransaction.paymentMethodId);
      }
      setLoading(false);
    }
  }, [id, transactions]);
  
  // Obter informações da categoria
  const getCategoryInfo = (categoryId: string, transactionType: string) => {
    // Usar a função getCategoryById do constants/Categories.ts
    const category = getCategoryById(categoryId);
    return category || { id: categoryId, name: 'Categoria', icon: 'help-circle', color: colors.primary };
  };
  
  // Verificar informações importantes para debug
  useEffect(() => {
    if (transaction) {
      console.log('Detalhes da transação carregada:');
      console.log('- ID:', transaction.id);
      console.log('- Descrição:', transaction.description);
      console.log('- Tipo:', transaction.type);
      console.log('- Conta ID:', transaction.accountId);
      console.log('- Método de Pagamento ID:', transaction.paymentMethodId);
      
      console.log('Todos os métodos de pagamento disponíveis:');
      paymentMethods.forEach(method => {
        console.log(`- ${method.id}: ${method.name}`);
      });
      
      const foundMethod = paymentMethods.find(m => m.id === transaction.paymentMethodId);
      console.log('Método encontrado na lista:', foundMethod ? `${foundMethod.name} (${foundMethod.id})` : 'Não encontrado');
      
      if (transaction.paymentMethodId) {
        const method = getPaymentMethodById(transaction.paymentMethodId);
        console.log('- Método de Pagamento Nome (via helper):', method.name);
      }
    }
  }, [transaction, paymentMethods]);
  
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
    
    setEditedAmount(value);
  };
  
  // Converter string para número
  const parseAmount = (amountStr: string): number => {
    return parseFloat(amountStr.replace(',', '.')) || 0;
  };
  
  // Salvar alterações
  const handleSave = async () => {
    if (!transaction) return;
    
    if (!editedDescription.trim()) {
      Alert.alert('Erro', 'Informe uma descrição para a transação.');
      return;
    }
    
    if (!editedAmount || parseAmount(editedAmount) <= 0) {
      Alert.alert('Erro', 'Informe um valor válido para a transação.');
      return;
    }
    
    if (!editedCategory) {
      Alert.alert('Erro', 'Selecione uma categoria para a transação.');
      return;
    }
    
    try {
      setLoading(true);
      
      // Importar enum TransactionFrequency se ainda não estiver disponível
      const { TransactionFrequency } = require('../../constants/Categories');
      
      // Criar o objeto de transação com todos os campos obrigatórios
      const updatedTransaction = {
        ...transaction,
        title: transaction.title || editedDescription,
        description: editedDescription,
        amount: parseAmount(editedAmount),
        categoryId: editedCategory,
        // Garantir que os campos obrigatórios estejam presentes e definidos
        frequency: transaction.frequency || TransactionFrequency.VARIABLE,
        date: editedDate,
        type: transaction.type,
        paymentMethodId: editedPaymentMethod || null
      };
      
      // Exibir log para depuração
      console.log('Atualizando transação:', JSON.stringify(updatedTransaction));
      
      await updateTransaction(updatedTransaction);
      Alert.alert('Sucesso', 'Transação atualizada com sucesso!');
      setIsEditing(false);
      setTransaction(updatedTransaction);
    } catch (error) {
      console.error('Erro ao atualizar transação:', error);
      Alert.alert('Erro', 'Não foi possível atualizar a transação.');
    } finally {
      setLoading(false);
    }
  };
  
  // Excluir transação
  const handleDelete = () => {
    Alert.alert(
      'Excluir Transação',
      'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir', 
          style: 'destructive',
          onPress: async () => {
            if (!transaction) return;
            
            try {
              setLoading(true);
              await deleteTransaction(transaction.id);
              Alert.alert('Sucesso', 'Transação excluída com sucesso!');
              router.back();
            } catch (error) {
              console.error('Erro ao excluir transação:', error);
              Alert.alert('Erro', 'Não foi possível excluir a transação.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  
  if (!transaction) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Detalhes da Transação
          </Text>
          <View style={styles.headerRight} />
        </View>
        
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.muted} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Transação não encontrada
          </Text>
          <TouchableOpacity
            style={[styles.backToListButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backToListButtonText}>
              Voltar para a lista
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const isIncome = transaction.type === TransactionType.INCOME;
  const categoryInfo = getCategoryInfo(transaction.categoryId, transaction.type);
  const formattedDate = new Date(transaction.date).toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? 'Editar Transação' : 'Detalhes da Transação'}
        </Text>
        <View style={styles.headerRight}>
          {!isEditing && (
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditing(true)}
            >
              <MaterialCommunityIcons name="pencil" size={22} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Card Principal */}
        <View 
          style={[
            styles.mainCard, 
            { 
              backgroundColor: isIncome ? '#E8F5E9' : '#FFEBEE',
              borderColor: isIncome ? '#4CAF50' : '#F44336',
            }
          ]}
        >
          <View style={styles.typeIndicator}>
            <View 
              style={[
                styles.typeIconContainer, 
                { backgroundColor: isIncome ? '#4CAF50' : '#F44336' }
              ]}
            >
              <MaterialCommunityIcons 
                name={isIncome ? "arrow-down" : "arrow-up"} 
                size={24} 
                color="#FFF" 
              />
            </View>
            <Text 
              style={[
                styles.typeText, 
                { color: isIncome ? '#4CAF50' : '#F44336' }
              ]}
            >
              {isIncome ? 'Receita' : 'Despesa'}
            </Text>
          </View>
          
          <Text 
            style={[
              styles.amount, 
              { color: isIncome ? '#4CAF50' : '#F44336' }
            ]}
          >
            {formatCurrency(transaction.amount)}
          </Text>
        </View>
        
        {/* Detalhes ou Formulário de Edição */}
        {isEditing ? (
          // Formulário de Edição
          <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
            <View style={styles.formRow}>
              <Text style={[styles.label, { color: colors.text }]}>Descrição</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={editedDescription}
                onChangeText={setEditedDescription}
                placeholder="Ex: Compras no supermercado"
                placeholderTextColor={colors.muted}
              />
            </View>
            
            <View style={styles.formRow}>
              <Text style={[styles.label, { color: colors.text }]}>Valor (R$)</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={editedAmount}
                onChangeText={handleAmountChange}
                placeholder="0,00"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
              />
            </View>
            
            <TouchableOpacity
              style={styles.formRow}
              onPress={() => setShowCategoryPicker(true)}
            >
              <Text style={[styles.label, { color: colors.text }]}>Categoria</Text>
              <View style={[styles.pickerButton, { borderColor: colors.border }]}>
                {categoryInfo && (
                  <View style={styles.selectedCategory}>
                    <MaterialCommunityIcons
                      name={categoryInfo.icon as any}
                      size={20}
                      color={colors.primary}
                      style={styles.categoryIcon}
                    />
                    <Text style={[styles.categoryText, { color: colors.text }]}>
                      {categoryInfo.name}
                    </Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={20} color={colors.muted} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.formRow}>
              <Text style={[styles.label, { color: colors.text }]}>Data</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.selectedDate, { color: colors.text }]}>
                  {editedDate.toLocaleDateString('pt-BR')}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => {
                  setIsEditing(false);
                  setEditedDescription(transaction.description || '');
                  setEditedAmount(String(transaction.amount));
                  setEditedCategory(transaction.categoryId || '');
                  setEditedDate(new Date(transaction.date));
                }}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Salvar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Visualização de Detalhes
          <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Descrição</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {transaction.description}
              </Text>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Categoria</Text>
              <View style={styles.categoryContainer}>
                <MaterialCommunityIcons
                  name={categoryInfo.icon as any}
                  size={20}
                  color={colors.primary}
                  style={styles.categoryIcon}
                />
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {categoryInfo.name}
                </Text>
              </View>
            </View>
            
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.muted }]}>Data</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {formattedDate}
              </Text>
            </View>
            
            {transaction.accountId && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Conta</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {accounts.find(a => a.id === transaction.accountId)?.name || 'Conta não encontrada'}
                </Text>
              </View>
            )}
            
            {transaction.paymentMethodId && transaction.paymentMethodId !== 'unknown' && !isIncome && (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLabel, { color: colors.muted }]}>Forma de Pagamento</Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {paymentMethods.find(m => m.id === transaction.paymentMethodId)?.name || 
                   getPaymentMethodById(transaction.paymentMethodId).name}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.deleteButton, { borderColor: '#F44336' }]}
              onPress={handleDelete}
            >
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#F44336" />
              <Text style={[styles.deleteButtonText, { color: '#F44336' }]}>
                Excluir Transação
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {/* Modal para escolher categoria */}
      {showCategoryPicker && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showCategoryPicker}
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Selecionar Categoria
                </Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.categoriesList}>
                {transaction && (
                  transaction.type === TransactionType.INCOME ? (
                    categoryGroups.income.map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryItem,
                          editedCategory === category.id && { backgroundColor: `${colors.primary}20` },
                          { borderColor: colors.border }
                        ]}
                        onPress={() => {
                          setEditedCategory(category.id);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <View style={[styles.categoryIconContainer, { backgroundColor: category.color || colors.primary }]}>
                          <MaterialCommunityIcons name={category.icon as any} size={20} color="#FFF" />
                        </View>
                        <Text style={[styles.categoryItemText, { color: colors.text }]}>
                          {category.name}
                        </Text>
                        {editedCategory === category.id && (
                          <Ionicons name="checkmark" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    categoryGroups.expense.map(category => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.categoryItem,
                          editedCategory === category.id && { backgroundColor: `${colors.primary}20` },
                          { borderColor: colors.border }
                        ]}
                        onPress={() => {
                          setEditedCategory(category.id);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <View style={[styles.categoryIconContainer, { backgroundColor: category.color || colors.primary }]}>
                          <MaterialCommunityIcons name={category.icon as any} size={20} color="#FFF" />
                        </View>
                        <Text style={[styles.categoryItemText, { color: colors.text }]}>
                          {category.name}
                        </Text>
                        {editedCategory === category.id && (
                          <Ionicons name="checkmark" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    ))
                  )
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
      
      {/* Modal para escolher data */}
      {showDatePicker && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showDatePicker}
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
                    const newDate = new Date(editedDate);
                    newDate.setMonth(editedDate.getMonth() - 1);
                    setEditedDate(newDate);
                  }}>
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                  </TouchableOpacity>
                  
                  <Text style={[styles.monthText, { color: colors.text }]}>
                    {editedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </Text>
                  
                  <TouchableOpacity onPress={() => {
                    const newDate = new Date(editedDate);
                    newDate.setMonth(editedDate.getMonth() + 1);
                    if (newDate <= new Date()) {
                      setEditedDate(newDate);
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
                        day.date && day.date.getDate() === editedDate.getDate() && 
                        day.date.getMonth() === editedDate.getMonth() &&
                        day.date.getFullYear() === editedDate.getFullYear()
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
                          day.date && day.date.getDate() === editedDate.getDate() && 
                          day.date.getMonth() === editedDate.getMonth() &&
                          day.date.getFullYear() === editedDate.getFullYear()
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
    </View>
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
    alignItems: 'flex-end',
  },
  editButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mainCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 5,
  },
  typeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  detailsCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
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
  pickerButton: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    padding: 16,
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
  categoriesList: {
    flex: 1,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryItemText: {
    flex: 1,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  backToListButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backToListButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  selectedDate: {
    fontSize: 16,
    flex: 1,
  },
  selectedPaymentMethod: {
    fontSize: 16,
    flex: 1,
  },
  datePickerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    padding: 16,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayHeader: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  dayButton: {
    width: '14.28%', 
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 20,
  },
  dayText: {
    fontSize: 16,
    textAlign: 'center',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  todayButton: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
}); 