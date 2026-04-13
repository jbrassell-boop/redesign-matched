import { useState } from 'react';
import './EvalChecklist.css';

export interface EvalItem {
  key: string;
  label: string;
  result: 'pass' | 'fail' | null;
  notes: string;
}

interface EvalChecklistProps {
  items: EvalItem[];
  onChange: (items: EvalItem[]) => void;
  onSubmit: (items: EvalItem[]) => void;
  readOnly?: boolean;
  submittedBy?: string;
  submittedAt?: string;
}

export const EvalChecklist = ({
  items,
  onChange,
  onSubmit,
  readOnly = false,
  submittedBy,
  submittedAt,
}: EvalChecklistProps) => {
  const [localItems, setLocalItems] = useState<EvalItem[]>(items);

  const update = (idx: number, patch: Partial<EvalItem>) => {
    const next = localItems.map((it, i) => (i === idx ? { ...it, ...patch } : it));
    setLocalItems(next);
    onChange(next);
  };

  const allDone = localItems.every((it) => it.result !== null);
  const anyFail = localItems.some((it) => it.result === 'fail');

  return (
    <div className="eval-checklist">
      {readOnly && submittedBy && (
        <div className="eval-checklist__stamp">
          Submitted by <strong>{submittedBy}</strong> on {submittedAt}
        </div>
      )}
      <table className="eval-checklist__table">
        <thead>
          <tr>
            <th>Check</th>
            <th style={{ width: 60 }}>Pass</th>
            <th style={{ width: 60 }}>Fail</th>
            <th style={{ width: 180 }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {localItems.map((item, i) => (
            <tr key={item.key} className={item.result === 'fail' ? 'eval-checklist__row--fail' : ''}>
              <td>{item.label}</td>
              <td className="eval-checklist__center">
                <input
                  type="radio"
                  name={`eval-${item.key}`}
                  checked={item.result === 'pass'}
                  onChange={() => update(i, { result: 'pass' })}
                  disabled={readOnly}
                />
              </td>
              <td className="eval-checklist__center">
                <input
                  type="radio"
                  name={`eval-${item.key}`}
                  checked={item.result === 'fail'}
                  onChange={() => update(i, { result: 'fail' })}
                  disabled={readOnly}
                />
              </td>
              <td>
                <input
                  className="eval-checklist__notes"
                  value={item.notes}
                  onChange={(e) => update(i, { notes: e.target.value })}
                  placeholder="Notes..."
                  disabled={readOnly}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <div className="eval-checklist__footer">
          {anyFail && (
            <span className="eval-checklist__warning">
              Failed items detected — scope will be sent to Repair
            </span>
          )}
          <button
            className="eval-checklist__submit"
            disabled={!allDone}
            onClick={() => onSubmit(localItems)}
            type="button"
          >
            Submit Evaluation
          </button>
        </div>
      )}
    </div>
  );
};
