import { describe, expect, it } from "vitest";
import { checkAndIncrementDailyUsage } from "@/lib/chat/usage-limit";
import { makeFakeSupabase } from "@/lib/chat/__tests__/supabase-mock";

const USER_ID = "user-1";
const TODAY = new Date("2026-11-02T10:00:00");

describe("checkAndIncrementDailyUsage", () => {
  it("permite el primer mensaje del día cuando no hay fila todavía", async () => {
    const supabase = makeFakeSupabase({ chat_usage_daily: [] });
    const result = await checkAndIncrementDailyUsage(supabase as never, USER_ID, 3, TODAY);
    expect(result).toEqual({ allowed: true, count: 1 });
  });

  it("permite hasta el límite exacto", async () => {
    const supabase = makeFakeSupabase({
      chat_usage_daily: [{ user_id: USER_ID, day: "2026-11-02", message_count: 2 }],
    });
    const result = await checkAndIncrementDailyUsage(supabase as never, USER_ID, 3, TODAY);
    expect(result).toEqual({ allowed: true, count: 3 });
  });

  it("bloquea en límite+1", async () => {
    const supabase = makeFakeSupabase({
      chat_usage_daily: [{ user_id: USER_ID, day: "2026-11-02", message_count: 3 }],
    });
    const result = await checkAndIncrementDailyUsage(supabase as never, USER_ID, 3, TODAY);
    expect(result).toEqual({ allowed: false, count: 3 });
  });

  it("resetea en un día distinto", async () => {
    const supabase = makeFakeSupabase({
      chat_usage_daily: [{ user_id: USER_ID, day: "2026-11-01", message_count: 3 }],
    });
    const result = await checkAndIncrementDailyUsage(supabase as never, USER_ID, 3, TODAY);
    expect(result).toEqual({ allowed: true, count: 1 });
  });
});
