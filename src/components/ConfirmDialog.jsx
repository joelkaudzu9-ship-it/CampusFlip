
import React from 'react';
import { AnimatedModal, MotionButton } from './MotionUI';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message = 'Please confirm that you want to continue.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  danger = false,
  loading = false,
}) {
  return (
    <AnimatedModal
      open={open}
      onClose={loading ? undefined : onClose}
      className="cf-confirm-dialog"
    >
      <div className="cf-confirm-icon">
        {danger ? '!' : '?'}
      </div>

      <h2 className="cf-confirm-title">{title}</h2>
      <p className="cf-confirm-message">{message}</p>

      <div className="cf-confirm-actions">
        <MotionButton
          type="button"
          className="cf-confirm-cancel"
          disabled={loading}
          onClick={onClose}
        >
          {cancelLabel}
        </MotionButton>

        <MotionButton
          type="button"
          className={`cf-confirm-submit ${danger ? 'danger' : ''}`}
          disabled={loading}
          onClick={onConfirm}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </MotionButton>
      </div>
    </AnimatedModal>
  );
}
