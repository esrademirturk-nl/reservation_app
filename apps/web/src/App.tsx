import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Placeholder } from './pages/Placeholder'
import { TripDetail } from './pages/trip/TripDetail'
import { OrderBook } from './pages/trip/OrderBook'
import { MyTrips } from './pages/MyTrips'
import { Wallet } from './pages/Wallet'
import { Suggestions } from './pages/Suggestions'
import { PlaceDetail } from './pages/PlaceDetail'
import { AudioProvider } from './lib/audio'

export default function App() {
  return (
    <AudioProvider>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="trips" element={<MyTrips />} />
          <Route path="trips/:tripId" element={<TripDetail tab="overview" />} />
          <Route path="trips/:tripId/plan" element={<TripDetail tab="plan" />} />
          <Route path="trips/:tripId/bookings" element={<TripDetail tab="bookings" />} />
          <Route path="trips/:tripId/documents" element={<TripDetail tab="documents" />} />
          <Route path="trips/:tripId/book" element={<TripDetail tab="book" />} />
          <Route path="trips/:tripId/book/order" element={<OrderBook />} />
          <Route path="places/:placeId" element={<PlaceDetail />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="suggestions" element={<Suggestions />} />
          <Route path="*" element={<Placeholder title="Not found" design="—" />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AudioProvider>
  )
}
