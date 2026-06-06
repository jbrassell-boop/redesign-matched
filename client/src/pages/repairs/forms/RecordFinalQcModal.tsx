import { useState, useEffect, type CSSProperties } from 'react';
import { Modal, Segmented, message } from 'antd';
import { recordFinalInspection } from '../../../api/quality';

interface Props {
  repairKey: number;
  open: boolean;
  onClose: () => void;
  onSaved?: (result: 'Pass' | 'Fail') => void;
}

type PF = 'Pass' | 'Fail';

const labelStyle: CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 };

// Record the Post-Repair (final QC) result for a repair: hot/cold-leak + autoclave
// pass/fail. Upserts via POST /api/quality/inspections; overall Pass requires both.
export const RecordFinalQcModal = ({ repairKey, open, onClose, onSaved }: Props) => {
  const [leak, setLeak] = useState<PF>('Pass');
  const [autoclave, setAutoclave] = useState<PF>('Pass');
  const [saving, setSaving] = useState(false);

  // The modal instance is reused across repairs (destroyOnClose only unmounts children),
  // so reset to defaults whenever it opens or the target repair changes — otherwise the
  // previous repair's Pass/Fail choices would carry over and could be saved by mistake.
  useEffect(() => {
    if (open) { setLeak('Pass'); setAutoclave('Pass'); }
  }, [open, repairKey]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await recordFinalInspection(repairKey, {
        hotColdLeakPass: leak === 'Pass',
        autoclavePass: autoclave === 'Pass',
      });
      message.success(`Final QC recorded — ${res.result}`);
      onSaved?.(res.result);
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to record final QC');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Record Final QC"
      open={open}
      onCancel={onClose}
      onOk={save}
      confirmLoading={saving}
      okText="Save Result"
      destroyOnClose
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
        <div>
          <div style={labelStyle}>Hot / Cold Leak Test</div>
          <Segmented value={leak} onChange={(v) => setLeak(v as PF)} options={['Pass', 'Fail']} block />
        </div>
        <div>
          <div style={labelStyle}>Autoclave Test</div>
          <Segmented value={autoclave} onChange={(v) => setAutoclave(v as PF)} options={['Pass', 'Fail']} block />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>
          Overall result is <b>Pass</b> only if both tests pass. Saved against this repair's
          post-repair inspection (updates the existing record if one exists).
        </div>
      </div>
    </Modal>
  );
};
