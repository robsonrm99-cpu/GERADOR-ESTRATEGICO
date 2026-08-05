export interface ProposalData {
  id?: string;
  uid: string;
  clientName: string;
  creditType: string;
  creditCategory: string;
  requestedValue: number;
  consultantName: string;
  emissionDate: string;
  adhesionValue: number;
  adminFeePercentage: number;
  financingFactor: number;
  financingTerm: number;
  isManualFinancing: boolean;
  manualFinancingEntry: number;
  manualFinancingInstallment: number;
  manualFinancingTotal: number;
  letterTerm: number;
  letterInstallment?: number;
  observations: string;
  validity: string;
  logoUrl?: string;
  templateStyle?: 'estudo' | 'simulador';
  clientCpf?: string;
  proposalCode?: string;
  consultantPhone?: string;
  urgencyBannerText?: string;
  createdAt: string;
}

export interface CalculationResult {
  requestedValue: number;
  
  // Financing
  financingTotal: number;
  financingEntry: number;
  financingBalance: number;
  financingTerm: number;
  financingInstallment: number;
  
  // Letter
  letterAdhesion: number;
  letterTerm: number;
  letterInstallment: number;
  letterTotalCost: number;
  
  // Comparison
  economyValue: number;
  economyPercentage: number;
}

export function calculateProposal(data: Partial<ProposalData>): CalculationResult {
  const requestedValue = data.requestedValue || 0;
  
  // Financing Rules
  let financingTotal = 0;
  let financingEntry = 0;
  let financingInstallment = 0;
  let financingTerm = data.financingTerm || 240;

  if (!data.financingTerm) {
    if (requestedValue <= 150000) financingTerm = 180;
    else if (requestedValue <= 300000) financingTerm = 204;
    else if (requestedValue <= 500000) financingTerm = 228;
    else financingTerm = 240;
  }

  if (data.isManualFinancing) {
    financingTotal = data.manualFinancingTotal || 0;
    financingEntry = data.manualFinancingEntry || 0;
    financingInstallment = data.manualFinancingInstallment || 0;
  } else {
    let factor = data.financingFactor || 1.95;
    if (!data.financingFactor) {
      if (requestedValue <= 100000) factor = 1.92;
      else if (requestedValue <= 250000) factor = 1.95;
      else if (requestedValue <= 500000) factor = 1.97;
      else factor = 1.99;
    }
    
    // Max 1.999
    const rawTotal = Math.min(requestedValue * factor, requestedValue * 1.999);
    financingEntry = Math.round((requestedValue * 0.40) * 100) / 100;
    const rawBalance = rawTotal - financingEntry;
    financingInstallment = Math.round((rawBalance / financingTerm) * 100) / 100;
    financingTotal = Math.round(((financingInstallment * financingTerm) + financingEntry) * 100) / 100;
  }
  
  const financingBalance = Math.round((financingTotal - financingEntry) * 100) / 100;

  // Letter Rules
  const letterAdhesion = Math.round((data.adhesionValue || 0) * 100) / 100;
  const adminFeePercentage = data.adminFeePercentage ?? 20;
  
  const rawLetterTotalCost = requestedValue * (1 + adminFeePercentage / 100);
  const letterBalance = rawLetterTotalCost - letterAdhesion;
  
  let letterTerm = data.letterTerm || 180;
  let letterInstallment = 0;
  let letterTotalCost = 0;

  if (data.letterInstallment && data.letterInstallment > 0) {
    letterInstallment = Math.round(data.letterInstallment * 100) / 100;
    letterTerm = Math.ceil(letterBalance / letterInstallment);
    // Recalculate total cost to be EXACTLY term * installment + adhesion
    letterTotalCost = Math.round(((letterInstallment * letterTerm) + letterAdhesion) * 100) / 100;
  } else {
    letterInstallment = Math.round((letterBalance / letterTerm) * 100) / 100;
    // Ensure exact math for display
    letterTotalCost = Math.round(((letterInstallment * letterTerm) + letterAdhesion) * 100) / 100;
  }
  
  // Economy
  const economyValue = Math.round((financingTotal - letterTotalCost) * 100) / 100;
  const economyPercentage = financingTotal > 0 ? (economyValue / financingTotal) * 100 : 0;
  
  return {
    requestedValue,
    financingTotal,
    financingEntry,
    financingBalance,
    financingTerm,
    financingInstallment,
    letterAdhesion,
    letterTerm,
    letterInstallment,
    letterTotalCost,
    economyValue,
    economyPercentage
  };
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
