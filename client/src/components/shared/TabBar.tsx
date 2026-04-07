import { memo } from 'react';
import './TabBar.css';

export interface TabDef {
  key: string;
  label: string;
  badge?: number | null;
}

interface TabBarProps {
  tabs: TabDef[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export const TabBar = memo(({ tabs, activeKey, onChange, className }: TabBarProps) => (
  <div className={`tab-bar${className ? ` ${className}` : ''}`} role="tablist">
    {tabs.map(tab => (
      <button
        key={tab.key}
        className={`tab-bar__item${tab.key === activeKey ? ' tab-bar__item--active' : ''}`}
        onClick={() => onChange(tab.key)}
        type="button"
        role="tab"
        aria-selected={tab.key === activeKey}
      >
        {tab.label}
        {tab.badge != null && tab.badge > 0 && (
          <span className="tab-badge">{tab.badge}</span>
        )}
      </button>
    ))}
  </div>
));
