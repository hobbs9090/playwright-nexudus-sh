export type MPBookingDate = {
  businessTimeZone: string
  dateISO: string
  datePickerValue: string
  day: number
  month: number
  weekdayIndex: number
  weekdayName: string
  year: number
}

export type MPBookingLength = {
  durationLabel: string
  durationMinutes: number
}

export type MPBookingTime = {
  hour24: number
  meridiemLabel: string
  minute: number
  minutesSinceMidnight: number
}

export type MPBookingWindow = MPBookingDate &
  MPBookingLength & {
    endDateTimeLocal: string
    endDateTimeLocalWithSeconds: string
    endMinutesSinceMidnight: number
    endTimeLabel: string
    startDateTimeLocal: string
    startDateTimeLocalWithSeconds: string
    startMinutesSinceMidnight: number
    startTimeLabel: string
  }

export type MPBookingWindowUtcRange = {
  endUtcISOString: string
  startUtcISOString: string
}

export type MPRepeatPattern = {
  mode: 'none' | 'weekly' | 'workday'
  repeatUntilDateISO?: string
  repeatUntilDatePickerValue?: string
  uiOptionLabel: string
  usesRepeatUntil: boolean
}

export type MPAvailabilitySlot = {
  className: string
  endMinutesSinceMidnight: number
  startMinutesSinceMidnight: number
  status: 'available' | 'booked' | 'other'
  tooltipText: string
}

const minutesPerSlot = 30
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export function getNextFutureMpBookingWindow(businessTimeZone: string, now: Date = new Date()): MPBookingWindow {
  return getFutureMpBookingWindow(businessTimeZone, 0, now)
}

export function getFutureMpBookingWindow(
  businessTimeZone: string,
  dayOffset: number,
  now: Date = new Date(),
): MPBookingWindow {
  const nowInBusinessTime = getZonedDateTimeParts(now, businessTimeZone)
  const shouldUseNextDay =
    nowInBusinessTime.hour > 9 ||
    (nowInBusinessTime.hour === 9 &&
      (nowInBusinessTime.minute > 0 || nowInBusinessTime.second > 0 || nowInBusinessTime.millisecond > 0))
  const bookingDate = buildBookingDateFromParts({
    businessTimeZone,
    day: nowInBusinessTime.day + (shouldUseNextDay ? 1 : 0) + dayOffset,
    month: nowInBusinessTime.month,
    year: nowInBusinessTime.year,
  })

  return createMpBookingWindow({
    businessTimeZone,
    dateInput: bookingDate.dateISO,
    lengthInput: '2 hours',
    now,
    startTimeInput: '09:00',
  })
}

export function createMpBookingWindow({
  businessTimeZone,
  dateInput,
  lengthInput,
  now = new Date(),
  startTimeInput,
}: {
  businessTimeZone: string
  dateInput: string
  lengthInput: string
  now?: Date
  startTimeInput: string
}): MPBookingWindow {
  const bookingTime = parseMpBookingTime(startTimeInput)
  const bookingLength = parseMpBookingLength(lengthInput)
  const bookingDate = parseMpBookingDate(dateInput, businessTimeZone, {
    now,
    requestedStartMinutesSinceMidnight: bookingTime.minutesSinceMidnight,
  })
  const endMinutesSinceMidnight = bookingTime.minutesSinceMidnight + bookingLength.durationMinutes

  if (endMinutesSinceMidnight > 24 * 60) {
    throw new Error(`MP booking length "${lengthInput}" would run past midnight, which this helper does not support.`)
  }

  const endTime = formatMinutesSinceMidnight(endMinutesSinceMidnight)

  return {
    ...bookingDate,
    ...bookingLength,
    endDateTimeLocal: `${bookingDate.dateISO}T${formatTimeForLocalDateTime(endTime)}`,
    endDateTimeLocalWithSeconds: `${bookingDate.dateISO}T${formatTimeForLocalDateTime(endTime)}:00`,
    endMinutesSinceMidnight,
    endTimeLabel: `${endTime.meridiemLabel} (${bookingLength.durationLabel})`,
    startDateTimeLocal: `${bookingDate.dateISO}T${formatTimeForLocalDateTime(bookingTime)}`,
    startDateTimeLocalWithSeconds: `${bookingDate.dateISO}T${formatTimeForLocalDateTime(bookingTime)}:00`,
    startMinutesSinceMidnight: bookingTime.minutesSinceMidnight,
    startTimeLabel: bookingTime.meridiemLabel,
  }
}

export function parseMpBookingDate(
  input: string,
  businessTimeZone: string,
  options: {
    now?: Date
    requestedStartMinutesSinceMidnight?: number
  } = {},
): MPBookingDate {
  const now = options.now || new Date()
  const normalizedInput = input.trim()
  const exactDateMatch = normalizedInput.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  const isoDateMatch = normalizedInput.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  let bookingDate =
    exactDateMatch
      ? buildBookingDateFromParts({
          businessTimeZone,
          day: Number(exactDateMatch[1]),
          month: Number(exactDateMatch[2]),
          year: Number(exactDateMatch[3]),
        })
      : isoDateMatch
        ? buildBookingDateFromParts({
            businessTimeZone,
            day: Number(isoDateMatch[3]),
            month: Number(isoDateMatch[2]),
            year: Number(isoDateMatch[1]),
          })
      : parseRelativeMpBookingDate(normalizedInput, businessTimeZone, now)

  if (!exactDateMatch && normalizedInput.toLowerCase() === 'today' && options.requestedStartMinutesSinceMidnight !== undefined) {
    const nowInBusinessTime = getZonedDateTimeParts(now, businessTimeZone)
    const currentMinutesSinceMidnight = nowInBusinessTime.hour * 60 + nowInBusinessTime.minute

    if (currentMinutesSinceMidnight >= options.requestedStartMinutesSinceMidnight) {
      bookingDate = addDaysToBookingDate(bookingDate, 1)
    }
  }

  if ((exactDateMatch || isoDateMatch) && options.requestedStartMinutesSinceMidnight !== undefined) {
    const nowInBusinessTime = getZonedDateTimeParts(now, businessTimeZone)
    const currentDateISO = `${nowInBusinessTime.year}-${padNumber(nowInBusinessTime.month)}-${padNumber(nowInBusinessTime.day)}`

    if (bookingDate.dateISO < currentDateISO) {
      throw new Error(`The exact booking date "${input}" is in the past for business timezone ${businessTimeZone}.`)
    }

    if (bookingDate.dateISO === currentDateISO) {
      const currentMinutesSinceMidnight = nowInBusinessTime.hour * 60 + nowInBusinessTime.minute

      if (currentMinutesSinceMidnight >= options.requestedStartMinutesSinceMidnight) {
        throw new Error(`The exact booking date "${input}" at the requested start time is already in the past for ${businessTimeZone}.`)
      }
    }
  }

  return bookingDate
}

export function parseMpBookingTime(input: string): MPBookingTime {
  const normalizedInput = input.trim().toLowerCase()
  const meridiemMatch = normalizedInput.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/)

  if (meridiemMatch) {
    const hour12 = Number(meridiemMatch[1])
    const minute = Number(meridiemMatch[2] || '0')

    if (hour12 < 1 || hour12 > 12 || minute < 0 || minute > 59) {
      throw new Error(`Unsupported MP booking start time "${input}". Use values such as 09:00, 9am, or 2:30pm.`)
    }

    const isPm = meridiemMatch[3] === 'pm'
    const hour24 = hour12 % 12 + (isPm ? 12 : 0)

    return {
      hour24,
      meridiemLabel: formatMeridiemTime(hour24, minute),
      minute,
      minutesSinceMidnight: hour24 * 60 + minute,
    }
  }

  const twentyFourHourMatch = normalizedInput.match(/^(\d{1,2}):(\d{2})$/)

  if (!twentyFourHourMatch) {
    throw new Error(`Unsupported MP booking start time "${input}". Use values such as 09:00, 9am, or 2:30pm.`)
  }

  const hour24 = Number(twentyFourHourMatch[1])
  const minute = Number(twentyFourHourMatch[2])

  if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) {
    throw new Error(`Unsupported MP booking start time "${input}". Use values such as 09:00, 9am, or 2:30pm.`)
  }

  return {
    hour24,
    meridiemLabel: formatMeridiemTime(hour24, minute),
    minute,
    minutesSinceMidnight: hour24 * 60 + minute,
  }
}

export function parseMpBookingLength(input: string): MPBookingLength {
  const normalizedInput = input.trim().toLowerCase()
  const hoursMatch = normalizedInput.match(/^(\d+)\s*hour(?:s)?$/)

  if (hoursMatch) {
    const hours = Number(hoursMatch[1])

    if (hours <= 0) {
      throw new Error(`Unsupported MP booking length "${input}". Use values such as 30 minutes, 1 hour, 2 hours, or 90 minutes.`)
    }

    return {
      durationLabel: `${hours} hour${hours === 1 ? '' : 's'}`,
      durationMinutes: hours * 60,
    }
  }

  const minutesMatch = normalizedInput.match(/^(\d+)\s*minute(?:s)?$/)

  if (!minutesMatch) {
    throw new Error(`Unsupported MP booking length "${input}". Use values such as 30 minutes, 1 hour, 2 hours, or 90 minutes.`)
  }

  const durationMinutes = Number(minutesMatch[1])

  if (durationMinutes <= 0 || durationMinutes % minutesPerSlot !== 0) {
    throw new Error(`MP booking length "${input}" must be a positive multiple of ${minutesPerSlot} minutes.`)
  }

  return {
    durationLabel: `${durationMinutes} minutes`,
    durationMinutes,
  }
}

export function parseMpRepeatPattern(input: string, bookingDate: MPBookingDate): MPRepeatPattern {
  const normalizedInput = input.trim().toLowerCase()

  if (normalizedInput === 'does not repeat') {
    return {
      mode: 'none',
      uiOptionLabel: 'Does not repeat',
      usesRepeatUntil: false,
    }
  }

  if (normalizedInput === 'every workday') {
    if (bookingDate.weekdayIndex === 0 || bookingDate.weekdayIndex === 6) {
      throw new Error(`Repeat option "${input}" requires a weekday booking date, but ${bookingDate.dateISO} falls on ${bookingDate.weekdayName}.`)
    }

    const repeatUntilDate = addDaysToBookingDate(bookingDate, bookingDate.weekdayIndex === 5 ? 3 : 1)

    return {
      mode: 'workday',
      repeatUntilDateISO: repeatUntilDate.dateISO,
      repeatUntilDatePickerValue: repeatUntilDate.datePickerValue,
      uiOptionLabel: 'Every workday',
      usesRepeatUntil: true,
    }
  }

  const weeklyMatch = normalizedInput.match(/^every day on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/)

  if (!weeklyMatch) {
    throw new Error(
      `Unsupported MP repeat option "${input}". Use "Does not repeat", "Every workday", or "Every day on <weekday>".`,
    )
  }

  const weekdayName = capitalizeWord(weeklyMatch[1])
  const weekdayIndex = weekdayNames.indexOf(weekdayName as (typeof weekdayNames)[number])

  if (bookingDate.weekdayIndex !== weekdayIndex) {
    throw new Error(
      `Repeat option "${input}" requires the booking date to fall on ${weekdayName}, but ${bookingDate.dateISO} is ${bookingDate.weekdayName}.`,
    )
  }

  const repeatUntilDate = addDaysToBookingDate(bookingDate, 7)

  return {
    mode: 'weekly',
    repeatUntilDateISO: repeatUntilDate.dateISO,
    repeatUntilDatePickerValue: repeatUntilDate.datePickerValue,
    uiOptionLabel: `Every week on ${weekdayName}`,
    usesRepeatUntil: true,
  }
}

export function parseAlternativeBookingPreference(input: string) {
  const normalizedInput = input.trim().toLowerCase()

  if (['true', 'yes', 'y'].includes(normalizedInput)) {
    return true
  }

  if (['false', 'no', 'n'].includes(normalizedInput)) {
    return false
  }

  throw new Error(`Unsupported MP alternative flag "${input}". Use true/false or yes/no.`)
}

export function parseMpAvailabilitySlotTooltip(tooltipText: string) {
  const normalizedTooltip = tooltipText.replace(/<br\/?>/gi, ' ').replace(/\s+/g, ' ').trim()
  const timeRangeMatch = normalizedTooltip.match(/^(.+?)\s*-\s*(.+?)\s/)

  if (!timeRangeMatch) {
    throw new Error(`Could not parse MP availability tooltip "${tooltipText}".`)
  }

  const { endMinutesSinceMidnight, startMinutesSinceMidnight } = parseAvailabilityTimeRange(timeRangeMatch[1], timeRangeMatch[2])

  return {
    endMinutesSinceMidnight,
    startMinutesSinceMidnight,
    tooltipText: normalizedTooltip,
  }
}

export function findNearestAvailableMpSlot(
  slots: MPAvailabilitySlot[],
  targetStartMinutesSinceMidnight: number,
  durationMinutes: number,
) {
  const requiredSlots = durationMinutes / minutesPerSlot

  if (!Number.isInteger(requiredSlots) || requiredSlots <= 0) {
    throw new Error(`MP availability slot search requires a duration in ${minutesPerSlot}-minute increments.`)
  }

  const candidateSlots = slots.filter((slot) => slot.status === 'available').sort(sortAvailabilitySlotsByStartTime)
  const candidateStartTimes: number[] = []

  for (const slot of candidateSlots) {
    const matchingSequence = Array.from({ length: requiredSlots }, (_, index) =>
      candidateSlots.find((candidateSlot) => candidateSlot.startMinutesSinceMidnight === slot.startMinutesSinceMidnight + index * minutesPerSlot),
    )

    if (matchingSequence.every(Boolean)) {
      candidateStartTimes.push(slot.startMinutesSinceMidnight)
    }
  }

  if (candidateStartTimes.length === 0) {
    return null
  }

  return candidateStartTimes.sort((leftStartTime, rightStartTime) => {
    const leftDistance = Math.abs(leftStartTime - targetStartMinutesSinceMidnight)
    const rightDistance = Math.abs(rightStartTime - targetStartMinutesSinceMidnight)

    if (leftDistance !== rightDistance) {
      return leftDistance - rightDistance
    }

    return leftStartTime - rightStartTime
  })[0]
}

export function formatMinutesSinceMidnight(minutesSinceMidnight: number): MPBookingTime {
  const hour24 = Math.floor(minutesSinceMidnight / 60)
  const minute = minutesSinceMidnight % 60

  return {
    hour24,
    meridiemLabel: formatMeridiemTime(hour24, minute),
    minute,
    minutesSinceMidnight,
  }
}

export function getUtcIsoRangeForMpBookingWindow(bookingWindow: MPBookingWindow): MPBookingWindowUtcRange {
  const startUtcDate = getUtcDateForBusinessLocalDateTime({
    businessTimeZone: bookingWindow.businessTimeZone,
    dateISO: bookingWindow.dateISO,
    hour24: Math.floor(bookingWindow.startMinutesSinceMidnight / 60),
    minute: bookingWindow.startMinutesSinceMidnight % 60,
  })
  const endUtcDate = getUtcDateForBusinessLocalDateTime({
    businessTimeZone: bookingWindow.businessTimeZone,
    dateISO: bookingWindow.dateISO,
    hour24: Math.floor(bookingWindow.endMinutesSinceMidnight / 60),
    minute: bookingWindow.endMinutesSinceMidnight % 60,
  })

  return {
    endUtcISOString: formatUtcDateAsIsoString(endUtcDate),
    startUtcISOString: formatUtcDateAsIsoString(startUtcDate),
  }
}

export function shiftMpBookingWindowByDays(bookingWindow: MPBookingWindow, dayOffset: number) {
  const shiftedBookingDate = addDaysToBookingDate(bookingWindow, dayOffset)

  return createMpBookingWindow({
    businessTimeZone: bookingWindow.businessTimeZone,
    dateInput: shiftedBookingDate.dateISO,
    lengthInput: bookingWindow.durationLabel,
    startTimeInput: bookingWindow.startTimeLabel,
  })
}

export function expandMpBookingWindowsForRepeatPattern(bookingWindow: MPBookingWindow, repeatPattern: MPRepeatPattern) {
  if (repeatPattern.mode === 'none') {
    return [bookingWindow]
  }

  const bookingWindows = [bookingWindow]
  let nextBookingWindow = bookingWindow

  while (true) {
    nextBookingWindow = shiftMpBookingWindowByDays(nextBookingWindow, repeatPattern.mode === 'weekly' ? 7 : 1)

    if (nextBookingWindow.dateISO > (repeatPattern.repeatUntilDateISO || '')) {
      break
    }

    if (repeatPattern.mode === 'workday' && (nextBookingWindow.weekdayIndex === 0 || nextBookingWindow.weekdayIndex === 6)) {
      continue
    }

    bookingWindows.push(nextBookingWindow)
  }

  return bookingWindows
}

export function expandMpUtilityCandidateBookingWindows({
  allowAlternative,
  alternativeFutureDaySearchWindow = 7,
  alternativeSameDaySlotRadius = 4,
  bookingWindow,
  repeatPattern,
}: {
  allowAlternative: boolean
  alternativeFutureDaySearchWindow?: number
  alternativeSameDaySlotRadius?: number
  bookingWindow: MPBookingWindow
  repeatPattern: MPRepeatPattern
}) {
  const exactBookingWindows = expandMpBookingWindowsForRepeatPattern(bookingWindow, repeatPattern)
  const candidateBookingWindows = [...exactBookingWindows]

  if (allowAlternative && repeatPattern.mode === 'none') {
    for (let slotOffset = -alternativeSameDaySlotRadius; slotOffset <= alternativeSameDaySlotRadius; slotOffset += 1) {
      if (slotOffset === 0) {
        continue
      }

      const alternativeStartMinutesSinceMidnight = bookingWindow.startMinutesSinceMidnight + slotOffset * minutesPerSlot
      const alternativeEndMinutesSinceMidnight = alternativeStartMinutesSinceMidnight + bookingWindow.durationMinutes

      if (alternativeStartMinutesSinceMidnight < 0 || alternativeEndMinutesSinceMidnight > 24 * 60) {
        continue
      }

      candidateBookingWindows.push(
        createMpBookingWindow({
          businessTimeZone: bookingWindow.businessTimeZone,
          dateInput: bookingWindow.dateISO,
          lengthInput: bookingWindow.durationLabel,
          startTimeInput: formatMinutesSinceMidnight(alternativeStartMinutesSinceMidnight).meridiemLabel,
        }),
      )
    }

    for (let dayOffset = 1; dayOffset <= alternativeFutureDaySearchWindow; dayOffset += 1) {
      candidateBookingWindows.push(shiftMpBookingWindowByDays(bookingWindow, dayOffset))
    }
  }

  return Array.from(
    new Map(
      candidateBookingWindows.map((candidateBookingWindow) => [
        `${candidateBookingWindow.dateISO}|${candidateBookingWindow.startMinutesSinceMidnight}|${candidateBookingWindow.durationMinutes}`,
        candidateBookingWindow,
      ]),
    ).values(),
  ).sort((leftBookingWindow, rightBookingWindow) => {
    if (leftBookingWindow.dateISO !== rightBookingWindow.dateISO) {
      return leftBookingWindow.dateISO.localeCompare(rightBookingWindow.dateISO)
    }

    return leftBookingWindow.startMinutesSinceMidnight - rightBookingWindow.startMinutesSinceMidnight
  })
}

function parseRelativeMpBookingDate(input: string, businessTimeZone: string, now: Date): MPBookingDate {
  const normalizedInput = input.trim().toLowerCase()
  const nowInBusinessTime = getZonedDateTimeParts(now, businessTimeZone)
  const today = buildBookingDateFromParts({
    businessTimeZone,
    day: nowInBusinessTime.day,
    month: nowInBusinessTime.month,
    year: nowInBusinessTime.year,
  })

  if (normalizedInput === 'today') {
    return today
  }

  if (normalizedInput === 'tomorrow') {
    return addDaysToBookingDate(today, 1)
  }

  const nextWeekdayMatch = normalizedInput.match(/^next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/)

  if (!nextWeekdayMatch) {
    throw new Error(`Unsupported MP booking date "${input}". Use dd/mm/yyyy, today, tomorrow, or next <weekday>.`)
  }

  const targetWeekdayName = capitalizeWord(nextWeekdayMatch[1])
  const targetWeekdayIndex = weekdayNames.indexOf(targetWeekdayName as (typeof weekdayNames)[number])
  const dayOffset = ((targetWeekdayIndex - today.weekdayIndex + 7) % 7 || 7) as number

  return addDaysToBookingDate(today, dayOffset)
}

function buildBookingDateFromParts({
  businessTimeZone,
  day,
  month,
  year,
}: {
  businessTimeZone: string
  day: number
  month: number
  year: number
}): MPBookingDate {
  const bookingDate = new Date(Date.UTC(year, month - 1, day))
  const bookingYear = bookingDate.getUTCFullYear()
  const bookingMonth = bookingDate.getUTCMonth() + 1
  const bookingDay = bookingDate.getUTCDate()
  const weekdayIndex = bookingDate.getUTCDay()

  return {
    businessTimeZone,
    dateISO: `${bookingYear}-${padNumber(bookingMonth)}-${padNumber(bookingDay)}`,
    datePickerValue: `${padNumber(bookingMonth)}/${padNumber(bookingDay)}/${bookingYear}`,
    day: bookingDay,
    month: bookingMonth,
    weekdayIndex,
    weekdayName: weekdayNames[weekdayIndex],
    year: bookingYear,
  }
}

function addDaysToBookingDate(bookingDate: MPBookingDate, dayOffset: number) {
  return buildBookingDateFromParts({
    businessTimeZone: bookingDate.businessTimeZone,
    day: bookingDate.day + dayOffset,
    month: bookingDate.month,
    year: bookingDate.year,
  })
}

function parseMeridiemTimeToMinutes(input: string) {
  const normalizedInput = input.trim().toLowerCase()
  const match = normalizedInput.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)

  if (!match) {
    throw new Error(`Could not parse MP meridiem time "${input}".`)
  }

  const hour12 = Number(match[1])
  const minute = Number(match[2])
  const hour24 = hour12 % 12 + (match[3] === 'pm' ? 12 : 0)

  return hour24 * 60 + minute
}

function parseAvailabilityTimeRange(startInput: string, endInput: string) {
  const startTimeComponent = parseAvailabilityTimeComponent(startInput)
  const endTimeComponent = parseAvailabilityTimeComponent(endInput)
  const candidateTimeRanges: Array<{ durationMinutes: number; endMinutesSinceMidnight: number; startMinutesSinceMidnight: number }> = []

  for (const startMinutesSinceMidnight of expandAvailabilityTimeCandidates(startTimeComponent)) {
    for (const endMinutesSinceMidnight of expandAvailabilityTimeCandidates(endTimeComponent)) {
      const sameDayDurationMinutes = endMinutesSinceMidnight - startMinutesSinceMidnight
      const normalizedEndMinutesSinceMidnight =
        sameDayDurationMinutes > 0 ? endMinutesSinceMidnight : endMinutesSinceMidnight + 24 * 60
      const durationMinutes = normalizedEndMinutesSinceMidnight - startMinutesSinceMidnight

      if (durationMinutes > 0 && durationMinutes <= 180) {
        candidateTimeRanges.push({
          durationMinutes,
          endMinutesSinceMidnight: normalizedEndMinutesSinceMidnight,
          startMinutesSinceMidnight,
        })
      }
    }
  }

  const bestCandidateTimeRange = candidateTimeRanges.sort((leftCandidate, rightCandidate) => {
    const leftDurationDistance = Math.abs(leftCandidate.durationMinutes - minutesPerSlot)
    const rightDurationDistance = Math.abs(rightCandidate.durationMinutes - minutesPerSlot)

    if (leftDurationDistance !== rightDurationDistance) {
      return leftDurationDistance - rightDurationDistance
    }

    return leftCandidate.startMinutesSinceMidnight - rightCandidate.startMinutesSinceMidnight
  })[0]

  if (!bestCandidateTimeRange) {
    throw new Error(`Could not infer an MP availability time range from "${startInput} - ${endInput}".`)
  }

  return bestCandidateTimeRange
}

function parseAvailabilityTimeComponent(input: string) {
  const normalizedInput = input.trim().toLowerCase()
  const meridiemMatch = normalizedInput.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/)

  if (meridiemMatch) {
    return {
      hour12: Number(meridiemMatch[1]),
      meridiem: meridiemMatch[3] as 'am' | 'pm',
      minute: Number(meridiemMatch[2]),
    }
  }

  const plainTimeMatch = normalizedInput.match(/^(\d{1,2}):(\d{2})$/)

  if (!plainTimeMatch) {
    throw new Error(`Could not parse MP availability time "${input}".`)
  }

  return {
    hour12: Number(plainTimeMatch[1]),
    meridiem: null,
    minute: Number(plainTimeMatch[2]),
  }
}

function expandAvailabilityTimeCandidates(timeComponent: { hour12: number; meridiem: 'am' | 'pm' | null; minute: number }) {
  const meridiemCandidates = timeComponent.meridiem ? [timeComponent.meridiem] : ['am', 'pm']

  return meridiemCandidates.map((meridiemCandidate) => {
    const hour24 = timeComponent.hour12 % 12 + (meridiemCandidate === 'pm' ? 12 : 0)

    return hour24 * 60 + timeComponent.minute
  })
}

function getZonedDateTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    year: 'numeric',
  })
  const parts = formatter.formatToParts(date)

  return {
    day: getNumericPart(parts, 'day'),
    hour: getNumericPart(parts, 'hour'),
    millisecond: date.getUTCMilliseconds(),
    minute: getNumericPart(parts, 'minute'),
    month: getNumericPart(parts, 'month'),
    second: getNumericPart(parts, 'second'),
    year: getNumericPart(parts, 'year'),
  }
}

function getUtcDateForBusinessLocalDateTime({
  businessTimeZone,
  dateISO,
  hour24,
  minute,
}: {
  businessTimeZone: string
  dateISO: string
  hour24: number
  minute: number
}) {
  const match = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    throw new Error(`Could not convert booking date "${dateISO}" to UTC because it is not in YYYY-MM-DD format.`)
  }

  const targetYear = Number(match[1])
  const targetMonth = Number(match[2])
  const targetDay = Number(match[3])
  const targetDateAsUtc = Date.UTC(targetYear, targetMonth - 1, targetDay, hour24, minute, 0, 0)
  let utcMilliseconds = targetDateAsUtc

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const zonedParts = getZonedDateTimeParts(new Date(utcMilliseconds), businessTimeZone)
    const zonedDateAsUtc = Date.UTC(
      zonedParts.year,
      zonedParts.month - 1,
      zonedParts.day,
      zonedParts.hour,
      zonedParts.minute,
      zonedParts.second,
      0,
    )
    const difference = targetDateAsUtc - zonedDateAsUtc

    if (difference === 0) {
      return new Date(utcMilliseconds)
    }

    utcMilliseconds += difference
  }

  return new Date(utcMilliseconds)
}

function getNumericPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const partValue = parts.find((part) => part.type === type)?.value || '0'

  return Number(partValue)
}

function formatMeridiemTime(hour24: number, minute: number) {
  const suffix = hour24 >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour24 % 12 || 12

  return `${normalizedHour}:${padNumber(minute)} ${suffix}`
}

function formatTimeForLocalDateTime(bookingTime: MPBookingTime) {
  return `${padNumber(bookingTime.hour24)}:${padNumber(bookingTime.minute)}`
}

function sortAvailabilitySlotsByStartTime(leftSlot: MPAvailabilitySlot, rightSlot: MPAvailabilitySlot) {
  return leftSlot.startMinutesSinceMidnight - rightSlot.startMinutesSinceMidnight
}

function capitalizeWord(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

function padNumber(value: number) {
  return value.toString().padStart(2, '0')
}

function formatUtcDateAsIsoString(date: Date) {
  return `${date.getUTCFullYear()}-${padNumber(date.getUTCMonth() + 1)}-${padNumber(date.getUTCDate())}T${padNumber(
    date.getUTCHours(),
  )}:${padNumber(date.getUTCMinutes())}:${padNumber(date.getUTCSeconds())}Z`
}
