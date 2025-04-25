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
import { doc, getDoc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';

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
  { id: 'current', label: 'Conta Corrente' },
  { id: 'savings', label: 'Conta Poupança' },
  { id: 'investment', label: 'Conta Investimento' },
  { id: 'digital', label: 'Conta Digital' }
];

interface BankAccount {
  id?: string;
  name: string;
  bank: string;
  type: 'current' | 'savings' | 'investment' | 'digital';
  color: string;
  balance: number;
  lastUpdate: Date;
}

export default function EditAccountScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ id: string }>();
  const accountId = params.id;
  const isEditing = !!accountId;
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<BankAccount>({
    name: '',
    bank: '',
    type: 'current',
    color: ACCOUNT_COLORS[0],
    balance: 0,
    lastUpdate: new Date()
  });
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  
  useEffect(() => {
    if (isEditing && user) {
      fetchAccount();
    }
  }, [accountId, user]);
  
  const fetchAccount = async () => {
    if (!user || !accountId) return;
    
    try {
      setLoading(true);
      const accountDoc = await getDoc(doc(db, `users/${user.id}/bankAccounts/${accountId}`));
      
      if (accountDoc.exists()) {
        const accountData = accountDoc.data() as BankAccount;
        setAccount({
          id: accountId,
          name: accountData.name || '',
          bank: accountData.bank || '',
          type: accountData.type || 'current',
          color: accountData.color || ACCOUNT_COLORS[0],
          balance: accountData.balance || 0,
          lastUpdate: accountData.lastUpdate ? new Date(accountData.lastUpdate) : new Date()
        });
      } else {
        Alert.alert('Erro', 'Conta bancária não encontrada.');
        router.back();
      }
    } catch (error) {
      console.error('Erro ao buscar conta bancária:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados da conta.');
      router.back();
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    
    // Validação dos campos
    if (!account.name.trim()) {
      Alert.alert('Erro', 'Informe o nome da conta.');
      return;
    }
    
    if (!account.bank.trim()) {
      Alert.alert('Erro', 'Informe o nome do banco.');
      return;
    }
    
    try {
      setSaving(true);
      
      const accountData = {
        name: account.name,
        bank: account.bank,
        type: account.type,
        color: account.color,
        balance: account.balance,
        lastUpdate: account.lastUpdate
      };
      
      if (isEditing && accountId) {
        // Atualizando conta existente
        await updateDoc(doc(db, `users/${user.id}/bankAccounts/${accountId}`), accountData);
        Alert.alert('Sucesso', 'Conta atualizada com sucesso!');
      } else {
        // Criando nova conta
        await addDoc(collection(db, `users/${user.id}/bankAccounts`), accountData);
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
  
  const renderColorPicker = () => {
    return (
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Escolha uma cor</Text>
          <TouchableOpacity onPress={() => setShowColorPicker(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.colorGrid}>
          {ACCOUNT_COLORS.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorItem,
                { backgroundColor: color },
                account.color === color && styles.colorItemSelected
              ]}
              onPress={() => {
                setAccount({ ...account, color });
                setShowColorPicker(false);
              }}
            />
          ))}
        </View>
      </View>
    );
  };
  
  const renderTypePicker = () => {
    return (
      <View style={styles.pickerContainer}>
        <View style={styles.pickerHeader}>
          <Text style={[styles.pickerTitle, { color: colors.text }]}>Tipo de conta</Text>
          <TouchableOpacity onPress={() => setShowTypePicker(false)}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        <ScrollView>
          {ACCOUNT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeItem,
                { borderBottomColor: colors.border }
              ]}
              onPress={() => {
                setAccount({ ...account, type: type.id });
                setShowTypePicker(false);
              }}
            >
              <Text style={[
                styles.typeItemText, 
                { color: colors.text },
                account.type === type.id && { fontWeight: 'bold', color: colors.primary }
              ]}>
                {type.label}
              </Text>
              {account.type === type.id && (
                <Ionicons name="checkmark" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };
  
  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Carregando...</Text>
      </View>
    );
  }
  
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
      
      <ScrollView style={styles.content}>
        <LinearGradient
          colors={[account.color, adjustColor(account.color, -30)]}
          style={styles.cardPreview}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.previewLabel}>Visualização</Text>
          <Text style={styles.previewBankName}>
            {account.bank || 'Nome do Banco'}
          </Text>
          <Text style={styles.previewAccountType}>
            {ACCOUNT_TYPES.find(t => t.id === account.type)?.label || 'Selecione'}
          </Text>
          <View style={styles.previewInfo}>
            <Text style={styles.previewInfoLabel}>Saldo</Text>
            <Text style={styles.previewInfoValue}>
              R$ {account.balance.toFixed(2).replace('.', ',')}
            </Text>
          </View>
        </LinearGradient>
        
        <View style={[styles.formCard, { backgroundColor: colors.card }]}>
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Nome da Conta</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={account.name}
              onChangeText={(text) => setAccount({ ...account, name: text })}
              placeholder="Ex: Conta Principal"
              placeholderTextColor={colors.muted}
            />
          </View>
          
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Banco</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={account.bank}
              onChangeText={(text) => setAccount({ ...account, bank: text })}
              placeholder="Ex: Banco do Brasil"
              placeholderTextColor={colors.muted}
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.formRow, styles.pickerButton]}
            onPress={() => setShowTypePicker(true)}
          >
            <Text style={[styles.label, { color: colors.text }]}>Tipo de Conta</Text>
            <View style={[styles.pickerValueContainer, { borderColor: colors.border }]}>
              <Text style={[styles.pickerValue, { color: colors.text }]}>
                {ACCOUNT_TYPES.find(t => t.id === account.type)?.label || 'Selecione'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.formRow}>
            <Text style={[styles.label, { color: colors.text }]}>Saldo</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border }]}
              value={account.balance.toString().replace('.', ',')}
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

// Função para ajustar a cor para criar um gradiente
const adjustColor = (color: string, amount: number): string => {
  return color;
  // Uma implementação real precisaria converter a cor para RGB, ajustar e retornar
};

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
  cardPreview: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  previewBankName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  previewAccountType: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 16,
  },
  previewInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewInfoLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  previewInfoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  formCard: {
    borderRadius: 16,
    padding: 16,
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
  pickerContainer: {
    width: '100%',
    backgroundColor: '#fff',
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
    borderBottomColor: '#eee',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  colorItem: {
    width: 48,
    height: 48,
    margin: 8,
    borderRadius: 24,
  },
  colorItemSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  typeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  typeItemText: {
    fontSize: 16,
  },
}); 