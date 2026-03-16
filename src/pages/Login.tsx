import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error, data: signInData } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      // Check if super admin
      const { data: saData } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", signInData.user.id)
        .maybeSingle();

      navigate(saData ? "/super-admin" : "/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5">
      <div className="w-full max-w-[400px] rounded-3xl bg-card p-10 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] border border-border">
        <div className="text-center mb-8">
          <h1 className="text-[32px] font-extrabold text-secondary">
            OptiFlow
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="email" className="mb-1.5 block">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-1.5 block">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
            />
          </div>
          <Button variant="cta" size="xl" className="w-full text-base" type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          Access is by invitation only.
        </p>
      </div>
    </div>
  );
};

export default Login;
