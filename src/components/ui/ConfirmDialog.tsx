import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { ReactNode } from 'react';

interface Props {
  buka: boolean;
  judul: string;
  pesan: ReactNode;
  labelYa: string;
  bahaya?: boolean;
  onYa: () => void;
  onBatal: () => void;
}
export function ConfirmDialog({ buka, judul, pesan, labelYa, bahaya, onYa, onBatal }: Props) {
  return (
    <Modal buka={buka} onTutup={onBatal} judul={judul} lebar="sm"
      footer={<><Button varian="garis" onClick={onBatal}>Batal</Button><Button varian={bahaya ? 'bahaya' : 'primer'} onClick={onYa}>{labelYa}</Button></>}>
      <div className="flex gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${bahaya ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}><AlertTriangle className="h-5 w-5" /></span>
        <div className="text-sm text-gray-600">{pesan}</div>
      </div>
    </Modal>
  );
}
