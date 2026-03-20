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

export type NexudusCourseResponse = {
  Active: boolean
  BusinessId: number
  ClearImageFile?: boolean
  ClearLargeImageFile?: boolean
  DisplayOrder: number
  FullDescription: string | null
  GroupName: string | null
  HasCommunityGroup: boolean
  HostId: number | null
  Id: number
  ImageFileName?: string | null
  LargeImageFileName?: string | null
  NewImageUrl?: string | null
  NewLargeImageUrl?: string | null
  OverviewText: string | null
  ShowInHomePage: boolean
  ShowOverview: boolean
  SummaryText: string | null
  Title: string
  Visibility: number
  [key: string]: unknown
}

export type NexudusCourseSectionResponse = {
  Active: boolean
  ClearImageFile?: boolean
  CourseId: number
  DisplayOrder: number
  Id: number
  ImageFileName?: string | null
  NewImageUrl?: string | null
  SectionContents: string | null
  Title: string
  UnlockAfterDays: number
  UnlockType: number
  [key: string]: unknown
}

export type NexudusCourseLessonResponse = {
  Active: boolean
  ClearImageFile?: boolean
  CompletionType: number
  CourseId: number
  DisplayOrder: number
  Id: number
  ImageFileName?: string | null
  LessonContents: string | null
  NewImageUrl?: string | null
  SectionDisplayOrder?: number | null
  SectionId?: number | null
  SectionTitle?: string | null
  SummaryText: string | null
  Title: string
  UnlockAfterDays: number
  UnlockType: number
  [key: string]: unknown
}

export type NexudusCourseMemberResponse = {
  Approved: boolean
  Blocked: boolean
  CourseId: number
  CoworkerFullName?: string | null
  CoworkerId: number
  Id: number
  [key: string]: unknown
}

export type NexudusCoworkerResponse = {
  Email?: string | null
  FullName?: string | null
  Id: number
  [key: string]: unknown
}

type NexudusBusinessSettingIdentifier = {
  businessId: number
  name: string
}

type NexudusMutationResponse<TValue = unknown> = {
  Errors?: unknown
  Message?: string | null
  Status: number
  Value?: TValue
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

  async getCourse(accessToken: string, courseId: number) {
    const response = await this.request.get(`/api/content/courses/${courseId}`, {
      headers: getAuthorizationHeaders(accessToken),
    })

    await expectOk(response, `fetch course ${courseId}`)

    return (await response.json()) as NexudusCourseResponse
  }

  async updateCourse(accessToken: string, course: NexudusCourseResponse) {
    const response = await this.request.put('/api/content/courses', {
      data: {
        ...course,
        TypeName: 'course',
      },
      headers: {
        ...getAuthorizationHeaders(accessToken),
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `update course "${course.Title}"`)

    const updateResponse = (await response.json()) as NexudusMutationResponse<{ Id: number }>
    expectSuccessfulMutation(updateResponse, `update course "${course.Title}"`)

    return this.getCourse(accessToken, course.Id)
  }

  async createCourseSection(
    accessToken: string,
    courseSection: Pick<NexudusCourseSectionResponse, 'CourseId' | 'Title'> &
      Partial<Omit<NexudusCourseSectionResponse, 'CourseId' | 'Id' | 'Title'>>,
  ) {
    const response = await this.request.post('/api/content/coursesections', {
      data: {
        Id: 0,
        SectionContents: null,
        Active: true,
        DisplayOrder: 0,
        UnlockType: 1,
        UnlockAfterDays: 0,
        NewImageUrl: null,
        ImageFileName: null,
        ClearImageFile: false,
        TypeName: 'courseSection',
        ...courseSection,
      },
      headers: {
        ...getAuthorizationHeaders(accessToken),
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `create course section "${courseSection.Title}"`)

    const createResponse = (await response.json()) as NexudusMutationResponse<NexudusCourseSectionResponse>
    expectSuccessfulMutation(createResponse, `create course section "${courseSection.Title}"`)

    return createResponse.Value as NexudusCourseSectionResponse
  }

  async createCourseLesson(
    accessToken: string,
    courseLesson: Pick<NexudusCourseLessonResponse, 'CourseId' | 'Title'> &
      Partial<Omit<NexudusCourseLessonResponse, 'CourseId' | 'Id' | 'Title'>>,
  ) {
    const response = await this.request.post('/api/content/courselessons', {
      data: {
        SectionId: null,
        SectionDisplayOrder: null,
        SectionTitle: null,
        SummaryText: null,
        LessonContents: null,
        Active: true,
        DisplayOrder: 0,
        UnlockType: 1,
        UnlockAfterDays: 0,
        CompletionType: 2,
        NewImageUrl: null,
        ImageFileName: null,
        ClearImageFile: false,
        TypeName: 'courseLesson',
        ...courseLesson,
      },
      headers: {
        ...getAuthorizationHeaders(accessToken),
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `create course lesson "${courseLesson.Title}"`)

    const createResponse = (await response.json()) as NexudusMutationResponse<NexudusCourseLessonResponse>
    expectSuccessfulMutation(createResponse, `create course lesson "${courseLesson.Title}"`)

    return createResponse.Value as NexudusCourseLessonResponse
  }

  async createCourseMember(
    accessToken: string,
    courseMember: Pick<NexudusCourseMemberResponse, 'CourseId' | 'CoworkerId'> &
      Partial<Pick<NexudusCourseMemberResponse, 'Approved' | 'Blocked'>>,
  ) {
    const response = await this.request.post('/api/content/coursemembers', {
      data: {
        Approved: true,
        Blocked: false,
        ...courseMember,
      },
      headers: {
        ...getAuthorizationHeaders(accessToken),
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `create course member ${courseMember.CoworkerId}`)

    const createResponse = (await response.json()) as NexudusMutationResponse<NexudusCourseMemberResponse>
    expectSuccessfulMutation(createResponse, `create course member ${courseMember.CoworkerId}`)

    return createResponse.Value as NexudusCourseMemberResponse
  }

  async listCoworkers(accessToken: string, pageSize: number = 5000) {
    const response = await this.request.get('/api/spaces/coworkers', {
      headers: getAuthorizationHeaders(accessToken),
      params: {
        page: '1',
        size: String(pageSize),
      },
    })

    await expectOk(response, 'fetch coworkers')

    const pagedCoworkers = (await response.json()) as NexudusPagedResponse<NexudusCoworkerResponse>
    return pagedCoworkers.Records
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
    expectSuccessfulMutation(updateResponse, `update business setting "${businessSetting.Name}"`)

    return this.getBusinessSettingById(accessToken, businessSetting.Id)
  }
}

async function expectOk(response: APIResponse, actionDescription: string) {
  expect(response.ok(), `Expected Nexudus API to ${actionDescription}.`).toBeTruthy()
}

function expectSuccessfulMutation(response: NexudusMutationResponse, actionDescription: string) {
  expect(response.WasSuccessful, `Expected Nexudus API to ${actionDescription} successfully.`).toBeTruthy()
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
