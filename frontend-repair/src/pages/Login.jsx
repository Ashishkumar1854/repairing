import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Form";
import { useAuth } from "@/contexts/AuthContext";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export function Login() {
  const { login } = useAuth();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values) {
    try {
      await login(values);
    } catch {
      form.setError("root", { message: "Invalid credentials or backend unavailable." });
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--background)] px-4">
      <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(135deg,#1769aa,#0f9f8f)]" />
      <Card className="relative z-10 w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">Auth module: POST /auth/login</p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...form.register("email")} />
            </Field>
            <Field label="Password" error={form.formState.errors.password?.message}>
              <Input type="password" autoComplete="current-password" {...form.register("password")} />
            </Field>
            {form.formState.errors.root ? <p className="text-sm text-[var(--danger)]">{form.formState.errors.root.message}</p> : null}
            <Button className="w-full" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Signing in..." : "Login"}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
