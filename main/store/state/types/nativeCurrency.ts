import { z } from 'zod'

import { CurrencyRateSchema } from './rate'

export const NativeCurrencySchema = z.object({
  symbol: z.string(),
  icon: z.string().default(''),
  name: z.string(),
  decimals: z.number(),
  usd: CurrencyRateSchema
})

export type NativeCurrency = z.infer<typeof NativeCurrencySchema>
