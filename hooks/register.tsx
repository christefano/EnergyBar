import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

const model = atom({ plugin: 'energybar', key: 'model' } as const, '')
const effort = atom({ plugin: 'energybar', key: 'effort' } as const, '')

type Figures = {
  context: number | null
  tokens: number | null
  limits: { kind: string; percentUsed: number; resetsAt: string | null }[]
  now: number
}
const tick = atom({ plugin: 'energybar', key: 'tick' } as const, 0)
const figures = atom({ plugin: 'energybar', key: 'figures' } as const, null as Figures | null)

type Reading = {
  context: { percent?: number | null; tokens?: number | null }
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
}
async function measure($: any, u: Reading): Promise<Figures> {
  return {
    context: u.context.percent ?? null,
    tokens: u.context.tokens ?? null,
    limits: u.rateLimits.map((r) => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt ?? null })),
    now: await $.clock.now(),
  }
}

function until(resetsAt: string | null, now: number, long: boolean): string {
  if (resetsAt === null) return ''
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms) || ms <= 0) return ''
  const mins = Math.floor(ms / 60_000)
  const d = Math.floor(mins / 1440)
  const h = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  return long ? ` (${d}d ${h}h)` : ` (${Math.floor(mins / 60)}h ${m}m)`
}

function usageLine(f: Figures): string {
  const parts: string[] = ['Context: ' +(f.context === null ? '--' : `${f.context}%`) + (f.tokens === null ? '' : ` (${Math.round(f.tokens / 1000)}k)`)]
  for (const l of f.limits) {
    if (l.kind === 'five_hour') parts.push(`5h: ${l.percentUsed}%${until(l.resetsAt, f.now, false)}`)
    else if (l.kind === 'seven_day') parts.push(`7d: ${l.percentUsed}%${until(l.resetsAt, f.now, true)}`)
  }
  return parts.join(' · ')
}

const MODELS = [
  { key: 'H', alias: 'haiku' },
  { key: 'S', alias: 'sonnet' },
  { key: 'O', alias: 'opus' },
  { key: 'F', alias: 'fable' },
] as const
const EFFORTS = [
  { key: 'L', level: 'low' },
  { key: 'M', level: 'medium' },
  { key: 'H', level: 'high' },
] as const

let lastModel = ''
let startError = ''

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    const refresh = async () => {
      try { lastModel = String(await $.session.model()).toLowerCase() } catch (err) { startError = String(err) }
      try {
        const f = await measure($, await $.session.usage())
        await update($, figures, () => f)
      } catch (err) {
        startError = String(err)
      }
      try { $.ui.invalidate('ui.render') } catch { /* no redraw */ }
    }
    void refresh()
    let n = 0
    try {
      $.clock.every(2_000, async () => {
        if (n < 15) { n++; await refresh() }
      })
      $.clock.every(60_000, async () => {
        const now = await $.clock.now()
        await update($, figures, (f) => (f === null ? f : { ...f, now }))
      })
    } catch (err) {
      startError += ' ' + String(err)
    }
    return next(e)
  })

  on('session.attach', async ($, e, next) => {
    try {
      const f = await measure($, await $.session.usage())
      await update($, figures, () => f)
    } catch (err) {
      startError = String(err)
    }
    try { $.ui.invalidate('ui.render') } catch { /* no redraw */ }
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (typeof e.effort === 'string') await update($, effort, () => e.effort as string)
    if (typeof e.model === 'string') {
      lastModel = e.model.toLowerCase()
      const alias = MODELS.find((m) => lastModel.includes(m.alias))
      if (alias) await update($, model, () => alias.alias)
    }
    return yield* next(e)
  })

  on('session.measure', async ($, e, next) => {
    const m = await measure($, e)
    await update($, figures, () => m)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    try {
    const { Box, Button, Text } = $.ui.resolve(e)
        const current = lastModel
    const chosenModel = await read($, model)
    const chosenEffort = await read($, effort)
    await read($, tick)
    const f = await read($, figures)

    return (
      <Box justifyContent="space-between" flexWrap="wrap" columnGap={1}>
        <Box columnGap={1} alignItems="center">
          <Text size="heading">🍫</Text>
          <Text dimColor size="caption">{f === null ? startError : usageLine(f)}</Text>
        </Box>
        <Box flexWrap="wrap" columnGap={1}>
        <Text dimColor size="caption">Model:</Text>
        {MODELS.map((m) => {
          const isOn = chosenModel ? chosenModel === m.alias : current.includes(m.alias)
          return (
            <Button
              key={`m-${m.alias}`}
              label={m.key}
              variant={isOn ? 'primary' : 'secondary'}
              onPress={async () => {
                await update($, model, () => m.alias)
                await $.command.run({ command: 'model', args: m.alias })
              }}
            />
          )
        })}
        <Text dimColor size="caption">Effort:</Text>
        {EFFORTS.map((p) => (
          <Button
            key={`p-${p.level}`}
            label={p.key}
            variant={chosenEffort === p.level ? 'primary' : 'secondary'}
            onPress={async () => {
              await update($, effort, () => p.level)
              await $.command.run({ command: 'effort', args: p.level })
            }}
          />
        ))}
        </Box>
      </Box>
    )
    } catch (err) {
      const { Text } = $.ui.resolve(e)
      return <Text dimColor>energybar: {String(err)} {startError}</Text>
    }
  })
}
