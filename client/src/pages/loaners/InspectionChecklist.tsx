import { useState } from 'react';
import './InspectionChecklist.css';

interface InspectionCategory {
  name: string;
  items: { label: string; field: string }[];
}

const FLEX_CATEGORIES: InspectionCategory[] = [
  { name: 'LEAK & PRESSURE TESTING', items: [
    { label: 'Leak Test — Immersion', field: 'insLeakPF' },
    { label: 'Hot / Cold Leak Test', field: 'insHotColdLeakPF' },
    { label: 'Air / Water System', field: 'insAirWaterPF' },
    { label: 'Suction Channel', field: 'insSuctionPF' },
    { label: 'Forcep / Biopsy Channel', field: 'insForcepChannelPF' },
    { label: 'Aux Water Channel', field: 'insAuxWaterPF' },
  ]},
  { name: 'IMAGE & OPTICS', items: [
    { label: 'Image Clarity & Focus', field: 'insImagePF' },
    { label: 'Image Centration', field: 'insImageCentrationPF' },
    { label: 'Focal Distance', field: 'insFocalDistancePF' },
    { label: 'Light Transmission', field: 'insFiberLightTransPF' },
    { label: 'Vision / Field of View', field: 'insVisionPF' },
    { label: 'Eye Piece', field: 'insEyePiecePF' },
    { label: 'Light Fibers', field: 'insLightFibersPF' },
  ]},
  { name: 'ANGULATION & MECHANICAL', items: [
    { label: 'Angulation — All 4 Directions', field: 'insAngulationPF' },
    { label: 'Insertion Tube Integrity', field: 'insInsertionTubePF' },
    { label: 'Alcohol Wipe / External', field: 'insAlcoholWipePF' },
    { label: 'Fog Test', field: 'insFogPF' },
  ]},
];

const RIGID_CATEGORIES: InspectionCategory[] = [
  { name: 'FUNCTIONAL TESTS', items: [
    { label: 'Optical Clarity / Image Quality', field: 'rigidImagePF' },
    { label: 'Light Transmission', field: 'rigidLightTransPF' },
    { label: 'Rod Lens Integrity', field: 'rigidRodLensPF' },
    { label: 'Working Channel / Sheath', field: 'rigidChannelPF' },
    { label: 'Ocular / Eyepiece', field: 'rigidOcularPF' },
    { label: 'Light Post / Connector', field: 'rigidLightPostPF' },
    { label: 'Sheath / Tube Straightness', field: 'rigidSheathPF' },
    { label: 'Coupler / Camera Attachment', field: 'rigidCouplerPF' },
    { label: 'Irrigation / Insufflation Ports', field: 'rigidPortsPF' },
    { label: 'Cosmetic / Exterior Condition', field: 'rigidCosmeticPF' },
  ]},
];

const CAMERA_CATEGORIES: InspectionCategory[] = [
  { name: 'CAMERA TESTS', items: [
    { label: 'Camera Cable', field: 'camCablePF' },
    { label: 'Cable Connector', field: 'camConnectorPF' },
    { label: 'Lens Cleaned', field: 'camLensPF' },
    { label: 'Control Buttons', field: 'camButtonsPF' },
    { label: 'Focus', field: 'camFocusPF' },
    { label: 'Video Appearance', field: 'camVideoPF' },
    { label: 'White Balance', field: 'camWhiteBalPF' },
  ]},
];

function getCategoriesForType(category: string): InspectionCategory[] {
  const c = category.toLowerCase();
  if (c.includes('rigid')) return RIGID_CATEGORIES;
  if (c.includes('camera')) return CAMERA_CATEGORIES;
  return FLEX_CATEGORIES;
}

interface Props {
  category: string;
  onComplete: (results: Record<string, string>, allPassed: boolean) => void;
}

export const InspectionChecklist = ({ category, onComplete }: Props) => {
  const categories = getCategoriesForType(category);
  const allFields = categories.flatMap(c => c.items.map(i => i.field));
  const [results, setResults] = useState<Record<string, string>>(
    Object.fromEntries(allFields.map(f => [f, '']))
  );

  const toggle = (field: string) => {
    setResults(prev => {
      const current = prev[field];
      const next = current === '' ? 'P' : current === 'P' ? 'F' : '';
      return { ...prev, [field]: next };
    });
  };

  const allMarked = allFields.every(f => results[f] === 'P' || results[f] === 'F');
  const anyFailed = allFields.some(f => results[f] === 'F');
  const allPassed = allMarked && !anyFailed;

  const handleComplete = () => {
    onComplete(results, allPassed);
  };

  return (
    <div className="inspection-checklist">
      {categories.map(cat => (
        <div key={cat.name} className="inspection-checklist__category">
          <div className="inspection-checklist__category-name">{cat.name}</div>
          {cat.items.map(item => {
            const v = results[item.field];
            return (
              <div
                key={item.field}
                className="inspection-checklist__item"
                onClick={() => toggle(item.field)}
              >
                <span className="inspection-checklist__label">{item.label}</span>
                <span className={`inspection-checklist__pf ${
                  v === 'P' ? 'inspection-checklist__pf--pass' :
                  v === 'F' ? 'inspection-checklist__pf--fail' :
                  'inspection-checklist__pf--empty'
                }`}>
                  {v || '\u2014'}
                </span>
              </div>
            );
          })}
        </div>
      ))}

      <div className="inspection-checklist__footer">
        {anyFailed && (
          <div className="inspection-checklist__warning">
            {allFields.filter(f => results[f] === 'F').length} item(s) failed — scope will go to repair
          </div>
        )}
        <button
          className={`inspection-checklist__btn ${anyFailed ? 'inspection-checklist__btn--fail' : 'inspection-checklist__btn--pass'}`}
          disabled={!allMarked}
          onClick={handleComplete}
        >
          {!allMarked ? 'Mark all items' : anyFailed ? 'Report Failure' : 'Inspection Passed'}
        </button>
      </div>
    </div>
  );
};
