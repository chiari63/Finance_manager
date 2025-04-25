import { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, TextInput as NativeTextInput, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useAuth } from '@/context/AuthContext';

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { resetPassword, error } = useAuth();
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const handleResetPassword = async () => {
    if (!email) return;
    
    setLoading(true);
    
    try {
      await resetPassword(email);
      setSuccess(true);
      
      Alert.alert(
        'Email enviado',
        'Enviamos um link de recuperação para o seu email. Verifique sua caixa de entrada.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Erro na recuperação de senha:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <MaterialCommunityIcons name="arrow-left" size={24} color={colors.icon} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Recuperar senha</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons 
                name="lock-reset" 
                size={64} 
                color={colors.primary} 
              />
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>Esqueceu sua senha?</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              Enviaremos um link para seu email para redefinir sua senha.
            </Text>
            
            {error && (
              <View style={[styles.errorContainer, { backgroundColor: `${colors.error}15` }]}>
                <MaterialCommunityIcons name="alert-circle" size={18} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}
            
            <View style={[styles.inputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <MaterialCommunityIcons name="email-outline" size={20} color={colors.icon} />
              <NativeTextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Email"
                placeholderTextColor={colors.muted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            
            <TouchableOpacity 
              style={[styles.resetButton, { backgroundColor: colors.primary }]}
              onPress={handleResetPassword}
              disabled={loading || !email}
            >
              {loading ? (
                <Text style={styles.resetButtonText}>Enviando...</Text>
              ) : (
                <Text style={styles.resetButtonText}>Enviar link de recuperação</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={[styles.backButtonText, { color: colors.muted }]}>
                Voltar para o login
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  formContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    width: '100%',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  resetButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
  },
  backButtonText: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 