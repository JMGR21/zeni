"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type AuthActionState = { error?: string };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function signUp(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const name = getField(formData, "name");
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  if (!name || !email || !password) return { error: "Completa todos los campos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signIn(_previousState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getField(formData, "email");
  const password = getField(formData, "password");
  if (!email || !password) return { error: "Completa todos los campos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}