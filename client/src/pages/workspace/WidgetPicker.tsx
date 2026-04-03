import { WIDGET_REGISTRY } from './widgetRegistry';
import './WidgetPicker.css';

interface WidgetPickerProps {
  open: boolean;
  currentWidgetIds: string[];
  onAddWidget: (id: string) => void;
  onClose: () => void;
}

export const WidgetPicker = ({ open, currentWidgetIds, onAddWidget, onClose }: WidgetPickerProps) => {
  const available = Object.values(WIDGET_REGISTRY).filter(w => !currentWidgetIds.includes(w.id));

  return (
    <>
      {open && <div className="widget-picker__overlay" onClick={onClose} />}
      <div className={`widget-picker${open ? ' widget-picker--open' : ''}`}>
        <div className="widget-picker__header">
          <span className="widget-picker__title">Add Widget</span>
          <button className="widget-picker__close" onClick={onClose}>&times;</button>
        </div>
        <div className="widget-picker__list">
          {available.length === 0 ? (
            <div className="widget-picker__empty">All widgets are already on your workspace.</div>
          ) : (
            available.map(w => (
              <div key={w.id} className="widget-picker__item">
                <div>
                  <div className="widget-picker__item-title">{w.title}</div>
                  <div className="widget-picker__item-desc">{w.description}</div>
                </div>
                <button className="widget-picker__add-btn" onClick={() => onAddWidget(w.id)}>Add</button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};
