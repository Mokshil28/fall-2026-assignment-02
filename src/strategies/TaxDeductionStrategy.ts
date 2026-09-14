import { Transaction } from '../models.js';
import { TaxConfigService } from '../services/TaxConfigService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class TaxDeductionStrategy implements AuditStrategy {
  public readonly name = 'Tax & Deductions Auditor';
  public readonly description =
    'Identifies eligible tax-deductible expenses and estimates savings';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {
    // TODO: Feature 4 - Implement this strategy.
    // 1. Call TaxConfigService.getTaxConfig() asynchronously.
    // 2. Filter expenses (amount < 0) that belong to eligible tax-deductible categories.
    // 3. Sum total deductible expenses.
    // 4. Estimate tax savings based on the standard tax rate: total deductible * taxRate.
    // 5. Estimate sales tax/VAT paid on NON-deductible expenses using standard tax rate.
    // 6. Format and return a text-based audit report detailing total deductions, savings, VAT estimates, and eligible transactions.

    // 1.
    const taxConfig = await TaxConfigService.getTaxConfig();

    // 2.
    const deductibleTransactions = transactions.filter(
      (transaction) =>
        transaction.amount < 0 &&
        taxConfig.deductibleCategories.includes(transaction.category),
    );

    // 3.
    const totalDeductions = deductibleTransactions.reduce(
      (total, transaction) => total + Math.abs(transaction.amount),
      0,
    );

    // 4.
    const estimatedSavings = totalDeductions * taxConfig.standardTaxRate;

    const nonDeductibleExpenses = transactions.filter(
      (transaction) =>
        transaction.amount < 0 &&
        !taxConfig.deductibleCategories.includes(transaction.category),
    );

    const nonDeductibleTotal = nonDeductibleExpenses.reduce(
      (total, transaction) => total + Math.abs(transaction.amount),
      0,
    );

    // 5.
    const estimatedVAT = nonDeductibleTotal * taxConfig.standardTaxRate;

    // 6.
    let report = `=== Tax & Deductions Audit Report ===\n`;
    report += `Eligible Deductible Transactions:\n`;

    if (deductibleTransactions.length === 0) {
      report += "None\n";
    } else {
      deductibleTransactions.forEach((transaction) => {
        report += `${transaction.date} | ${transaction.category} | ${transaction.description} | $${Math.abs(transaction.amount).toFixed(2)}\n`;
      });
    }

    report += `\nDeductions: $${totalDeductions.toFixed(2)}\n`;
    report += `Savings: $${estimatedSavings.toFixed(2)}\n`;
    report += `Estimated VAT on Non-Deductible Expenses: $${estimatedVAT.toFixed(2)}\n`;
    return report;
  }
}
