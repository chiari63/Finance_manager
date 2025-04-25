/**
 * Cores do aplicativo de gestão financeira.
 * Definidas para modos claro e escuro.
 */

const primaryColor = '#2563EB'; // Azul principal
const secondaryColor = '#0EA5E9'; // Azul secundário
const accentColor = '#10B981'; // Verde para valores positivos
const errorColor = '#EF4444'; // Vermelho para valores negativos

// Cores comuns para ambos os temas
const common = {
  primary: '#2563EB',
  red: '#F44336',
  green: '#10B981',
  blue: '#3182CE',
  yellow: '#F59E0B',
  orange: '#DD6B20',
  purple: '#805AD5',
  
  // Cores semânticas para transações
  expense: '#F44336', // Vermelho para despesas
  income: '#10B981',  // Verde para receitas
  warning: '#F59E0B',  // Amarelo para avisos
};

export const Colors = {
  light: {
    text: '#1F2937',
    background: '#F9FAFB',
    card: '#FFFFFF',
    primary: common.primary,
    secondary: '#0EA5E9',
    border: '#E5E7EB',
    notification: '#EF4444',
    muted: '#6B7280',
    
    // Cores semânticas para valores
    expense: common.expense,
    income: common.income,
    warning: common.warning,
  },
  dark: {
    text: '#F9FAFB',
    background: '#111827',
    card: '#1F2937',
    primary: common.primary,
    secondary: '#0EA5E9',
    border: '#374151',
    notification: '#EF4444',
    muted: '#9CA3AF',
    
    // Cores semânticas para valores
    expense: common.expense,
    income: common.income,
    warning: common.warning,
  },
};
