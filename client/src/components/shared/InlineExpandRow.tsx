import { type ReactNode } from 'react';
import './InlineExpandRow.css';

interface InlineExpandRowProps {
  colSpan: number;
  children: ReactNode;
  onCancel: () => void;
}

export const InlineExpandRow = ({ colSpan, children, onCancel }: InlineExpandRowProps) => (
  <tr className="inline-expand-row">
    <td colSpan={colSpan}>
      <div className="inline-expand-row__body">
        {children}
        <button className="inline-expand-row__cancel" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>
    </td>
  </tr>
);
