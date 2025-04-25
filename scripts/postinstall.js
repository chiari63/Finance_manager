const fs = require('fs');
const path = require('path');

/**
 * Script de pós-instalação para configurar o ambiente de desenvolvimento
 */
console.log('🔧 Executando script de pós-instalação...');

// Verificar se o arquivo .env existe
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), '.env.example');

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('📄 Arquivo .env não encontrado. Criando a partir do .env.example...');
  
  // Copiar .env.example para .env
  fs.copyFileSync(envExamplePath, envPath);
  console.log('✅ Arquivo .env criado com sucesso!');
} else if (fs.existsSync(envPath)) {
  console.log('✅ Arquivo .env já existe.');
} else {
  console.log('⚠️ Arquivos .env e .env.example não encontrados. Criando .env vazio...');
  
  // Criar arquivo .env com configurações do Firebase
  const envContent = `# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBQj6Q-jJ7zMKttIYHv1U1uq1rudHHdwrk
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=financemanager-c2cf1.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=financemanager-c2cf1
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=financemanager-c2cf1.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1092601281806
EXPO_PUBLIC_FIREBASE_APP_ID=1:1092601281806:web:73b70efb238c4ebd40ab5f
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-YZL838Y1RR
`;
  
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Arquivo .env criado com configurações do Firebase.');
}

// Verificar e criar estrutura de pastas necessárias
const requiredDirs = ['assets', 'hooks', 'components', 'constants', 'utils', 'types', 'app'];

for (const dir of requiredDirs) {
  const dirPath = path.join(process.cwd(), dir);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`📁 Criando diretório ${dir}...`);
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

console.log('✨ Instalação concluída com sucesso!');
console.log('🚀 Execute "npm start" para iniciar o projeto.'); 