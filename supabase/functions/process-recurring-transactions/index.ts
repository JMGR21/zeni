// Setup type definitions for built-in Supabase Runtime APIs
import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase, type SupabaseContext } from "@supabase/server";

/**
 * Copia intencional de `src/lib/recurring-schedule.ts`. Esta Edge Function
 * corre en Deno, no en el runtime de Next.js, así que no puede importar ese
 * archivo directamente — se reimplementa aquí manteniendo el mismo
 * comportamiento. Si cambias la lógica de fechas en un lado, cámbiala en
 * el otro también.
 */
type RecurringFrequency = "weekly" | "biweekly" | "monthly";

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function computeNextOccurrenceDate(
  frequency: RecurringFrequency,
  fromDate: Date,
  dayOfWeek?: number,
  dayOfMonth?: number,
): Date {
  if (frequency === "biweekly") {
    const next = new Date(fromDate);
    next.setDate(next.getDate() + 14);
    return next;
  }

  if (frequency === "weekly") {
    const target = dayOfWeek ?? fromDate.getDay();
    const next = new Date(fromDate);
    const diff = (target - next.getDay() + 7) % 7 || 7;
    next.setDate(next.getDate() + diff);
    return next;
  }

  // monthly
  const target = dayOfMonth ?? fromDate.getDate();
  const nextMonthYear = fromDate.getFullYear();
  const nextMonth = fromDate.getMonth() + 1;
  const day = Math.min(target, lastDayOfMonth(nextMonthYear, nextMonth));
  return new Date(nextMonthYear, nextMonth, day);
}

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type RecurringDefinition = {
  id: string;
  user_id: string;
  name: string;
  type: "income" | "expense";
  amount: number;
  category_id: string | null;
  frequency: RecurringFrequency;
  day_of_week: number | null;
  day_of_month: number | null;
  next_occurrence_date: string;
  auto_apply: boolean;
};

const MAX_ITERATIONS_PER_DEFINITION = 60;

async function getCurrentMonthBalance(supabaseAdmin: SupabaseContext["supabaseAdmin"], userId: string) {
  const now = new Date();
  const start = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const end = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 1));

  const { data } = await supabaseAdmin
    .from("transactions")
    .select("type, amount")
    .eq("user_id", userId)
    .gte("occurred_on", start)
    .lt("occurred_on", end)
    .returns<{ type: "income" | "expense"; amount: number }[]>();

  return (data ?? []).reduce(
    (balance, transaction) => balance + (transaction.type === "income" ? transaction.amount : -transaction.amount),
    0,
  );
}

async function processDefinition(
  supabaseAdmin: SupabaseContext["supabaseAdmin"],
  definition: RecurringDefinition,
  today: string,
  startingBalance: number,
) {
  let balance = startingBalance;
  let nextDate = new Date(`${definition.next_occurrence_date}T00:00:00`);
  let iterations = 0;

  while (toISODate(nextDate) <= today && iterations < MAX_ITERATIONS_PER_DEFINITION) {
    const scheduledDate = toISODate(nextDate);

    if (definition.auto_apply) {
      const wouldOverdraw = definition.type === "expense" && balance - definition.amount < 0;

      if (wouldOverdraw) {
        await supabaseAdmin.from("recurring_transaction_occurrences").insert({
          recurring_transaction_id: definition.id,
          user_id: definition.user_id,
          scheduled_date: scheduledDate,
          status: "insufficient_funds",
          resolved_at: new Date().toISOString(),
        });
      } else {
        const { data: transaction, error: transactionError } = await supabaseAdmin
          .from("transactions")
          .insert({
            user_id: definition.user_id,
            type: definition.type,
            amount: definition.amount,
            category_id: definition.category_id,
            description: definition.name,
            occurred_on: scheduledDate,
            recurring_transaction_id: definition.id,
          })
          .select("id")
          .single<{ id: string }>();

        if (transactionError || !transaction) {
          console.error(`No se pudo crear la transacción para ${definition.id} (${scheduledDate})`, transactionError);
        } else {
          await supabaseAdmin.from("recurring_transaction_occurrences").insert({
            recurring_transaction_id: definition.id,
            user_id: definition.user_id,
            scheduled_date: scheduledDate,
            status: "applied",
            transaction_id: transaction.id,
            resolved_at: new Date().toISOString(),
          });
          balance += definition.type === "income" ? definition.amount : -definition.amount;
        }
      }
    } else {
      await supabaseAdmin.from("recurring_transaction_occurrences").insert({
        recurring_transaction_id: definition.id,
        user_id: definition.user_id,
        scheduled_date: scheduledDate,
        status: "pending",
      });
    }

    nextDate = computeNextOccurrenceDate(
      definition.frequency,
      nextDate,
      definition.day_of_week ?? undefined,
      definition.day_of_month ?? undefined,
    );
    iterations += 1;
  }

  await supabaseAdmin
    .from("recurring_transactions")
    .update({ next_occurrence_date: toISODate(nextDate) })
    .eq("id", definition.id);

  return balance;
}

// Llamada exclusivamente por pg_cron/pg_net (ver migración de la
// programación) — nunca desde el cliente. `auth: 'secret'` exige la
// secret key en el header `apikey` y entrega `ctx.supabaseAdmin`, que
// pasa por alto RLS: necesario aquí porque esta función procesa las
// definiciones recurrentes de TODOS los usuarios, no las de uno solo.
export default {
  fetch: withSupabase({ auth: "secret" }, async (_req, ctx) => {
    const today = toISODate(new Date());

    const { data: dueDefinitions, error } = await ctx.supabaseAdmin
      .from("recurring_transactions")
      .select("id, user_id, name, type, amount, category_id, frequency, day_of_week, day_of_month, next_occurrence_date, auto_apply")
      .eq("active", true)
      .lte("next_occurrence_date", today)
      .returns<RecurringDefinition[]>();

    if (error) {
      console.error("No se pudieron leer las transacciones recurrentes vencidas", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    const definitionsByUser = new Map<string, RecurringDefinition[]>();
    for (const definition of dueDefinitions ?? []) {
      const list = definitionsByUser.get(definition.user_id) ?? [];
      list.push(definition);
      definitionsByUser.set(definition.user_id, list);
    }

    let processedCount = 0;
    for (const [userId, definitions] of definitionsByUser) {
      let balance = await getCurrentMonthBalance(ctx.supabaseAdmin, userId);
      for (const definition of definitions) {
        balance = await processDefinition(ctx.supabaseAdmin, definition, today, balance);
        processedCount += 1;
      }
    }

    return Response.json({ processed: processedCount });
  }),
};
