import { APIRequestContext, APIResponse, expect, Page, request as playwrightRequest } from '@playwright/test'
import type {
  NexudusBusinessSettingResponse,
  NexudusCourseLessonResponse,
  NexudusCourseMemberResponse,
  NexudusCourseResponse,
  NexudusCourseSectionResponse,
  NexudusCoworkerResponse,
  NexudusMutationResponse,
  NexudusPagedResponse,
} from '../../api/NexudusApiClient'
import { getConfiguredBaseURL } from '../../nexudus-config'
import { APLoginPage } from '../../page-objects/ap/APLoginPage'

type BackofficeBusinessSettingIdentifier = {
  businessId: number
  name: string
}

const backofficeApiOrigin = 'https://spacesstaging.nexudus.com'
const backofficeAcceptHeader = 'application/json, text/plain, */*'
const businessSettingsPageSize = 500

export class NexudusBackofficeApiClient {
  constructor(private readonly request: APIRequestContext) {}

  async dispose() {
    await this.request.dispose()
  }

  async getCourse(courseId: number) {
    const response = await this.request.get(`/api/content/courses/${courseId}`)

    await expectOk(response, `fetch course ${courseId}`)

    return (await response.json()) as NexudusCourseResponse
  }

  async updateCourse(course: NexudusCourseResponse) {
    const response = await this.request.put('/api/content/courses', {
      data: {
        ...course,
        TypeName: 'course',
      },
      headers: {
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `update course "${course.Title}"`)

    const updateResponse = (await response.json()) as NexudusMutationResponse<{ Id: number }>
    expectSuccessfulMutation(updateResponse, `update course "${course.Title}"`)

    return this.getCourse(course.Id)
  }

  async createCourseSection(
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
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `create course section "${courseSection.Title}"`)

    const createResponse = (await response.json()) as NexudusMutationResponse<NexudusCourseSectionResponse>
    expectSuccessfulMutation(createResponse, `create course section "${courseSection.Title}"`)

    return createResponse.Value as NexudusCourseSectionResponse
  }

  async createCourseLesson(
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
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `create course lesson "${courseLesson.Title}"`)

    const createResponse = (await response.json()) as NexudusMutationResponse<NexudusCourseLessonResponse>
    expectSuccessfulMutation(createResponse, `create course lesson "${courseLesson.Title}"`)

    return createResponse.Value as NexudusCourseLessonResponse
  }

  async createCourseMember(
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
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `create course member ${courseMember.CoworkerId}`)

    const createResponse = (await response.json()) as NexudusMutationResponse<NexudusCourseMemberResponse>
    expectSuccessfulMutation(createResponse, `create course member ${courseMember.CoworkerId}`)

    return createResponse.Value as NexudusCourseMemberResponse
  }

  async listCoworkers(pageSize: number = 5000) {
    const response = await this.request.get('/api/spaces/coworkers', {
      params: {
        page: '1',
        size: String(pageSize),
      },
    })

    await expectOk(response, 'fetch coworkers')

    const pagedCoworkers = (await response.json()) as NexudusPagedResponse<NexudusCoworkerResponse>
    return pagedCoworkers.Records
  }

  async getBusinessSetting(businessSetting: BackofficeBusinessSettingIdentifier) {
    let page = 1

    while (true) {
      const response = await this.request.get('/api/sys/businesssettings', {
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

  async getBusinessSettingById(businessSettingId: number) {
    const response = await this.request.get(`/api/sys/businesssettings/${businessSettingId}`)

    await expectOk(response, `fetch business setting ${businessSettingId}`)

    return (await response.json()) as NexudusBusinessSettingResponse
  }

  async updateBusinessSetting(
    businessSetting: Pick<NexudusBusinessSettingResponse, 'BusinessId' | 'Id' | 'Name' | 'Value'>,
  ) {
    await this.updateBusinessSettingMutation(businessSetting)

    return this.getBusinessSettingById(businessSetting.Id)
  }

  async updateBusinessSettingMutation(
    businessSetting: Pick<NexudusBusinessSettingResponse, 'BusinessId' | 'Id' | 'Name' | 'Value'>,
  ) {
    const response = await this.request.put('/api/sys/businesssettings', {
      data: {
        ...businessSetting,
      },
      headers: {
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `update business setting "${businessSetting.Name}"`)

    const updateResponse = (await response.json()) as NexudusMutationResponse
    expectSuccessfulMutation(updateResponse, `update business setting "${businessSetting.Name}"`)

    return updateResponse
  }
}

export async function createBackofficeApiClientFromAuthenticatedAP(page: Page) {
  const accessToken = await captureBackofficeAccessTokenFromAuthenticatedAP(page)
  const requestContext = await playwrightRequest.newContext({
    baseURL: backofficeApiOrigin,
    extraHTTPHeaders: {
      accept: backofficeAcceptHeader,
      authorization: `Bearer ${accessToken}`,
    },
  })

  return new NexudusBackofficeApiClient(requestContext)
}

export async function createBackofficeApiClientWithAPLogin(page: Page) {
  const loginPage = new APLoginPage(page)

  await loginPage.login(undefined, undefined, true, getConfiguredBaseURL('NEXUDUS_AP_BASE_URL'))

  return createBackofficeApiClientFromAuthenticatedAP(page)
}

async function captureBackofficeAccessTokenFromAuthenticatedAP(page: Page) {
  const tokenCaptureURL = new URL('/content/courses', getConfiguredBaseURL('NEXUDUS_AP_BASE_URL'))
  tokenCaptureURL.searchParams.set('playwright_backoffice_token', Date.now().toString())

  const apiRequestPromise = page.waitForRequest(
    (request) =>
      request.url().startsWith(`${backofficeApiOrigin}/api/`) &&
      /^Bearer\s+\S+/i.test(request.headers().authorization || ''),
    { timeout: 30000 },
  )

  await page.goto(tokenCaptureURL.toString())

  const apiRequest = await apiRequestPromise
  const authorizationHeader = apiRequest.headers().authorization || ''

  expect(
    authorizationHeader,
    'Expected authenticated AP navigation to issue a back-office API request with a bearer token.',
  ).toMatch(/^Bearer\s+\S+/i)

  return authorizationHeader.replace(/^Bearer\s+/i, '')
}

async function expectOk(response: APIResponse, actionDescription: string) {
  expect(response.ok(), `Expected Nexudus back-office API to ${actionDescription}.`).toBeTruthy()
}

function expectSuccessfulMutation(response: NexudusMutationResponse, actionDescription: string) {
  expect(response.WasSuccessful, `Expected Nexudus back-office API to ${actionDescription} successfully.`).toBeTruthy()
}
