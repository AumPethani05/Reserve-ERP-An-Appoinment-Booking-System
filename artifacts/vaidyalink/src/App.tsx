import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "sonner";
import { AuthProvider } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import VerifyOtpPage from "@/pages/VerifyOtpPage";
import BusinessesPage from "@/pages/BusinessesPage";
import BusinessDetailPage from "@/pages/BusinessDetailPage";
import ProvidersPage from "@/pages/ProvidersPage";
import ProviderDetailPage from "@/pages/ProviderDetailPage";
import BookingPage from "@/pages/BookingPage";
import BookingSuccessPage from "@/pages/BookingSuccessPage";
import AppointmentsPage from "@/pages/AppointmentsPage";
import DashboardLayout from "@/pages/dashboard/DashboardLayout";
import OverviewPage from "@/pages/dashboard/OverviewPage";
import DashAppointmentsPage from "@/pages/dashboard/DashAppointmentsPage";
import ServicesPage from "@/pages/dashboard/ServicesPage";
import ResourcesPage from "@/pages/dashboard/ResourcesPage";
import SchedulePage from "@/pages/dashboard/SchedulePage";
import InvoicesPage from "@/pages/dashboard/InvoicesPage";
import AdminPage from "@/pages/AdminPage";
import OnboardingPage from "@/pages/OnboardingPage";

function NotFound() {
  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
      <div>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontFamily: "Manrope, sans-serif", fontSize: 28, color: "var(--color-primary)", marginBottom: 8 }}>Page Not Found</h1>
        <p style={{ color: "var(--color-outline)", marginBottom: 24 }}>The page you're looking for doesn't exist.</p>
        <a href="/" style={{ background: "var(--color-primary)", color: "#fff", padding: "12px 24px", borderRadius: 8, textDecoration: "none", fontWeight: 700 }}>Go Home</a>
      </div>
    </div>
  );
}

function DashboardRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={OverviewPage} />
        <Route path="/dashboard/appointments" component={DashAppointmentsPage} />
        <Route path="/dashboard/services" component={ServicesPage} />
        <Route path="/dashboard/resources" component={ResourcesPage} />
        <Route path="/dashboard/schedule" component={SchedulePage} />
        <Route path="/dashboard/invoices" component={InvoicesPage} />
      </Switch>
    </DashboardLayout>
  );
}

function AppRoutes() {
  return (
    <>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/signup" component={SignupPage} />
        <Route path="/verify-otp" component={VerifyOtpPage} />
        <Route>
          <>
            <Navbar />
            <Switch>
              <Route path="/" component={HomePage} />
              {/* New universal routes */}
              <Route path="/businesses" component={BusinessesPage} />
              <Route path="/businesses/:id/book" component={BookingPage} />
              <Route path="/businesses/:id" component={BusinessDetailPage} />
              {/* Legacy healthcare routes kept for backward compat */}
              <Route path="/providers" component={ProvidersPage} />
              <Route path="/providers/:id/book" component={BookingPage} />
              <Route path="/providers/:id" component={ProviderDetailPage} />
              {/* Booking success */}
              <Route path="/booking/success" component={BookingSuccessPage} />
              {/* Patient routes */}
              <Route path="/appointments" component={AppointmentsPage} />
              {/* Business onboarding */}
              <Route path="/onboarding" component={OnboardingPage} />
              {/* Business/Provider dashboard */}
              <Route path="/dashboard" component={DashboardRouter} />
              <Route path="/dashboard/:rest*" component={DashboardRouter} />
              {/* Admin */}
              <Route path="/admin" component={AdminPage} />
              <Route component={NotFound} />
            </Switch>
          </>
        </Route>
      </Switch>
      <Toaster richColors position="top-right" />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AppRoutes />
      </WouterRouter>
    </AuthProvider>
  );
}

export default App;
