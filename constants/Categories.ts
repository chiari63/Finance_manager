/**
 * Definição de categorias para transações financeiras.
 * Baseado nas categorias observadas na planilha do usuário.
 */
import { PaymentMethod } from '@/types/TransactionTypes';

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

// Categorias de transações
export const CATEGORIES: Category[] = [
  // Categorias de despesas
  { id: 'food', name: 'Comida', icon: 'food', color: '#E53E3E' },
  { id: 'transport', name: 'Transporte', icon: 'car', color: '#DD6B20' },
  { id: 'leisure', name: 'Lazer', icon: 'party-popper', color: '#D69E2E' },
  { id: 'games', name: 'Jogos', icon: 'gamepad-variant', color: '#805AD5' },
  { id: 'health', name: 'Saúde', icon: 'hospital-box', color: '#38A169' },
  { id: 'clothing', name: 'Roupa', icon: 'tshirt-crew', color: '#3182CE' },
  { id: 'electronics', name: 'Eletrônicos', icon: 'laptop', color: '#00B5D8' },
  { id: 'housing', name: 'Moradia', icon: 'home', color: '#DD6B20' },
  { id: 'subscriptions', name: 'Assinaturas', icon: 'refresh', color: '#ED64A6' },
  { id: 'education', name: 'Educação', icon: 'school', color: '#667EEA' },
  { id: 'bank', name: 'Banco', icon: 'bank', color: '#319795' },
  { id: 'misc', name: 'Aleatórios', icon: 'dots-horizontal', color: '#718096' },
  
  // Categorias de receitas
  { id: 'salary', name: 'Salário', icon: 'cash', color: '#10B981' },
  { id: 'bonus', name: 'Bônus', icon: 'gift', color: '#3B82F6' },
  { id: 'food_voucher', name: 'Vale-Refeição', icon: 'food-apple', color: '#F59E0B' },
  { id: 'investment', name: 'Investimentos', icon: 'chart-line', color: '#0EA5E9' },
  { id: 'refund', name: 'Reembolso', icon: 'cash-refund', color: '#8B5CF6' },
];

// Métodos de pagamento
export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'pix', name: 'Pix', icon: 'bank-transfer', type: 'transfer', color: '#FFAA44' },
  { id: 'credit', name: 'Crédito', icon: 'credit-card', type: 'credit', color: '#4F44FF' },
  { id: 'debit', name: 'Débito', icon: 'credit-card-outline', type: 'debit', color: '#44BB44' },
  { id: 'vr', name: 'VR', icon: 'food', type: 'food', color: '#F59E0B' },
  { id: 'money', name: 'Dinheiro', icon: 'cash', type: 'money', color: '#10B981' },
  { id: 'transfer', name: 'Transferência', icon: 'bank-transfer', type: 'transfer', color: '#3B82F6' },
];

// Tipos de transação
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

// Tipo fixo ou variável
export enum TransactionFrequency {
  FIXED = 'fixed',
  VARIABLE = 'variable',
}

// Função para obter a categoria pelo ID
export const getCategoryById = (id: string): Category => {
  return CATEGORIES.find(category => category.id === id) || CATEGORIES[CATEGORIES.length - 1];
};

// Função para obter o método de pagamento pelo ID
export const getPaymentMethodById = (id: string | null | undefined): PaymentMethod => {
  // Se o ID for nulo ou undefined, retornar método genérico
  if (!id) return {
    id: 'unknown',
    name: 'Não informado',
    icon: 'help-circle-outline',
    type: 'other',
    color: '#999999'
  };
  
  const method = PAYMENT_METHODS.find(method => method.id === id);
  if (method) return method;
  
  // Retornar um método genérico quando não encontrado
  return {
    id: 'unknown',
    name: 'Não informado',
    icon: 'help-circle-outline',
    type: 'other',
    color: '#999999'
  };
}; 