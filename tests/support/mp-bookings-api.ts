import { APIRequestContext, expect } from '@playwright/test'

export type MPBookingCancellationResult = {
  contentType: string | null
  status: number
  text: string
  url: string
}

export async function cancelPortalBooking(
  request: APIRequestContext,
  accessToken: string,
  bookingId: number,
): Promise<MPBookingCancellationResult> {
  const response = await request.post(`/en/bookings/deletejson/${bookingId}`, {
    data: {
      cancellationReason: 'NoLongerNeeded',
      cancellationReasonDetails: null,
    },
    headers: {
      accept: 'application/json, text/plain, */*',
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-requested-with': 'XMLHttpRequest',
    },
  })

  const cancellationResult = {
    contentType: response.headers()['content-type'] || null,
    status: response.status(),
    text: await response.text(),
    url: response.url(),
  }

  expect(cancellationResult.status, `Expected MP booking cleanup for ${bookingId} to return HTTP 200.`).toBe(200)

  return cancellationResult
}
