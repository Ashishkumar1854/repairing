import { useState } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Form";
import { authApi } from "@/services/modules";
import loginBg from "@/public/assets/login_bg.png";

const forgotSchema = z.object({
  email: z.string().email("Valid email is required"),
});

export function ForgotPassword() {
  const [message, setMessage] = useState("");
  const [resetToken, setResetToken] = useState("");
  const form = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  async function submit(values) {
    setMessage("");
    setResetToken("");
    try {
      const response = await authApi.forgotPassword({ email: values.email.trim() });
      setMessage("Password reset request accepted. Check the configured delivery channel.");
      if (response.data?.resetToken) setResetToken(response.data.resetToken);
    } catch (error) {
      form.setError("root", {
        message: error?.response?.data?.message || "Password reset request failed.",
      });
    }
  }

  return (
    <main
      className="relative grid min-h-screen place-items-center px-4 py-12 bg-cover bg-center bg-no-repeat antialiased font-sans"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute inset-0 bg-slate-50/15 backdrop-blur-[1px]" />
      <Card className="relative z-10 w-full max-w-md border border-white/50 bg-white/75 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden p-2">
        <CardHeader className="text-center pb-2 pt-6 border-b-0">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
            <KeyRound className="h-5 w-5 text-[#1769aa]" />
            Forgot Password
          </CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">Owner and super admin password recovery</p>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <Field label="Email address" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" placeholder="owner@shop.com" {...form.register("email")} />
            </Field>
            {form.formState.errors.root ? (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            {message ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 font-semibold">
                {message}
                {resetToken ? <p className="mt-2 break-all font-mono text-[11px]">{resetToken}</p> : null}
              </div>
            ) : null}
            <Button
              className="w-full h-11 text-xs font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-white border-none shadow-lg shadow-blue-200/50"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Sending..." : "Request Reset"}
            </Button>
            <div className="text-center text-xs text-slate-500">
              <Link to="/login" className="font-bold text-[#1769aa] hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
