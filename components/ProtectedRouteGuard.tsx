import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';

type ProtectedRouteGuardProps = {
  children: React.ReactNode;
};

export default function ProtectedRouteGuard({ children }: ProtectedRouteGuardProps) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{[key: string]: any}>({});
  
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
      if (!isLoading) {
        // Se estamos em uma rota protegida e não há usuário, redireciona para login
        if (isAuthGroup && !user) {
          console.log('  ⚠️ Redirecionando para login (rota protegida sem autenticação)');
          // Usar setTimeout para evitar navegação antes do componente estar montado
          setTimeout(() => {
            router.replace('/auth/login');
          }, 100);
        } 
        // Se estamos em uma rota de autenticação e há um usuário, redireciona para home
        else if (!isAuthGroup && segments[0] === 'auth' && user) {
          console.log('  ⚠️ Redirecionando para home (usuário já autenticado)');
          // Usar setTimeout para evitar navegação antes do componente estar montado
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 100);
        }
      }
    } catch (e: any) {
      console.error('❌ Erro na navegação do ProtectedRouteGuard:', e);
      setError(`Erro de navegação: ${e.message}`);
    }
  }, [user, segments, isLoading, router, isAuthGroup]);
  
  // Se temos um erro, mostramos uma tela de erro
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Erro de Navegação</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        
        <Text style={styles.debugTitle}>Informações de Depuração:</Text>
        {Object.entries(debugInfo).map(([key, value]) => (
          <Text key={key} style={styles.debugText}>
            {key}: {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </Text>
        ))}
      </View>
    );
  }
  
  // Enquanto estamos carregando, mostra uma tela simples
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
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
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff9f9'
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#E53935'
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333'
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  }
}); 