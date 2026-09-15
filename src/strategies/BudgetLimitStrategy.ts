import { Transaction } from '../models.js';
import { BudgetService } from '../services/BudgetService.js';
import { AuditStrategy } from './AuditStrategy.js';

export class BudgetLimitStrategy implements AuditStrategy {
  public readonly name = 'Budget Limit Auditor';
  public readonly description =
    'Checks category spending against monthly budget limits';

  public async execute(
    transactions: Transaction[],
    customParam?: string,
  ): Promise<string> {
    // TODO: Feature 1 - Implement this strategy.
    // 1. Call BudgetService.getCategoryBudgets() asynchronously.
    const budgets = await BudgetService.getCategoryBudgets();

    // 2. Group expenses (amounts < 0) by category and compute total spending for each category.
    const expensesByCategory = new Map<string, Transaction[]>();

    for (const transaction of transactions) {
      if (transaction.amount < 0) {
        const category = transaction.category;

        if (!expensesByCategory.has(category)) {
          expensesByCategory.set(category, []);
        }

        expensesByCategory.get(category)!.push(transaction);
      }
    }

    const spendingByCategory = new Map<string, number>();

    for (const [category, categoryTransactions] of expensesByCategory) {
      const total = categoryTransactions.reduce(
        (sum, transaction) => sum + Math.abs(transaction.amount),
        0,
      );

      spendingByCategory.set(category, total);
    }

    // 3. Compare spending against the fetched limits.
    const allCategories = new Set<string>([
      ...Object.keys(budgets),
      ...spendingByCategory.keys(),
    ]);

    const formatMoney = (amount: number): string => `$${amount.toFixed(2)}`;

    const report: string[] = [];

    report.push('=== Budget Limit Audit Report ===');
    report.push('');
    report.push('Summary');
    report.push('-------');

    for (const category of [...allCategories].sort()) {
      const budget = budgets[category] ?? 0;
      const actual = spendingByCategory.get(category) ?? 0;

      report.push(
        `${category}: Budget ${formatMoney(budget)}, Actual ${formatMoney(actual)}`,
      );
    }

    // 4. Identify overages (categories where spending exceeds the budget).
    const overBudgetCategories = [...allCategories]
      .filter((category) => {
        const budget = budgets[category];

        if (budget === undefined) {
          return false;
        }

        const actual = spendingByCategory.get(category) ?? 0;
        return actual > budget;
      })
      .sort();

    report.push('');
    report.push('Warnings');
    report.push('--------');

    if (overBudgetCategories.length === 0) {
      report.push('No categories exceeded their budget.');
    } else {
      for (const category of overBudgetCategories) {
        const budget = budgets[category];
        const actual = spendingByCategory.get(category) ?? 0;
        const overage = actual - budget;
        const percentageExceeded = (actual / budget) * 100;

        report.push(
          `${category}: Over budget by ${formatMoney(overage)} (${percentageExceeded.toFixed(2)}% of budget)`,
        );
      }
    }

    report.push('');
    report.push('Transactions Contributing to Overages');
    report.push('-------------------------------------');

    // 5. Format and return a text-based audit report outlining limits, actuals, overage amounts, percentages, and lists of transactions causing the overage.
    if (overBudgetCategories.length === 0) {
      report.push('No transactions contributed to budget overages.');
    } else {
      for (const category of overBudgetCategories) {
        report.push('');
        report.push(`[${category}]`);

        const categoryTransactions = expensesByCategory.get(category) ?? [];
        for (const transaction of categoryTransactions) {
          report.push(
            `- ${transaction.date}: ${transaction.description} (${formatMoney(
              Math.abs(transaction.amount),
            )})`,
          );
        }
      }
    }

    return report.join('\n');
  }
}
