import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/contexts/ToastContext";

export function getErrorMessage(error) {
  return error?.response?.data?.message || error?.message || "Request failed. Please try again.";
}

export function useNotifyMutation(options) {
  const toast = useToast();
  const { successMessage, errorMessage, onSuccess, onError, ...mutationOptions } = options;

  return useMutation({
    ...mutationOptions,
    onSuccess: async (...args) => {
      if (successMessage) toast.success(typeof successMessage === "function" ? successMessage(...args) : successMessage);
      await onSuccess?.(...args);
    },
    onError: async (error, ...args) => {
      toast.error(errorMessage || getErrorMessage(error));
      await onError?.(error, ...args);
    },
  });
}
