import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { PaymentMethod } from '@/types/TransactionTypes';

// Constantes para ícones e cores dos tipos de pagamento
const PAYMENT_TYPE_ICONS = {
  credit: 'credit-card',
  debit: 'credit-card-outline',
  pix: 'qrcode',
  boleto: 'barcode',
  transfer: 'bank-transfer',
  other: 'cash'
};

const PAYMENT_TYPE_COLORS = {
  credit: '#4F44FF',
  debit: '#44BB44',
  pix: '#FFAA44',
  boleto: '#FF4444',
  transfer: '#44FFFF',
  other: '#8844FF'
};

const PAYMENT_TYPE_LABELS = {
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  pix: 'PIX',
  boleto: 'Boleto',
  transfer: 'Transferência',
  other: 'Outro'
};

// Constantes para bandeiras de cartão cores
const CARD_BRAND_COLORS: Record<string, string> = {
  visa: '#1A1F71',
  mastercard: '#EB001B',
  elo: '#00A4E0',
  amex: '#006FCF',
  hipercard: '#822124',
  default: '#888888'
};

export default function PaymentMethodsScreen() {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const methodsCollection = collection(db, `users/${user.id}/paymentMethods`);
      const methodsSnapshot = await getDocs(methodsCollection);
      
      const methodsList: PaymentMethod[] = [];
      methodsSnapshot.forEach((doc) => {
        methodsList.push({ id: doc.id, ...doc.data() } as PaymentMethod);
      });
      
      setPaymentMethods(methodsList);
    } catch (error) {
      console.error('Erro ao buscar métodos de pagamento:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus métodos de pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentMethod = () => {
    router.push({
      pathname: '/payments/edit'
    } as any);
  };

  const handleEditPaymentMethod = (methodId: string) => {
    router.push({
      pathname: '/payments/edit',
      params: { id: methodId }
    } as any);
  };

  const handleDeletePaymentMethod = async (methodId: string) => {
    Alert.alert(
      'Remover Método de Pagamento',
      'Tem certeza que deseja remover este método de pagamento? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            
            try {
              await deleteDoc(doc(db, `users/${user.id}/paymentMethods/${methodId}`));
              setPaymentMethods(paymentMethods.filter(method => method.id !== methodId));
              Alert.alert('Sucesso', 'Método de pagamento removido com sucesso!');
            } catch (error) {
              console.error('Erro ao remover método de pagamento:', error);
              Alert.alert('Erro', 'Não foi possível remover o método de pagamento.');
            }
          }
        }
      ]
    );
  };

  const renderPaymentItem = ({ item }: { item: PaymentMethod }) => {
    // Converter o timestamp do Firestore para Date se necessário
    const lastUpdate = item.lastUpdate instanceof Date 
      ? item.lastUpdate 
      : item.lastUpdate?.toDate 
        ? item.lastUpdate.toDate() 
        : new Date();
    
    return (
      <TouchableOpacity 
        style={[styles.methodCard, { backgroundColor: colors.card }]}
        onPress={() => handleEditPaymentMethod(item.id)}
      >
        <View style={styles.methodHeader}>
          <View style={styles.methodTitleContainer}>
            <View 
              style={[
                styles.methodIcon, 
                { backgroundColor: PAYMENT_TYPE_COLORS[item.type as keyof typeof PAYMENT_TYPE_COLORS] }
              ]}
            >
              <MaterialCommunityIcons 
                name={PAYMENT_TYPE_ICONS[item.type as keyof typeof PAYMENT_TYPE_ICONS] as any} 
                size={20} 
                color="#fff" 
              />
            </View>
            <View>
              <Text style={[styles.methodName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.methodType, { color: colors.muted }]}>
                {getPaymentTypeLabel(item.type)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeletePaymentMethod(item.id)}
          >
            <MaterialCommunityIcons name="delete-outline" size={22} color={colors.muted} />
          </TouchableOpacity>
        </View>
        
        {item.lastDigits && (
          <Text style={[styles.lastDigits, { color: colors.muted }]}>
            Final {item.lastDigits}
          </Text>
        )}
        
        {item.dueDate && (
          <Text style={[styles.dueDate, { color: colors.muted }]}>
            Vencimento: dia {item.dueDate}
          </Text>
        )}
        
        <Text style={[styles.lastUpdate, { color: colors.muted }]}>
          Atualizado em: {lastUpdate.toLocaleDateString()}
        </Text>
        
        {item.isDefault && (
          <View style={[styles.defaultBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.defaultBadgeText}>Padrão</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const getPaymentTypeLabel = (type: string) => {
    const types = {
      credit: 'Cartão de Crédito',
      debit: 'Cartão de Débito',
      pix: 'PIX',
      digital: 'Carteira Digital',
      other: 'Outro'
    };
    return types[type as keyof typeof types] || type;
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Métodos de Pagamento</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <FlatList
        data={paymentMethods}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="credit-card-outline" 
              size={80} 
              color={colors.muted} 
            />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Você ainda não possui métodos de pagamento cadastrados
            </Text>
          </View>
        }
      />
      
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={handleAddPaymentMethod}
      >
        <MaterialCommunityIcons name="plus" size={24} color="#fff" />
      </TouchableOpacity>
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
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  methodCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  methodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  methodTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  methodType: {
    fontSize: 14,
  },
  deleteButton: {
    padding: 4,
  },
  lastDigits: {
    marginTop: 8,
    marginBottom: 8,
  },
  dueDate: {
    marginBottom: 8,
  },
  lastUpdate: {
    marginBottom: 8,
  },
  defaultBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
}); 