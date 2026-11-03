import { getKiBreakdown } from "@/lib/chat/tools/get-ki-breakdown";
import { getPeriodSummary } from "@/lib/chat/tools/get-period-summary";
import { getBudgetStatus } from "@/lib/chat/tools/get-budget-status";
import { getFiftyThirtyTwenty } from "@/lib/chat/tools/get-fifty-thirty-twenty";
import { getDragonDetail } from "@/lib/chat/tools/get-dragon-detail";
import { simulateDebtPayoffTool } from "@/lib/chat/tools/simulate-debt-payoff";
import { getProjectionTool } from "@/lib/chat/tools/get-projection";
import { runCashflowSimulationTool } from "@/lib/chat/tools/run-cashflow-simulation";
import { queryTransactionsTool } from "@/lib/chat/tools/query-transactions";
import { getLevelAndAchievementsTool } from "@/lib/chat/tools/get-level-and-achievements";
import type { ToolModule } from "@/lib/chat/tools/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- cada tool tiene su propio tipo de input; el dispatcher solo necesita poder invocarlas por nombre.
export const CHAT_TOOLS: ToolModule<any>[] = [
  getKiBreakdown,
  getPeriodSummary,
  getBudgetStatus,
  getFiftyThirtyTwenty,
  getDragonDetail,
  simulateDebtPayoffTool,
  getProjectionTool,
  runCashflowSimulationTool,
  queryTransactionsTool,
  getLevelAndAchievementsTool,
];

export const CHAT_TOOLS_BY_NAME = new Map(CHAT_TOOLS.map((tool) => [tool.definition.name, tool]));

export type { ToolContext, ToolModule } from "@/lib/chat/tools/types";
