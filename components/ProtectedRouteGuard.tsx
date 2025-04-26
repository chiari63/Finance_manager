import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

type ProtectedRouteGuardProps = {
  children: React.ReactNode;
};

export default function ProtectedRouteGuard({ children }: ProtectedRouteGuardProps) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{[key: string]: any}>({});
  const redirectingRef = useRef(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  // Verifica se o usuário está em uma rota autenticada
  const isAuthGroup = segments[0] === '(tabs)' || segments[0] === 'security';
  
  useEffect(() => {
    // Coletando informações de debug
    const info = {
      platform: Platform.OS,
      version: Platform.Version,
      timestamps: new Date().toISOString(),
      route: segments.join('/'),
      isProtectedRoute: isAuthGroup,
      isLoading,
      hasUser: !!user,
      userId: user?.id || 'none',
      userEmail: user?.email || 'none'
    };
    
    setDebugInfo(info);
    
    console.log('🚦 ProtectedRouteGuard: Verificando autenticação', JSON.stringify(info, null, 2));
    
    try {
      // Evitar múltiplas navegações simultâneas
      if (!isLoading && !redirectingRef.current) {
        // Se estamos em uma rota protegida e não há usuário, redireciona para login
        if (isAuthGroup && !user) {
          console.log('  ⚠️ Redirecionando para login (rota protegida sem autenticação)');
          // Marcar que estamos no meio de um redirecionamento
          redirectingRef.current = true;
          
          // Usar setTimeout para evitar navegação antes do componente estar montado
          // Aumentado para 500ms para garantir transição suave
          setTimeout(() => {
            router.replace('/auth/login');
            // Resetar o flag após um tempo
            setTimeout(() => {
              redirectingRef.current = false;
            }, 1000);
          }, 500);
        } 
        // Se estamos em uma rota de autenticação e há um usuário, redireciona para home
        else if (!isAuthGroup && segments[0] === 'auth' && user) {
          console.log('  ⚠️ Redirecionando para home (usuário já autenticado)');
          // Marcar que estamos no meio de um redirecionamento
          redirectingRef.current = true;
          
          // Usar setTimeout para evitar navegação antes do componente estar montado
          // Aumentado para 500ms para garantir transição suave
          setTimeout(() => {
            router.replace('/(tabs)');
            // Resetar o flag após um tempo
            setTimeout(() => {
              redirectingRef.current = false;
            }, 1000);
          }, 500);
        }
      }
    } catch (e: any) {
      console.error('❌ Erro na navegação do ProtectedRouteGuard:', e);
      setError(`Erro de navegação: ${e.message}`);
      redirectingRef.current = false;
    }
  }, [user, segments, isLoading, router, isAuthGroup]);
  
  // Se temos um erro, mostramos uma tela de erro
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: '#E53935' }]}>Erro de Navegação</Text>
        <Text style={[styles.errorMessage, { color: colors.text }]}>{error}</Text>
        
        <Text style={[styles.debugTitle, { color: colors.text }]}>Informações de Depuração:</Text>
        {Object.entries(debugInfo).map(([key, value]) => (
          <Text key={key} style={[styles.debugText, { color: colors.muted || '#666' }]}>
            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </Text>
        ))}
      </View>
    );
  }
  
  // Enquanto estamos carregando, mostra uma tela simples
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Carregando...</Text>
      </View>
    );
  }
  
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  debugText: {
    fontSize: 12,
    marginBottom: 4,
  }
}); 