import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// Chave para armazenar a configuração no AsyncStorage
const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';

export function useBiometricAuth() {
  // Estados
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [biometricType, setBiometricType] = useState<LocalAuthentication.AuthenticationType | null>(null);
  
  // Verificar se o dispositivo suporta autenticação biométrica
  const checkBiometricSupport = async () => {
    try {
      setIsLoading(true);
      
      // Verifica se o hardware suporta biometria
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsSupported(compatible);
      
      if (!compatible) {
        console.log('Este dispositivo não suporta autenticação biométrica');
        return false;
      }

      // Verifica se o usuário tem biometria registrada
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsEnrolled(enrolled);
      
      if (!enrolled) {
        console.log('Nenhuma biometria registrada no dispositivo');
        return false;
      }

      // Obtém o tipo de biometria suportada
      const availableTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (availableTypes.length > 0) {
        setBiometricType(availableTypes[0]);
      }
      
      // Verifica se o usuário habilitou a autenticação biométrica no aplicativo
      const storedPreference = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      const isEnabledFromStorage = storedPreference === 'true';
      setIsEnabled(isEnabledFromStorage);
      
      console.log('Autenticação biométrica - Compatível:', compatible, 'Registrada:', enrolled, 'Habilitada:', isEnabledFromStorage);
      
      return compatible && enrolled;
    } catch (error) {
      console.error('Erro ao verificar suporte para biometria:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Habilitar ou desabilitar a autenticação biométrica
  const toggleBiometricAuth = async (value: boolean) => {
    try {
      setIsLoading(true);
      
      if (value && !isSupported) {
        Alert.alert(
          'Não suportado',
          'Seu dispositivo não suporta autenticação biométrica'
        );
        return false;
      }
      
      if (value && !isEnrolled) {
        Alert.alert(
          'Biometria não configurada',
          'Você precisa configurar a biometria nas configurações do seu dispositivo primeiro.'
        );
        return false;
      }
      
      // Se estiver ativando, primeiro tenta autenticar para confirmar
      if (value) {
        const result = await authenticate('Confirme sua identidade para ativar autenticação biométrica');
        if (!result.success) {
          return false;
        }
      }
      
      // Salva a configuração
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, value ? 'true' : 'false');
      setIsEnabled(value);
      
      return true;
    } catch (error) {
      console.error('Erro ao alterar configuração de biometria:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Autenticar usando biometria
  const authenticate = async (promptMessage: string = 'Confirme sua identidade'): Promise<{success: boolean, error?: string}> => {
    try {
      if (!isSupported || !isEnrolled) {
        return { success: false, error: 'Biometria não suportada ou não configurada' };
      }
      
      // Configurar opções de autenticação
      const options: LocalAuthentication.LocalAuthenticationOptions = {
        promptMessage,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
        fallbackLabel: 'Usar senha',
      };
      
      // Executar autenticação
      const result = await LocalAuthentication.authenticateAsync(options);
      
      console.log('Resultado da autenticação biométrica:', result);
      
      if (result.success) {
        return { success: true };
      } else {
        return {
          success: false,
          error: result.error === 'user_cancel' ? 'Autenticação cancelada' : 'Falha na autenticação'
        };
      }
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      return { success: false, error: 'Erro ao autenticar' };
    }
  };

  // Obter o nome amigável do tipo de biometria
  const getBiometricTypeName = (): string => {
    if (!biometricType) return 'Biometria';
    
    switch (biometricType) {
      case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
        return Platform.OS === 'ios' ? 'Face ID' : 'Reconhecimento Facial';
      case LocalAuthentication.AuthenticationType.FINGERPRINT:
        return Platform.OS === 'ios' ? 'Touch ID' : 'Impressão Digital';
      case LocalAuthentication.AuthenticationType.IRIS:
        return 'Reconhecimento de Íris';
      default:
        return 'Biometria';
    }
  };

  // Verificar suporte na inicialização
  useEffect(() => {
    checkBiometricSupport();
  }, []);

  return {
    isSupported,
    isEnabled,
    isEnrolled,
    isLoading,
    biometricType,
    checkBiometricSupport,
    toggleBiometricAuth,
    authenticate,
    getBiometricTypeName,
  };
} 