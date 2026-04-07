import { memo } from 'react';
import './Field.css';

interface FieldProps {
  label: string;
  value: string | number | null | undefined;
  multiline?: boolean;
  className?: string;
}

export const Field = memo(function Field({ label, value, multiline, className }: FieldProps) {
  return (
    <div className={`field${className ? ` ${className}` : ''}`}>
      <div className="field__label">{label}</div>
      <div className={`field__value${value == null || value === '' ? ' field__value--empty' : ''}${multiline ? ' field__value--multiline' : ''}`}>
        {value ?? '\u2014'}
      </div>
    </div>
  );
});
