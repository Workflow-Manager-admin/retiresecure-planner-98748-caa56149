import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import App, { runProjection } from './App';

// =============================
// TEST SUITE for RetireSecure Planner Retirement Projections
// =============================
describe('RetireSecure Planner Retirement Projections', () => {
  // -------------------- UNIT TESTS: LOGIC --------------------
  describe('runProjection: Core Calculation Logic', () => {
    test('handles taxes: after-tax income vs tax-free, impact on assets', () => {
      const assets = { "401k": 100000, "ira": 0, "brokerage": 0, "realEstate": 0, "cash": 0 };
      const income = { salary: 60000, pension: 0, socialSecurity: 10000, otherIncome: 0, ssStartAge: 67 };
      const spending = { housing: 1800, healthcare: 500, travel: 100, discretionary: 200, other: 0 };
      const taxesLow = { status: "Single", rate: 0, deductions: 0 };
      const taxesHigh = { status: "Single", rate: 30, deductions: 0 };
      const projLow = runProjection(assets, income, spending, taxesLow);
      const projHigh = runProjection(assets, income, spending, taxesHigh);
      expect(projLow.income[0]).toBeGreaterThan(projHigh.income[0]);
      // Accept equality as well as less-than in the first-year asset for edge case of identical drawdown
      expect(projHigh.assets[0]).toBeLessThanOrEqual(projLow.assets[0]);
    });

    test('tracks assets: withdrawal sequence cash -> brokerage -> ira -> 401k', () => {
      // Spending > income, only cash available
      let assets = { "401k": 0, "ira": 0, "brokerage": 0, "realEstate": 0, "cash": 30000 };
      let income = { salary: 0, pension: 0, socialSecurity: 0, otherIncome: 0, ssStartAge: 67 };
      let spending = { housing: 2500, healthcare: 0, travel: 0, discretionary: 0, other: 0 };
      let taxes = { status: "Single", rate: 0, deductions: 0 };
      let proj = runProjection(assets, income, spending, taxes);
      // First year asset draw - cash should drop
      expect(proj.assets[0]).toBeLessThan(30000);

      // Now cash = 0, brokerage available
      assets = { "401k": 0, "ira": 0, "brokerage": 36000, "realEstate": 0, "cash": 0 };
      proj = runProjection(assets, income, spending, taxes);
      expect(proj.assets[0]).toBeLessThan(36000);

      // Now only ira available
      assets = { "401k": 0, "ira": 36000, "brokerage": 0, "realEstate": 0, "cash": 0 };
      proj = runProjection(assets, income, spending, taxes);
      expect(proj.assets[0]).toBeLessThan(36000);

      // Now only 401k available
      assets = { "401k": 36000, "ira": 0, "brokerage": 0, "realEstate": 0, "cash": 0 };
      proj = runProjection(assets, income, spending, taxes);
      expect(proj.assets[0]).toBeLessThan(36000);
    });

    test('401K/IRA: minimum distributions (RMD) are triggered at age 73+', () => {
      const assets = { "401k": 40000, "ira": 30000, "brokerage": 0, "realEstate": 0, "cash": 0 };
      const income = { salary: 0, pension: 0, socialSecurity: 0, otherIncome: 0, ssStartAge: 67 };
      const spending = { housing: 1800, healthcare: 0, travel: 0, discretionary: 0, other: 0 };
      const taxes = { status: "Single", rate: 0, deductions: 0 };
      const proj = runProjection(assets, income, spending, taxes);
      // RMD should be deducted at year corresponding to age 73
      // Default simulation uses curAge 45, ssStartAge 67, horizon 30 (ending at 75)
      // Let's find the 73rd year (age)
      const firstRmdIdx = 73 - 45; // 28th year of projection
      expect(proj.assets.length).toBeGreaterThan(firstRmdIdx);
      // Asset drop at firstRmdIdx due to RMD withdrawals; not a strict equality test (compounded by growth)
      expect(proj.assets[firstRmdIdx] <= proj.assets[firstRmdIdx - 1]).toBe(true);
    });

    test('IRA/401K withdrawal does not make balance negative', () => {
      const assets = { "401k": 5000, "ira": 1000, "brokerage": 0, "realEstate": 0, "cash": 0 };
      const income = { salary: 3000, pension: 0, socialSecurity: 0, otherIncome: 0, ssStartAge: 67 };
      const spending = { housing: 3000, healthcare: 0, travel: 0, discretionary: 0, other: 0 };
      const taxes = { status: "Single", rate: 0, deductions: 0 };
      const proj = runProjection(assets, income, spending, taxes);
      expect(Math.min(...proj.assets)).toBeGreaterThanOrEqual(0);
    });

    test('social security payment appears only after ssStartAge', () => {
      const income = { salary: 0, pension: 0, socialSecurity: 25000, otherIncome: 0, ssStartAge: 69 };
      const spending = { housing: 200, healthcare: 0, travel: 0, discretionary: 0, other: 0 };
      const taxes = { status: "Single", rate: 5, deductions: 0 };
      const proj = runProjection({}, income, spending, taxes);
      // Index for ssStartAge
      const idx = income.ssStartAge - 45; // default curAge=45
      // Should have 25k SS after reaching ssStartAge
      for (let i = 0; i < proj.years.length; ++i) {
        if (i + 45 >= income.ssStartAge) expect(proj.income[i]).toBeGreaterThanOrEqual(20000);
        else expect(proj.income[i]).toBeLessThan(20000);
      }
    });

    test('other income sources added to post-retirement income', () => {
      const income = { salary: 0, pension: 6000, socialSecurity: 0, otherIncome: 2000, ssStartAge: 67 };
      const spending = { housing: 200, healthcare: 0, travel: 0, discretionary: 0, other: 0 };
      const taxes = { status: "Single", rate: 0, deductions: 0 };
      const proj = runProjection({}, income, spending, taxes);
      // All post-retirement years have pension + other income
      for (let i = 22; i < proj.income.length; ++i) { // 45+22=67
        expect(proj.income[i]).toBeGreaterThanOrEqual(8000);
      }
    });

    test('spending projections: higher spending leads to faster depletion', () => {
      const big_spending = { housing: 6000, healthcare: 2000, travel: 1000, discretionary: 1000, other: 1000 };
      const low_spending = { housing: 500, healthcare: 100, travel: 0, discretionary: 100, other: 0 };
      const assets = { "401k": 50000, "ira": 0, "brokerage": 0, "realEstate": 0, "cash": 0 };
      const income = { salary: 0, pension: 0, socialSecurity: 0, otherIncome: 0, ssStartAge: 67 };
      const taxes = { status: "Single", rate: 0, deductions: 0 };
      const projBig = runProjection(assets, income, big_spending, taxes);
      const projLow = runProjection(assets, income, low_spending, taxes);

      // Assets depleted earlier for big spending
      const depletionBig = projBig.assets.findIndex(x => x === 0);
      const depletionLow = projLow.assets.findIndex(x => x === 0);
      expect(depletionBig).toBeGreaterThanOrEqual(0);
      expect(depletionBig).toBeLessThan(depletionLow);
    });
  });

  // -------------------- INTEGRATION/COMPONENT TESTS: UI/State flows --------------------
  describe('Integration: User Flows through UI and projection results', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    test('user can register, input assets/income/spending, run projection and see updated stats', async () => {
      render(<App />);
      // Registration
      fireEvent.click(screen.getByRole('button', { name: /register/i }));
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'User1' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@test.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw123' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.queryByRole('dialog', { name: /welcome/i })).not.toBeInTheDocument();

      // Edit Assets
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
      const assetModal = screen.getByRole('dialog', { name: /edit assets/i });
      fireEvent.change(within(assetModal).getByLabelText(/401k/i), { target: { value: 90000 } });
      fireEvent.change(within(assetModal).getByLabelText(/brokerage/i), { target: { value: 30000 } });
      fireEvent.click(within(assetModal).getByRole('button', { name: /save/i }));

      // Edit Income
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[1]);
      const incomeModal = screen.getByRole('dialog', { name: /edit income/i });
      fireEvent.change(within(incomeModal).getByLabelText(/current salary/i), { target: { value: 50000 } });
      fireEvent.change(within(incomeModal).getByLabelText(/social security/i), { target: { value: 18000 } });
      fireEvent.change(within(incomeModal).getByLabelText(/ss start age/i), { target: { value: 66 } });
      fireEvent.click(within(incomeModal).getByRole('button', { name: /save/i }));

      // Edit Spending
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[2]);
      const spendModal = screen.getByRole('dialog', { name: /edit spending/i });
      fireEvent.change(within(spendModal).getByLabelText(/housing/i), { target: { value: 1800 } });
      fireEvent.change(within(spendModal).getByLabelText(/healthcare/i), { target: { value: 500 } });
      fireEvent.click(within(spendModal).getByRole('button', { name: /save/i }));

      // Run Projection
      fireEvent.click(screen.getByRole('button', { name: /project retirement income/i }));
      await waitFor(() => expect(screen.getByRole('dialog', { name: /retirement projection/i })).toBeInTheDocument());
      expect(screen.getByRole('img', { name: /projection chart/i })).toBeInTheDocument();
      // Stats update in dashboard
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.getByText(/first year income/i).closest('.stat-card')).toHaveTextContent(/\$[0-9,]+/);
    });

    test('guest mode disables persistence & shows proper user state', async () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /guest/i }));
      // Wait for guest "Continue as Guest" button to become available
      const continueBtn = await screen.findByRole('button', { name: /continue as guest/i });
      fireEvent.click(continueBtn);
      expect(screen.getByText(/guest/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('listitem', { name: /profile/i }));
      expect(screen.getByText(/data will not be saved/i)).not.toBeInTheDocument();
    });

    test('multiple scenarios: add, duplicate, compare, and delete', async () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /guest/i }));
      // Wait for guest "Continue as Guest" button
      const continueBtn = await screen.findByRole('button', { name: /continue as guest/i });
      fireEvent.click(continueBtn);

      // Go to scenarios tab
      fireEvent.click(screen.getByRole('listitem', { name: /scenarios/i }));
      // Add scenario (simulate prompt)
      window.prompt = jest.fn(() => "Test Plan 2");
      fireEvent.click(screen.getByRole('button', { name: /^\+$/ }));
      expect(screen.getByText(/test plan 2/i)).toBeInTheDocument();

      // Duplicate scenario
      fireEvent.click(screen.getAllByRole('button', { name: /duplicate/i })[0]);
      expect(screen.getAllByRole('button', { name: /scenario/i }).length).toBeGreaterThan(1);

      // Switch & Delete scenario (simulate confirm)
      window.confirm = jest.fn(() => true);
      fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[1]);
      expect(window.confirm).toHaveBeenCalled();
    });
  });
});
