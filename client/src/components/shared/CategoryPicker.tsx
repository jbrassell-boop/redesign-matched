import { useState } from 'react';
import './CategoryPicker.css';

export interface CategoryItem {
  key: number;
  name: string;
}

export interface SizeItem {
  key: number;
  description: string;
  description2: string;
  description3: string;
  status: string;
  unitCost: number | null;
}

interface CategoryPickerProps {
  categories: CategoryItem[];
  sizes: SizeItem[];
  loadingSizes: boolean;
  onSelectCategory: (key: number) => void;
  onAddItem: (sizeKey: number, quantity: number) => void;
  selectedCategoryName: string | null;
  onBack: () => void;
}

export const CategoryPicker = ({
  categories,
  sizes,
  loadingSizes,
  onSelectCategory,
  onAddItem,
  selectedCategoryName,
  onBack,
}: CategoryPickerProps) => {
  const [catSearch, setCatSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const filteredCats = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const setQty = (key: number, val: number) =>
    setQuantities((prev) => ({ ...prev, [key]: Math.max(1, val) }));

  if (selectedCategoryName) {
    return (
      <div className="category-picker">
        <div className="category-picker__header">
          <button className="category-picker__back" onClick={onBack} type="button">
            ← {selectedCategoryName}
          </button>
          <span className="category-picker__step">Step 2: Pick a size → add</span>
        </div>
        {loadingSizes ? (
          <div className="category-picker__loading">Loading sizes...</div>
        ) : (
          <table className="category-picker__table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Desc 2</th>
                <th style={{ width: 60 }}>Status</th>
                <th style={{ width: 50 }}>Qty</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {sizes.map((s) => (
                <tr key={s.key}>
                  <td>{s.description}</td>
                  <td className="category-picker__muted">{s.description2}</td>
                  <td><span className={`category-picker__status category-picker__status--${s.status.toLowerCase()}`}>{s.status}</span></td>
                  <td>
                    <input
                      type="number"
                      className="category-picker__qty"
                      value={quantities[s.key] ?? 1}
                      onChange={(e) => setQty(s.key, parseInt(e.target.value) || 1)}
                      min={1}
                    />
                  </td>
                  <td>
                    <button
                      className="category-picker__add"
                      onClick={() => onAddItem(s.key, quantities[s.key] ?? 1)}
                      type="button"
                    >+</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }

  return (
    <div className="category-picker">
      <div className="category-picker__header">
        <span className="category-picker__title">Add Items</span>
        <span className="category-picker__step">Step 1: Pick a category</span>
      </div>
      <div className="category-picker__search">
        <input
          placeholder="Search categories..."
          value={catSearch}
          onChange={(e) => setCatSearch(e.target.value)}
        />
      </div>
      <div className="category-picker__list">
        {filteredCats.map((c) => (
          <div
            key={c.key}
            className="category-picker__item"
            onClick={() => onSelectCategory(c.key)}
          >
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
};
