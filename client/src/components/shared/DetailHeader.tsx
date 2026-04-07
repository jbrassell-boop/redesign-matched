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
    <h1 className="detail-header__title">{title}</h1>
    {subtitle && <span className="detail-header__subtitle">{subtitle}</span>}
    {badges}
    {meta && <span className="detail-header__meta">{meta}</span>}
    {actions && <div className="detail-header__actions">{actions}</div>}
  </div>
);
