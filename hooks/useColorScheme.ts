import { useEffect, useState } from 'react';
import { ColorSchemeName } from 'react-native';
import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { auth } from '../config/firebase';

// Criar um emissor de eventos para notificar mudanças de tema
const themeEmitter = new EventEmitter();
const THEME_CHANGE_EVENT = 'themeChange';
const THEME_STORAGE_KEY = 'app_theme';

// Aumentar o limite de listeners para evitar warning
themeEmitter.setMaxListeners(30);

// Variável global para armazenar o tema atual
let currentTheme: ColorSchemeName = 'light';

// Inicializar o tema a partir do AsyncStorage
async function initializeTheme() {
  try {
    const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      currentTheme = savedTheme as ColorSchemeName;
      // Emitir o evento para atualizar todos os componentes que usam o tema
      themeEmitter.emit(THEME_CHANGE_EVENT, currentTheme);
    }
  } catch (error) {
    console.error('Erro ao carregar tema do AsyncStorage:', error);
  }
}

// Inicializar tema ao carregar o módulo
initializeTheme();

/**
 * Hook personalizado para gerenciar o tema do aplicativo.
 * Salva preferências no AsyncStorage e Firestore.
 */
export function useColorScheme(): ColorSchemeName {
  const [theme, setTheme] = useState<ColorSchemeName>(currentTheme);
  
  // Ouvir mudanças de tema
  useEffect(() => {
    const themeChangeListener = (newTheme: ColorSchemeName) => {
      setTheme(newTheme);
    };
    
    // Aplicar o tema atual assim que o componente montar
    setTheme(currentTheme);
    
    // Adicionar listener
    themeEmitter.on(THEME_CHANGE_EVENT, themeChangeListener);
    
    // Limpar listener quando o componente desmontar
    return () => {
      themeEmitter.off(THEME_CHANGE_EVENT, themeChangeListener);
    };
  }, []);
  
  // Função para definir e salvar o tema
  const setAndSaveTheme = async (newTheme: ColorSchemeName) => {
    currentTheme = newTheme;
    
    // Emitir o evento para atualizar todos os componentes que usam o tema
    themeEmitter.emit(THEME_CHANGE_EVENT, newTheme);
    
    // Salvar no AsyncStorage
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme as string);
      console.log(`Tema salvo no AsyncStorage: ${newTheme}`);
      
      // Salvar no Firestore se o usuário estiver autenticado
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, { 
            theme: newTheme
          });
          console.log(`Tema salvo no Firestore para o usuário ${currentUser.uid}: ${newTheme}`);
        } catch (firestoreError) {
          console.error('Erro ao salvar tema no Firestore:', firestoreError);
          // Continue mesmo com erro no Firestore, pois já salvamos no AsyncStorage
        }
      }
    } catch (error) {
      console.error('Erro ao salvar tema:', error);
    }
  };
  
  // Expor a função setTheme para acesso global
  (useColorScheme as any).setTheme = setAndSaveTheme;
  
  return theme || 'light';
}
