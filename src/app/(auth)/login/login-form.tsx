"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Lock, Mail, Radar } from "lucide-react";
import { signIn, type AuthActionState } from "../actions";
import { AuthModeToggle } from "@/components/auth-mode-toggle";
import { HudFrame } from "@/components/hud-frame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INPUT_CLASSNAME =
  "h-10 border-ink-muted/20 bg-void/40 pl-9 text-ink placeholder:text-ink-muted focus-visible:border-ki-awakening focus-visible:ring-ki-awakening/40";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-10 w-full gap-2 bg-ki-awakening text-void hover:bg-ki-awakening/90 focus-visible:ring-ki-awakening/40"
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Verificando ki...
        </>
      ) : (
        <>
          <Radar className="size-4" />
          Iniciar sesión
        </>
      )}
    </Button>
  );
}

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, initialState);
  return (
    <HudFrame>
      <AuthModeToggle mode="login" />
      <h1 className="font-display text-3xl font-semibold text-ink">
        Bienvenido de vuelta, guerrero
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Tu entrenamiento financiero te espera.
      </p>
      <form action={formAction} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-ink">
            Email
          </Label>
          <div className="relative">
            <Mail
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={INPUT_CLASSNAME}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-ink">
            Contraseña
          </Label>
          <div className="relative">
            <Lock
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            />
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={INPUT_CLASSNAME}
            />
          </div>
        </div>
        {state.error && (
          <p className="text-sm text-destructive" role="alert">
            {state.error}
          </p>
        )}
        <SubmitButton />
      </form>
    </HudFrame>
  );
}
