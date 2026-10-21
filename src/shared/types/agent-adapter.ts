import type { Agent } from '../constants/agents.ts';
import type { OutputFile, SetupPlan } from './output.ts';
import type { Resolution } from './resolution.ts';

export type AgentPlanContext = {
  resolution: Resolution;
  /** Rule files in `.agents/rules`, already rendered; an agent can copy them. */
  ruleFiles: ReadonlyArray<OutputFile>;
};

/** Turns the resolved setup into the native configuration of one agent. */
export type AgentAdapter = {
  agent: Agent;
  plan: (context: AgentPlanContext) => SetupPlan;
};
