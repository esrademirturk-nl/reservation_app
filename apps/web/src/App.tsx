import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Placeholder } from './pages/Placeholder'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="trips" element={<Placeholder title="My trips" design="5a" />} />
          <Route path="trips/:tripId" element={<Placeholder title="Trip detail · Overview" design="3a" />} />
          <Route path="trips/:tripId/plan" element={<Placeholder title="Trip detail · Day plan" design="3c" />} />
          <Route path="trips/:tripId/bookings" element={<Placeholder title="Trip detail · Bookings" design="3f" />} />
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
