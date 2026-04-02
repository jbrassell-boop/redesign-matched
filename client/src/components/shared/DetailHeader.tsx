import './DetailHeader.css';

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}

export const DetailHeader = ({ title, subtitle, badges, actions, meta }: DetailHeaderProps) => (
  <div className="detail-header">
    <span className="detail-header__title">{title}</span>
    {subtitle && <span className="detail-header__subtitle">{subtitle}</span>}
    {badges}
    {meta && <span className="detail-header__meta">{meta}</span>}
    {actions && <div className="detail-header__actions">{actions}</div>}
  </div>
);
