import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BudgetLimitStrategy } from '../src/strategies/BudgetLimitStrategy.js';
import { BudgetService } from '../src/services/BudgetService.js';
import { Transaction } from '../src/models.js';

describe('BudgetLimitStrategy (Feature 1)', () => {
  let strategy: BudgetLimitStrategy;

  beforeEach(() => {
    strategy = new BudgetLimitStrategy();
    vi.restoreAllMocks();
  });

  it('should correctly identify categories that are over budget', async () => {
    // 1. Mock the BudgetService asynchronously
    const mockBudgets = {
      Food: 300,
      Rent: 1000,
      Transport: 200,
    };

    const spy = vi
      .spyOn(BudgetService, 'getCategoryBudgets')
      .mockResolvedValue(mockBudgets);

    //2. Set up test transactions
    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -100,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -75,
        category: 'Food',
        description: 'Restaurant',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -900,
        category: 'Rent',
        description: 'Apartment',
        status: 'completed',
      },
      {
        id: '4',
        date: '2026-05-04',
        amount: 500,
        category: 'Food',
        description: 'Salary',
        status: 'completed',
      },
    ];

    // 3. Execute
    const result = await strategy.execute(testTransactions);

    // 4. Assert
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toContain('Food: Budget $300.00, Actual $175.00');
    expect(result).toContain('Rent: Budget $1000.00, Actual $900.00');
    expect(result).not.toContain('Actual $675.00');
  });

  it('should calculate overage amount and percentage correctly', async () => {
    const mockBudgets = {
      Food: 100,
      Rent: 1000,
    };

    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(
      mockBudgets,
    );

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -150,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -900,
        category: 'Rent',
        description: 'Apartment',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Food: Over budget by $50.00 (150.00% of budget)');
    expect(result).not.toContain('Rent: Over budget');
  });

  it('should list the specific transactions contributing to an overage', async () => {
    const mockBudgets = {
      Food: 100,
      Rent: 1000,
    };

    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(
      mockBudgets,
    );

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -75.5,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -50.25,
        category: 'Food',
        description: 'Restaurant',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -900,
        category: 'Rent',
        description: 'Apartment',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('[Food]');
    expect(result).toContain('- 2026-05-01: Groceries ($75.50)');
    expect(result).toContain('- 2026-05-02: Restaurant ($50.25)');
    expect(result).not.toContain('[Rent]');
    expect(result).not.toContain('Apartment ($900.00)');
  });

  it('should handle an empty transaction list gracefully', async () => {
    const mockBudgets = {
      Food: 300,
      Rent: 1000,
      Transport: 200,
    };

    const spy = vi
      .spyOn(BudgetService, 'getCategoryBudgets')
      .mockResolvedValue(mockBudgets);

    const result = await strategy.execute([]);

    expect(spy).toHaveBeenCalledTimes(1);

    expect(result).toContain('=== Budget Limit Audit Report ===');
    expect(result).toContain('Food: Budget $300.00, Actual $0.00');
    expect(result).toContain('Rent: Budget $1000.00, Actual $0.00');
    expect(result).toContain('Transport: Budget $200.00, Actual $0.00');
    expect(result).toContain('No categories exceeded their budget.');
    expect(result).toContain('No transactions contributed to budget overages.');
  });

  it('should not flag a category when spending is exactly equal to its budget', async () => {
    const mockBudgets = {
      Food: 100,
    };

    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(
      mockBudgets,
    );

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -60,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -40,
        category: 'Food',
        description: 'Restaurant',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Food: Budget $100.00, Actual $100.00');
    expect(result).toContain('No categories exceeded their budget.');
    expect(result).not.toContain('Over budget by');
  });

  it('should include spending for an unknown category in the summary but not flag it as over budget', async () => {
    const mockBudgets = {
      Food: 100,
    };

    vi.spyOn(BudgetService, 'getCategoryBudgets').mockResolvedValue(
      mockBudgets,
    );

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -250,
        category: 'Entertainment',
        description: 'Concert',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Entertainment: Budget $0.00, Actual $250.00');
    expect(result).not.toContain('Entertainment: Over budget');
    expect(result).toContain('No categories exceeded their budget.');
  });
});
