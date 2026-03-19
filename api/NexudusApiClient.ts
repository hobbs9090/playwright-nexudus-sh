import { APIRequestContext, APIResponse, expect } from '@playwright/test'

type CredentialName = 'username' | 'password'

export type NexudusBearerTokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  token_type: string
}

export type NexudusCurrentUserResponse = {
  DefaultBusinessId?: number | string | null
  DefaultBusinessName?: string | null
  [key: string]: unknown
}

export type NexudusPagedResponse<TRecord> = {
  CurrentPage?: number
  CurrentPageSize?: number
  HasNextPage: boolean
  HasPreviousPage?: boolean
  PageNumber?: number
  PageSize?: number
  Records: TRecord[]
  TotalItems?: number
  TotalPages?: number
  [key: string]: unknown
}

export type NexudusBusinessSettingResponse = {
  BusinessId: number
  CreatedOn?: string | null
  CustomFields?: unknown
  Id: number
  IsNew?: boolean
  LocalizationDetails?: unknown
  Name: string
  SystemId?: string | null
  ToStringText?: string | null
  UniqueId?: string | null
  UpdatedBy?: string | null
  UpdatedOn?: string | null
  Value: string | null
  [key: string]: unknown
}

type NexudusBusinessSettingIdentifier = {
  businessId: number
  name: string
}

type NexudusMutationResponse = {
  Errors?: unknown
  Message?: string | null
  Status: number
  Value?: unknown
  WasSuccessful?: boolean
}

const businessSettingsPageSize = 500

export class NexudusApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async createBearerToken() {
    const response = await this.request.post('/api/token', {
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded',
      },
      form: {
        grant_type: 'password',
        username: getApiCredential('username'),
        password: getApiCredential('password'),
      },
    })

    await expectOk(response, 'create a Nexudus bearer token')

    const token = (await response.json()) as NexudusBearerTokenResponse
    expect(token.access_token?.trim(), 'Expected Nexudus to return an access token.').toBeTruthy()
    expect((token.token_type || '').toLowerCase(), 'Expected token_type to be bearer.').toBe('bearer')
    expect(token.expires_in, 'Expected Nexudus to return a positive token expiry.').toBeGreaterThan(0)

    return token
  }

  async getCurrentUser(accessToken: string) {
    const response = await this.request.get('/en/user/me', {
      headers: getAuthorizationHeaders(accessToken),
    })

    await expectOk(response, 'fetch the current Nexudus user')

    return (await response.json()) as NexudusCurrentUserResponse
  }

  async getBusinessSetting(accessToken: string, businessSetting: NexudusBusinessSettingIdentifier) {
    let page = 1

    while (true) {
      const response = await this.request.get('/api/sys/businesssettings', {
        headers: getAuthorizationHeaders(accessToken),
        params: {
          page: String(page),
          size: String(businessSettingsPageSize),
        },
      })

      await expectOk(response, `fetch Nexudus business settings page ${page}`)

      const pagedBusinessSettings = (await response.json()) as NexudusPagedResponse<NexudusBusinessSettingResponse>
      const matchingBusinessSetting = pagedBusinessSettings.Records.find(
        (record) => record.BusinessId === businessSetting.businessId && record.Name === businessSetting.name,
      )

      if (matchingBusinessSetting) {
        return matchingBusinessSetting
      }

      if (!pagedBusinessSettings.HasNextPage) {
        break
      }

      page += 1
    }

    throw new Error(
      `Could not find Nexudus business setting "${businessSetting.name}" for business ${businessSetting.businessId}.`,
    )
  }

  async getBusinessSettingById(accessToken: string, businessSettingId: number) {
    const response = await this.request.get(`/api/sys/businesssettings/${businessSettingId}`, {
      headers: getAuthorizationHeaders(accessToken),
    })

    await expectOk(response, `fetch Nexudus business setting ${businessSettingId}`)

    return (await response.json()) as NexudusBusinessSettingResponse
  }

  async updateBusinessSetting(
    accessToken: string,
    businessSetting: Pick<NexudusBusinessSettingResponse, 'BusinessId' | 'Id' | 'Name' | 'Value'>,
  ) {
    const response = await this.request.put('/api/sys/businesssettings', {
      data: businessSetting,
      headers: {
        ...getAuthorizationHeaders(accessToken),
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `update Nexudus business setting "${businessSetting.Name}"`)

    const updateResponse = (await response.json()) as NexudusMutationResponse
    expect(
      updateResponse.WasSuccessful,
      `Expected Nexudus to update business setting "${businessSetting.Name}" successfully.`,
    ).toBeTruthy()

    return this.getBusinessSettingById(accessToken, businessSetting.Id)
  }
}

async function expectOk(response: APIResponse, actionDescription: string) {
  expect(response.ok(), `Expected Nexudus API to ${actionDescription}.`).toBeTruthy()
}

function getApiCredential(name: CredentialName) {
  const envVarNames =
    name === 'username'
      ? ['NEXUDUS_API_USERNAME', 'NEXUDUS_MP_EMAIL', 'NEXUDUS_AP_EMAIL']
      : ['NEXUDUS_API_PASSWORD', 'NEXUDUS_MP_PASSWORD', 'NEXUDUS_AP_PASSWORD']

  for (const envVarName of envVarNames) {
    const value = process.env[envVarName]?.trim()

    if (value) {
      return value
    }
  }

  throw new Error(
    `Missing Nexudus API ${name}. Set ${envVarNames[0]} or make sure one of ${envVarNames.slice(1).join(', ')} is available.`,
  )
}

function getAuthorizationHeaders(accessToken: string) {
  return {
    accept: 'application/json',
    authorization: `Bearer ${accessToken}`,
  }
}
