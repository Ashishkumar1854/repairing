import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Form";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "@/services/modules";
import loginBg from "@/public/assets/login_bg.png";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  branchName: z.string().optional().nullable(),
});

export function Login() {
  const { login } = useAuth();
  const [branches, setBranches] = useState([]);
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", branchName: "" },
  });

  const emailValue = form.watch("email");

  useEffect(() => {
    const fetchBranches = async () => {
      if (!emailValue || !emailValue.includes("@")) {
        setBranches([]);
        return;
      }
      try {
        const response = await authApi.getBranchesByEmail({ email: emailValue.trim() });
        setBranches(response?.data?.branches || []);
      } catch (err) {
        console.error("Failed to fetch branch suggestions", err);
      }
    };

    const debounceTimer = setTimeout(() => {
      fetchBranches();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [emailValue]);

  async function submit(values) {
    try {
      const payload = {
        email: values.email,
        password: values.password,
        branchName: values.branchName?.trim() || undefined,
      };
      await login(payload);
    } catch (error) {
      form.setError("root", { message: error?.response?.data?.message || "Invalid credentials or branch check failed." });
    }
  }

  return (
    <main
      className="relative grid min-h-screen place-items-center px-4 py-12 bg-cover bg-center bg-no-repeat antialiased font-sans"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      {/* Light Glassy Backdrop Overlay */}
      <div className="absolute inset-0 bg-slate-50/15 backdrop-blur-[1px]" />

      <Card className="relative z-10 w-full max-w-md border border-white/50 bg-white/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden p-2">
        <CardHeader className="text-center pb-2 pt-6 border-b-0">
          <Link to="/" className="inline-block mx-auto mb-3">
            <div className="h-11 w-11 rounded-2xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white font-black shadow-md shadow-blue-200/60 hover:scale-105 transition-transform">
              RF
            </div>
          </Link>
          <CardTitle className="text-2xl font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
            Welcome Back
          </CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Access the RepairFlow ERP Dashboard
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <Field
              label={<span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Email Address</span>}
              error={form.formState.errors.email?.message}
            >
              <Input
                type="email"
                autoComplete="email"
                placeholder="name@company.com"
                className="mt-1.5 bg-white/80 border-slate-200/80 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs h-11"
                {...form.register("email")}
              />
            </Field>

            <Field
              label={<span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">Password</span>}
              error={form.formState.errors.password?.message}
            >
              <Input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="mt-1.5 bg-white/80 border-slate-200/80 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs h-11"
                {...form.register("password")}
              />
            </Field>

            <Field
              label={
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                  Branch Context <span className="text-[9px] font-normal text-slate-400 normal-case">(Staff only)</span>
                </span>
              }
              error={form.formState.errors.branchName?.message}
            >
              <Input
                type="text"
                placeholder="e.g. Main Branch"
                list="login-branch-suggestions"
                className="mt-1.5 bg-white/80 border-slate-200/80 focus:border-blue-500 focus:ring-blue-500/20 rounded-lg text-xs h-11"
                {...form.register("branchName")}
              />
              <datalist id="login-branch-suggestions">
                {branches.map((b) => (
                  <option key={b.id} value={b.name} />
                ))}
              </datalist>
            </Field>

            {form.formState.errors.root ? (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold leading-normal">
                {form.formState.errors.root.message}
              </div>
            ) : null}

            <Button
              className="w-full h-11 text-xs font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-white border-none shadow-lg shadow-blue-200/50 hover:brightness-95 transition-all mt-6 rounded-lg cursor-pointer"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Signing in..." : "Login to Portal"}
            </Button>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100 mt-6 text-xs">
              <Link to="/signup" className="font-bold text-[#1769aa] hover:underline">
                Owner signup
              </Link>
              <Link to="/forgot-password" className="font-bold text-slate-500 hover:text-slate-800 hover:underline">
                Forgot password?
              </Link>
            </div>

            <div className="text-center">
              <Link to="/" className="text-xs text-slate-400 hover:text-slate-700 transition-colors font-bold inline-flex items-center gap-1">
                ← Back to homepage
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
