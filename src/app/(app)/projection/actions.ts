"use server";

import { revalidatePath } from "next/cache";
import { getAvailableBalanceAsOf } from "@/lib/total-balance";
import { createClient } from "@/lib/supabase/server";

export type ProjectionActionState = { error?: string; success?: boolean; scenarioId?: string };

function getField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * `opening_balance` por defecto es el Saldo Disponible real al cierre del
 * mes anterior al proyectado (día 0 del mes = último día del mes previo,
 * aprovechando el overflow nativo de `Date`), no el saldo de hoy.
 */
async function getDefaultOpeningBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  month: Date,
): Promise<number> {
  const cutoff = new Date(month.getFullYear(), month.getMonth(), 0);
  return getAvailableBalanceAsOf(supabase, userId, cutoff);
}

export async function createProjectionScenario(
  _previousState: ProjectionActionState,
  formData: FormData,
): Promise<ProjectionActionState> {
  const monthField = getField(formData, "month");
  if (!monthField) return { error: "Mes inválido." };
  const name = getField(formData, "name") || "Escenario";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const month = new Date(`${monthField}T00:00:00`);
  const openingBalance = await getDefaultOpeningBalance(supabase, user.id, month);

  const { data, error } = await supabase
    .from("projection_scenarios")
    .insert({
      user_id: user.id,
      month: monthField,
      name,
      opening_balance: openingBalance,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !data) return { error: error?.message ?? "No se pudo crear el escenario." };

  revalidatePath("/projection");
  return { success: true, scenarioId: data.id };
}

export async function renameProjectionScenario(id: string, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("projection_scenarios").update({ name: trimmed }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/projection");
}

export async function updateProjectionOpeningBalance(id: string, openingBalance: number) {
  if (!Number.isFinite(openingBalance)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("projection_scenarios")
    .update({ opening_balance: openingBalance, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/projection");
}

export async function updateProjectionBufferPercent(id: string, bufferPercent: number) {
  if (!Number.isFinite(bufferPercent) || bufferPercent < 0) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("projection_scenarios")
    .update({ buffer_percent: bufferPercent, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  revalidatePath("/projection");
}

export async function duplicateProjectionScenario(id: string): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { data: scenario } = await supabase
    .from("projection_scenarios")
    .select("month, name, opening_balance, buffer_percent")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle<{ month: string; name: string; opening_balance: number; buffer_percent: number }>();
  if (!scenario) return { error: "Escenario no encontrado." };

  const { data: lines } = await supabase
    .from("projection_lines")
    .select("kind, label, amount, expected_date, category_id, source, source_ref, included, sort_order")
    .eq("scenario_id", id)
    .eq("user_id", user.id);

  const { data: newScenario, error } = await supabase
    .from("projection_scenarios")
    .insert({
      user_id: user.id,
      month: scenario.month,
      name: `${scenario.name} (copia)`,
      opening_balance: scenario.opening_balance,
      buffer_percent: scenario.buffer_percent,
    })
    .select("id")
    .single<{ id: string }>();
  if (error || !newScenario) return { error: error?.message ?? "No se pudo duplicar el escenario." };

  if (lines && lines.length > 0) {
    const clonedLines = lines.map((line) => ({ ...line, scenario_id: newScenario.id, user_id: user.id }));
    await supabase.from("projection_lines").insert(clonedLines);
  }

  revalidatePath("/projection");
  return { id: newScenario.id };
}

export async function deleteProjectionScenario(
  _previousState: ProjectionActionState,
  formData: FormData,
): Promise<ProjectionActionState> {
  const id = getField(formData, "id");
  if (!id) return { error: "Escenario inválido." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { error } = await supabase.from("projection_scenarios").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/projection");
  return { success: true };
}

export async function addProjectionLine(
  _previousState: ProjectionActionState,
  formData: FormData,
): Promise<ProjectionActionState> {
  const scenarioId = getField(formData, "scenario_id");
  if (!scenarioId) return { error: "Escenario inválido." };

  const kind = getField(formData, "kind");
  if (kind !== "income" && kind !== "expense") return { error: "Selecciona un tipo válido." };

  const label = getField(formData, "label");
  if (!label) return { error: "Ingresa una etiqueta." };

  const amount = Number(getField(formData, "amount"));
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Ingresa un monto válido." };

  const expectedDate = getField(formData, "expected_date");
  if (!expectedDate) return { error: "Selecciona una fecha." };

  const categoryId = getField(formData, "category_id") || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { count } = await supabase
    .from("projection_lines")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", scenarioId)
    .eq("user_id", user.id);

  const { error } = await supabase.from("projection_lines").insert({
    scenario_id: scenarioId,
    user_id: user.id,
    kind,
    label,
    amount,
    expected_date: expectedDate,
    category_id: categoryId,
    source: "manual",
    sort_order: count ?? 0,
  });
  if (error) return { error: error.message };

  revalidatePath("/projection");
  return { success: true };
}

type ImportableTransaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  occurred_on: string;
  category_id: string | null;
  categories: { name: string } | null;
};

/**
 * Importa movimientos reales ya registrados (de `transactions`) como líneas
 * del escenario — `source: "transaction"`, `source_ref` = id de la
 * transacción, para que la página pueda excluirlos de la lista de
 * "movimientos disponibles para agregar" la próxima vez que se abra.
 */
export async function addProjectionLinesFromTransactions(
  scenarioId: string,
  transactionIds: string[],
): Promise<{ added: number } | { error: string }> {
  if (transactionIds.length === 0) return { added: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sesión no válida. Vuelve a iniciar sesión." };

  const { data: transactions } = await supabase
    .from("transactions")
    .select("id, type, amount, description, occurred_on, category_id, categories(name)")
    .in("id", transactionIds)
    .eq("user_id", user.id)
    .returns<ImportableTransaction[]>();
  if (!transactions || transactions.length === 0) return { error: "No se encontraron los movimientos." };

  const { count } = await supabase
    .from("projection_lines")
    .select("id", { count: "exact", head: true })
    .eq("scenario_id", scenarioId)
    .eq("user_id", user.id);

  const newLines = transactions.map((transaction, index) => ({
    scenario_id: scenarioId,
    user_id: user.id,
    kind: transaction.type,
    label: transaction.description || transaction.categories?.name || "Movimiento",
    amount: transaction.amount,
    expected_date: transaction.occurred_on,
    category_id: transaction.category_id,
    source: "transaction",
    source_ref: transaction.id,
    sort_order: (count ?? 0) + index,
  }));

  const { error } = await supabase.from("projection_lines").insert(newLines);
  if (error) return { error: error.message };

  revalidatePath("/projection");
  return { added: newLines.length };
}

export async function deleteProjectionLine(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("projection_lines").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/projection");
}

export async function toggleProjectionLineIncluded(id: string, included: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("projection_lines").update({ included }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/projection");
}
