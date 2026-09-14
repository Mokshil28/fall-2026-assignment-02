import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaxDeductionStrategy } from '../src/strategies/TaxDeductionStrategy.js';
import { TaxConfigService } from '../src/services/TaxConfigService.js';
import { Transaction } from '../src/models.js';

describe('TaxDeductionStrategy (Feature 4)', () => {
  let strategy: TaxDeductionStrategy;

  beforeEach(() => {
    strategy = new TaxDeductionStrategy();
    vi.restoreAllMocks();
  });

  // Example of how to write and mock in your tests:
  //
  // it('should compute tax savings correctly based on rate and deductible categories', async () => {
  //   const mockConfig = { standardTaxRate: 0.10, deductibleCategories: ['Medical', 'Charity'] };
  //   const spy = vi.spyOn(TaxConfigService, 'getTaxConfig').mockResolvedValue(mockConfig);
  //
  //   const testTransactions: Transaction[] = [
  //     { id: '1', date: '2026-05-01', amount: -200.00, category: 'Charity', description: 'Donation', status: 'completed' }, // Deductible
  //     { id: '2', date: '2026-05-02', amount: -100.00, category: 'Food', description: 'Grocery', status: 'completed' }, // Non-deductible
  //   ];
  //
  //   const result = await strategy.execute(testTransactions);
  //
  //   expect(spy).toHaveBeenCalled();
  //   expect(result).toContain('Deductions: $200.00'); // Sum of Charity
  //   expect(result).toContain('Savings: $20.00'); // $200 * 0.10
  // });

  it('should filter only the categories specified as deductible in the config', async () => {
    const mockConfig = {
      standardTaxRate: 0.1,
      deductibleCategories: ['Medical', 'Charity'],
    };

    vi.spyOn(TaxConfigService, 'getTaxConfig').mockResolvedValue(mockConfig);

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -200,
        category: 'Charity',
        description: 'Donation',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -100,
        category: 'Food',
        description: 'Groceries',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -75,
        category: 'Medical',
        description: 'Doctor visit',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Donation');
    expect(result).toContain('Doctor visit');
    expect(result).not.toContain('Groceries');
  });

  it('should sum total eligible tax deductions correctly', async () => {
    const mockConfig = {
      standardTaxRate: 0.1,
      deductibleCategories: ['Business', 'Medical'],
    };

    vi.spyOn(TaxConfigService, 'getTaxConfig').mockResolvedValue(mockConfig);

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -300,
        category: 'Business',
        description: 'Office supplies',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -100,
        category: 'Medical',
        description: 'Prescription',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -50,
        category: 'Food',
        description: 'Lunch',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Deductions: $400.00');
  });

  it('should calculate estimated tax savings using standardTaxRate', async () => {
    const mockConfig = {
      standardTaxRate: 0.2,
      deductibleCategories: ['Charity'],
    };

    vi.spyOn(TaxConfigService, 'getTaxConfig').mockResolvedValue(mockConfig);

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -500,
        category: 'Charity',
        description: 'Donation',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain('Savings: $100.00');
  });

  it('should calculate estimated VAT/sales tax paid on non-deductible expense transactions', async () => {
    const mockConfig = {
      standardTaxRate: 0.1,
      deductibleCategories: ['Medical'],
    };

    vi.spyOn(TaxConfigService, 'getTaxConfig').mockResolvedValue(mockConfig);

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
        amount: -200,
        category: 'Entertainment',
        description: 'Concert',
        status: 'completed',
      },
      {
        id: '3',
        date: '2026-05-03',
        amount: -50,
        category: 'Medical',
        description: 'Medicine',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(result).toContain(
      'Estimated VAT on Non-Deductible Expenses: $30.00',
    );
  });

  it('should structure report to show both aggregates and itemized deductible transactions', async () => {
    const mockConfig = {
      standardTaxRate: 0.1,
      deductibleCategories: ['Business'],
    };

    const spy = vi
      .spyOn(TaxConfigService, 'getTaxConfig')
      .mockResolvedValue(mockConfig);

    const testTransactions: Transaction[] = [
      {
        id: '1',
        date: '2026-05-01',
        amount: -150,
        category: 'Business',
        description: 'Printer ink',
        status: 'completed',
      },
      {
        id: '2',
        date: '2026-05-02',
        amount: -50,
        category: 'Food',
        description: 'Dinner',
        status: 'completed',
      },
    ];

    const result = await strategy.execute(testTransactions);

    expect(spy).toHaveBeenCalled();
    expect(result).toContain('Eligible Deductible Transactions:');
    expect(result).toContain('2026-05-01');
    expect(result).toContain('Business');
    expect(result).toContain('Printer ink');
    expect(result).toContain('$150.00');
    expect(result).toContain('Deductions: $150.00');
    expect(result).toContain('Savings: $15.00');
  });
});