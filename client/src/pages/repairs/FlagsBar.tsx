import type { ClientFlag } from '../clients/types';
import './FlagsBar.css';

interface FlagsBarProps {
  flags: ClientFlag[];
  scopeHistoryCount?: number;
}

export const FlagsBar = ({ flags, scopeHistoryCount }: FlagsBarProps) => {
  if (flags.length === 0 && !scopeHistoryCount) return null;

  return (
    <div className="flags-bar">
      {flags.map(f => (
        <span key={f.flagKey} className="flags-bar__chip flags-bar__chip--amber">
          {f.flagType ? `${f.flagType}: ` : ''}{f.flag}
        </span>
      ))}
      {scopeHistoryCount != null && scopeHistoryCount > 0 && (
        <span className="flags-bar__chip flags-bar__chip--purple">
          {scopeHistoryCount} prior repair{scopeHistoryCount !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
};
