"use client";
import React, { useEffect, useId, useRef } from "react";
import { Icon } from "./icons";
export function ToolDialog({
  title,
  open = true,
  onClose,
  children,
}: {
  title: string;
  open?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog?.open) dialog?.showModal();
    if (!open && dialog?.open) dialog.close();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, [open]);
  const close = () => {
    ref.current?.close();
    onClose();
  };
  return (
    <dialog
      ref={ref}
      className="folego-dialog"
      aria-labelledby={id}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="folego-dialog-header">
        <h2 id={id}>{title}</h2>
        <button
          type="button"
          className="folego-icon-button"
          aria-label="Fechar painel"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="folego-tool-content">{children}</div>
    </dialog>
  );
}
