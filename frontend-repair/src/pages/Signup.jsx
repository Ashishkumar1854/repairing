import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { authApi } from "@/services/modules";
import loginBg from "@/public/assets/login_bg.png";

const signupSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    mobile: z.string().min(7, "Mobile number is required"),
    shopName: z.string().min(1, "Shop name is required"),
    address: z.string().min(1, "Address is required"),
    email: z.string().email("Valid email is required"),
    confirmEmail: z.string().email("Confirm email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
  })
  .refine((value) => value.email.toLowerCase() === value.confirmEmail.toLowerCase(), {
    message: "Email and confirm email must match",
    path: ["confirmEmail"],
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Password and confirm password must match",
    path: ["confirmPassword"],
  });

export function Signup() {
  const navigate = useNavigate();
  const [success, setSuccess] = useState("");
  const form = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      mobile: "",
      shopName: "",
      address: "",
      email: "",
      confirmEmail: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function submit(values) {
    setSuccess("");
    try {
      await authApi.signup({
        name: values.name.trim(),
        mobile: values.mobile.trim(),
        shopName: values.shopName.trim(),
        address: values.address.trim(),
        email: values.email.trim(),
        confirmEmail: values.confirmEmail.trim(),
        password: values.password,
        confirmPassword: values.confirmPassword,
      });
      setSuccess("Signup complete. Login with your owner email to choose a subscription plan.");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (error) {
      form.setError("root", {
        message: error?.response?.data?.message || "Signup failed. Please check your details.",
      });
    }
  }

  return (
    <main
      className="relative grid min-h-screen place-items-center px-4 py-10 bg-cover bg-center bg-no-repeat antialiased font-sans"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <div className="absolute inset-0 bg-slate-50/15 backdrop-blur-[1px]" />

      <Card className="relative z-10 w-full max-w-2xl border border-white/50 bg-white/75 backdrop-blur-xl shadow-2xl shadow-slate-200/50 rounded-2xl overflow-hidden p-2">
        <CardHeader className="text-center pb-2 pt-6 border-b-0">
          <Link to="/" className="inline-block mx-auto mb-3">
            <div className="h-11 w-11 rounded-2xl bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] grid place-items-center text-white font-black shadow-md shadow-blue-200/60">
              RF
            </div>
          </Link>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] bg-clip-text text-transparent">
            <UserPlus className="h-5 w-5 text-[#1769aa]" />
            Owner Signup
          </CardTitle>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Create your repair shop SaaS workspace
          </p>
        </CardHeader>
        <CardContent className="p-6">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(submit)}>
            <Field label="Owner name" error={form.formState.errors.name?.message}>
              <Input autoComplete="name" placeholder="Your full name" {...form.register("name")} />
            </Field>
            <Field label="Mobile number" error={form.formState.errors.mobile?.message}>
              <Input autoComplete="tel" placeholder="Mobile number" {...form.register("mobile")} />
            </Field>
            <Field label="Shop name" error={form.formState.errors.shopName?.message}>
              <Input autoComplete="organization" placeholder="Repair shop name" {...form.register("shopName")} />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" placeholder="owner@shop.com" {...form.register("email")} />
            </Field>
            <Field label="Confirm email" error={form.formState.errors.confirmEmail?.message}>
              <Input type="email" autoComplete="email" placeholder="owner@shop.com" {...form.register("confirmEmail")} />
            </Field>
            <Field label="Password" error={form.formState.errors.password?.message}>
              <Input type="password" autoComplete="new-password" placeholder="Minimum 8 characters" {...form.register("password")} />
            </Field>
            <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
              <Input type="password" autoComplete="new-password" placeholder="Repeat password" {...form.register("confirmPassword")} />
            </Field>
            <Field label="Shop address" error={form.formState.errors.address?.message} className="md:col-span-2">
              <Textarea placeholder="Full shop address" {...form.register("address")} />
            </Field>

            {form.formState.errors.root ? (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-semibold md:col-span-2">
                {form.formState.errors.root.message}
              </div>
            ) : null}
            {success ? (
              <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 text-xs text-emerald-700 font-semibold md:col-span-2">
                {success}
              </div>
            ) : null}

            <Button
              className="h-11 text-xs font-black bg-[linear-gradient(135deg,#1769aa,#0f9f8f)] text-white border-none shadow-lg shadow-blue-200/50 md:col-span-2"
              disabled={form.formState.isSubmitting}
            >
              <Building2 className="h-4 w-4" />
              {form.formState.isSubmitting ? "Creating workspace..." : "Create Owner Account"}
            </Button>

            <div className="text-center text-xs text-slate-500 md:col-span-2">
              Already registered?{" "}
              <Link to="/login" className="font-bold text-[#1769aa] hover:underline">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
