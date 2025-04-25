import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ActivityIndicator, ScrollView, SafeAreaView, StatusBar, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SecurityScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const { 
    isSupported, 
    isEnabled, 
    isEnrolled,
    isLoading, 
    toggleBiometricAuth,
    getBiometricTypeName,
    authenticate
  } = useBiometricAuth();
  
  const [loading, setLoading] = useState(false);
  
  const handleBiometricToggle = async (value: boolean) => {
    setLoading(true);
    try {
      const success = await toggleBiometricAuth(value);
      if (success) {
        Alert.alert(
          value ? 'Biometria ativada' : 'Biometria desativada',
          value 
            ? `${getBiometricTypeName()} ativado com sucesso.` 
            : `${getBiometricTypeName()} desativado com sucesso.`
        );
      }
    } catch (error) {
      console.error('Erro ao alternar biometria:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestBiometric = async () => {
    setLoading(true);
    try {
      const result = await authenticate('Teste de autenticação biométrica');
      
      if (result.success) {
        Alert.alert('Sucesso', 'Autenticação biométrica funcionando corretamente.');
      } else {
        Alert.alert('Falha', result.error || 'Falha na autenticação biométrica.');
      }
    } catch (error) {
      console.error('Erro no teste biométrico:', error);
      Alert.alert('Erro', 'Ocorreu um erro durante o teste biométrico.');
    } finally {
      setLoading(false);
    }
  };
  
  const goBack = () => {
    router.back();
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      <Stack.Screen 
        options={{ 
          title: 'Segurança',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerShadowVisible: false,
          headerShown: false,
        }} 
      />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={goBack}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
          <Text style={[styles.backButtonText, { color: colors.text }]}>Voltar</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Segurança</Text>
        <View style={styles.rightPlaceholder} />
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>AUTENTICAÇÃO BIOMÉTRICA</Text>
          
          {isLoading ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Verificando disponibilidade...
              </Text>
            </View>
          ) : !isSupported ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.notSupportedIcon}>
                <Ionicons name="warning" size={24} color={colors.warning} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Biometria não suportada
              </Text>
              <Text style={[styles.cardDescription, { color: colors.muted }]}>
                Seu dispositivo não suporta autenticação biométrica.
              </Text>
            </View>
          ) : !isEnrolled ? (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.notSupportedIcon}>
                <Ionicons name="finger-print" size={24} color={colors.warning} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>
                Biometria não configurada
              </Text>
              <Text style={[styles.cardDescription, { color: colors.muted }]}>
                Você precisa configurar a biometria nas configurações do seu dispositivo primeiro.
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.card }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingContent}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>
                    Usar {getBiometricTypeName()}
                  </Text>
                  <Text style={[styles.settingDescription, { color: colors.muted }]}>
                    Use sua biometria para fazer login no aplicativo.
                  </Text>
                </View>
                
                <Switch
                  value={isEnabled}
                  onValueChange={handleBiometricToggle}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                  disabled={loading}
                />
              </View>
              
              {isEnabled && (
                <TouchableOpacity
                  style={[styles.testButton, { backgroundColor: colors.primary + '20' }]}
                  onPress={handleTestBiometric}
                  disabled={loading}
                >
                  <Ionicons name="finger-print" size={20} color={colors.primary} />
                  <Text style={[styles.testButtonText, { color: colors.primary }]}>
                    Testar {getBiometricTypeName()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>INFORMAÇÕES</Text>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              Sobre autenticação biométrica
            </Text>
            <Text style={[styles.infoText, { color: colors.muted }]}>
              A autenticação biométrica permite que você faça login na sua conta usando sua impressão digital, reconhecimento facial ou outros métodos biométricos, dependendo do dispositivo.
            </Text>
            <Text style={[styles.infoText, { color: colors.muted, marginTop: 8 }]}>
              Sua biometria nunca é armazenada por este aplicativo e permanece segura em seu dispositivo.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 10 : 0,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: 4,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  rightPlaceholder: {
    width: 70,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingTop: 10,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingText: {
    marginTop: 8,
    textAlign: 'center',
  },
  notSupportedIcon: {
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingContent: {
    flex: 1,
    paddingRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
}); 