/**
 * Utilitários para lidar com datas e timestamps do Firestore
 */

/**
 * Converte qualquer formato de data (Date, Timestamp, string, etc) para um objeto Date
 */
export function toDate(date: any): Date {
  if (date instanceof Date) {
    return date;
  }
  
  // Timestamp do Firestore
  if (date && typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
    return date.toDate();
  }
  
  // Outros formatos (string, número)
  return new Date(date);
}

/**
 * Retorna o timestamp de uma data em milissegundos
 */
export function getTimestamp(date: any): number {
  return toDate(date).getTime();
}

/**
 * Verifica se a data está no mês e ano especificados
 */
export function isInMonth(date: any, month: number, year: number): boolean {
  const dateObj = toDate(date);
  return dateObj.getMonth() === month && dateObj.getFullYear() === year;
}

/**
 * Formata uma data no padrão brasileiro (DD/MM/YYYY)
 */
export function formatDateBR(date: any): string {
  const dateObj = toDate(date);
  return dateObj.toLocaleDateString('pt-BR');
}

/**
 * Retorna o primeiro dia do mês
 */
export function getFirstDayOfMonth(month: number, year: number): Date {
  return new Date(year, month, 1);
}

/**
 * Retorna o último dia do mês
 */
export function getLastDayOfMonth(month: number, year: number): Date {
  return new Date(year, month + 1, 0);
}

/**
 * Retorna informações do mês anterior ao atual
 */
export function getPreviousMonth(month: number, year: number): {month: number, year: number} {
  if (month === 0) {
    return {
      month: 11,
      year: year - 1
    };
  }
  
  return {
    month: month - 1,
    year
  };
}

/**
 * Retorna informações do próximo mês
 */
export function getNextMonth(month: number, year: number): {month: number, year: number} {
  if (month === 11) {
    return {
      month: 0,
      year: year + 1
    };
  }
  
  return {
    month: month + 1,
    year
  };
} 