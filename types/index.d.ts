export type Choice = string
export type Figures = {
  context: number | null
  limits: { kind: string; percentUsed: number; resetsAt: string | null }[]
  now: number
}

declare module 'claude-code' {
  interface PluginState {
    'energybar': { model: Choice; effort: Choice; figures: Figures | null; tick: number }
  }
}
