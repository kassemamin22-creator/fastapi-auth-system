import { useState } from "react";
import ConfirmDialog from "../ui/ConfirmDialog";
import Alert from "../ui/Alert";
import { api, ApiError, messageFromDetail } from "../../lib/api";

export default function DeleteUserDialog({ user, isOpen, onClose, onDeleted }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setError("");
    setIsDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      onDeleted(user);
    } catch (err) {
      // Show the actual server/network message when there is one (a 404
      // really does mean "already removed"; a network failure should say
      // so, not guess) — only fall back to a generic string for a
      // genuinely unexpected non-ApiError failure.
      setError(
        err instanceof ApiError
          ? messageFromDetail(err.detail)
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Remove this user?"
      description={`${user.first_name} ${user.last_name} (${user.email}) will lose access immediately. Their record is kept, not erased — this can only be undone by an engineer with direct database access.`}
      confirmLabel="Remove user"
      isConfirming={isDeleting}
      variant="danger"
    >
      {error && <Alert variant="danger">{error}</Alert>}
    </ConfirmDialog>
  );
}
