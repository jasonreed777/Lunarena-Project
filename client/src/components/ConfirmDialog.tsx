import React from "react";
import ReactDOM from "react-dom";
import * as Typography from "../libs/Typography";
import { TranslucentButton as Button } from "./Buttons";

/**
 * Styled confirmation dialog that replaces window.confirm().
 * Uses a portal so it always renders at the document root,
 * avoiding clipping when triggered from inside constrained containers.
 */
const ConfirmDialog: React.FC<{
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  backgroundColor?: string;
  textColor?: string;
}> = ({
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "#ef4444",
  onConfirm,
  onCancel,
  backgroundColor = "#1a1a1a",
  textColor = "#fff",
}) =>
  ReactDOM.createPortal(
    <div className="manage-dialog-overlay" onClick={onCancel}>
      <div
        className="manage-dialog"
        style={{
          backgroundColor,
          color: textColor,
          maxWidth: 400,
          textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Typography.InputText style={{ marginBottom: 24 }}>{message}</Typography.InputText>
        <div style={{ display: "flex", gap: 12 }}>
          <Button color="#888888" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button color={confirmColor} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );

export default ConfirmDialog;
