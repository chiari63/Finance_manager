import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

// Chave para armazenar a configuração no AsyncStorage
const BIOMETRIC_ENABLED_KEY = 'biometric_auth_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export function useBiometricAuth() {
  // Estados
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [biometricType, setBiometricType] = useState<LocalAuthentication.AuthenticationType | null>(null);
  const [hasCredentials, setHasCredentials] = useState<boolean>(false);
  
  // Verificar se há credenciais biométricas salvas
  const checkBiometricCredentials = async (email?: string) => {
    try {
      const credentialsStr = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      if (!credentialsStr) {
        setHasCredentials(false);
        return false;
      }
      
      const credentials = JSON.parse(credentialsStr);
      if (!Array.isArray(credentials) || credentials.length === 0) {
        setHasCredentials(false);
        return false;
      }
      
      if (email) {
        // Verifica se há credenciais para este email específico
        const userCredential = credentials.find(cred => cred.email === email);
        setHasCredentials(!!userCredential);
        return !!userCredential;
      } else {
        // Verifica se há qualquer credencial
        setHasCredentials(true);
        return true;
      }
    } catch (error) {
      console.error('Erro ao verificar credenciais biométricas:', error);
      setHasCredentials(false);
      return false;
    }
  };
  
  // Limpar credenciais biométricas
  const clearBiometricCredentials = async (emailToClear?: string) => {
    try {
      if (!emailToClear) {
        // Limpar todas as credenciais
        await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
        setHasCredentials(false);
        return true;
      }
      
      // Limpar apenas para um email específico
      const credentialsStr = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY);
      if (!credentialsStr) return true;
      
      const credentials = JSON.parse(credentialsStr);
      if (!Array.isArray(credentials)) return true;
      
      const updatedCredentials = credentials.filter(cred => cred.email !== emailToClear);
      
      if (updatedCredentials.length === 0) {
        await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY);
      } else {
        await AsyncStorage.setItem(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(updatedCredentials));
      }
      
      await checkBiometricCredentials();
      return true;
    } catch (error) {
      console.error('Erro ao limpar credenciais biométricas:', error);
      return false;
    }
  };
  
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
      
      // Verificar se há credenciais salvas
      await checkBiometricCredentials();
      
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
        
        // Verificar se há email salvo para login automático
        const lastEmail = await AsyncStorage.getItem('last_email');
        if (!lastEmail) {
          Alert.alert(
            'Login necessário',
            'Você precisa fazer login pelo menos uma vez antes de ativar a biometria.'
          );
          return false;
        }
      } else {
        // Ao desativar, perguntar se deve limpar credenciais
        const shouldClear = await new Promise<boolean>(resolve => {
          Alert.alert(
            'Limpar credenciais?',
            'Deseja também remover as senhas salvas para autenticação biométrica?',
            [
              { text: 'Não', onPress: () => resolve(false) },
              { text: 'Sim', onPress: () => resolve(true) }
            ]
          );
        });
        
        if (shouldClear) {
          await clearBiometricCredentials();
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
    hasCredentials,
    biometricType,
    checkBiometricSupport,
    toggleBiometricAuth,
    authenticate,
    getBiometricTypeName,
    checkBiometricCredentials,
    clearBiometricCredentials
  };
} 