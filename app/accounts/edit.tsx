import React, { useState, useEffect } from 'react';
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
  ActivityIndicator 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionContext';
import { BalanceAccount } from '@/types/TransactionTypes';

// Lista de cores disponíveis para contas bancárias
const ACCOUNT_COLORS = [
  '#4F44FF', // Azul
  '#FF4444', // Vermelho
  '#44FF44', // Verde
  '#FFAA44', // Laranja
  '#44FFFF', // Ciano
  '#FF44FF', // Magenta
  '#8844FF', // Roxo
  '#FF8844', // Coral
  '#44FF88', // Verde-agua
  '#FF4488', // Rosa
];

// Lista de tipos de contas
const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Conta Corrente' },
  { id: 'bank', label: 'Conta Poupança' },
  { id: 'investment', label: 'Conta Investimento' },
  { id: 'cash', label: 'Dinheiro' },
  { id: 'voucher', label: 'Vale-Refeição' }
];

export default function EditAccountScreen() {
  const params = useLocalSearchParams();
  const accountId = params.id as string | undefined;
  const isEditing = Boolean(accountId);
  
  const { user } = useAuth();
  const { addAccount, updateAccount } = useTransactions();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [saving, setSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  
  const [account, setAccount] = useState<Partial<BalanceAccount>>({
    name: '',
    type: 'bank',
    color: ACCOUNT_COLORS[0],
    balance: 0,
    icon: 'bank'
  });
  
  useEffect(() => {
    if (isEditing && accountId && user) {
  const fetchAccount = async () => {
    try {
          const accountRef = doc(db, `users/${user.id}/bankAccounts/${accountId}`);
          const accountSnap = await getDoc(accountRef);
      
          if (accountSnap.exists()) {
            const accountData = accountSnap.data();
        setAccount({
          id: accountId,
              name: accountData.name,
              type: accountData.type,
              color: accountData.color,
              balance: accountData.balance,
              icon: accountData.icon || 'bank'
        });
      } else {
            Alert.alert('Erro', 'Conta não encontrada.');
        router.back();
      }
    } catch (error) {
          console.error('Erro ao buscar dados da conta:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da conta.');
      router.back();
    }
  };
      
      fetchAccount();
    }
  }, [isEditing, accountId, user]);
  
  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    
    // Validação dos campos
    if (!account.name?.trim()) {
      Alert.alert('Erro', 'Informe o nome da conta.');
      return;
    }
    
    try {
      setSaving(true);
      
      const accountData: BalanceAccount = {
        id: account.id || '',
        name: account.name,
        type: account.type || 'bank',
        color: account.color || ACCOUNT_COLORS[0],
        balance: account.balance || 0,
        icon: account.icon || 'bank'
      };
      
      if (isEditing && accountId) {
        // Atualizando conta existente
        await updateAccount(accountData);
        Alert.alert('Sucesso', 'Conta atualizada com sucesso!');
      } else {
        // Criando nova conta
        await addAccount(accountData);
        Alert.alert('Sucesso', 'Conta adicionada com sucesso!');
      }
      
      router.back();
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
      Alert.alert('Erro', 'Não foi possível salvar a conta bancária.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleBalanceChange = (text: string) => {
    // Substitui vírgula por ponto para converter corretamente para número
    const numericValue = parseFloat(text.replace(',', '.'));
    setAccount({
      ...account,
      balance: isNaN(numericValue) ? 0 : numericValue
    });
  };
  
  // Selecionar tipo de conta
  const handleSelectType = (type: string) => {
    setAccount({
      ...account,
      type: type as 'bank' | 'investment' | 'cash' | 'voucher'
    });
    setShowTypePicker(false);
  };
  
  // Selecionar cor
  const handleSelectColor = (color: string) => {
    setAccount({
      ...account,
      color
    });
    setShowColorPicker(false);
  };
  
  // Renderiza o seletor de cor
  const renderColorPicker = () => {
    return (
      <TouchableOpacity 
        style={styles.modalContainer}
        activeOpacity={1}
        onPress={() => setShowColorPicker(false)}
      >
        <View style={[styles.colorPickerContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Escolha uma cor</Text>
        
        <View style={styles.colorGrid}>
            {ACCOUNT_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                  styles.colorOption,
                { backgroundColor: color },
                  account.color === color && styles.selectedColorOption
              ]}
                onPress={() => handleSelectColor(color)}
            />
          ))}
        </View>
      </View>
      </TouchableOpacity>
    );
  };
  
  // Renderiza o seletor de tipo de conta
  const renderTypePicker = () => {
    return (
      <TouchableOpacity 
        style={styles.modalContainer}
        activeOpacity={1}
        onPress={() => setShowTypePicker(false)}
      >
        <View style={[styles.pickerContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Tipo de Conta</Text>
        
          {ACCOUNT_TYPES.map(type => (
            <TouchableOpacity
              key={type.id + type.label}
              style={[
                styles.typeOption,
                account.type === type.id && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => handleSelectType(type.id)}
            >
              <Text style={[
                styles.typeOptionText, 
                { color: colors.text },
                account.type === type.id && { fontWeight: 'bold', color: colors.primary }
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
      </View>
      </TouchableOpacity>
    );
  };
  
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
          {isEditing ? 'Editar Conta' : 'Nova Conta'}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={styles.formContent}
      >
        <View style={styles.formFields}>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Nome</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={account.name}
              onChangeText={(text) => setAccount({ ...account, name: text })}
              placeholder="Minha Conta"
              placeholderTextColor={colors.muted}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.formRow, styles.pickerButton]}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={[styles.label, { color: colors.text }]}>Tipo</Text>
            <View style={styles.pickerValueContainer}>
              <Text style={[styles.pickerValue, { color: colors.text }]}>
                {ACCOUNT_TYPES.find(t => t.id === account.type)?.label || 'Conta Corrente'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={colors.muted} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Saldo</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={account.balance?.toString().replace('.', ',') || '0'}
              onChangeText={handleBalanceChange}
              placeholder="0,00"
              placeholderTextColor={colors.muted}
              keyboardType="decimal-pad"
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.formRow, styles.pickerButton]}
            onPress={() => setShowColorPicker(true)}
          >
            <Text style={[styles.label, { color: colors.text }]}>Cor</Text>
            <View style={[styles.colorPreview, { backgroundColor: account.color }]} />
          </TouchableOpacity>
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
              {isEditing ? 'Atualizar Conta' : 'Adicionar Conta'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      
      {showColorPicker && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          {renderColorPicker()}
        </View>
      )}
      
      {showTypePicker && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          {renderTypePicker()}
        </View>
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
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  formFields: {
    marginBottom: 24,
  },
  formRow: {
    marginBottom: 16,
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
  pickerValue: {
    fontSize: 16,
  },
  colorPreview: {
    height: 48,
    borderRadius: 8,
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
  modalContainer: {
    flex: 1,
  },
  colorPickerContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 400,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  colorOption: {
    width: 48,
    height: 48,
    margin: 8,
    borderRadius: 24,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  pickerContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 400,
  },
  typeOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  typeOptionText: {
    fontSize: 16,
  },
}); 