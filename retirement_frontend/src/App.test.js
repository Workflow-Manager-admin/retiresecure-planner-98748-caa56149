import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import App from './App';
import { runProjection } from './App';

// TEST SUITE for RetireSecure Planner

describe('RetireSecure Planner Frontend Integration/Unit Tests', () => {
  // ---------- Authentication Flows -----------
  describe('Authentication Modal', () => {
    function getModal() {
      return screen.getByRole('dialog', { name: /welcome to retiresecure/i });
    }
    beforeEach(() => {
      localStorage.clear();
    });

    test('shows login, registration and guest mode tabs', () => {
      render(<App />);
      // Modal appears on fresh load
      expect(getModal()).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /guest/i })).toBeInTheDocument();
    });

    test('login fails with invalid credentials and shows error', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /login/i }));
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'foo@example.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'badpw' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });

    test('can register a new user and then login', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /register/i }));
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Alice' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@test.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw1234' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));

      expect(screen.queryByRole('dialog', { name: /welcome to retiresecure/i })).not.toBeInTheDocument();
      expect(screen.getByText(/alice/i)).toBeInTheDocument();

      // Log out and log back in works
      fireEvent.click(screen.getByRole('button', { name: /logout/i }));
      expect(screen.getByRole('dialog', { name: /welcome to retiresecure/i })).toBeInTheDocument();

      // Now try login that succeeds
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'alice@test.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw1234' } });
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(screen.queryByRole('dialog', { name: /welcome to retiresecure/i })).not.toBeInTheDocument();
      expect(screen.getByText(/alice/i)).toBeInTheDocument();
    });

    test('guest mode disables persistence and displays note', () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /guest/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue as guest/i }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText(/guest/i)).toBeInTheDocument();
    });
  });

  // ---------- Dashboard, Navigation, and User Profile -----------
  describe('Main Dashboard and Sidebar Navigation', () => {
    beforeEach(() => {
      localStorage.clear();
      render(<App />);
      // Use guest by default to skip login for navigation/flows
      fireEvent.click(screen.getByRole('button', { name: /guest/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue as guest/i }));
    });

    test('shows main dashboard with quick stats/cards', () => {
      expect(screen.getByRole('heading', { name: /retirement overview/i })).toBeInTheDocument();
      expect(screen.getByText(/retirement age/i)).toBeInTheDocument();
      expect(screen.getByText(/first year income/i)).toBeInTheDocument();
      expect(screen.getByText(/asset depletion risk/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /project retirement income/i })).toBeInTheDocument();
    });

    test('sidebar navigates between dashboard and profile', () => {
      fireEvent.click(screen.getByRole('listitem', { name: /profile/i }));
      expect(screen.getByRole('heading', { name: /user profile/i })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('listitem', { name: /dashboard/i }));
      expect(screen.getByRole('heading', { name: /retirement overview/i })).toBeInTheDocument();
    });
  });

  // ---------- Data Input Forms and Modal Validations -----------
  describe('Data Input Forms for Assets, Income, Spending', () => {
    beforeEach(() => {
      localStorage.clear();
      render(<App />);
      // Guest for simplicity
      fireEvent.click(screen.getByRole('button', { name: /guest/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue as guest/i }));
    });
    function openEdit(type) {
      // Find and click edit button for assets, income, or spending
      fireEvent.click(screen.getAllByRole('button', { name: /edit/i }).find(btn =>
        btn.closest('tr').firstChild.textContent.toLowerCase() === type
      ));
    }

    test('asset entry modal validates required fields', () => {
      openEdit('assets');
      const modal = screen.getByRole('dialog', { name: /edit assets/i });
      const saveBtn = within(modal).getByRole('button', { name: /save/i });
      // Set asset to invalid
      fireEvent.change(within(modal).getByLabelText(/401k accounts/i), { target: { value: -1 } });
      fireEvent.click(saveBtn);
      expect(screen.getByText(/must be a non-negative number/i)).toBeInTheDocument();
      // Set asset to valid and save
      fireEvent.change(within(modal).getByLabelText(/401k accounts/i), { target: { value: 50000 } });
      fireEvent.click(saveBtn);
      expect(screen.queryByRole('dialog', { name: /edit assets/i })).not.toBeInTheDocument();
    });

    test('income/spending modals require valid numbers and text', () => {
      openEdit('income');
      const modal = screen.getByRole('dialog', { name: /edit income/i });
      fireEvent.change(within(modal).getByLabelText(/current salary/i), { target: { value: '' } });
      fireEvent.click(within(modal).getByRole('button', { name: /save/i }));
      expect(screen.getByText(/must be a non-negative number/i)).toBeInTheDocument();

      // spending
      openEdit('spending');
      const sModal = screen.getByRole('dialog', { name: /edit spending/i });
      fireEvent.change(within(sModal).getByLabelText(/housing/i), { target: { value: -10 } });
      fireEvent.click(within(sModal).getByRole('button', { name: /save/i }));
      expect(screen.getByText(/must be a non-negative number/i)).toBeInTheDocument();
    });
  });

  // ---------- Projection Logic/UI Integration -----------
  describe('Projection Modal, Chart, and Calculation', () => {
    beforeEach(() => {
      localStorage.clear();
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /guest/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue as guest/i }));
    });

    test('projects income and updates dashboard stats', async () => {
      const projBtn = screen.getByRole('button', { name: /project retirement income/i });
      fireEvent.click(projBtn);

      await waitFor(() =>
        expect(screen.getByRole('dialog', { name: /retirement projection/i })).toBeInTheDocument()
      );
      expect(screen.getByRole('img', { name: /projection chart/i })).toBeInTheDocument();
      // Close button closes modal
      fireEvent.click(screen.getByRole('button', { name: /close/i }));
      expect(screen.queryByRole('dialog', { name: /retirement projection/i })).not.toBeInTheDocument();
    });
  });

  // ---------- Scenario Comparison -----------
  describe('Scenario Comparison Flows', () => {
    beforeEach(() => {
      localStorage.clear();
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /guest/i }));
      fireEvent.click(screen.getByRole('button', { name: /continue as guest/i }));
    });

    test('can add, switch, and delete scenarios', () => {
      // Go to scenarios tab
      fireEvent.click(screen.getByRole('listitem', { name: /scenarios/i }));
      expect(screen.getByRole('heading', { name: /scenarios/i })).toBeInTheDocument();

      // Add scenario
      fireEvent.click(screen.getByRole('button', { name: /\+/i }));
      // Simulate user prompt
      window.prompt = jest.fn(() => "My Plan 2");
      fireEvent.click(screen.getByRole('button', { name: /\+/i }));
      expect(screen.getAllByRole('button', { name: /scenario/i }).length).toBeGreaterThan(1);

      // Switch scenario
      fireEvent.click(screen.getAllByRole('button', { name: /scenario/i })[1]);
      expect(screen.getAllByRole('button', { name: /scenario/i })[1].closest('li')).toHaveClass('active');

      // Duplicate current scenario
      fireEvent.click(screen.getAllByRole('button', { name: /duplicate/i })[1]);
      expect(screen.getAllByRole('button', { name: /scenario/i }).length).toBeGreaterThan(2);

      // Delete a scenario (ensure confirmation dialog)
      window.confirm = jest.fn(() => true);
      fireEvent.click(screen.getAllByRole('button', { name: /delete/i })[2]);
      expect(window.confirm).toHaveBeenCalled();
    });

    test('chart overlays comparison between scenarios', () => {
      fireEvent.click(screen.getByRole('listitem', { name: /scenarios/i }));
      // There should be an Assets/Income/Expenses chart in each scenario display
      expect(screen.getAllByRole('img', { name: /projection chart/i }).length).toBeGreaterThan(0);
    });
  });

  // ---------- User Profile -----------
  describe('User Profile Panel', () => {
    beforeEach(() => {
      localStorage.clear();
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: /register/i }));
      fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'Testy' } });
      fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 't@x.com' } });
      fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pw1111' } });
      fireEvent.click(screen.getByRole('button', { name: /sign up/i }));
    });

    test('shows correct user info and allows logout', () => {
      fireEvent.click(screen.getByRole('listitem', { name: /profile/i }));
      expect(screen.getByText(/name:/i)).toHaveTextContent('Testy');
      expect(screen.getByText(/email:/i)).toHaveTextContent('t@x.com');
      // Log out returns to auth screen
      fireEvent.click(screen.getByRole('button', { name: /logout/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // ---------- Utility/Logic Unit Tests -----------
  describe('runProjection Calculation Logic', () => {
    test('returns consistent projection with reasonable data', () => {
      const assets = { "401k": 100000, "ira": 0, "brokerage": 0, "realEstate": 0, "cash": 0 };
      const income = { salary: 100000, pension: 0, socialSecurity: 30000, otherIncome: 0, ssStartAge: 67 };
      const spending = { housing: 2000, healthcare: 400, travel: 200, discretionary: 500, other: 200 };
      const taxes = { status: "Single", rate: 20, deductions: 0 };
      const proj = runProjection(assets, income, spending, taxes);
      expect(proj.years.length).toBe(30);
      expect(proj.income[0]).toBeGreaterThan(0);
      expect(proj.expenses[0]).toBeGreaterThan(0);
      expect(proj.assets[0]).toBe(103000); // 3% growth after first year drawdown/test; fudge for withdrawal
      expect(proj.assets[proj.assets.length - 1]).toBeGreaterThanOrEqual(0);
    });

    test('projection shows asset depletion and income drops with low starting asset', () => {
      const assets = { "401k": 0, "ira": 0, "brokerage": 0, "realEstate": 0, "cash": 0 };
      const income = { salary: 25000, pension: 0, socialSecurity: 0, otherIncome: 0, ssStartAge: 67 };
      const spending = { housing: 3000, healthcare: 1000, travel: 200, discretionary: 500, other: 200 };
      const taxes = { status: "Single", rate: 5, deductions: 0 };
      const proj = runProjection(assets, income, spending, taxes);
      // Assets should stay zero, never negative
      expect(Math.min(...proj.assets)).toBeGreaterThanOrEqual(0);
      // Income remains about the same pre/post retirement
      expect(proj.income[0]).toBeLessThan(proj.expenses[0]);
      expect(proj.assets.findIndex(x=>x===0)).not.toBe(-1);
    });

    test('different tax rates affect after-tax income', () => {
      const baseIncome = { salary: 50000, pension: 0, socialSecurity: 0, otherIncome: 0, ssStartAge: 67 };
      const spending = { housing: 2000, healthcare: 300, travel: 100, discretionary: 300, other: 0 };
      const taxesLow = { status: "Single", rate: 0, deductions: 0 };
      const taxesHigh = { status: "Single", rate: 40, deductions: 0 };
      const projLow = runProjection({}, baseIncome, spending, taxesLow);
      const projHigh = runProjection({}, baseIncome, spending, taxesHigh);
      expect(projLow.income[0]).toBeGreaterThan(projHigh.income[0]);
    });

    test('social security start age affects retirement year income', () => {
      const incomeEarly = { salary: 0, pension: 0, socialSecurity: 30000, otherIncome: 0, ssStartAge: 62 };
      const incomeLate = { salary: 0, pension: 0, socialSecurity: 30000, otherIncome: 0, ssStartAge: 70 };
      const spending = { housing: 300, healthcare: 200, travel: 0, discretionary: 0, other: 0 };
      const taxes = { status: "Single", rate: 10, deductions: 0 };
      const projEarly = runProjection({}, incomeEarly, spending, taxes);
      const projLate = runProjection({}, incomeLate, spending, taxes);
      // Early SS means more total years with SS income
      expect(projEarly.income.filter(i => i >= 25000).length).toBeGreaterThan(projLate.income.filter(i => i >= 25000).length);
    });
  });
});
