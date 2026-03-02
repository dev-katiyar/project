import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Button } from "primereact/button";
import { Message } from "primereact/message";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname ||
    "/overview";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message || "Invalid credentials");
    }
  };

  return (
    <div className="flex justify-content-center py-8 px-2">
      <Card className="w-full" style={{ maxWidth: 420 }}>
        <h2 className="mt-0 mb-1 font-bold">Welcome back</h2>
        <p className="mt-0 mb-4 text-sm text-color-secondary">
          Sign in to your SimpleVisor account
        </p>

        {error && (
          <Message severity="error" text={error} className="w-full mb-3" />
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <InputText
              id="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              className="w-full"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Password
            </label>
            <Password
              inputId="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              toggleMask
              feedback={false}
              className="w-full"
              inputClassName="w-full"
            />
          </div>

          <Button
            type="submit"
            label={loading ? "Signing in..." : "Sign In"}
            className="p-button-primary w-full"
            loading={loading}
          />
        </form>

        <div className="text-center mt-4 text-sm">
          <Link to="/forgot-password">Forgot password?</Link>
          <span className="mx-2" style={{ color: "var(--sv-text-muted)" }}>
            &middot;
          </span>
          <Link to="/signup">Create account</Link>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
