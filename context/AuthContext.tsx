import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { auth, db } from '../config/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updateProfile, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  collection,
  Timestamp,
  query,
  getDocs,
  where
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import { sanitizeString, isValidEmail, validatePassword } from '@/utils/securityUtils';
import { useColorScheme } from '@/hooks/useColorScheme';

// Define o tipo para Timestamp do Firestore
interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
  toDate?: () => Date;
}

// Define os tipos para o contexto
export interface User {
  id: string;
  name: string;
  email: string;
  photoURL: string | null;
  createdAt: Date;
  theme?: string;
}

// Interface para dados do Firestore
interface FirestoreUserData {
  name: string;
  email: string;
  photoURL: string | null;
  createdAt: FirestoreTimestamp | Date;
  theme?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  updateUserEmail: (email: string, password: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

// Cria o contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Função para converter um timestamp do Firestore para Date
const convertTimestampToDate = (timestamp: FirestoreTimestamp | Date | null): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(timestamp.seconds * 1000);
};

// Provedor de autenticação
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Função para converter um FirebaseUser para nosso tipo User
  const createUserObject = (firebaseUser: FirebaseUser): User => {
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || '',
      email: firebaseUser.email || '',
      photoURL: firebaseUser.photoURL,
      createdAt: new Date(),
    };
  };

  // Login com email e senha
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Sanitizar e validar inputs
      const sanitizedEmail = sanitizeString(email).toLowerCase();
      
      // Validar e-mail
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('O e-mail fornecido é inválido.');
      }
      
      // Se a senha estiver vazia, verificar se é uma tentativa de login biométrico
      if (!password) {
        console.log('🔑 Login - Tentativa de login biométrico para:', sanitizedEmail);
        
        // Verificar se o usuário já está logado no Firebase Auth
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.email === sanitizedEmail) {
          console.log('🔑 Login - Usuário já está autenticado no Firebase');
          return;
        }
        
        // Buscar credenciais biométricas guardadas
        try {
          const bioAuthData = await AsyncStorage.getItem('biometric_credentials');
          if (bioAuthData) {
            const credentials = JSON.parse(bioAuthData);
            // Verificar se temos a senha armazenada para este e-mail
            const userCredential = credentials.find((cred: any) => 
              cred.email === sanitizedEmail
            );
            
            if (userCredential && userCredential.password) {
              console.log('🔑 Login - Credenciais biométricas encontradas, tentando login automático');
              // Usar as credenciais salvas para fazer login
              await signInWithEmailAndPassword(auth, sanitizedEmail, userCredential.password);
              console.log('🔑 Login - Login biométrico bem-sucedido!');
              return;
            }
          }
        } catch (storageError) {
          console.error('🔑 Login - Erro ao acessar credenciais biométricas:', storageError);
        }
        
        // Se não encontramos credenciais ou ocorreu erro, verificamos se o usuário existe
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', sanitizedEmail));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error('Usuário não encontrado. Faça login com email e senha.');
        }
        
        // Usuário existe, mas não temos a senha salva para biometria
        throw new Error('Autenticação biométrica falhou. Por favor, faça login com email e senha e ative a biometria novamente.');
      }
      
      // Continuar com o login normal com senha
      await signInWithEmailAndPassword(auth, sanitizedEmail, password);
      
      // Verificar se devemos salvar as credenciais para biometria
      try {
        const bioEnabled = await AsyncStorage.getItem('biometric_auth_enabled');
        if (bioEnabled === 'true') {
          console.log('🔑 Login - Salvando credenciais para uso com biometria');
          // Buscar credenciais existentes ou criar array vazio
          const existingDataStr = await AsyncStorage.getItem('biometric_credentials');
          const existingData = existingDataStr ? JSON.parse(existingDataStr) : [];
          
          // Verificar se já existe entrada para este e-mail
          const existingIndex = existingData.findIndex((item: any) => item.email === sanitizedEmail);
          
          // Criar ou atualizar entrada
          const credentialEntry = {
            email: sanitizedEmail,
            password: password,
            updatedAt: new Date().toISOString()
          };
          
          if (existingIndex >= 0) {
            // Atualizar entrada existente
            existingData[existingIndex] = credentialEntry;
          } else {
            // Adicionar nova entrada
            existingData.push(credentialEntry);
          }
          
          // Salvar de volta no AsyncStorage
          await AsyncStorage.setItem('biometric_credentials', JSON.stringify(existingData));
          console.log('🔑 Login - Credenciais salvas com sucesso para biometria');
        }
      } catch (storageError) {
        console.error('🔑 Login - Erro ao salvar credenciais biométricas:', storageError);
        // Continuar mesmo se falhar a gravação - não é crítico
      }
      
      // Importante: Não desativamos o loading aqui para evitar que a tela pisque
      // O ProtectedRouteGuard irá cuidar da navegação
      return;
    } catch (error: any) {
      console.error('🔑 Login - Erro no login:', error);
      let errorMsg = 'Falha ao fazer login';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'Email ou senha incorretos';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Muitas tentativas de login. Tente mais tarde';
      } else if (error.code === 'auth/user-disabled') {
        errorMsg = 'Esta conta foi desativada';
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = 'Erro de conexão. Verifique sua internet.';
      } else if (error.code) {
        errorMsg = `Erro: ${error.code}`;
      }
      
      setError(errorMsg);
      setIsLoading(false); // Só desativamos o loading em caso de erro
      throw new Error(errorMsg);
    }
  };

  // Registrar novo usuário
  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Sanitizar e validar inputs
      const sanitizedEmail = sanitizeString(email).toLowerCase();
      const sanitizedName = sanitizeString(name);
      
      // Validar e-mail
      if (!isValidEmail(sanitizedEmail)) {
        throw new Error('O e-mail fornecido é inválido.');
      }
      
      // Validar senha
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new Error(passwordValidation.message || 'Senha inválida.');
      }
      
      // Continuar com o registro
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, password);
      
      console.log('🔥 Register - Atualizando perfil com o nome...');
      // Atualizar o perfil com o nome
      await updateProfile(userCredential.user, {
        displayName: sanitizedName
      });
      console.log('🔥 Register - Perfil atualizado com sucesso');
      
      console.log('🔥 Register - Criando documento do usuário no Firestore...');
      // Criar um documento do usuário no Firestore
      const newUser: User = {
        id: userCredential.user.uid,
        name: sanitizedName,
        email: sanitizedEmail,
        photoURL: null,
        createdAt: new Date()
      };
      
      try {
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          name: sanitizedName,
          email: sanitizedEmail,
          photoURL: null,
          createdAt: serverTimestamp()
        });
        console.log('🔥 Register - Documento do usuário criado no Firestore');
      } catch (firestoreError) {
        console.error('🔥 Register - Erro ao criar documento no Firestore:', firestoreError);
        // Continue mesmo se falhar o Firestore - podemos sincronizar depois
      }
      
      // Atualizar o estado
      console.log('🔥 Register - Atualizando estado local');
      setUser(newUser);
      
      // Salvar informação de login no AsyncStorage
      try {
        console.log('🔥 Register - Salvando informações no AsyncStorage');
        await AsyncStorage.setItem('user', JSON.stringify({
          id: userCredential.user.uid,
          email: sanitizedEmail
        }));
        console.log('🔥 Register - AsyncStorage atualizado com sucesso');
      } catch (asyncError) {
        console.error('🔥 Register - Erro ao salvar no AsyncStorage:', asyncError);
        // Continue mesmo se falhar o AsyncStorage
      }
      
      console.log('🔥 Register - Redirecionando para a tela principal');
      // Aguardar um pouco mais para garantir que o componente Root Layout esteja montado
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500); // Aumentando o tempo para garantir uma transição mais suave
    } catch (error: any) {
      console.error('🔥 Register - Erro no processo de registro:', error);
      let errorMsg = 'Falha ao criar conta';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'Este email já está em uso';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'A senha deve ter pelo menos 6 caracteres';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Email inválido';
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = 'Erro de conexão. Verifique sua internet.';
      } else if (error.code) {
        errorMsg = `Erro: ${error.code}`;
      }
      
      console.error('🔥 Register - Mensagem de erro:', errorMsg);
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      console.log('🔥 Register - Finalizando processo de registro');
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    
    try {
      await signOut(auth);
      await AsyncStorage.removeItem('user');
      setUser(null);
      // Aguardar um pouco mais para garantir que o componente Root Layout esteja montado
      setTimeout(() => {
        router.replace('/auth/login');
      }, 1500); // Aumentando o tempo para garantir uma transição mais suave
    } catch (error) {
      throw new Error('Falha ao fazer logout');
    } finally {
      setIsLoading(false);
    }
  };

  // Resetar senha
  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      let errorMsg = 'Falha ao enviar email de recuperação';
      
      if (error.code === 'auth/user-not-found') {
        errorMsg = 'Não existe conta com este email';
      } else if (error.code === 'auth/invalid-email') {
        errorMsg = 'Email inválido';
      }
      
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar perfil do usuário
  const updateUserProfile = async (data: Partial<User>) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    setIsLoading(true);
    try {
      // Verificar tamanho dos dados antes de enviar
      const photoURLSize = data.photoURL ? data.photoURL.length : 0;
      console.log(`Atualizando perfil - Nome: ${data.name?.length || 0} caracteres, Foto: ${photoURLSize > 0 ? (photoURLSize / 1024).toFixed(2) + 'KB' : 'Sem alteração'}`);
      
      // Verificar se a foto não é muito grande para o Firestore
      if (photoURLSize > 900 * 1024) { // 900KB
        console.error('Foto muito grande para ser salva no Firestore');
        throw new Error('A foto é muito grande para ser salva. O tamanho máximo é de 900KB.');
      }
      
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { 
        ...(data.name ? { name: data.name } : {}),
        ...(data.photoURL !== undefined ? { photoURL: data.photoURL } : {})
      });
      
      // Se há nome ou foto a atualizar no Auth
      if (data.name || data.photoURL !== undefined) {
        try {
          await updateProfile(auth.currentUser!, {
            ...(data.name ? { displayName: data.name } : {}),
            ...(data.photoURL !== undefined ? { photoURL: data.photoURL } : {})
          });
        } catch (authError) {
          console.error('Erro ao atualizar perfil no Auth:', authError);
          // Continua mesmo se falhar o Auth, pois já atualizamos no Firestore
        }
      }
      
      // Atualizar estado local
      setUser(prev => prev ? { ...prev, ...data } : null);
    } catch (error) {
      console.error('Erro detalhado ao atualizar perfil:', error);
      throw new Error(error instanceof Error ? error.message : 'Falha ao atualizar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  // Atualizar email do usuário
  const updateUserEmail = async (email: string, password: string) => {
    // Implementar lógica para atualizar email com reautenticação
    throw new Error('Função não implementada');
  };

  // Atualizar senha do usuário
  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    // Implementar lógica para atualizar senha com reautenticação
    throw new Error('Função não implementada');
  };

  // Verificar estado de autenticação ao iniciar
  useEffect(() => {
    console.log('🔐 AuthContext - Inicializando listener de autenticação');
    
    // Flag para evitar atualizações de estado após desmontagem
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 AuthContext - Estado de autenticação alterado:', 
        firebaseUser ? `Usuário autenticado: ${firebaseUser.email}` : 'Usuário não autenticado');
      
      // Aguardar um pouco para garantir que outras operações tenham terminado
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verificar se o componente ainda está montado
      if (!isMounted) return;
      
      if (firebaseUser) {
        // Usuário autenticado
        try {
          console.log('🔐 AuthContext - Buscando dados do usuário no Firestore...');
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (userDoc.exists()) {
            // Se o doc existe, usamos os dados do Firestore
            console.log('🔐 AuthContext - Documento do usuário encontrado no Firestore');
            const userData = userDoc.data() as FirestoreUserData;
            
            if (isMounted) {
              setUser({
                id: firebaseUser.uid,
                name: userData.name,
                email: userData.email,
                photoURL: userData.photoURL,
                createdAt: convertTimestampToDate(userData.createdAt)
              });
            
              // Carregar a preferência de tema salva no Firestore
              if (userData.theme) {
                try {
                  console.log('🔐 AuthContext - Aplicando tema salvo do usuário:', userData.theme);
                  // Usar o método global para definir o tema
                  if (typeof (useColorScheme as any).setTheme === 'function') {
                    (useColorScheme as any).setTheme(userData.theme);
                  }
                } catch (themeError) {
                  console.error('🔐 AuthContext - Erro ao aplicar tema do usuário:', themeError);
                }
              }
            }
          } else {
            // Se não existe, criamos um documento básico
            console.log('🔐 AuthContext - Documento do usuário não encontrado, criando novo...');
            const newUser = createUserObject(firebaseUser);
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              name: newUser.name,
              email: newUser.email,
              photoURL: newUser.photoURL,
              createdAt: serverTimestamp()
            });
            
            if (isMounted) {
              setUser(newUser);
            }
          }
          console.log('🔐 AuthContext - Usuário definido com sucesso:', firebaseUser.email);
        } catch (error) {
          console.error('🔐 AuthContext - Erro ao carregar dados do usuário:', error);
          console.log('🔐 AuthContext - Usando dados básicos do Auth');
          
          if (isMounted) {
            setUser(createUserObject(firebaseUser));
          }
        }
      } else {
        // Usuário não autenticado
        console.log('🔐 AuthContext - Limpando dados do usuário (não autenticado)');
        
        if (isMounted) {
          setUser(null);
        }
        
        try {
          await AsyncStorage.removeItem('user');
          console.log('🔐 AuthContext - AsyncStorage limpo');
        } catch (asyncError) {
          console.error('🔐 AuthContext - Erro ao limpar AsyncStorage:', asyncError);
        }
      }
      
      console.log('🔐 AuthContext - Finalizando carregamento (setIsLoading(false))');
      
      if (isMounted) {
        setIsLoading(false);
      }
    }, (error) => {
      console.error('🔐 AuthContext - Erro no listener de autenticação:', error);
      
      if (isMounted) {
        setIsLoading(false);
      }
    });
    
    // Limpar listener ao desmontar
    return () => {
      console.log('🔐 AuthContext - Desmontando e limpando listener');
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      register,
      logout,
      resetPassword,
      updateUserProfile,
      updateUserEmail,
      updateUserPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar o contexto de autenticação
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth deve ser usado dentro de um AuthProvider');
    // Fornecer valores padrão em vez de falhar completamente
    return {
      user: null,
      isLoading: false,
      login: async () => { throw new Error('AuthProvider não encontrado'); },
      register: async () => { throw new Error('AuthProvider não encontrado'); },
      logout: async () => { throw new Error('AuthProvider não encontrado'); },
      resetPassword: async () => { throw new Error('AuthProvider não encontrado'); },
      updateUserProfile: async () => { throw new Error('AuthProvider não encontrado'); },
      updateUserEmail: async () => { throw new Error('AuthProvider não encontrado'); },
      updateUserPassword: async () => { throw new Error('AuthProvider não encontrado'); },
    };
  }
  return context;
}; 