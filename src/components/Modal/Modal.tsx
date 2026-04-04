import type { ReactNode } from 'react';
import { Dialog, Heading, Modal as AriaModal, ModalOverlay } from 'react-aria-components';
import { X } from '@phosphor-icons/react';
import { Button } from '../Button/Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth,
}: ModalProps) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={(isOpen) => !isOpen && onClose()}
      isDismissable
      className={({ isEntering, isExiting }) => `
        modal-overlay
        ${isEntering ? 'modal-overlay-entering' : ''}
        ${isExiting ? 'modal-overlay-exiting' : ''}
      `}
    >
      <AriaModal
        className={({ isEntering, isExiting }) => `
          modal
          ${isEntering ? 'modal-entering' : ''}
          ${isExiting ? 'modal-exiting' : ''}
        `}
        style={maxWidth ? { maxWidth } : undefined}
      >
        <Dialog className="modal-dialog">
          {({ close }) => (
            <>
              <div className="modal-header">
                <Heading slot="title" className="modal-title">{title}</Heading>
                <Button variant="ghost" className="btn-icon modal-close" onPress={() => close()}>
                  <X size={18} />
                </Button>
              </div>
              <div className="modal-body">{children}</div>
              {footer && <div className="modal-footer">{footer}</div>}
            </>
          )}
        </Dialog>
      </AriaModal>
    </ModalOverlay>
  );
}
