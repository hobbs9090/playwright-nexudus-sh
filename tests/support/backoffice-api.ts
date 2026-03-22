import { APIRequestContext, APIResponse, expect, Page, request as playwrightRequest } from '@playwright/test'
import type {
  NexudusBusinessResponse,
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

export type NexudusBackofficeAuthResponse = {
  Businesses?: Array<number | string> | null
  DefaultBusinessId: number
  DefaultBusinessName?: string | null
  DefaultSimpleTimeZoneNameIana?: string | null
  Email?: string | null
  FullName?: string | null
  Id: number
  [key: string]: unknown
}

export type NexudusBackofficeResourceTypeResponse = {
  BusinessId: number
  Id: number
  Name: string
  [key: string]: unknown
}

export type NexudusBackofficeResourceResponse = {
  Allocation?: number | null
  AirConditioning?: boolean
  AllowMultipleBookings?: boolean
  Archived?: boolean
  BusinessId: number
  BusinessName?: string | null
  ConferencePhone?: boolean
  Description?: string | null
  DisplayOrder?: number | null
  FlipChart?: boolean
  GroupName?: string | null
  HideInCalendar?: boolean
  Id: number
  Internet?: boolean
  LargeDisplay?: boolean
  MaxBookingLength?: number | null
  MinBookingLength?: number | null
  Name: string
  NaturalLight?: boolean
  NoReturnPolicy?: number | null
  NoReturnPolicyAllResources?: boolean | null
  NoReturnPolicyAllUsers?: boolean | null
  OnlyForMembers?: boolean
  Projector?: boolean
  ResourceTypeId?: number | null
  ResourceTypeName?: string | null
  RequiresConfirmation?: boolean
  VideoConferencing?: boolean
  Visible?: boolean
  WhiteBoard?: boolean
  [key: string]: unknown
}

export type NexudusBackofficeResourceMutationInput = Omit<NexudusBackofficeResourceResponse, 'Id'> &
  Partial<Pick<NexudusBackofficeResourceResponse, 'Id'>> & {
    TypeName?: 'resource'
  }

export type NexudusBackofficeBookingResponse = {
  BookingNumber?: number | null
  BookingProducts?: unknown[]
  BookingVisitors?: unknown[]
  CoworkerCoworkerType?: string | null
  CoworkerFullName?: string | null
  CoworkerId: number
  FromTime: string
  Id: number
  Online?: boolean
  OverrideResourceLimits?: boolean
  RepeatBooking?: boolean
  RepeatEvery?: number | null
  RepeatOnFridays?: boolean
  RepeatOnMondays?: boolean
  RepeatOnSaturdays?: boolean
  RepeatOnSundays?: boolean
  RepeatOnThursdays?: boolean
  RepeatOnTuesdays?: boolean
  RepeatOnWednesdays?: boolean
  RepeatSeriesUniqueId?: string | null
  RepeatUntil?: string | null
  Repeats?: number | null
  ResourceAllocation?: number | null
  ResourceHideInCalendar?: boolean
  ResourceId: number
  ResourceName?: string | null
  ResourceNoReturnPolicy?: number | null
  ResourceNoReturnPolicyAllResources?: boolean | null
  ResourceNoReturnPolicyAllUsers?: boolean | null
  ResourceResourceTypeId?: number | null
  ResourceResourceTypeName?: string | null
  Tentative?: boolean
  ToTime: string
  TypeName?: string
  [key: string]: unknown
}

export type NexudusBackofficeBookingMutationInput = NexudusBackofficeBookingResponse & {
  TypeName: 'booking'
}

export type NexudusBackofficeBookingAvailabilityResponse = {
  available: boolean
  canBeIgnored?: boolean | null
  errorCode?: string | null
  message?: string | null
  [key: string]: unknown
}

const backofficeApiOrigin = 'https://spacesstaging.nexudus.com'
const backofficeAcceptHeader = 'application/json, text/plain, */*'
const businessSettingsPageSize = 500
const resourcePageSize = 500
const resourceTypePageSize = 500

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

  async getAuthenticatedUser() {
    const response = await this.request.get('/api/auth/me')

    await expectOk(response, 'fetch the authenticated AP user')

    return (await response.json()) as NexudusBackofficeAuthResponse
  }

  async getBusiness(businessId: number) {
    const response = await this.request.get(`/api/sys/businesses/${businessId}`)

    await expectOk(response, `fetch business ${businessId}`)

    return (await response.json()) as NexudusBusinessResponse
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

  async listResourceTypes(pageSize: number = resourceTypePageSize) {
    let page = 1
    const resourceTypes: NexudusBackofficeResourceTypeResponse[] = []

    while (true) {
      const response = await this.request.get('/api/spaces/resourcetypes', {
        params: {
          page: String(page),
          size: String(pageSize),
          orderBy: 'Name',
          dir: '0',
        },
      })

      await expectOk(response, `fetch resource types page ${page}`)

      const pagedResourceTypes = (await response.json()) as NexudusPagedResponse<NexudusBackofficeResourceTypeResponse>
      resourceTypes.push(...pagedResourceTypes.Records)

      if (!pagedResourceTypes.HasNextPage) {
        break
      }

      page += 1
    }

    return resourceTypes
  }

  async findResourceTypeByName(resourceTypeName: string, businessId: number) {
    const normalizedResourceTypeName = normalizeBackofficeName(resourceTypeName)
    const resourceTypes = await this.listResourceTypes()
    const matchingResourceType = resourceTypes.find(
      (resourceType) =>
        resourceType.BusinessId === businessId && normalizeBackofficeName(String(resourceType.Name || '')) === normalizedResourceTypeName,
    )

    if (!matchingResourceType) {
      throw new Error(`Could not find AP resource type "${resourceTypeName}" for business ${businessId}.`)
    }

    return matchingResourceType
  }

  async listResources(pageSize: number = resourcePageSize) {
    let page = 1
    const resources: NexudusBackofficeResourceResponse[] = []

    while (true) {
      const response = await this.request.get('/api/spaces/resources', {
        params: {
          page: String(page),
          size: String(pageSize),
          orderBy: 'Name',
          dir: '0',
        },
      })

      await expectOk(response, `fetch resources page ${page}`)

      const pagedResources = (await response.json()) as NexudusPagedResponse<NexudusBackofficeResourceResponse>
      resources.push(...pagedResources.Records)

      if (!pagedResources.HasNextPage) {
        break
      }

      page += 1
    }

    return resources
  }

  async findResourceByName(resourceName: string, businessId: number) {
    const normalizedResourceName = normalizeBackofficeName(resourceName)
    const resources = await this.listResources()
    const matchingResource = resources.find(
      (resource) => resource.BusinessId === businessId && normalizeBackofficeName(resource.Name) === normalizedResourceName,
    )

    if (!matchingResource) {
      throw new Error(`Could not find AP resource "${resourceName}" for business ${businessId}.`)
    }

    return matchingResource
  }

  async getResource(resourceId: number) {
    const response = await this.request.get(`/api/spaces/resources/${resourceId}`)

    await expectOk(response, `fetch resource ${resourceId}`)

    return (await response.json()) as NexudusBackofficeResourceResponse
  }

  async getResourceIfExists(resourceId: number) {
    const response = await this.request.get(`/api/spaces/resources/${resourceId}`)

    if (response.status() === 404) {
      return null
    }

    await expectOk(response, `fetch resource ${resourceId}`)

    return (await response.json()) as NexudusBackofficeResourceResponse
  }

  async createResource(resource: NexudusBackofficeResourceMutationInput) {
    const response = await this.request.post('/api/spaces/resources', {
      data: {
        TypeName: 'resource',
        ...resource,
      },
      headers: {
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `create resource "${resource.Name}"`)

    const createResponse = (await response.json()) as NexudusMutationResponse<NexudusBackofficeResourceResponse>
    expectSuccessfulMutation(createResponse, `create resource "${resource.Name}"`)
    expect(createResponse.Value, `Expected Nexudus to return the created resource for "${resource.Name}".`).toBeTruthy()

    return createResponse.Value as NexudusBackofficeResourceResponse
  }

  async deleteResource(resourceId: number) {
    const response = await this.request.delete(`/api/spaces/resources/${resourceId}`)

    await expectOk(response, `delete resource ${resourceId}`)

    const deleteResponse = (await response.json()) as NexudusMutationResponse
    expectSuccessfulMutation(deleteResponse, `delete resource ${resourceId}`)

    return deleteResponse
  }

  async getBooking(bookingId: number) {
    const response = await this.request.get(`/api/spaces/bookings/${bookingId}`)

    await expectOk(response, `fetch booking ${bookingId}`)

    return (await response.json()) as NexudusBackofficeBookingResponse
  }

  async getBookingIfExists(bookingId: number) {
    const response = await this.request.get(`/api/spaces/bookings/${bookingId}`)

    if (response.status() === 404) {
      return null
    }

    await expectOk(response, `fetch booking ${bookingId}`)

    return (await response.json()) as NexudusBackofficeBookingResponse
  }

  async listBookings({
    fromTime,
    pageSize = 5000,
    resourceId,
    toTime,
  }: {
    fromTime?: string
    pageSize?: number
    resourceId?: number
    toTime?: string
  } = {}) {
    let page = 1
    const bookings: NexudusBackofficeBookingResponse[] = []

    while (true) {
      const response = await this.request.get('/api/spaces/bookings', {
        params: {
          page: String(page),
          size: String(pageSize),
          orderBy: 'Id',
          dir: '1',
          ...(resourceId ? { booking_Resource: String(resourceId) } : {}),
          ...(fromTime ? { from_booking_FromTime: fromTime } : {}),
          ...(toTime ? { to_booking_FromTime: toTime } : {}),
        },
      })

      await expectOk(response, `fetch bookings page ${page}`)

      const pagedBookings = (await response.json()) as NexudusPagedResponse<NexudusBackofficeBookingResponse>
      bookings.push(...pagedBookings.Records)

      if (!pagedBookings.HasNextPage) {
        break
      }

      page += 1
    }

    return bookings
  }

  async checkBookingAvailability(booking: NexudusBackofficeBookingMutationInput) {
    const response = await this.request.post('/api/spaces/bookings/available', {
      data: booking,
      headers: {
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `check booking availability for "${booking.ResourceName || booking.ResourceId}"`)

    return (await response.json()) as NexudusBackofficeBookingAvailabilityResponse
  }

  async createBooking(booking: NexudusBackofficeBookingMutationInput) {
    const response = await this.request.post('/api/spaces/bookings', {
      data: booking,
      headers: {
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `create booking for "${booking.ResourceName || booking.ResourceId}"`)

    const createResponse = (await response.json()) as NexudusMutationResponse<NexudusBackofficeBookingResponse>
    expectSuccessfulMutation(createResponse, `create booking for "${booking.ResourceName || booking.ResourceId}"`)

    return createResponse
  }

  async cancelBookings(bookingIds: number[]) {
    expect(bookingIds.length, 'Expected at least one AP booking id before running the cancel-bookings command.').toBeGreaterThan(0)

    const response = await this.request.post('/api/spaces/bookings/runCommand', {
      data: {
        Ids: bookingIds,
        Key: 'CANCEL_BOOKING',
        Parameters: [
          {
            Name: 'Cancellation Reason',
            Type: 'eBookingCancellationReason',
            Value: 1,
          },
          {
            Name: 'Cancel without applying cancellation fee rules.',
            Type: 'Boolean',
            Value: 'True',
          },
        ],
      },
      headers: {
        'content-type': 'application/json',
      },
    })

    await expectOk(response, `cancel bookings ${bookingIds.join(', ')}`)

    const cancelResponse = (await response.json()) as NexudusMutationResponse
    expectSuccessfulMutation(cancelResponse, `cancel bookings ${bookingIds.join(', ')}`)

    return cancelResponse
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

function normalizeBackofficeName(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}
