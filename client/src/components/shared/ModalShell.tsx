import { Modal } from 'antd';
import type { ModalProps } from 'antd';
import './ModalShell.css';

interface ModalShellProps extends ModalProps {
  variant?: 'primary' | 'danger';
}

export const ModalShell = ({ variant = 'primary', className, ...rest }: ModalShellProps) => (
  <Modal
    className={`modal-shell${variant === 'danger' ? ' modal-shell--danger' : ''}${className ? ` ${className}` : ''}`}
    centered
    {...rest}
  />
);
