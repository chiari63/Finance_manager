import { Redirect } from 'expo-router';

export default function Index() {
  // Redirecionar para a página inicial
  return <Redirect href="/(tabs)" />;
} 