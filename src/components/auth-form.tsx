"use client";

import { LogIn, UserPlus } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FormState } from "@/app/actions";

type Props = {
  mode: "login" | "register";
  action: (s: FormState, f: FormData) => Promise<FormState>;
  next: string;
  needsAccessCode?: boolean;
  canReset?: boolean;
  /** Branding name and optional slogan. */
  brand: string;
  slogan?: string | null;
};

export function AuthForm({ mode, action, next, needsAccessCode, canReset, brand, slogan }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const isLogin = mode === "login";
  const other = `${isLogin ? "/register" : "/login"}?next=${encodeURIComponent(next)}`;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{brand}</CardTitle>
          {slogan && <p className="text-sm font-semibold text-ink/70">{slogan}</p>}
          <CardDescription>
            {isLogin ? "Sign in to view items and place bids." : "Create an account to start bidding."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" autoComplete="name" required />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={isLogin ? undefined : 8}
                required
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="shift">Shift <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="shift" name="shift" maxLength={60} />
              </div>
            )}
            {!isLogin && needsAccessCode && (
              <div className="space-y-2">
                <Label htmlFor="accessCode">Access code</Label>
                <Input id="accessCode" name="accessCode" autoComplete="off" required />
              </div>
            )}
            {isLogin && canReset && (
              <p className="text-right text-sm">
                <Link href="/forgot-password" className="text-muted-foreground underline underline-offset-4">Forgot password?</Link>
              </p>
            )}
            {state?.error && (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={pending}>
              {isLogin ? <LogIn /> : <UserPlus />} {pending ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {isLogin ? "New here?" : "Already registered?"}{" "}
              <Link href={other} className="underline underline-offset-4">
                {isLogin ? "Create an account" : "Sign in"}
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
