import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionContext';
import { BalanceAccount } from '@/types/TransactionTypes';

export default function AccountsScreen() {
  const { user } = useAuth();
  const { accounts, loadAccounts, deleteAccount } = useTransactions();
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  useEffect(() => {
    const loadAccountsData = async () => {
      try {
        setLoading(true);
        await loadAccounts();
      } catch (error) {
        console.error('Erro ao carregar contas:', error);
        Alert.alert('Erro', 'Não foi possível carregar suas contas bancárias.');
      } finally {
        setLoading(false);
      }
    };
    
    loadAccountsData();
  }, []);

  const handleAddAccount = () => {
    router.push({
      pathname: '/accounts/edit'
    } as any);
  };

  const handleEditAccount = (accountId: string) => {
    router.push({
      pathname: '/accounts/edit',
      params: { id: accountId }
    } as any);
  };

  const handleDeleteAccount = async (accountId: string) => {
    Alert.alert(
      'Remover Conta',
      'Tem certeza que deseja remover esta conta? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive',
          onPress: async () => {
            if (!user) return;
            
            try {
              await deleteAccount(accountId);
              Alert.alert('Sucesso', 'Conta removida com sucesso!');
            } catch (error) {
              console.error('Erro ao remover conta:', error);
              Alert.alert('Erro', 'Não foi possível remover a conta.');
            }
          }
        }
      ]
    );
  };

  const renderAccountItem = ({ item }: { item: BalanceAccount }) => {
    const gradientColors = [item.color || '#4F44FF', adjustColor(item.color || '#4F44FF', -30)];
    
    // Obter a data atual formatada para a atualização
    const currentDate = new Date().toLocaleDateString();
    
    return (
      <TouchableOpacity 
        style={styles.accountCard}
        onPress={() => handleEditAccount(item.id)}
      >
        <LinearGradient
          colors={[gradientColors[0], gradientColors[1]]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <Text style={styles.bankName}>{item.name}</Text>
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDeleteAccount(item.id)}
              >
                <MaterialCommunityIcons name="delete-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.accountType}>{getAccountTypeLabel(item.type)}</Text>
            
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceLabel}>Saldo Atual</Text>
              <Text style={styles.balanceValue}>
                R$ {item.balance.toFixed(2).replace('.', ',')}
              </Text>
            </View>
            
            <Text style={styles.lastUpdate}>
              Atualizado em: {currentDate}
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const getAccountTypeLabel = (type: string) => {
    const types = {
      cash: 'Dinheiro',
      bank: 'Conta Bancária',
      investment: 'Investimento',
      voucher: 'Vale-Refeição',
      current: 'Conta Corrente',
      savings: 'Conta Poupança',
      digital: 'Conta Digital'
    };
    return types[type as keyof typeof types] || type;
  };

  // Função para ajustar a cor para criar um gradiente
  const adjustColor = (color: string, amount: number): string => {
    return color;
    // Uma implementação real precisaria converter a cor para RGB, ajustar e retornar
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Minhas Contas</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <FlatList
        data={accounts}
        renderItem={renderAccountItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="bank-outline" 
              size={80} 
              color={colors.muted} 
            />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Você ainda não possui contas bancárias cadastradas
            </Text>
          </View>
        }
      />
      
      <TouchableOpacity 
        style={[styles.addButton, { backgroundColor: colors.primary }]}
        onPress={handleAddAccount}
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
  accountCard: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  cardGradient: {
    borderRadius: 16,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  deleteButton: {
    padding: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginBottom: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  accountLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  accountValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  balanceContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
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
  lastUpdate: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 8,
  },
}); 