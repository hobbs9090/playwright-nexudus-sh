import { test as base, expect } from '@playwright/test'
import { NexudusApiClient } from '../../api/NexudusApiClient'
import { NexudusBackofficeApiClient, createBackofficeApiClientWithAPLogin } from '../support/backoffice-api'

type ApiFixtures = {
  nexudusApi: NexudusApiClient
  backofficeApi: NexudusBackofficeApiClient
  accessToken: string
}

export const test = base.extend<ApiFixtures>({
  nexudusApi: async ({ request }, use) => {
    await use(new NexudusApiClient(request))
  },
  backofficeApi: async ({ page }, use) => {
    const backofficeApi = await createBackofficeApiClientWithAPLogin(page)

    try {
      await use(backofficeApi)
    } finally {
      await backofficeApi.dispose()
    }
  },
  accessToken: async ({ nexudusApi }, use) => {
    const token = await nexudusApi.createBearerToken()
    await use(token.access_token)
  },
})

export { expect }
