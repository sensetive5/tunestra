import type { Agent } from '../constants/agents.ts';
import type { Output, OutputFile, SettingsMerge, SetupPlan } from './output.ts';
import type { Resolution } from './resolution.ts';

export type AgentPlanContext = {
  resolution: Resolution;
  /** Rule files in `.agents/rules`, already rendered; an agent can copy them. */
  ruleFiles: ReadonlyArray<OutputFile>;
};

export type LocalPlanContext = {
  /** Without the personal level: what the team commits. */
  shared: Resolution;
  /** With the personal level of the developer. */
  local: Resolution;
};

/** The files that tell the agent about the personal level; none of them is committed. */
export type LocalPlan = {
  outputs: ReadonlyArray<Output>;
  ignoredPaths: ReadonlyArray<string>;
  merges: ReadonlyArray<SettingsMerge>;
};

/** Turns the resolved setup into the native configuration of one agent. */
export type AgentAdapter = {
  agent: Agent;
  plan: (context: AgentPlanContext) => SetupPlan;
  planLocal: (context: LocalPlanContext) => LocalPlan;
};
