import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Image, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { MaterialCommunityIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useTransactions } from '@/context/TransactionContext';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// Componente de item de menu
const MenuItem = ({ 
  icon, 
  iconType = 'ionicons',
  title, 
  subtitle, 
  onPress, 
  showChevron = true,
  rightContent
}: { 
  icon: string,
  iconType?: 'ionicons' | 'material' | 'awesome',
  title: string, 
  subtitle?: string, 
  onPress?: () => void, 
  showChevron?: boolean,
  rightContent?: React.ReactNode
}) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const renderIcon = () => {
    if (iconType === 'material') {
      return <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary} />;
    } else if (iconType === 'awesome') {
      return <FontAwesome name={icon as any} size={24} color={colors.primary} />;
    }
    return <Ionicons name={icon as any} size={24} color={colors.primary} />;
  };

  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.menuIconContainer}>
        {renderIcon()}
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.menuSubtitle, { color: colors.muted }]}>{subtitle}</Text>}
      </View>
      {rightContent && (
        <View style={styles.rightContent}>
          {rightContent}
        </View>
      )}
      {showChevron && onPress && (
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      )}
    </TouchableOpacity>
  );
};

// Componente de seção
const Section = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.muted }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );
};

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { logout, user, updateUserProfile } = useAuth();
  const { clearTransactions } = useTransactions();

  // Estados para edição de perfil
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Função para abrir o modal de edição
  const handleProfileEdit = () => {
    setEditName(user?.name || '');
    setSelectedImage(null);
    setIsEditModalVisible(true);
  };
  
  // Função para converter imagem para base64 com tamanho reduzido
  const convertImageToBase64 = async (uri: string): Promise<string> => {
    try {
      // Verificar tamanho do arquivo
      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      
      // Se o arquivo for maior que 1MB, alertar o usuário
      const ONE_MB = 1 * 1024 * 1024; // 1MB em bytes
      if (fileInfo.exists && fileInfo.size && fileInfo.size > ONE_MB) {
        console.log(`Arquivo grande (${(fileInfo.size / 1024).toFixed(2)}KB), compressão adicional será aplicada`);
        
        // Se for muito grande, lançamos imediatamente alert e abortamos
        if (fileInfo.size > 5 * 1024 * 1024) { // 5MB
          Alert.alert(
            'Imagem muito grande',
            'A imagem selecionada é muito grande (mais de 5MB). Por favor, escolha uma imagem menor.'
          );
          throw new Error('Imagem muito grande para processamento');
        }
        
        // Se for grande mas tratável, apenas alertamos o usuário
        Alert.alert('Aviso', 'A imagem é grande e pode afetar o desempenho do aplicativo.');
      }
      
      // Ler a imagem como base64
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Verificar o tamanho do resultado base64
        const base64Size = base64.length;
        console.log(`Tamanho da imagem em base64: ${(base64Size / 1024).toFixed(2)}KB`);
        
        return `data:image/jpeg;base64,${base64}`;
      } catch (readError) {
        console.error('Erro ao ler arquivo como base64:', readError);
        throw new Error('Não foi possível ler a imagem');
      }
    } catch (error) {
      console.error('Erro ao converter imagem para base64:', error);
      throw new Error('Falha ao processar a imagem');
    }
  };
  
  // Função para selecionar imagem da galeria
  const pickImage = async () => {
    try {
      // Solicitar permissão para acessar a biblioteca de fotos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de permissão para acessar sua galeria de fotos.');
        return;
      }
      
      // Lançar o seletor de imagem com qualidade muito reduzida para economizar espaço
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.1, // Reduzindo ainda mais a qualidade para garantir que caiba no Firestore
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };
  
  // Função para salvar as alterações do perfil
  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Erro', 'O nome não pode estar vazio');
      return;
    }
    
    setIsSaving(true);
    try {
      let photoURL = user?.photoURL || null;
      
      // Se tiver uma nova imagem selecionada, converter para base64
      if (selectedImage) {
        try {
          setIsProcessingImage(true);
          // Converter imagem para base64 e usar como photoURL
          const base64Image = await convertImageToBase64(selectedImage);
          
          // Verifica se a imagem base64 não é muito grande (limitando a 500KB para Firestore)
          const MAX_SIZE = 500 * 1024; // 500KB em bytes (para ficar bem abaixo do limite do Firestore)
          if (base64Image.length > MAX_SIZE) {
            console.warn(`Imagem grande demais: ${Math.round(base64Image.length / 1024)}KB > 500KB`);
            Alert.alert(
              'Imagem muito grande', 
              'A imagem selecionada é muito grande para ser armazenada. Por favor, escolha uma imagem menor ou use uma foto de menor resolução.',
              [
                { text: 'OK', onPress: () => setIsProcessingImage(false) }
              ]
            );
            return;
          }
          
          photoURL = base64Image;
        } catch (processError) {
          Alert.alert('Erro', 'Não foi possível processar a imagem, mas o perfil será atualizado.');
          console.error('Erro ao processar a imagem:', processError);
        } finally {
          setIsProcessingImage(false);
        }
      }
      
      // Adicionar um log para ver o tamanho dos dados sendo enviados
      console.log(`Tamanho dos dados do perfil: Nome (${editName.length} caracteres), Foto (${photoURL ? (photoURL.length / 1024).toFixed(2) + 'KB' : 'Nenhuma'})`);
      
      await updateUserProfile({
        name: editName.trim(),
        photoURL
      });
      
      setIsEditModalVisible(false);
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil');
      console.error('Erro ao atualizar perfil:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Funções para navegação
  const handleBankAccountsPress = () => {
    router.push('/accounts');
  };

  const handlePaymentMethodsPress = () => {
    router.push('/payments');
  };

  const handleCreditCardsPress = () => {
    router.push('/credit-cards');
  };

  const handleBackupPress = () => {
    // Implementar backup
    Alert.alert('Em breve', 'Backup e exportação estará disponível em breve!');
  };

  const handleThemePress = () => {
    // Implementar alteração de tema
    Alert.alert('Em breve', 'Personalização de tema estará disponível em breve!');
  };

  const handleThemeChange = (value: boolean) => {
    // Usar a função setTheme exposta pelo hook personalizado
    const newTheme = value ? 'dark' : 'light';
    (useColorScheme as any).setTheme(newTheme);
  };

  const handleNotificationsPress = () => {
    // Implementação futura
    Alert.alert('Notificações', 'Esta funcionalidade estará disponível em breve.');
  };

  const handleSecurityPress = () => {
    // Navegar para a nova tela de segurança
    router.push('/security');
  };

  const handleClearDataPress = () => {
    Alert.alert(
      'Limpar dados',
      'Tem certeza que deseja limpar todos os dados de transações? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Limpar', 
          style: 'destructive',
          onPress: () => {
            clearTransactions();
            Alert.alert('Sucesso', 'Todos os dados foram limpos com sucesso!');
          }
        }
      ]
    );
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Sair', 
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Configurações</Text>
      </View>

      {/* Perfil do usuário */}
      <View style={styles.profileSection}>
        <View>
          {user?.photoURL ? (
            <Image 
              source={{ uri: user.photoURL }} 
              style={styles.profileImage} 
            />
          ) : (
            <View style={[styles.profileImage, styles.profilePlaceholder, { backgroundColor: colors.primary }]}>
              <Text style={styles.profilePlaceholderText}>
                {user?.name?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {user?.name || 'Usuário'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.muted }]}>
            {user?.email || 'email@exemplo.com'}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.editButton, { borderColor: colors.border }]}
          onPress={handleProfileEdit}
        >
          <Text style={[styles.editButtonText, { color: colors.primary }]}>Editar</Text>
        </TouchableOpacity>
      </View>

      {/* Financeiro */}
      <Section title="FINANCEIRO">
        <MenuItem
          icon="wallet"
          title="Contas Bancárias"
          subtitle="Gerenciar suas contas"
          onPress={handleBankAccountsPress}
        />
        <MenuItem
          icon="card"
          title="Métodos de Pagamento"
          subtitle="Configurar formas de pagamento"
          onPress={handlePaymentMethodsPress}
        />
        <MenuItem
          icon="card"
          iconType="material"
          title="Cartões de Crédito"
          subtitle="Gerenciar faturas e cartões"
          onPress={handleCreditCardsPress}
        />
      </Section>

      {/* Preferências */}
      <Section title="PREFERÊNCIAS">
        <MenuItem
          icon="moon"
          title="Tema"
          subtitle={colorScheme === 'dark' ? 'Escuro' : 'Claro'}
          rightContent={(
            <Switch
              value={colorScheme === 'dark'}
              onValueChange={handleThemeChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#FFF"
            />
          )}
          showChevron={false}
        />
        <MenuItem
          icon="notifications"
          title="Notificações"
          subtitle="Configurar alertas e lembretes"
          onPress={handleNotificationsPress}
        />
      </Section>

      {/* Dados e Segurança */}
      <Section title="DADOS E SEGURANÇA">
        <MenuItem
          icon="cloud-upload"
          title="Backup e Exportação"
          subtitle="Faça backup ou exporte seus dados"
          onPress={handleBackupPress}
        />
        <MenuItem
          icon="shield"
          title="Segurança"
          subtitle="Autenticação e privacidade"
          onPress={handleSecurityPress}
        />
        <MenuItem
          icon="trash"
          title="Limpar Dados"
          subtitle="Remover todos os dados do app"
          onPress={handleClearDataPress}
        />
      </Section>

      {/* Sair */}
      <View style={styles.logoutContainer}>
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: colors.expense + '15', borderColor: colors.expense }]}
          onPress={handleLogoutPress}
        >
          <Ionicons name="log-out" size={18} color={colors.expense} />
          <Text style={[styles.logoutButtonText, { color: colors.expense }]}>Sair da Conta</Text>
        </TouchableOpacity>
      </View>

      {/* Informações do App */}
      <View style={styles.footer}>
        <Text style={[styles.appVersion, { color: colors.muted }]}>
          Finance Manager v1.0.1
        </Text>
      </View>

      {/* Modal de edição de perfil */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isEditModalVisible}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Editar Perfil</Text>
            
            {/* Imagem de perfil */}
            <View style={styles.profileImageContainer}>
              {selectedImage ? (
                <Image source={{ uri: selectedImage }} style={styles.profileImagePreview} />
              ) : user?.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.profileImagePreview} />
              ) : (
                <View style={[styles.profileImagePreview, styles.profilePlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={styles.profilePlaceholderText}>
                    {editName.charAt(0) || 'U'}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity 
                style={[styles.changePhotoButton, { backgroundColor: colors.primary }]}
                onPress={pickImage}
                disabled={isSaving || isProcessingImage}
              >
                <MaterialCommunityIcons name="camera" size={16} color="#FFFFFF" />
                <Text style={styles.changePhotoText}>Escolher foto</Text>
              </TouchableOpacity>
              
              <Text style={[styles.infoText, { color: colors.muted }]}>
                Toque no botão acima para selecionar uma foto da galeria
              </Text>
              
              {isProcessingImage && (
                <View style={styles.progressContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.progressText, { color: colors.muted }]}>
                    Processando imagem...
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={[styles.inputLabel, { color: colors.muted }]}>Nome</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.background, 
                color: colors.text,
                borderColor: colors.border 
              }]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Seu nome"
              placeholderTextColor={colors.muted}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setIsEditModalVisible(false)}
                disabled={isSaving || isProcessingImage}
              >
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}
                disabled={isSaving || isProcessingImage}
              >
                {isSaving || isProcessingImage ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF' }}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  sectionContent: {
    borderRadius: 12,
    marginHorizontal: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIconContainer: {
    marginRight: 12,
    width: 32,
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  rightContent: {
    marginRight: 8,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  appVersion: {
    fontSize: 14,
    marginBottom: 4,
  },
  appCopyright: {
    fontSize: 12,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profilePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  editButton: {
    padding: 8,
    borderWidth: 1,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 20,
    elevation: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  changePhotoButton: {
    padding: 8,
    borderWidth: 1,
    borderColor: '#FFF',
    borderRadius: 20,
  },
  changePhotoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  infoText: {
    fontSize: 12,
    color: '#FFF',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  cancelButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 8,
  },
  saveButton: {
    padding: 12,
    borderRadius: 8,
  },
  logoutContainer: {
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 8,
    maxWidth: 180,
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  progressText: {
    marginLeft: 8,
    fontSize: 14,
  },
  modalButton: {
    flex: 1,
    margin: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 