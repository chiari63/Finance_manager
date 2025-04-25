/**
 * Funções de segurança para sanitização e validação de dados
 */

/**
 * Sanitiza uma string removendo caracteres potencialmente perigosos
 * @param input - String a ser sanitizada
 * @returns String sanitizada
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Remove tags HTML, caracteres especiais e scripts
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove tags HTML
    .replace(/[^\w\s.,@-]/gi, ''); // Permite apenas letras, números, espaços e alguns caracteres específicos
}

/**
 * Sanitiza um valor numérico
 * @param input - Valor a ser sanitizado
 * @returns Número sanitizado ou 0 se inválido
 */
export function sanitizeNumber(input: string | number): number {
  if (typeof input === 'number') return isNaN(input) ? 0 : input;
  
  if (!input || typeof input !== 'string') return 0;
  
  // Remove tudo que não for dígito, ponto ou vírgula
  const cleaned = input.replace(/[^\d.,]/g, '');
  
  // Substitui vírgula por ponto para conversão correta
  const normalized = cleaned.replace(',', '.');
  
  // Converte para número ou retorna 0 se inválido
  const number = parseFloat(normalized);
  return isNaN(number) ? 0 : number;
}

/**
 * Valida um e-mail
 * @param email - E-mail a ser validado
 * @returns true se o e-mail é válido, false caso contrário
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida uma senha quanto à força
 * @param password - Senha a ser validada
 * @returns Objeto com resultado da validação e mensagem de erro se houver
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password) return { valid: false, message: 'A senha não pode estar vazia' };
  
  if (password.length < 8) {
    return { valid: false, message: 'A senha deve ter pelo menos 8 caracteres' };
  }
  
  // Verifica se contém pelo menos um número
  if (!/\d/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos um número' };
  }
  
  // Verifica se contém pelo menos uma letra maiúscula
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos uma letra maiúscula' };
  }
  
  // Verifica se contém pelo menos um caractere especial
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, message: 'A senha deve conter pelo menos um caractere especial' };
  }
  
  return { valid: true };
} 