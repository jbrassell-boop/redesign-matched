import { type ReactNode, type MouseEvent } from 'react';
import './DevNotice.css';

interface DevNoticeProps {
  /** What the feature is (e.g. "Mark Shipped") */
  title: string;
  /** What Steve needs to do (e.g. "Add sItemStatus column to tblProductSalesInventory") */
  requirement: string;
  /** Optional exact SQL migration */
  sql?: string;
  /** Wrap a button/element — click shows the notice instead of the action */
  children: ReactNode;
}

export const DevNotice = ({ title, requirement, sql, children }: DevNoticeProps) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Find or create the toast container
    let container = document.getElementById('dev-notice-toast');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dev-notice-toast';
      container.className = 'dev-notice-toast-container';
      document.body.appendChild(container);
    }

    // Create toast
    const toast = document.createElement('div');
    toast.className = 'dev-notice-toast';
    toast.innerHTML = `
      <div class="dev-notice-toast__header">
        <span class="dev-notice-toast__icon">&#9888;</span>
        <strong>Dev Required: ${title}</strong>
        <button class="dev-notice-toast__close" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
      <div class="dev-notice-toast__body">${requirement}</div>
      ${sql ? `<pre class="dev-notice-toast__sql">${sql}</pre>` : ''}
    `;
    container.appendChild(toast);

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
      toast.classList.add('dev-notice-toast--exit');
      setTimeout(() => toast.remove(), 300);
    }, 8000);
  };

  return (
    <span className="dev-notice-wrapper" onClick={handleClick}>
      {children}
    </span>
  );
};
