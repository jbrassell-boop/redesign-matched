import type { RepairFull } from './types';
import { StatusBadge } from '../../components/shared';
import './CockpitHeader.css';

interface CockpitHeaderProps {
  repair: RepairFull;
  onNextStage?: () => void;
  onChangeStatus?: () => void;
  onPrint?: () => void;
  nextStageName?: string | null;
  hasNextStage?: boolean;
}

export const CockpitHeader = ({
  repair, onNextStage, onChangeStatus, onPrint, nextStageName, hasNextStage,
}: CockpitHeaderProps) => {
  const tatColor = repair.daysIn > 14 ? 'var(--danger)' : repair.daysIn > 7 ? 'var(--amber)' : 'var(--muted)';

  return (
    <div className="cockpit-header">
      <span className="cockpit-header__wo">{repair.wo}</span>
      <StatusBadge status={repair.status} />
      {repair.isUrgent && <StatusBadge status="URGENT" variant="red" />}

      <span className="cockpit-header__sep" />
      <span className="cockpit-header__entity">
        <b>{repair.client}</b> &rarr; {repair.dept}
      </span>

      <span className="cockpit-header__sep" />
      <span className="cockpit-header__entity">
        {repair.scopeType} &middot; {repair.serial}
      </span>

      <span className="cockpit-header__sep" />
      <span className="cockpit-header__tat" style={{ color: tatColor }}>
        TAT: {repair.daysIn}d
      </span>

      <div className="cockpit-header__actions">
        {hasNextStage && (
          <button className="cockpit-header__btn cockpit-header__btn--primary" onClick={onNextStage}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {nextStageName ?? 'Next Stage'}
          </button>
        )}
        <button className="cockpit-header__btn" onClick={onChangeStatus}>
          Change Status
        </button>
        <button className="cockpit-header__btn" onClick={onPrint}>
          Print D&amp;I
        </button>
      </div>
    </div>
  );
};
