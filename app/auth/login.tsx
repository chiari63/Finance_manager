import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastEmail, setLastEmail] = useState<string | null>(null);
  
  const { login } = useAuth();
  const { 
    isSupported, 
    isEnabled, 
    isEnrolled, 
    authenticate, 
    getBiometricTypeName,
    hasCredentials,
    checkBiometricCredentials,
    isLoading: biometricLoading 
  } = useBiometricAuth();
  
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Buscar o email do último login
  useEffect(() => {
    const fetchLastEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('last_email');
        if (savedEmail) {
          setLastEmail(savedEmail);
          setEmail(savedEmail);
          
          // Verificar se há credenciais biométricas para este email
          await checkBiometricCredentials(savedEmail);
        }
      } catch (error) {
        console.error('Erro ao buscar email do último login:', error);
      }
    };
    
    fetchLastEmail();
  }, []);
  
  const handleBiometricLogin = async () => {
    if (!lastEmail) {
      Alert.alert(
        'Login necessário',
        'Faça login com email e senha pelo menos uma vez para usar a autenticação biométrica.'
      );
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      // Tentar autenticação biométrica
      const result = await authenticate('Use sua biometria para entrar no FinanceManager');
      
      if (result.success) {
        console.log('Autenticação biométrica bem-sucedida, tentando login automático');
        // Se biometria for bem-sucedida, fazer login com o email armazenado
        // A senha não é armazenada, mas o Firebase Auth pode manter o usuário autenticado
        // em segundo plano se houver uma sessão válida
        
        // Pequeno delay antes do login para garantir que a UI esteja responsiva
        await new Promise(resolve => setTimeout(resolve, 300));
        await login(lastEmail, '');
        console.log('Login com biometria realizado com sucesso');
        // Não desativamos o loading para evitar piscar a tela
        return;
      } else {
        setError(result.error || 'Falha na autenticação biométrica');
      }
    } catch (err) {
      console.error('Erro no login com biometria:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro durante a autenticação');
      }
      // Só desativamos o loading em caso de erro
      setLoading(false);
    }
  };
  
  const handleLogin = async () => {
    // Validar entrada
    if (!email.trim()) {
      setError('Por favor, insira seu email');
      return;
    }
    
    if (!password) {
      setError('Por favor, insira sua senha');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      console.log('Tentando fazer login com:', email);
      // Pequeno delay antes do login para garantir que a UI esteja responsiva
      await new Promise(resolve => setTimeout(resolve, 300));
      await login(email, password);
      
      // Salvar email para login biométrico futuro
      await AsyncStorage.setItem('last_email', email);
      setLastEmail(email);
      
      console.log('Login realizado com sucesso');
      // Importante: Não desativamos o estado de loading aqui,
      // para evitar que a tela pisque entre estados
      // O ProtectedRouteGuard vai cuidar da navegação e estados
      return;
    } catch (err) {
      console.error('Erro no login:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro durante a autenticação');
      }
      // Só desativamos o loading em caso de erro
      setLoading(false);
    }
  };
  
  // Verificar se deve mostrar botão de biometria
  const showBiometricButton = isSupported && isEnabled && isEnrolled && !!lastEmail && hasCredentials;
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          <View style={styles.logoContainer}>
            <Text style={[styles.logoText, { color: colors.primary }]}>Finance Manager</Text>
            <Text style={[styles.tagline, { color: colors.muted }]}>Gerencie suas finanças com simplicidade</Text>
          </View>
          
          <View style={[styles.formContainer, { backgroundColor: colors.card, shadowColor: colorScheme === 'dark' ? 'transparent' : '#000' }]}>
            <Text style={[styles.title, { color: colors.text }]}>Bem-vindo(a) de volta!</Text>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ff4d4d" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="mail-outline" size={22} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.muted}
              />
            </View>
            
            <View style={[styles.inputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Ionicons name="lock-closed-outline" size={22} color={colors.muted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor={colors.muted}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={22} 
                  color={colors.muted}
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Redefinir Senha', 'Funcionalidade em desenvolvimento')}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>Esqueceu a senha?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Entrar</Text>
              )}
            </TouchableOpacity>
            
            {showBiometricButton && (
              <TouchableOpacity 
                style={[styles.biometricButton, loading && styles.loginButtonDisabled]}
                onPress={handleBiometricLogin}
                disabled={loading || biometricLoading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Ionicons 
                      name={Platform.OS === 'ios' ? 'finger-print' : 'finger-print'} 
                      size={22} 
                      color="#ffffff" 
                    />
                    <Text style={styles.biometricButtonText}>
                      Entrar com {getBiometricTypeName()}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.muted }]}>
                Não tem uma conta?{' '}
              </Text>
              <Link href="/auth/register" asChild>
                <TouchableOpacity>
                  <Text style={[styles.registerLink, { color: colors.primary }]}>Registre-se</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    minHeight: '100%',
    paddingVertical: 40,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
  },
  formContainer: {
    borderRadius: 12,
    padding: 24,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    color: '#ff4d4d',
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    height: 50,
    marginBottom: 16,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    color: '#212529',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 5,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: '#3498db',
    borderRadius: 8,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  biometricButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  biometricButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#a6c9e2',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#6c757d',
    fontSize: 14,
  },
  registerLink: {
    color: '#3498db',
    fontSize: 14,
    fontWeight: 'bold',
  },
}); 