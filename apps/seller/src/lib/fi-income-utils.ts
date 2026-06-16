/** Cálculos de ingreso F&I sin dependencias de servidor (seguro en cliente). */

type IncomeJob = { monthlyIncome?: number };
type IncomeSource = { monthlyAmount?: number };

export type FIIncomeRequestLike = {
  employment?: IncomeJob;
  additionalEmployments?: IncomeJob[];
  otherIncomeSources?: IncomeSource[];
  spouseInfo?: IncomeJob;
  cosigner?: {
    employment?: IncomeJob;
    additionalEmployments?: IncomeJob[];
    otherIncomeSources?: IncomeSource[];
  };
};

export function getFITotalMonthlyIncome(request: FIIncomeRequestLike): number {
  let total = request.employment?.monthlyIncome || 0;
  for (const job of request.additionalEmployments || []) {
    total += job.monthlyIncome || 0;
  }
  for (const src of request.otherIncomeSources || []) {
    total += src.monthlyAmount || 0;
  }
  if (request.spouseInfo?.monthlyIncome) {
    total += request.spouseInfo.monthlyIncome;
  }
  return total;
}

export function getCosignerTotalMonthlyIncome(cosigner: NonNullable<FIIncomeRequestLike['cosigner']>): number {
  let total = cosigner.employment?.monthlyIncome || 0;
  for (const job of cosigner.additionalEmployments || []) {
    total += job.monthlyIncome || 0;
  }
  for (const src of cosigner.otherIncomeSources || []) {
    total += src.monthlyAmount || 0;
  }
  return total;
}
