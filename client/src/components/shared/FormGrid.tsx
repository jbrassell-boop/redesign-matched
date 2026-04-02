import './FormGrid.css';

interface FormGridProps {
  cols?: 2 | 3 | 4;
  children: React.ReactNode;
  className?: string;
}

export const FormGrid = ({ cols = 2, children, className }: FormGridProps) => (
  <div className={`form-grid form-grid--${cols}${className ? ` ${className}` : ''}`}>
    {children}
  </div>
);
