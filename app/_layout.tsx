import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { EventEmitter } from 'events';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from '../hooks/useColorScheme';
import { TransactionProvider } from '../context/TransactionContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { Colors } from '../constants/Colors';
import ProtectedRouteGuard from '../components/ProtectedRouteGuard';
import * as SplashScreen from 'expo-splash-screen';
import { Text, View, StyleSheet, Platform } from 'react-native';

// Impedir que a tela de splash seja escondida automaticamente
SplashScreen.preventAutoHideAsync().catch((error) => {
  console.warn('Erro ao prevenir auto-hide do splash:', error);
});

// Aumentar o limite de listeners para evitar avisos
EventEmitter.defaultMaxListeners = 20;

// Layout principal
export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [initError, setInitError] = useState<Error | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const colorScheme = useColorScheme();

  useEffect(() => {
    async function prepare() {
      try {
        console.log('🚀 App inicializando. Plataforma:', Platform.OS);
        
        // Aqui você pode colocar qualquer código que precise ser executado antes do app ficar pronto
        // Como carregar recursos ou fazer chamadas assíncronas
        
        // Simula um tempo de preparação
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ Preparação concluída com sucesso');
      } catch (e: any) {
        console.error('❌ Erro ao preparar o app:', e.message);
        setInitError(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    if (fontError) console.error('❌ Erro ao carregar fontes:', fontError);
  }, [fontError]);

  useEffect(() => {
    if (appIsReady && (fontsLoaded || fontError)) {
      // Esconde a tela de splash quando tudo estiver pronto
      const hideSplash = async () => {
        try {
          console.log('🎭 Escondendo splash screen...');
          await SplashScreen.hideAsync();
          console.log('🎭 Splash screen escondida com sucesso');
        } catch (e) {
          console.warn('❌ Erro ao esconder a tela de splash:', e);
        }
      };
      
      hideSplash();
    }
  }, [appIsReady, fontsLoaded, fontError]);

  // Se acontecer um erro na inicialização, mostrar uma tela de erro
  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Erro na inicialização</Text>
        <Text style={styles.errorMessage}>{initError.message}</Text>
      </View>
    );
  }

  if (!appIsReady || (!fontsLoaded && !fontError)) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Se houve erro no carregamento das fontes, seguimos mesmo assim
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <TransactionProvider>
          <StatusBar style="auto" />
          <ProtectedRouteGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="profile" options={{ headerShown: false }} />
              <Stack.Screen name="transactions/details" options={{ headerShown: false }} />
              <Stack.Screen name="transactions/add" options={{ headerShown: false }} />
              <Stack.Screen name="accounts/index" options={{ headerShown: false }} />
              <Stack.Screen name="accounts/edit" options={{ headerShown: false }} />
              <Stack.Screen name="payments/index" options={{ headerShown: false }} />
              <Stack.Screen name="payments/edit" options={{ headerShown: false }} />
              <Stack.Screen name="credit-cards/details" options={{ headerShown: false }} />
              <Stack.Screen name="security" options={{ headerShown: false }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
            </Stack>
          </ProtectedRouteGuard>
        </TransactionProvider>
      </AuthProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ff000010',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#E53935',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
  }
});
