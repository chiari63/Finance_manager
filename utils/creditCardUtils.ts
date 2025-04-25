import { Transaction } from '@/types/TransactionTypes';

/**
 * Calcula o limite utilizado de um cartão de crédito considerando compras parceladas
 * @param transactions - Lista de transações do cartão
 * @returns O valor total do limite utilizado
 */
export function calculateUsedLimit(transactions: Transaction[]): number {
  if (!transactions || transactions.length === 0) return 0;
  
  console.log(`Calculando limite usado para ${transactions.length} transações`);
  
  // Separar transações parceladas para depuração
  const installmentTransactions = transactions.filter(t => t.installment);
  console.log(`Transações parceladas encontradas: ${installmentTransactions.length}`);
  
  installmentTransactions.forEach(t => {
    if (t.installment) {
      console.log(`Transação parcelada: ${t.title || t.description} - Parcela ${t.installment.current}/${t.installment.total} - Valor original: ${t.installment.originalAmount} - Data início: ${t.installment.startDate.toISOString()}`);
    }
  });
  
  let totalUsedLimit = 0;
  
  // Novo mapa para agrupar transações parceladas pelo mesmo identificador
  const installmentGroups = new Map<string, Transaction[]>();
  
  // Primeiro passo: agrupar transações parceladas pelo mesmo identificador
  for (const transaction of transactions) {
    if (transaction.installment) {
      // Criar um identificador único para esta compra parcelada
      const installmentGroupId = `${transaction.title || transaction.description}-${transaction.installment.startDate.getTime()}-${transaction.installment.originalAmount}`;
      
      if (!installmentGroups.has(installmentGroupId)) {
        installmentGroups.set(installmentGroupId, []);
      }
      
      installmentGroups.get(installmentGroupId)?.push(transaction);
    } else {
      // Para compras normais (não parceladas), adicionar diretamente
      console.log(`Adicionando valor de compra normal: ${transaction.amount} - ${transaction.title || transaction.description}`);
      totalUsedLimit += transaction.amount;
    }
  }
  
  // Segundo passo: processar cada grupo de parcelas
  console.log(`Processando ${installmentGroups.size} grupos de parcelas`);
  
  for (const [groupId, groupTransactions] of installmentGroups.entries()) {
    console.log(`Grupo: ${groupId} - ${groupTransactions.length} transações`);
    
    // Ordenar as transações por número da parcela
    groupTransactions.sort((a, b) => 
      (a.installment?.current || 0) - (b.installment?.current || 0)
    );
    
    // Pegar a primeira transação para informações de base
    const firstTransaction = groupTransactions[0];
    
    if (firstTransaction?.installment) {
      const { current, total, originalAmount } = firstTransaction.installment;
      const valorParcela = originalAmount / total;
      
      console.log(`Processando compra parcelada: ${firstTransaction.title || firstTransaction.description}`);
      console.log(`- Parcela atual: ${current}/${total}`);
      console.log(`- Valor original: ${originalAmount}, Valor por parcela: ${valorParcela}`);
      
      // Importante: Adicionar ao limite o valor TOTAL da compra, não apenas a parcela atual
      // Isso reflete o comportamento real dos cartões de crédito, onde o limite é comprometido
      // pelo valor total da compra, não apenas pelas parcelas pagas ou a pagar
      const valorUtilizado = originalAmount;
      
      console.log(`- Valor utilizado (valor total da compra): ${valorUtilizado}`);
      
      totalUsedLimit += valorUtilizado;
    }
  }
  
  console.log(`Total do limite utilizado: ${totalUsedLimit}`);
  return totalUsedLimit;
}