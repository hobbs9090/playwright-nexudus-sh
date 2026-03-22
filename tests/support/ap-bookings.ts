import type {
  NexudusBackofficeApiClient,
  NexudusBackofficeBookingMutationInput,
  NexudusBackofficeBookingResponse,
  NexudusBackofficeResourceResponse,
} from './backoffice-api'
import { getUtcIsoRangeForMpBookingWindow, type MPBookingWindow } from './mp-bookings'

export function buildBackofficeBookingPayload({
  bookingWindow,
  coworkerId,
  coworkerName,
  resource,
}: {
  bookingWindow: MPBookingWindow
  coworkerId: number
  coworkerName: string
  resource: NexudusBackofficeResourceResponse
}): NexudusBackofficeBookingMutationInput {
  const { endUtcISOString, startUtcISOString } = getUtcIsoRangeForMpBookingWindow(bookingWindow)

  return {
    AvailableCredit: 0,
    BookingNumber: null,
    BookingProducts: [],
    BookingVisitors: [],
    CancelIfNotCheckedIn: false,
    CancelIfNotPaid: false,
    ChargeNow: false,
    ChargedExtraServices: null,
    CheckedInAt: null,
    CoworkerCheckedInAt: null,
    CoworkerCheckedOutAt: null,
    CoworkerCompanyName: null,
    CoworkerCoworkerType: 'Individual',
    CoworkerExtraServiceChargePeriod: null,
    CoworkerExtraServiceCurrencyCode: null,
    CoworkerExtraServiceIds: null,
    CoworkerExtraServicePrice: null,
    CoworkerExtraServiceTotalUses: null,
    CoworkerFullName: coworkerName,
    CoworkerId: coworkerId,
    CoworkerInvoiceCreditNote: false,
    CoworkerInvoiceDraft: false,
    CoworkerInvoiceId: null,
    CoworkerInvoiceNumber: null,
    CoworkerInvoicePaid: false,
    CoworkerInvoiceVoid: false,
    CoworkerLandLine: null,
    CoworkerMobilePhone: null,
    CustomFields: null,
    DisableConfirmation: false,
    DiscountAmount: null,
    DiscountCode: null,
    DoNotUseBookingCredit: false,
    DynamicPriceAdjustment: null,
    EstimatedCost: null,
    EstimatedCostWithProducts: null,
    EstimatedExtraService: null,
    EstimatedProductCost: null,
    EstimagedCost: null,
    ExtraServiceId: null,
    ExtraServiceName: null,
    FloorPlanDeskId: null,
    FloorPlanDeskName: null,
    FromTime: startUtcISOString,
    Id: 0,
    IncludeZoomInvite: false,
    InternalNotes: null,
    Invoice: null,
    InvoiceDate: null,
    InvoiceNow: false,
    InvoiceThisCoworker: false,
    Invoiced: false,
    IsEvent: false,
    IsNew: true,
    IsTour: false,
    LastMinutePriceAdjustment: null,
    LocalizationDetails: null,
    MaxOccupancy: null,
    MinutesToStart: 0,
    Notes: null,
    Online: true,
    OverridePrice: null,
    OverrideResourceLimits: true,
    PriceFactorDemand: null,
    PriceFactorLastMinute: null,
    PurchaseOrder: null,
    RepeatBooking: false,
    RepeatEvery: null,
    RepeatOnFridays: false,
    RepeatOnMondays: false,
    RepeatOnSaturdays: false,
    RepeatOnSundays: false,
    RepeatOnThursdays: false,
    RepeatOnTuesdays: false,
    RepeatOnWednesdays: false,
    RepeatSeriesUniqueId: null,
    RepeatUntil: null,
    Repeats: 2,
    ResourceAllocation: resource.Allocation ?? null,
    ResourceHideInCalendar: resource.HideInCalendar ?? false,
    ResourceId: resource.Id,
    ResourceName: resource.Name,
    ResourceNoReturnPolicy: resource.NoReturnPolicy ?? null,
    ResourceNoReturnPolicyAllResources: resource.NoReturnPolicyAllResources ?? null,
    ResourceNoReturnPolicyAllUsers: resource.NoReturnPolicyAllUsers ?? null,
    ResourceResourceTypeId: resource.ResourceTypeId ?? null,
    ResourceResourceTypeName: resource.ResourceTypeName ?? null,
    SkipGoogleCalendarUpdate: false,
    SystemId: null,
    TariffAtTheTimeOfBooking: null,
    TeamsAtTheTimeOfBooking: null,
    Tentative: false,
    ToStringText: '',
    ToTime: endUtcISOString,
    TypeName: 'booking',
    UniqueId: null,
    UpdatedBy: null,
    UpdatedOn: null,
    WhichBookingsToUpdate: 0,
  }
}

export async function findBackofficeBookingsMatchingWindows({
  backofficeApi,
  bookingWindows,
  coworkerId,
  resourceId,
}: {
  backofficeApi: NexudusBackofficeApiClient
  bookingWindows: MPBookingWindow[]
  coworkerId: number
  resourceId: number
}) {
  const matchingBookings = new Map<number, NexudusBackofficeBookingResponse>()

  for (const bookingWindow of bookingWindows) {
    const { endUtcISOString, startUtcISOString } = getUtcIsoRangeForMpBookingWindow(bookingWindow)
    const candidateBookings = await backofficeApi.listBookings({
      fromTime: startUtcISOString,
      resourceId,
      toTime: startUtcISOString,
    })

    for (const candidateBooking of candidateBookings) {
      if (
        candidateBooking.CoworkerId === coworkerId &&
        candidateBooking.ResourceId === resourceId &&
        candidateBooking.FromTime === startUtcISOString &&
        candidateBooking.ToTime === endUtcISOString
      ) {
        matchingBookings.set(candidateBooking.Id, candidateBooking)
      }
    }
  }

  return Array.from(matchingBookings.values()).sort((leftBooking, rightBooking) => leftBooking.FromTime.localeCompare(rightBooking.FromTime))
}
