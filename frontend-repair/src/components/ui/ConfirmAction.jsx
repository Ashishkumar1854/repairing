import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ConfirmAction({
  children,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "primary",
  disabled,
  onConfirm,
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="w-full" variant={variant} disabled={disabled} onClick={() => setOpen(true)} type="button">
        {children}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">{description}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} type="button">Cancel</Button>
              <Button
                variant={variant}
                onClick={() => {
                  setOpen(false);
                  onConfirm?.();
                }}
                type="button"
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
