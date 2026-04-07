import './DetailHeader.css';

interface DetailHeaderProps {
  title: string;
  subtitle?: string;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  /** Heading level for the title. Defaults to 'h1'. Use 'h2' when the page already has an h1. */
  headingLevel?: 'h1' | 'h2' | 'h3';
}

export const DetailHeader = ({ title, subtitle, badges, actions, meta, headingLevel: Tag = 'h1' }: DetailHeaderProps) => (
  <div className="detail-header">
    <Tag className="detail-header__title">{title}</Tag>
    {subtitle && <span className="detail-header__subtitle">{subtitle}</span>}
    {badges}
    {meta && <span className="detail-header__meta">{meta}</span>}
    {actions && <div className="detail-header__actions">{actions}</div>}
  </div>
);
