# VaidyaLink: Technical Documentation & Architecture

VaidyaLink is a comprehensive appointment booking and resource management platform designed for businesses (Providers) and customers (Patients). It supports multiple resource types (turfs, chairs, rooms) and automated payment/invoicing workflows.

---

## 1. Project Architecture (Monorepo)

The project is structured as a **PNPM Workspace** monorepo, separating the frontend, backend, and shared libraries for scalability and modularity.

### **Core Locations:**
-   `artifacts/vaidyalink/`: The **Frontend** React application (Vite).
-   `artifacts/api-server/`: The **Backend** Express.js API.
-   `lib/db/`: Shared **Database Layer** (MySQL, Drizzle ORM, and Connection Pool).
-   `lib/integrations/`: Shared third-party logic (e.g., Razorpay, Email).

---

## 2. Backend Functionality (`artifacts/api-server`)

The backend is built with **Node.js, Express, and TypeScript**.

### **Core Routing (`src/routes/`):**
-   **`auth.ts`**: Handles User Registration, Login, and JWT Token management. Supports Role-Based Access Control (RBAC).
-   **`onboarding.ts`**: Manage the multi-step provider profile completion and admin approval status.
-   **`providers.ts`**: Public endpoints to list businesses, search by category, and view profile details.
-   **`bookings.ts`**: Core appointment engine. Handles creation, status updates (Confirm/Done/Cancel), and slot locking.
-   **`payments.ts`**: Integration with **Razorpay**. Handles order creation, signature verification, and automated invoicing.
-   **`schedule.ts`**: Advanced scheduling logic. Allows providers to define working days, hours, and active/inactive states.
-   **`dashboard.ts`**: Analytics and appointment management for providers.

### **Key Concepts:**
-   **Authentication**: Uses JWT (JSON Web Tokens) stored in HTTP-only cookies and local storage.
-   **Concurrency**: Uses SQL Transactions (`BEGIN`/`COMMIT`) to ensure that when a slot is booked, it is locked atomicaly to prevent double-booking.
-   **Invoicing**: Automatically generates an invoice for every booking and sends it via **Nodemailer** (Gmail) upon payment.

---

## 3. Frontend Functionality (`artifacts/vaidyalink`)

The frontend is a modern **React SPA** (Single Page Application).

### **Core Pages (`src/pages/`):**
-   **`BusinessesPage.tsx`**: High-performance listing of all available service providers with category filtering.
-   **`BusinessDetailPage.tsx`**: Interactive profile view. Features:
    -   **Resource Selection**: Choose between different turfs, rooms, or chairs.
    -   **Dynamic Slot Booking**: Real-time availability calendar.
    -   **Instant Checkout**: Custom confirmation modal that triggers automatic booking and invoicing.
-   **`dashboard/`**: A private area for providers to manage:
    -   **Overview**: Business analytics and today's schedule.
    -   **Resources**: Add/edit bookable assets (e.g., "Turf A", "Dental Chair 1").
    -   **Schedule**: Toggle working days and hours.
-   **`AppointmentsPage.tsx`**: Customer view for tracking upcoming and past bookings.

### **State & Hooks (`src/hooks/`):**
-   **`useAuth.tsx`**: Centralized authentication state. Manages user profile, role-based redirects (e.g., Providers go to `/dashboard`, Patients to `/businesses`), and logout.
-   **`lib/api.ts`**: A thin wrapper around `fetch` that automatically injects Authorization headers and handles global error reporting.

---

## 4. Core Workflows

### **A. Provider Onboarding**
1.  User signs up as a "Provider".
2.  Redirected to `OnboardingPage.tsx` to fill in business details (Name, Category, Location).
3.  Profile is saved as `is_approved: false`.
4.  Admin must approve via the `AdminPage.tsx` before the business appears in public listings.

### **B. Instant Booking Flow**
1.  Patient selects a Slot on `BusinessDetailPage.tsx`.
2.  Clicking "Confirm Booking" opens the custom **Contact Modal**.
3.  On "Continue", the frontend calls `/api/payments/test-checkout`.
4.  The backend:
    -   Locks the slot.
    -   Creates the appointment record.
    -   Generates an invoice.
    -   Sends a confirmation email to the patient.

### **C. Cancellation & Slot Recovery**
When a provider or patient cancels an appointment:
1.  The appointment status moves to `cancelled`.
2.  The associated `slot` is automatically set back to `available`.
3.  The invoice is marked as `cancelled`.
4.  This is handled in a single SQL transaction in `bookings.ts` to ensure data integrity.

---

## 5. Technology Stack Summary
-   **Frontend**: React, Vite, Wouter (Routing), Tailwind CSS (Styling), Sonner (Toasts).
-   **Backend**: Express.js, TypeScript, Pino (Logging).
-   **Database**: MySQL, Drizzle ORM (Schema management), `mysql2` (Connection pool).
-   **Integrations**: Razorpay (Payments), Nodemailer (Email notifications).
