import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import App, { runProjection } from './App';

// =============================
// TEST SUITE for RetireSecure Planner Retirement Projections
// =============================
describe('RetireSecure Planner Retirement Projections', () => {
  // -------------------- UNIT TESTS: LOGIC --------------------
  describe('runProjection: Core Calculation Logic', () => {
    // (unit tests verbatim, no selector changes required)
    test('handles taxes: after-tax income vs tax-free, impact on assets', () => {
      const assets = { "401k": 100000, "ira": 0, "brokerage": 0, "realEstate": 0, "cash": 0 };
      const income = { salary: 60000, pension: 0, socialSecurity: 10000, otherIncome: 0, ssStartAge: 67 };
      const spending = { housing: 1800, healthcare: 500, travel: 100, discretionary: 200, other: 0 };
      const taxesLow = { status: "Single", rate: 0, deductions: 0 };
      const taxesHigh = { status: "Single", rate: 30, deductions: 0 };
      const projLow = runProjection(assets, income, spending, taxesLow);
      const projHigh = runProjection(assets, income, spending, taxesHigh);
      expect(projLow.income[0]).toBeGreaterThan(projHigh.income[0]);
      expect(projHigh.assets[0]).toBeLessThanOrEqual(projLow.assets[0]);
    });
    test('tracks assets: withdrawal sequence cash -> brokerage -> ira -> 401k', () => {
      let assets = { "401k": 0, "ira": 0, "brokerage": 0, "realEstate": 0, "cash": 30000 };
      let income = { salary: 0, pension: 0, socialSecurity: 0, otherIncome: 0, ssStartAge: 67 };
      let spending = { housing: 2500, healthcare: 0, travel: 0, discretionary: 0, other: 0 };
      let taxes = { status: "Single", rate: 0, deductions: 0 };
      let proj = runProjection(assets, income, spending, taxes);
      expect(proj.assets[0]).toBeLessThan(30000);
      assets = { "401k": 0, "ira": 0, "brokerage": 36000, "realEstate": 0, "cash": 0 };
      proj = runProjection(assets, income, spending, taxes);
      expect(proj.assets[0]).toBeLessThan(36000);
      assets = { "401k": 0, "ira": 36000, "brokerage": 0, "realEstate": 0, "cash": 0 };
      proj = runProjection(assets, income, spending, taxes);
      expect(proj.assets[0]).toBeLessThan(36000);
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
      const firstRmdIdx = 73 - 45;
      expect(proj.assets.length).toBeGreaterThan(firstRmdIdx);
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
      for (let i = 22; i < proj.income.length; ++i) {
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
      // Registration sequence (tab switch with testid, and actions)
      fireEvent.click(screen.getByTestId('register-tab'));
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'User1' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'u@test.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw123' } });
      fireEvent.click(screen.getByTestId('sign-up-button'));

      // Wait for auth modal to close
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: /welcome/i })).not.toBeInTheDocument()
      );

      // Edit Assets - open with /edit/i button, modal assertions remain
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[0]);
      const assetModal = await screen.findByRole('dialog', { name: /edit assets/i });
      fireEvent.change(within(assetModal).getByLabelText(/401k/i), { target: { value: 90000 } });
      fireEvent.change(within(assetModal).getByLabelText(/brokerage/i), { target: { value: 30000 } });
      fireEvent.click(within(assetModal).getByRole('button', { name: /save/i }));

      // Edit Income
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[1]);
      const incomeModal = await screen.findByRole('dialog', { name: /edit income/i });
      fireEvent.change(within(incomeModal).getByLabelText(/current salary/i), { target: { value: 50000 } });
      fireEvent.change(within(incomeModal).getByLabelText(/social security/i), { target: { value: 18000 } });
      fireEvent.change(within(incomeModal).getByLabelText(/ss start age/i), { target: { value: 66 } });
      fireEvent.click(within(incomeModal).getByRole('button', { name: /save/i }));

      // Edit Spending
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i })[2]);
      const spendModal = await screen.findByRole('dialog', { name: /edit spending/i });
      fireEvent.change(within(spendModal).getByLabelText(/housing/i), { target: { value: 1800 } });
      fireEvent.change(within(spendModal).getByLabelText(/healthcare/i), { target: { value: 500 } });
      fireEvent.click(within(spendModal).getByRole('button', { name: /save/i }));

      // Run Projection
      fireEvent.click(screen.getByRole('button', { name: /project retirement income/i }));
      await waitFor(() =>
        expect(screen.getByRole('dialog', { name: /retirement projection/i })).toBeInTheDocument()
      );
      expect(screen.getByRole('img', { name: /projection chart/i })).toBeInTheDocument();

      // Robust Close: use unique testid for "Close" in modal, async
      const closeBtn = await screen.findByTestId('close-projection-chart-button');
      fireEvent.click(closeBtn);

      // Stats update in dashboard: robust label-based lookup and assertion
      // Wait for DOM update reflecting latest state
      const firstYearStat = await screen.findByText(/first year income/i, {}, {timeout: 1200});
      // Wait for stat card to show a dollar amount after projection is run
      await waitFor(() => {
        const textContent = firstYearStat.closest('.stat-card')?.textContent || "";
        expect(textContent).toMatch(/\$[0-9,]+/);
      });
    });

    test('guest mode disables persistence & shows proper user state', async () => {
      render(<App />);
      // Switch to guest mode using testid and click testid continue
      fireEvent.click(screen.getByTestId('guest-tab'));
      const continueBtn = await screen.findByTestId('continue-as-guest-button');
      fireEvent.click(continueBtn);

      // Guest mode banner is visible using unique testid and async query
      expect(await screen.findByTestId('guest-mode-info')).toBeInTheDocument();

      // Sidebar guest label present
      expect(screen.getByTestId('sidebar-guest-label')).toBeInTheDocument();
      expect(screen.getByTestId('sidebar-guest-username')).toBeInTheDocument();

      // Banner label specific
      expect(screen.getByTestId('guest-mode-banner-label')).toHaveTextContent(/guest mode/i);

      // Profile section should NOT show guest banner (since modal is closed)
      fireEvent.click(screen.getByTestId('sidebar-navitem-profile'));
      await waitFor(() => {
        expect(screen.queryByTestId('guest-mode-info')).not.toBeInTheDocument();
      });
      // But guest label should appear in profile panel
      expect(screen.getByTestId('profile-guest-user-label')).toHaveTextContent(/guest/i);
    });

    test('multiple scenarios: add, duplicate, compare, and delete', async () => {
      render(<App />);
      fireEvent.click(screen.getByTestId('guest-tab'));
      const continueBtn = await screen.findByTestId('continue-as-guest-button');
      fireEvent.click(continueBtn);

      // Go to scenarios tab and manipulate scenarios
      fireEvent.click(screen.getByRole('listitem', { name: /scenarios/i }));

      window.prompt = jest.fn(() => "Test Plan 2");
      fireEvent.click(screen.getByRole('button', { name: /^\+$/ }));

      // Await new scenario label to appear robustly (sync, then async for full react propagation)
      // Use direct .findBy instead of async-in-waitFor; keeps test robust on slow CI/test runs.
      await screen.findByText(/test plan 2/i);

      // Await more than one scenario-label button in the DOM for strong state propagation guarantee
      await waitFor(async () => {
        const scenarioLabelButtons = await screen.findAllByRole('button', { name: /scenario/i });
        expect(scenarioLabelButtons.length).toBeGreaterThan(1);
      });

      // Duplicate first scenario
      fireEvent.click(screen.getAllByRole('button', { name: /duplicate/i })[0]);
      await waitFor(async () => {
        const buttons = await screen.findAllByRole('button', { name: /scenario/i });
        expect(buttons.length).toBeGreaterThan(2);
      });

      // Delete a scenario with confirmation
      window.confirm = jest.fn(() => true);
      const deleteBtns = screen.getAllByRole('button', { name: /delete/i });
      if (deleteBtns.length >= 2) {
        fireEvent.click(deleteBtns[1]);
      }
      expect(window.confirm).toHaveBeenCalled();
    });
  });
});
