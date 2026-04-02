import './SectionCard.css';

interface SectionCardProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SectionCard = ({ title, actions, children, className }: SectionCardProps) => (
  <div className={`section-card${className ? ` ${className}` : ''}`}>
    <div className="section-card__head">
      <span>{title}</span>
      {actions}
    </div>
    <div className="section-card__body">{children}</div>
  </div>
);
