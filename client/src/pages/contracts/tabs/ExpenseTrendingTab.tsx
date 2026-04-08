import { tabPaddingStyle, expensePlaceholderStyle, expenseTitleStyle, expenseDescStyle } from './shared';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ border: '1px solid var(--neutral-200)', borderRadius: 8, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
    {children}
  </div>
);

const PanelHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'var(--neutral-50)', padding: '7px 12px',
    fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    color: 'var(--navy)', borderBottom: '1px solid var(--neutral-200)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  }}>
    {children}
  </div>
);

export const ExpenseTrendingTab = ({ contractKey }: { contractKey: number }) => {
  void contractKey; // reserved for future endpoint wiring
  return (
    <div style={tabPaddingStyle}>
      <Panel>
        <PanelHead><span>Expense Trending</span></PanelHead>
        <div style={expensePlaceholderStyle}>
          <div style={{ marginBottom: 12 }}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
              style={{ width: 40, height: 40, margin: '0 auto', display: 'block', color: 'var(--neutral-300)' }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div style={expenseTitleStyle}>
            Expense trending data will appear here
          </div>
          <div style={expenseDescStyle}>
            Monthly expense analysis and cost trending for this contract will be shown
            once the reporting endpoint is available.
          </div>
        </div>
      </Panel>
    </div>
  );
};
