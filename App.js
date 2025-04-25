import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ExpoRoot } from 'expo-router';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <ExpoRoot context={require.context('./app', true, /\.(js|ts|tsx)$/)} />
    </SafeAreaProvider>
  );
} 