import { test as base, expect } from '@playwright/test'
import { NexudusApiClient } from '../../api/NexudusApiClient'

type ApiFixtures = {
  nexudusApi: NexudusApiClient
  accessToken: string
}

export const test = base.extend<ApiFixtures>({
  nexudusApi: async ({ request }, use) => {
    await use(new NexudusApiClient(request))
  },
  accessToken: async ({ nexudusApi }, use) => {
    const token = await nexudusApi.createBearerToken()
    await use(token.access_token)
  },
})

export { expect }
