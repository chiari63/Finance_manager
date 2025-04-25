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
    isLoading: biometricLoading 
  } = useBiometricAuth();
  
  // Buscar o email do último login
  useEffect(() => {
    const fetchLastEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('last_email');
        if (savedEmail) {
          setLastEmail(savedEmail);
          setEmail(savedEmail);
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
        await login(lastEmail, '');
        console.log('Login com biometria realizado com sucesso');
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
    } finally {
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
      await login(email, password);
      
      // Salvar email para login biométrico futuro
      await AsyncStorage.setItem('last_email', email);
      setLastEmail(email);
      
      console.log('Login realizado com sucesso');
    } catch (err) {
      console.error('Erro no login:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro durante o login');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Verificar se deve mostrar botão de biometria
  const showBiometricButton = isSupported && isEnabled && isEnrolled && !!lastEmail;
  
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>FinanceManager</Text>
            <Text style={styles.tagline}>Gerencie suas finanças com simplicidade</Text>
          </View>
          
          <View style={styles.formContainer}>
            <Text style={styles.title}>Bem-vindo(a) de volta!</Text>
            
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#ff4d4d" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
            
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={22} color="#6c757d" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#9e9e9e"
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={22} color="#6c757d" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor="#9e9e9e"
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={22} 
                  color="#6c757d" 
                />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Redefinir Senha', 'Funcionalidade em desenvolvimento')}
            >
              <Text style={styles.forgotPasswordText}>Esqueceu a senha?</Text>
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
                <Ionicons 
                  name={Platform.OS === 'ios' ? 'finger-print' : 'finger-print'} 
                  size={22} 
                  color="#ffffff" 
                />
                <Text style={styles.biometricButtonText}>
                  Entrar com {getBiometricTypeName()}
                </Text>
              </TouchableOpacity>
            )}
            
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                Não tem uma conta?{' '}
              </Text>
              <Link href="/auth/register" asChild>
                <TouchableOpacity>
                  <Text style={styles.registerLink}>Registre-se</Text>
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
    backgroundColor: '#f8f9fa',
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
    color: '#3498db',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
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