import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  isConfirming = false,
  variant = "danger",
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel={title}>
      <h2 className="font-display text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm text-slate">{description}</p>
      {children && <div className="mt-4">{children}</div>}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={isConfirming}>
          Cancel
        </Button>
        <Button variant={variant} onClick={onConfirm} isLoading={isConfirming}>
          {isConfirming ? "Working..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
