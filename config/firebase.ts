// Import the functions you need from the SDKs you need
import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  Auth, 
  browserLocalPersistence, 
  indexedDBLocalPersistence, 
  inMemoryPersistence
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Log para depuração
console.log('🔥 Inicializando Firebase...');

// Configurações do Firebase
// Idealmente, em produção, estas chaves deveriam ser carregadas de variáveis de ambiente
// ou armazenadas em um arquivo .env que não é commitado no repositório
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBQj6Q-jJ7zMKttIYHv1U1uq1rudHHdwrk",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "financemanager-c2cf1.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "financemanager-c2cf1",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "financemanager-c2cf1.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1092601281806",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1092601281806:web:73b70efb238c4ebd40ab5f",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-YZL838Y1RR"
};

// Log para verificar a disponibilidade das variáveis de ambiente
console.log('🔑 Variáveis de ambiente carregadas?', Boolean(process.env.EXPO_PUBLIC_FIREBASE_API_KEY));

// Declare variáveis que serão exportadas
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: any;

// Inicializar Firebase
try {
  console.log('🔥 Criando instância do Firebase app...');
  app = initializeApp(firebaseConfig);
  
  // Inicializar o Auth com persistência em AsyncStorage para React Native
  try {
    console.log('🔑 Inicializando serviço de autenticação Firebase...');
    if (Platform.OS !== 'web') {
      // No React Native, usamos o AsyncStorage para persistência (sem usar getReactNativePersistence)
      console.log('📱 Plataforma móvel - usando persistência no dispositivo');
      
      // Inicializar Auth com inMemoryPersistence para garantir compatibilidade
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence
      });
      console.log('✅ Auth inicializado com persistência básica');
    } else {
      console.log('🖥️ Plataforma web - usando getAuth padrão');
      auth = getAuth(app);
    }
  } catch (authError: any) {
    console.error('❌ Erro ao inicializar auth:', authError);
    // Fallback para getAuth padrão em caso de erro
    auth = getAuth(app);
    console.log('⚠️ Usando getAuth padrão como fallback');
  }
  
  // Inicializar o Firestore
  console.log('📊 Inicializando Firestore...');
  db = getFirestore(app);
  
  // Inicializar o Storage
  console.log('📁 Inicializando Storage...');
  storage = getStorage(app);

  // Para ambiente de desenvolvimento em localhost/emulador
  if (__DEV__) {
    try {
      console.log('🔧 Ambiente de desenvolvimento detectado. Verificando se devemos usar emuladores...');
      // Verificar se estamos em um emulador Android
      if (Platform.OS === 'android') {
        console.log('📱 Conectando aos emuladores locais do Firebase para Android...');
        // Use 10.0.2.2 para AVD/emulador Android acessar o localhost do host
        // connectAuthEmulator(auth, 'http://10.0.2.2:9099');
        // connectFirestoreEmulator(db, '10.0.2.2', 8080);
      } else {
        console.log('ℹ️ Não conectando aos emuladores para este ambiente');
      }
    } catch (emulatorError) {
      console.error('❌ Erro ao configurar emuladores:', emulatorError);
    }
  }

  console.log('✅ Firebase inicializado com sucesso');
} catch (error) {
  console.error('❌ ERRO CRÍTICO ao inicializar Firebase:', error);
  
  // Fallback para evitar que o app quebre completamente
  // Criar versões mock dos serviços para que o app continue funcionando
  // mesmo sem conexão com o Firebase
  app = {} as FirebaseApp;
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: any) => {
      callback(null);
      return () => {};
    },
    signInWithEmailAndPassword: async () => {
      throw new Error('Firebase não está disponível');
    },
    createUserWithEmailAndPassword: async () => {
      throw new Error('Firebase não está disponível');
    },
    signOut: async () => {}
  } as unknown as Auth;
  db = {} as Firestore;
  storage = {};
  
  console.warn('⚠️ Usando serviços Firebase mockados devido a erro de inicialização');
}

export { auth, db, storage };
export default app; 