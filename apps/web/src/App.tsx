import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Placeholder } from './pages/Placeholder'
import { TripDetail } from './pages/trip/TripDetail'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="trips" element={<Placeholder title="My trips" design="5a" />} />
          <Route path="trips/:tripId" element={<TripDetail tab="overview" />} />
          <Route path="trips/:tripId/plan" element={<TripDetail tab="plan" />} />
          <Route path="trips/:tripId/bookings" element={<TripDetail tab="bookings" />} />
          <Route path="trips/:tripId/book" element={<Placeholder title="Travel book" design="3h" />} />
          <Route path="trips/:tripId/book/order" element={<Placeholder title="Order printed book" design="7a" />} />
          <Route path="places/:placeId" element={<Placeholder title="Place detail & audio guide" design="4a" />} />
          <Route path="wallet" element={<Placeholder title="Wallet" design="1w / 1t" />} />
          <Route path="suggestions" element={<Placeholder title="Suggestions" design="6a" />} />
          <Route path="*" element={<Placeholder title="Not found" design="—" />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
