import React, { useEffect, useState, useCallback } from "react";
import "./App.css";
import "./index.css";

/** Color & layout config */
const COLORS = {
  primary: "#1976d2",
  secondary: "#424242",
  accent: "#ffb300",
  error: "#d32f2f",
};
const APP_SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "assets", label: "Assets" },
  { key: "income", label: "Income" },
  { key: "spending", label: "Spending" },
  { key: "projection", label: "Projection" },
  { key: "scenarios", label: "Scenarios" },
  { key: "profile", label: "Profile" },
];

///////////////// Components ////////////////////////

/** Sidebar Navigation Component */
function Sidebar({ selected, onSelect, user, onLogout }) {
  return (
    <nav className="sidebar" aria-label="Main Navigation">
      <div className="sidebar-title">RetireSecure</div>
      <ul className="sidebar-list" role="list">
        {APP_SECTIONS.map((section) => (
          <li
            key={section.key}
            className={
              "sidebar-item" + (selected === section.key ? " selected" : "")
            }
            tabIndex={0}
            role="listitem"
            aria-current={selected === section.key ? "true" : undefined}
            aria-label={section.label}
            onClick={() => onSelect(section.key)}
            data-testid={`sidebar-nav-${section.key}`}
          >
            {section.label}
          </li>
        ))}
      </ul>
      {user && (
        <div className="sidebar-user">
          <div className="user-name">{user.name}</div>
          <button
            className="sidebar-btn"
            onClick={onLogout}
            aria-label="Logout"
            type="button"
            id="sidebar-logout-btn"
            data-testid="sidebar-logout-btn"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

import ReactDOM from "react-dom";

/** PUBLIC_INTERFACE
 * Modern Modal Dialog wrapper using React Portal for strict mode compatibility and React 18 Static Flag (createPortal in StrictMode) requirements.
 * - Never creates or removes modal-root dynamically; expects a static <div id="modal-root"></div> in index.html.
 * - Handles modal portal and overlay semantics in compliance with React 18+ strict mode.
 * - Provides batch/unbatched updates safety.
 * @param {object} props
 * @property {boolean} open - Whether the modal is open.
 * @property {function} onClose - Callback to close the modal.
 * @property {React.ReactNode} children - Modal content.
 * @property {string} title - Title for aria-labeling.
 * @property {string} id - Optional DOM id.
 */
function Modal({ open, onClose, children, title, id }) {
  // If not open, don't render at all (remove from DOM) as recommended by React for overlays
  if (!open) return null;
  // All overlays/dialogs must use a static portal root for React 18 strict mode.
  // NOTE: index.html must have: <div id="modal-root"></div> sibling to root.
  const dialogId = id ? id : `modal-${title ? title.replace(/\s+/g, '-').toLowerCase() : Math.random().toString(36).slice(2,8)}`;
  const labelledById = `${dialogId}-label`;

  React.useEffect(() => {
    // Focus trap: focus modal on open
    const modal = document.getElementById(dialogId);
    if (modal) modal.focus();
    // Prevent scroll
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open, dialogId]);

  // Keyboard Esc closes
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") {
        (onClose || (() => {}))();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Use static modal-root div (React 18+ strict mode portal pattern)
  let modalRoot = document.getElementById("modal-root");

  if (!modalRoot) {
    // Developer guidance: If not found, fail obviously so developer adds it to index.html.
    throw new Error(
      'Modal root container <div id="modal-root"></div> not found in document. Add <div id="modal-root"></div> after <div id="root"></div> in public/index.html for React 18+ portal support.'
    );
  }

  const modalElement = (
    <div
      id={dialogId}
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledById}
      tabIndex={-1}
      data-testid={dialogId}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h2 id={labelledById}>{title}</h2>
          <button
            className="modal-close"
            aria-label="Close"
            onClick={onClose}
            type="button"
            data-testid={`${dialogId}-close-btn`}
            id={`${dialogId}-close-btn`}
          >
            Close
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );

  // React 18 strict mode: portal overlays must be static-rooted for "static flag" warning to disappear.
  return ReactDOM.createPortal(modalElement, modalRoot);
}

/** Authentication Component (login/register/guest)
 * - Always render Login, Register, and Guest tab buttons,
 * - Buttons must have visible text ("Login", "Register", "Guest"), role="button", correct aria-label for test/ax,
 * - Only the active authentication panel is present in the DOM (for accessibility and ARIA uniqueness).
 * - Only the active tab's submit button and panel are rendered.
 */
function AuthModal({ open, onAuthenticate, error, initialTab = "login" }) {
  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");

  const handleAuth = (e) => {
    e.preventDefault();
    if (tab === "register") {
      onAuthenticate({ action: "register", name, email, pw });
    } else if (tab === "login") {
      onAuthenticate({ action: "login", email, pw });
    } else if (tab === "guest") {
      onAuthenticate({ action: "guest" });
    }
  };

  // Prepare currently visible panel
  let panel = null;
  let submitLabel = "";
  if (tab === "login") {
    panel = (
      <div
        role="tabpanel"
        aria-labelledby="tab-login"
        id="tabpanel-login"
        aria-hidden={false}
        data-testid="login-panel"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
          id="auth-email"
          autoComplete="username"
          tabIndex={0}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          aria-label="Password"
          minLength={4}
          id="auth-password"
          autoComplete="current-password"
          tabIndex={0}
        />
      </div>
    );
    submitLabel = "Sign In";
  } else if (tab === "register") {
    panel = (
      <div
        role="tabpanel"
        aria-labelledby="tab-register"
        id="tabpanel-register"
        aria-hidden={false}
        data-testid="register-panel"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        <input
          type="text"
          placeholder="Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Name"
          id="auth-name"
          autoComplete="name"
          tabIndex={0}
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
          id="auth-email"
          autoComplete="username"
          tabIndex={0}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          aria-label="Password"
          minLength={4}
          id="auth-password"
          autoComplete="new-password"
          tabIndex={0}
        />
      </div>
    );
    submitLabel = "Sign Up";
  } else if (tab === "guest") {
    panel = (
      <div
        role="tabpanel"
        aria-labelledby="tab-guest"
        id="tabpanel-guest"
        aria-hidden={false}
        data-testid="guest-panel"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        {/* No input for guest */}
      </div>
    );
    submitLabel = "Continue as Guest";
  }

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="Welcome to RetireSecure"
      id="auth-modal"
    >
      <div
        style={{ marginBottom: 20, display: "flex", gap: 8 }}
        role="tablist"
        aria-label="Authentication Modes"
      >
        <button
          className={"switch-tab" + (tab === "login" ? " selected" : "")}
          type="button"
          role="tab"
          aria-label="Login"
          aria-pressed={tab === "login"}
          aria-selected={tab === "login"}
          onClick={() => setTab("login")}
          tabIndex={0}
          id="tab-login"
          data-testid="tab-login"
        >Login</button>
        <button
          className={"switch-tab" + (tab === "register" ? " selected" : "")}
          type="button"
          role="tab"
          aria-label="Register"
          aria-pressed={tab === "register"}
          aria-selected={tab === "register"}
          onClick={() => setTab("register")}
          tabIndex={0}
          id="tab-register"
          data-testid="tab-register"
        >Register</button>
        <button
          className={"switch-tab" + (tab === "guest" ? " selected" : "")}
          type="button"
          role="tab"
          aria-label="Guest"
          aria-pressed={tab === "guest"}
          aria-selected={tab === "guest"}
          onClick={() => setTab("guest")}
          tabIndex={0}
          id="tab-guest"
          data-testid="tab-guest"
        >Guest</button>
      </div>
      <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {panel}
        {tab === "login" && (
          <button
            className="primary"
            type="submit"
            role="button"
            aria-label="Sign In"
            data-testid="auth-submit-btn"
            tabIndex={0}
          >
            Sign In
          </button>
        )}
        {tab === "register" && (
          <button
            className="primary"
            type="submit"
            role="button"
            aria-label="Sign Up"
            data-testid="auth-submit-btn"
            tabIndex={0}
          >
            Sign Up
          </button>
        )}
        {tab === "guest" && (
          <button
            className="primary"
            type="submit"
            role="button"
            aria-label="Continue as Guest"
            data-testid="auth-submit-btn"
            tabIndex={0}
          >
            Continue as Guest
          </button>
        )}
      </form>
      {error && <div className="auth-error" aria-live="assertive">{error}</div>}
      {tab === "guest" && (
        <div
          className="auth-note"
          aria-live="polite"
          data-testid="guest-note"
          style={{ display: "block" }}
        >
          You are continuing as a guest. Data will not be saved.
        </div>
      )}
    </Modal>
  );
}

/** Data Entry Modal for Assets, Income, or Spending */
function DataEntryModal({ open, onClose, type, onSave, initial, assetLabels, incomeLabels, spendingLabels }) {
  // Build fields based on type.
  const fields =
    type === "assets"
      ? assetLabels
      : type === "income"
      ? incomeLabels
      : spendingLabels;

  const [form, setForm] = useState(
    initial || Object.fromEntries(fields.map(f => [f.key, f.default || ""]))
  );
  const [error, setError] = useState("");

  const handleChange = (key, value) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simple validation: all numbers >= 0 where numeric.
    for (const field of fields) {
      if (
        field.type === "number" &&
        (!form[field.key] || isNaN(Number(form[field.key])) || Number(form[field.key]) < 0)
      ) {
        setError(`"${field.label}" must be a non-negative number.`);
        // Do NOT call onSave; don't close modal on error.
        return;
      }
      if (field.type === "text" && !form[field.key]) {
        setError(`"${field.label}" is required.`);
        // Do NOT call onSave; don't close modal on error.
        return;
      }
    }
    setError("");
    // Only call onSave (triggers modal close) if validation passed
    onSave(form);
  };

  // Give modal/dialog a unique id for accessibility and test selection
  const dialogId = `data-entry-modal-${type}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Edit ${capitalize(type)}`}
      id={dialogId}
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
        aria-label={`Edit ${capitalize(type)} Form`}
        data-testid={`${dialogId}-form`}
        >
        {fields.map((field) => (
          <label
            key={field.key}
            style={{ fontWeight: 500 }}
            htmlFor={`form-field-${field.key}`}
          >
            {field.label}
            <input
              id={`form-field-${field.key}`}
              type={field.type}
              value={form[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              step={field.type === "number" ? "any" : undefined}
              min={field.type === "number" ? "0" : undefined}
              aria-label={`${capitalize(type)} - ${field.label}`}
              required={field.required !== false}
              data-testid={`input-${type}-${field.key}`}
            />
          </label>
        ))}
        <button
          className="primary"
          type="submit"
          role="button"
          aria-label="Save"
          data-testid="save-btn"
        >
          Save
        </button>
        {error && <div className="form-error" aria-live="assertive">{error}</div>}
      </form>
    </Modal>
  );
}

/** Dashboard Quick Stats + Actions */
function Dashboard({ stats, data, onEdit, onProject, onNewScenario }) {
  return (
    <div className="dashboard">
      <h1 style={{ marginBottom: 0 }} role="heading" aria-level={1}>Retirement Overview</h1>
      <div className="quick-stats">
        <StatCard label="Retirement Age" value={stats.retirementAge || "—"} />
        <StatCard label="First Year Income" value={stats.firstYearIncome ? `$${fmtMoney(stats.firstYearIncome)}` : "—"} />
        <StatCard label="Asset Depletion Risk" value={stats.depletionRisk != null ? `${stats.depletionRisk}%` : "—"} />
      </div>
      <div className="dashboard-actions">
        <button
          className="primary"
          onClick={onProject}
          aria-label="Project Retirement Income"
          role="button"
          id="dashboard-project-btn"
          data-testid="dashboard-project-btn"
        >
          Project Retirement Income
        </button>
        <button
          className="secondary"
          onClick={onNewScenario}
          aria-label="Create New Scenario"
          role="button"
          id="dashboard-newscenario-btn"
          data-testid="dashboard-newscenario-btn"
        >
          New Scenario
        </button>
      </div>
      <div className="consolidated-data">
        <h2 role="heading" aria-level={2}>Current Summary</h2>
        <SummaryTable data={data} onEdit={onEdit} />
      </div>
    </div>
  );
}

/** Stat Card in Dashboard */
function StatCard({ value, label }) {
  return (
    <div className="stat-card" role="region" aria-label={label}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

/** Data Summary Table for quick review */
function SummaryTable({ data, onEdit }) {
  return (
    <div style={{ margin: "10px 0"}}>
      <table className="summary-table">
        <thead>
          <tr>
            <th scope="col">Section</th>
            <th scope="col">Details</th>
            <th scope="col">Edit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Assets</td>
            <td>{describeAssets(data.assets)}</td>
            <td>
              <button
                className="small"
                onClick={() => onEdit("assets")}
                aria-label="Edit Assets"
                role="button"
                id="edit-assets-btn"
                data-testid="edit-assets-btn"
              >
                Edit Assets
              </button>
            </td>
          </tr>
          <tr>
            <td>Income</td>
            <td>{describeIncome(data.income)}</td>
            <td>
              <button
                className="small"
                onClick={() => onEdit("income")}
                aria-label="Edit Income"
                role="button"
                id="edit-income-btn"
                data-testid="edit-income-btn"
              >
                Edit Income
              </button>
            </td>
          </tr>
          <tr>
            <td>Spending</td>
            <td>{describeSpending(data.spending)}</td>
            <td>
              <button
                className="small"
                onClick={() => onEdit("spending")}
                aria-label="Edit Spending"
                role="button"
                id="edit-spending-btn"
                data-testid="edit-spending-btn"
              >
                Edit Spending
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Projection Visualization (Chart)
 *  Chart overlays and SVG ARIA labeling are standardized so test/automation can always query the same attributes.
 *  Always visible/testable, even for overlays.
 */
function ProjectionChart({ projection, comparison, color=COLORS.primary, chartId }) {
  // projection = { years: [2024,...], income: [...], expenses: [...], assets: [...] }
  if (!projection || !projection.years || projection.years.length === 0) {
    // Always render chart structure for test/automation even without data.
    return (
      <div
        className="chart-block"
        style={{ textAlign: "center", margin: 40, color: COLORS.secondary }}
        aria-label="No projection data"
        data-testid={chartId ? `projection-chart-${chartId}-nodata` : "projection-chart-nodata"}
        role="region"
      >
        <svg
          width={400}
          height={220}
          className="projection-chart"
          role="img"
          aria-label="Empty Projection Chart"
          data-testid={chartId ? `svg-projection-chart-empty-${chartId}` : "svg-projection-chart-empty"}
        />
        No projection data.
      </div>
    );
  }
  const maxY = Math.max(
    ...projection.income,
    ...projection.expenses,
    ...projection.assets,
    ...(comparison ? comparison.assets : [])
  );

  // Helper to build SVG path with data-testids to test overlays
  const makePath = (arr, yMax, strokeColor, label, overlayId, room = 60) => {
    const N = projection.years.length;
    const xStep = 340 / (N - 1 || 1);
    let path = "";
    arr.forEach((y, i) => {
      let svgY = room + (200 - room) - ((y / yMax) * (200 - room)); // from bottom up
      let svgX = 40 + i * xStep;
      if (i === 0) path = `M ${svgX} ${svgY}`;
      else path += ` L ${svgX} ${svgY}`;
    });
    return (
      <path
        d={path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        aria-label={label}
        data-testid={overlayId}
      />
    );
  };

  // Unique ARIA-labels and testids for overlays/series
  const regionLabel =
    `Retirement Projection Chart${projection.label ? `: ${projection.label}` : ""}${chartId ? ` Chart ID ${chartId}` : ""}`;

  return (
    <div
      className="chart-block"
      role="region"
      aria-label={regionLabel}
      data-testid={chartId ? `projection-chart-${chartId}` : "projection-chart"}
    >
      <div className="chart-labels">
        <strong>Retirement Projection</strong>
        <span style={{ fontWeight: 400, color: COLORS.accent }}>
          {projection.label || ""}
        </span>
      </div>
      <svg
        width={400}
        height={220}
        className="projection-chart"
        role="img"
        aria-label={regionLabel}
        data-testid={chartId ? `svg-projection-chart-${chartId}` : "svg-projection-chart"}
        tabIndex={0}
      >
        {/* Axes */}
        <line x1={40} y1={60} x2={40} y2={200} stroke="#CCC" data-testid={chartId ? `chart-axis-y-${chartId}` : "chart-axis-y"} />
        <line x1={40} y1={200} x2={380} y2={200} stroke="#CCC" data-testid={chartId ? `chart-axis-x-${chartId}` : "chart-axis-x"} />
        {/* Data Series - overlays explicitly labeled */}
        {makePath(projection.assets, maxY, color, "Assets Data Series", (chartId ? `chart-assets-overlay-${chartId}` : "chart-assets-overlay"))}
        {makePath(projection.income, maxY, COLORS.primary, "Income Data Series", (chartId ? `chart-income-overlay-${chartId}` : "chart-income-overlay"))}
        {makePath(projection.expenses, maxY, COLORS.error, "Expenses Data Series", (chartId ? `chart-expenses-overlay-${chartId}` : "chart-expenses-overlay"))}
        {comparison && makePath(comparison.assets, maxY, COLORS.secondary, "Comparison Assets Overlay", (chartId ? `chart-assets-comparison-overlay-${chartId}` : "chart-assets-comparison-overlay"))}
        {/* Axis labels */}
        {projection.years.map((y, i) => (
          <text
            key={y}
            x={40 + (i * 340) / (projection.years.length - 1 || 1)}
            y={215}
            fontSize={8}
            textAnchor="middle"
            fill="#666"
            aria-label={`Year ${y}`}
            data-testid={(chartId ? `chart-xlabel-${chartId}-${y}` : undefined)}
          >
            {y}
          </text>
        ))}
        {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => (
          <text
            key={i}
            x={25}
            y={200 - frac * 140}
            fontSize={8}
            textAnchor="end"
            fill="#666"
            aria-label={`Value $${fmtMoney(Math.round(maxY * frac))}`}
            data-testid={chartId ? `chart-ylabel-${chartId}-${i}` : undefined}
          >
            {"$" + fmtMoney(Math.round(maxY * frac))}
          </text>
        ))}
      </svg>
      <div className="chart-legend" data-testid={chartId ? `chart-legend-${chartId}` : "chart-legend"}>
        <span
          style={{ color: COLORS.primary }}
          aria-label="Income Data Series"
          data-testid={chartId ? `legend-income-${chartId}` : "legend-income"}
        >
          ● Income
        </span>
        <span
          style={{ color: COLORS.error }}
          aria-label="Expenses Data Series"
          data-testid={chartId ? `legend-expenses-${chartId}` : "legend-expenses"}
        >
          ● Expenses
        </span>
        <span
          style={{ color: color }}
          aria-label="Assets Data Series"
          data-testid={chartId ? `legend-assets-${chartId}` : "legend-assets"}
        >
          ● Assets
        </span>
        {comparison && (
          <span
            style={{ color: COLORS.secondary }}
            aria-label="Comparison Assets Overlay"
            data-testid={chartId ? `legend-comparison-${chartId}` : "legend-comparison"}
          >
            ● Other Plan
          </span>
        )}
      </div>
    </div>
  );
}

/** Scenario Comparison Panel 
 *  Ensures all controls are always present and discoverable for accessibility and automation.
 *  Buttons/labels are always in the DOM and tied to explicit aria-labels and testids.
 */
function ScenarioPanel({ scenarios, activeIdx, onActivate, onDuplicate, onDelete, onCreate }) {
  return (
    <div
      className="scenarios-panel"
      role="region"
      aria-label="Scenario Panel"
      data-testid="scenario-panel"
    >
      <h3 role="heading" aria-level={3} id="scenarios-heading">
        Scenarios
        <button
          className="small"
          title="Add Scenario"
          style={{ marginLeft: 4 }}
          onClick={onCreate}
          aria-label="Add Scenario"
          role="button"
          id="add-scenario-btn"
          data-testid="add-scenario-btn"
        >
          +
        </button>
      </h3>
      <ul className="scenarios-list" role="list" aria-labelledby="scenarios-heading">
        {scenarios.length === 0 ? (
          <li role="listitem" aria-current={false}>
            <span
              className="scenario-label"
              aria-label="No scenarios"
              data-testid="scenario-label-none"
            >
              No scenarios defined.
            </span>
          </li>
        ) : (
          scenarios.map((s, i) => (
            <li
              className={i === activeIdx ? "active" : ""}
              key={s.id}
              role="listitem"
              aria-current={i === activeIdx ? "true" : "false"}
              data-testid={`scenario-listitem-${i}`}
            >
              <button
                className="scenario-label"
                type="button"
                onClick={() => onActivate(i)}
                aria-label={
                  s.label
                    ? `Select Scenario: ${s.label} (${i + 1})`
                    : `Select Scenario ${i + 1}`
                }
                role="button"
                data-testid={`activate-scenario-btn-${i}`}
                id={`activate-scenario-btn-${i}`}
                tabIndex={0}
              >
                {s.label || `Scenario ${i + 1}`}
              </button>
              <button
                className="small"
                type="button"
                title="Duplicate"
                onClick={() => onDuplicate(i)}
                aria-label={
                  s.label
                    ? `Duplicate Scenario: ${s.label} (${i + 1})`
                    : `Duplicate Scenario ${i + 1}`
                }
                role="button"
                data-testid={`duplicate-scenario-btn-${i}`}
                id={`duplicate-scenario-btn-${i}`}
                tabIndex={0}
              >
                Duplicate
              </button>
              <button
                className="small"
                type="button"
                title="Delete"
                onClick={() => onDelete(i)}
                aria-label={
                  s.label
                    ? `Delete Scenario: ${s.label} (${i + 1})`
                    : `Delete Scenario ${i + 1}`
                }
                role="button"
                data-testid={`delete-scenario-btn-${i}`}
                id={`delete-scenario-btn-${i}`}
                disabled={i === 0}
                tabIndex={0}
              >
                Delete
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

/** User Profile and Settings */
function ProfilePanel({ user, onLogout }) {
  // PUBLIC_INTERFACE
  // This panel always shows the user's name and email as "Name: [name] ([email])" in a single testable row
  // for accessible test queries after registration/login.
  const displayName = user && user.name ? user.name : "N/A";
  const displayEmail = user && user.email ? user.email : "N/A";
  return (
    <div className="profile-panel">
      <h2 role="heading" aria-level={2}>User Profile</h2>
      <div>
        <strong>Name:</strong>{" "}
        <span
          data-testid="profile-user-info"
          style={{ marginLeft: 0 }}
        >
          {displayName} ({displayEmail})
        </span>
      </div>
      <button
        className="secondary"
        onClick={onLogout}
        aria-label="Logout"
        role="button"
        id="profile-logout-btn"
        data-testid="profile-logout-btn"
      >
        Logout
      </button>
    </div>
  );
}

/**********************************************/
/*************** Main App Component ***********/
/**********************************************/

// Field definitions
const ASSET_LABELS = [
  { key: "401k", label: "401K Accounts", type: "number", default: 0, placeholder: "e.g. 50000" },
  { key: "ira", label: "IRA Accounts", type: "number", default: 0 },
  { key: "brokerage", label: "Brokerage Accounts", type: "number", default: 0 },
  { key: "realEstate", label: "Real Estate Equity", type: "number", default: 0 },
  { key: "cash", label: "Cash/Savings", type: "number", default: 0 },
];
const INCOME_LABELS = [
  { key: "salary", label: "Current Salary", type: "number", default: 0 },
  { key: "pension", label: "Pensions", type: "number", default: 0 },
  { key: "socialSecurity", label: "Social Security", type: "number", default: 0 },
  { key: "otherIncome", label: "Other Recurring Income", type: "number", default: 0 },
  { key: "ssStartAge", label: "SS Start Age", type: "number", default: 67 },
];
const SPENDING_LABELS = [
  { key: "housing", label: "Housing", type: "number", default: 2000 },
  { key: "healthcare", label: "Healthcare", type: "number", default: 400 },
  { key: "travel", label: "Travel", type: "number", default: 200 },
  { key: "discretionary", label: "Discretionary", type: "number", default: 500 },
  { key: "other", label: "Other", type: "number", default: 200 },
];

const TAX_LABELS = [
  { key: "status", label: "Filing Status", type: "text", default: "Single"},
  { key: "rate", label: "Effective Tax Rate (%)", type: "number", default: 20},
  { key: "deductions", label: "Deductions", type: "number", default: 0}
];

/**
 * PUBLIC_INTERFACE
 * Main application component for RetireSecure Planner.
 */
function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(true);
  const [authError, setAuthError] = useState("");

  // Navigation state
  const [selectedSection, setSelectedSection] = useState("dashboard");
  const [showModal, setShowModal] = useState(null); // e.g. "assets" | "income" | "spending" | "projection"
  const [editType, setEditType] = useState(null);

  // Main scenario state (multiple scenarios for comparison)
  const [scenarios, setScenarios] = useState([
    // Each scenario: { id, label, assets, income, spending, taxes, projection, stats }
    createDefaultScenario("My Plan")
  ]);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);

  // When scenario changes, show dashboard
  useEffect(() => setSelectedSection("dashboard"), [activeScenarioIdx]);

  // Input for editing
  const [editInitial, setEditInitial] = useState(null);

  // Auth logic (no real backend)
  const handleAuthenticate = ({ action, name, email, pw }) => {
    setAuthError("");
    if (action === "logout") {
      setUser(null);
      setShowAuthModal(true);
      return;
    }
    if (action === "guest") {
      setUser({ name: "Guest", email: "" });
      setShowAuthModal(false);
      return;
    }
    // Simulate localstorage for basic login/register
    let users = JSON.parse(localStorage.getItem("rs-users") || "{}");
    if (action === "register") {
      if (!email || !pw || !name) {
        setAuthError("Please fill in all fields.");
        return;
      }
      if (users[email]) {
        setAuthError("Email is already registered.");
        return;
      }
      users[email] = { name, email, pw };
      localStorage.setItem("rs-users", JSON.stringify(users));
      setUser({ name, email });
      setShowAuthModal(false);
      return;
    }
    if (action === "login") {
      if (!users[email] || users[email].pw !== pw) {
        setAuthError("Invalid email or password.");
        return;
      }
      setUser({ name: users[email].name, email });
      setShowAuthModal(false);
    }
  };

  // Load data persistence (simulate if user logs in)
  useEffect(() => {
    // On new user, load their scenarios if exist
    if (!user) return;
    if (user.email && user.email !== "") {
      const scenarios = localStorage.getItem(`rs-scenarios-${user.email}`);
      if (scenarios) {
        setScenarios(JSON.parse(scenarios));
      }
    } else {
      // guest: always start fresh
      setScenarios([createDefaultScenario("My Plan")]);
      setActiveScenarioIdx(0);
    }
  }, [user]);

  useEffect(() => {
    // On scenarios update, persist if registered user
    if (user && user.email && user.email !== "") {
      localStorage.setItem(
        `rs-scenarios-${user.email}`,
        JSON.stringify(scenarios)
      );
    }
  }, [scenarios, user]);

  // Edit handlers - open modal and load initial data
  const handleEdit = (type) => {
    setEditType(type);
    setEditInitial(scenarios[activeScenarioIdx][type]);
    setShowModal("editData");
  };
  // PUBLIC_INTERFACE
  // Only closes asset modal on valid save. If validation fails in DataEntryModal, onSave is NOT called.
  const handleSaveEdit = (form) => {
    updateActiveScenario((s) => ({
      ...s,
      [editType]: form
    }));
    // Fully unmount and force modal DOM removal
    setShowModal(null);
    setTimeout(() => {
      // Clear out initial state so re-opening remounts a new modal instance
      setEditInitial(null);
      setEditType(null);
    }, 0);
  };

  // Project calculation handler
  const handleProject = () => {
    updateActiveScenario((s) => {
      const projection = runProjection(s.assets, s.income, s.spending, s.taxes);
      return {
        ...s,
        projection,
        stats: calcStats(projection)
      };
    });
    setShowModal("projection");
  };

  // New scenario (duplicate)
  const handleNewScenario = () => {
    const cur = scenarios[activeScenarioIdx];
    const label = prompt("Enter label for new scenario:", `${cur.label} Copy`);
    const copy = { ...cur, id: makeId(), label: label || `${cur.label} Copy` };
    setScenarios([...scenarios, copy]);
    setActiveScenarioIdx(scenarios.length);
  };
  // From Scenario Panel handlers
  const handleActivateScenario = (idx) => setActiveScenarioIdx(idx);
  const handleDuplicateScenario = (idx) => {
    const base = scenarios[idx];
    const copy = { ...base, id: makeId(), label: base.label + " Copy" };
    const arr = scenarios.slice();
    arr.splice(idx + 1, 0, copy);
    setScenarios(arr);
    setActiveScenarioIdx(idx + 1);
  };
  const handleDeleteScenario = (idx) => {
    if (scenarios.length === 1) return;
    if (!window.confirm("Are you sure you want to delete this scenario?")) return;
    const arr = scenarios.slice();
    arr.splice(idx, 1);
    setScenarios(arr);
    setActiveScenarioIdx(0);
  };

  // Helper: scenario state update
  function updateActiveScenario(fn) {
    setScenarios((old) =>
      old.map((s, i) =>
        i === activeScenarioIdx
          ? typeof fn === "function"
            ? fn(s)
            : { ...s, ...fn }
          : s
      )
    );
  }

  // Nav change
  const handleSidebarSelect = (key) => {
    if (key === "dashboard") setSelectedSection("dashboard");
    else if (key === "profile") setSelectedSection("profile");
    else if (["assets", "income", "spending"].includes(key)) {
      setEditType(key);
      setEditInitial(scenarios[activeScenarioIdx][key]);
      setShowModal("editData");
    } else if (key === "projection") {
      setShowModal("projection");
    } else if (key === "scenarios") {
      setSelectedSection("scenarios");
    }
  };

  // Layout
  const scenario = scenarios[activeScenarioIdx];
  const primaryColor = COLORS.primary;

  return (
    <div className="retire-app">
      <Sidebar
        selected={selectedSection}
        onSelect={handleSidebarSelect}
        user={user}
        onLogout={() => handleAuthenticate({ action: "logout" })}
      />

      <main className="main-dashboard" aria-live="polite">
        {/* Top Section */}
        {selectedSection === "dashboard" && (
          <Dashboard
            stats={scenario.stats || {}}
            data={scenario}
            onEdit={handleEdit}
            onProject={handleProject}
            onNewScenario={handleNewScenario}
          />
        )}

        {/* Scenarios comparison (side-by-side charts) */}
        {selectedSection === "scenarios" && (
          <div className="scenarios-compare">
            <ScenarioPanel
              scenarios={scenarios}
              activeIdx={activeScenarioIdx}
              onActivate={handleActivateScenario}
              onDuplicate={handleDuplicateScenario}
              onDelete={handleDeleteScenario}
              onCreate={handleNewScenario}
            />
            <div
              className="scenarios-charts"
              role="region"
              aria-label="Scenario Projections"
              data-testid="scenarios-charts"
            >
              {scenarios.length === 0 ? (
                <div
                  className="scenario-chart"
                  role="region"
                  aria-label="Scenario Projection Chart: No scenarios"
                  data-testid="scenario-chart-empty"
                  tabIndex={0}
                >
                  <ProjectionChart
                    projection={undefined}
                    comparison={null}
                    color={COLORS.primary}
                    chartId="scenario-empty"
                  />
                  <div
                    className="scenario-label-compare"
                    aria-label="Scenario Label: No scenarios"
                    data-testid="scenario-label-empty"
                  >
                    No scenarios defined.
                  </div>
                </div>
              ) : (
                scenarios.map((s, idx) => (
                  <div
                    key={s.id}
                    className={"scenario-chart" + (idx === activeScenarioIdx ? " active" : "")}
                    aria-current={idx === activeScenarioIdx ? "true" : "false"}
                    aria-label={
                      s.label && s.label.length > 0
                        ? `Scenario Projection Chart: Scenario ${idx + 1} (${s.label})${idx === activeScenarioIdx ? " (Active)" : ""}`
                        : `Scenario Projection Chart: Scenario ${idx + 1}${idx === activeScenarioIdx ? " (Active)" : ""}`
                    }
                    data-testid={`scenario-chart-${idx}`}
                    role="region"
                    tabIndex={0}
                  >
                    <ProjectionChart
                      projection={s.projection}
                      comparison={idx !== activeScenarioIdx ? scenarios[activeScenarioIdx].projection : null}
                      color={idx === activeScenarioIdx ? COLORS.primary : COLORS.secondary}
                      chartId={`scenario${idx + 1}`}
                    />
                    <div
                      className="scenario-label-compare"
                      aria-label={`Scenario Label: ${s.label || `Scenario ${idx + 1}`}`}
                      data-testid={`scenario-label-${idx}`}
                    >
                      {s.label || `Scenario ${idx + 1}`}
                    </div>
                    {/* Scenario action buttons pinned visibly with consistent selectors for testability */}
                    <div
                      className="scenario-actions-row"
                      style={{ marginTop: 8, display: "flex", gap: 8, justifyContent: "center" }}
                      role="group"
                      aria-label={`Scenario ${idx + 1} Controls`}
                      data-testid={`scenario-actions-${idx}`}
                    >
                      <button
                        className="small"
                        type="button"
                        aria-label={
                          s.label
                            ? `Select Scenario: ${s.label} (${idx + 1})`
                            : `Select Scenario ${idx + 1}`
                        }
                        role="button"
                        data-testid={`activate-scenario-btn-${idx}`}
                        id={`activate-scenario-btn-${idx}`}
                        tabIndex={0}
                        onClick={() => onActivate(idx)}
                        aria-pressed={idx === activeScenarioIdx}
                      >
                        Select
                      </button>
                      <button
                        className="small"
                        type="button"
                        aria-label={
                          s.label
                            ? `Duplicate Scenario: ${s.label} (${idx + 1})`
                            : `Duplicate Scenario ${idx + 1}`
                        }
                        role="button"
                        data-testid={`duplicate-scenario-btn-${idx}`}
                        id={`duplicate-scenario-btn-${idx}`}
                        tabIndex={0}
                        onClick={() => onDuplicate(idx)}
                      >
                        Duplicate
                      </button>
                      <button
                        className="small"
                        type="button"
                        aria-label={
                          s.label
                            ? `Delete Scenario: ${s.label} (${idx + 1})`
                            : `Delete Scenario ${idx + 1}`
                        }
                        role="button"
                        data-testid={`delete-scenario-btn-${idx}`}
                        id={`delete-scenario-btn-${idx}`}
                        tabIndex={0}
                        onClick={() => onDelete(idx)}
                        disabled={idx === 0}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Profile */}
        {selectedSection === "profile" && user && (
          <ProfilePanel user={user} onLogout={() => handleAuthenticate({ action: "logout" })}/>
        )}
      </main>

      {/* Data Entry / Projection Modal */}
      {(showModal === "editData" && editType) && (
        <DataEntryModal
          open={true}
          onClose={() => {
            setShowModal(null);
            setTimeout(() => {
              setEditInitial(null);
              setEditType(null);
            }, 0);
          }}
          type={editType}
          onSave={handleSaveEdit}
          initial={editInitial}
          assetLabels={ASSET_LABELS}
          incomeLabels={INCOME_LABELS}
          spendingLabels={SPENDING_LABELS}
        />
      )}
      {showModal === "projection" && (
        <Modal
          open={true}
          onClose={() => setShowModal(null)}
          title="Retirement Projection"
          id="projection-modal"
        >
          <ProjectionChart
            projection={scenario.projection}
            comparison={null}
          />
          <div style={{ margin: "14px 0" }}>
            {/* Only one visible close button: uniquely labeled for test and accessibility clarity */}
            <button
              className="primary"
              onClick={() => setShowModal(null)}
              autoFocus
              aria-label="Close Projection Modal"
              data-testid="projection-modal-close-btn"
              id="projection-modal-close-btn"
              role="button"
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onAuthenticate={handleAuthenticate}
        error={authError}
      />
    </div>
  );
}

/********************** Utilities and Calculation Logic *********************/

// Format money
function fmtMoney(n) {
  if (n == null) return "—";
  return n.toLocaleString();
}
function capitalize(s) {
  return s && s[0].toUpperCase() + s.slice(1);
}

// Create default scenario
function createDefaultScenario(label) {
  return {
    id: makeId(),
    label,
    assets: Object.fromEntries(ASSET_LABELS.map(f => [f.key, f.default])),
    income: Object.fromEntries(INCOME_LABELS.map(f => [f.key, f.default])),
    spending: Object.fromEntries(SPENDING_LABELS.map(f => [f.key, f.default])),
    taxes: { status: "Single", rate: 20, deductions: 0 },
    projection: undefined,
    stats: {}
  };
}
function makeId() {
  return Math.random().toString(36).substring(2, 10);
}

// Calculate summary strings
function describeAssets(a) {
  if (!a) return "";
  return (
    ["401k", "ira", "brokerage", "realEstate", "cash"]
      .map(k => (a[k] > 0 ? `${capitalize(k).replace(/([A-Z])/g, " $1")}: $${fmtMoney(Number(a[k]))}` : null))
      .filter(Boolean)
      .join("; ") || "—"
  );
}
function describeIncome(i) {
  if (!i) return "";
  return (
    ["salary", "pension", "socialSecurity", "otherIncome"]
      .map(k => (i[k] > 0 ? `${capitalize(k).replace(/([A-Z])/g, " $1")}: $${fmtMoney(Number(i[k]))}` : null))
      .filter(Boolean)
      .join("; ") || "—"
  );
}
function describeSpending(s) {
  if (!s) return "";
  return (
    ["housing", "healthcare", "travel", "discretionary", "other"]
      .map(k => (s[k] > 0 ? `${capitalize(k)}: $${fmtMoney(Number(s[k]))}` : null))
      .filter(Boolean)
      .join("; ") || "—"
  );
}

// PUBLIC_INTERFACE
function runProjection(assets, income, spending, taxesInput) {
  // Simulate a basic projection over 30 years.
  // - Assume retirement at 67 (or when social security starts).
  // - Asset drawdown is used to cover expenses not covered by income.
  // - Social Security, pension, other recurring income; apply basic tax rate.
  // - Model required minimum distributions from 401k/IRA at age 73+
  const years = [];
  const startYear = new Date().getFullYear();
  const AGE_RETIRE = income.ssStartAge ? Number(income.ssStartAge) : 67;
  const curAge = 45; // Assume
  const horizon = 30;
  let age = curAge;
  let assetsYear = {
    "401k": Number(assets["401k"] || 0),
    ira: Number(assets["ira"] || 0),
    brokerage: Number(assets["brokerage"] || 0),
    realEstate: Number(assets["realEstate"] || 0),
    cash: Number(assets["cash"] || 0),
  };
  let incomeArr = [];
  let expensesArr = [];
  let assetsArr = [];
  let curTotal = getAssetsTotal(assetsYear);
  let taxRate = Number(taxesInput.rate || 20) / 100;

  for (let i = 0; i < horizon; ++i) {
    const year = startYear + i;
    const retired = age >= AGE_RETIRE;
    let incomeThisYear = 0;
    if (!retired) {
      incomeThisYear = Number(income.salary || 0);
    }
    if (retired) {
      incomeThisYear += Number(income.pension || 0) + Number(income.otherIncome || 0);
      // Social security starts at ssStartAge.
      if (age >= Number(income.ssStartAge || 67)) {
        incomeThisYear += Number(income.socialSecurity || 0);
      }
    }
    let expensesThisYear =
      Number(spending.housing || 0) * 12 +
      Number(spending.healthcare || 0) * 12 +
      Number(spending.travel || 0) * 12 +
      Number(spending.discretionary || 0) * 12 +
      Number(spending.other || 0) * 12;

    // Apply taxes on income (simple)
    const taxesOwed = incomeThisYear * taxRate;
    incomeThisYear -= taxesOwed;

    // Drawdown assets if not enough income to cover expenses.
    let assetDraw = 0;
    if (incomeThisYear < expensesThisYear) {
      assetDraw = expensesThisYear - incomeThisYear;
      // Withdraw from cash, brokerage, IRA, 401k (in that order)
      let remaining = assetDraw;
      let out401k = 0, outIra = 0, outB = 0, outC = 0;
      // Required minimum distribution if age >= 73 (from 401k, ira)
      if (retired && age >= 73) {
        const rmd401k = Math.min(assetsYear["401k"], assetsYear["401k"] * 0.04);
        const rmdIra = Math.min(assetsYear["ira"], assetsYear["ira"] * 0.04);
        out401k += rmd401k; outIra += rmdIra;
        assetsYear["401k"] -= rmd401k; assetsYear["ira"] -= rmdIra;
        remaining -= (rmd401k + rmdIra);
      }
      // Cash
      if (assetsYear.cash > 0 && remaining > 0) {
        let canTake = Math.min(assetsYear.cash, remaining);
        outC += canTake;
        assetsYear.cash -= canTake;
        remaining -= canTake;
      }
      // Brokerage
      if (assetsYear.brokerage > 0 && remaining > 0) {
        let canTake = Math.min(assetsYear.brokerage, remaining);
        outB += canTake;
        assetsYear.brokerage -= canTake;
        remaining -= canTake;
      }
      // IRA
      if (assetsYear.ira > 0 && remaining > 0) {
        let canTake = Math.min(assetsYear.ira, remaining);
        outIra += canTake;
        assetsYear.ira -= canTake;
        remaining -= canTake;
      }
      // 401k
      if (assetsYear["401k"] > 0 && remaining > 0) {
        let canTake = Math.min(assetsYear["401k"], remaining);
        out401k += canTake;
        assetsYear["401k"] -= canTake;
        remaining -= canTake;
      }
      // Negative asset means fully depleted.
    }
    // Add basic investment growth for non-spent assets (3%/year)
    Object.keys(assetsYear).forEach((k) => {
      if (assetsYear[k] > 0) assetsYear[k] *= 1.03;
      assetsYear[k] = Math.max(0, assetsYear[k]);
    });

    curTotal = getAssetsTotal(assetsYear);
    years.push(year);
    incomeArr.push(Math.round(incomeThisYear));
    expensesArr.push(Math.round(expensesThisYear));
    assetsArr.push(Math.round(curTotal));
    age += 1;
  }
  return {
    years,
    income: incomeArr,
    expenses: expensesArr,
    assets: assetsArr,
    label: "",
  };
}

function getAssetsTotal(assets) {
  return (
    Number(assets["401k"] || 0) +
    Number(assets["ira"] || 0) +
    Number(assets["brokerage"] || 0) +
    Number(assets["realEstate"] || 0) +
    Number(assets["cash"] || 0)
  );
}

function calcStats(projection) {
  if (!projection) return {};
  // Example: earliest year where assets drop below 0, first-year income
  let depletionYear =
    projection.assets.findIndex((x) => x < 1) === -1
      ? null
      : projection.years[projection.assets.findIndex((x) => x < 1)];
  let firstYearIncome = projection.income.length > 0 ? projection.income[0] : null;
  let retirementAge = 67; // could use input
  let depletionRisk =
    depletionYear != null
      ? ((projection.years[projection.years.length - 1] - depletionYear) /
          projection.years.length) *
        100
      : 0;
  if (depletionRisk < 0) depletionRisk = 0;
  return {
    retirementAge,
    firstYearIncome,
    depletionRisk: Math.round(depletionRisk),
  };
}

export default App;

// PUBLIC_INTERFACE
export {
  runProjection
};
