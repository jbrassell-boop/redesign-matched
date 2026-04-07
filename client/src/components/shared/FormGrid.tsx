import { memo } from 'react';
import './FormGrid.css';

interface FormGridProps {
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export const FormGrid = memo(function FormGrid({ cols = 2, children, className }: FormGridProps) {
  return (
    <div className={`form-grid form-grid--${cols}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  );
});
