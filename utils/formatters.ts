/**
 * Utilitários para formatação de valores e datas
 */

/**
 * Formata um valor numérico para moeda brasileira (R$)
 * @param value Valor a ser formatado
 * @param showSymbol Indica se deve mostrar o símbolo da moeda
 * @returns String formatada
 */
export const formatCurrency = (value: number, showSymbol = true): string => {
  const formatted = value.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return showSymbol ? `R$ ${formatted}` : formatted;
};

/**
 * Formata uma data para exibição
 * @param date Data a ser formatada
 * @returns String no formato relativo (hoje, ontem) ou data completa
 */
export const formatDate = (date: Date): string => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const transactionDate = new Date(date);
  transactionDate.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - transactionDate.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Hoje';
  } else if (diffDays === 1) {
    return 'Ontem';
  } else if (diffDays < 7) {
    return `${diffDays} dias atrás`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
  } else {
    // Formatar data completa DD/MM/YYYY
    return transactionDate.toLocaleDateString('pt-BR');
  }
};

/**
 * Formata um valor de porcentagem
 * @param value Valor decimal (ex: 0.15)
 * @param decimalPlaces Casas decimais
 * @returns String formatada (ex: "15.0%")
 */
export const formatPercentage = (value: number, decimalPlaces = 1): string => {
  return `${(value * 100).toFixed(decimalPlaces)}%`;
};

/**
 * Formata um número de mês para nome do mês
 * @param month Número do mês (0-11)
 * @param abbreviated Indica se deve usar formato abreviado
 * @returns Nome do mês
 */
export const getMonthName = (month: number, abbreviated = false): string => {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  const abbrMonths = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  
  return abbreviated ? abbrMonths[month] : months[month];
}; 