export type HarnessTool<TInput, TOutput> = {
  name: string
  description: string
  execute: (input: TInput) => Promise<TOutput>
}

const tools = new Map<string, HarnessTool<unknown, unknown>>()

export function registerTool<TInput, TOutput>(
  tool: HarnessTool<TInput, TOutput>,
): void {
  tools.set(tool.name, tool as HarnessTool<unknown, unknown>)
}

export function getTool(name: string): HarnessTool<unknown, unknown> {
  const tool = tools.get(name)
  if (!tool) {
    throw new Error(`Unknown harness tool: ${name}`)
  }
  return tool
}

export function listTools(): HarnessTool<unknown, unknown>[] {
  return Array.from(tools.values())
}
