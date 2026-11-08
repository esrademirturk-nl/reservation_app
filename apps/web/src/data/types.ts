export type BookingType = 'flight' | 'hotel' | 'train' | 'museum' | 'restaurant' | 'tour'

export interface Booking {
  id: string
  tripId: string
  type: BookingType
  title: string
  provider: string
  /** where the booking came from */
  source: 'Booking.com' | 'Email' | 'PDF' | 'Manual'
  start: string // ISO local datetime
  end?: string
  location: string
  ref: string
  price: number // EUR
  paid: boolean
  status: 'confirmed' | 'cancelled'
  freeCancellationUntil?: string // ISO date
  checkInOpens?: string // ISO date, flights
  guests?: number
  /** has a scannable pass (QR) right now */
  hasPass: boolean
  addedAt: string // ISO datetime
}

export interface Trip {
  id: string
  city: string
  country: string
  countryCode: string
  start: string // ISO date
  end: string // ISO date
  photo: string
  photoCredit: string
  lat: number
  lon: number
  travelers: number
  weatherC?: number
}

export interface Gap {
  tripId: string
  kind: 'stay' | 'transport'
  date: string // ISO date (the night that is uncovered)
  title: string
  detail: string
}

export interface Deadline {
  date: string
  title: string
  subtitle: string
  bookingId?: string
}
