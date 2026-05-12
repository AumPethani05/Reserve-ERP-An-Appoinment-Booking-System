import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth.js";
import providersRouter from "./providers.js";
import bookingsRouter from "./bookings.js";
import dashboardRouter from "./dashboard.js";
import servicesRouter from "./services.js";
import resourcesRouter from "./resources.js";
import scheduleRouter from "./schedule.js";
import onboardingRouter from "./onboarding.js";
import invoicesRouter from "./invoices.js";
import adminRouter from "./admin.js";
import paymentsRouter from "./payments.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/providers", providersRouter);
router.use("/bookings", bookingsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/services", servicesRouter);
router.use("/resources", resourcesRouter);
router.use("/schedule", scheduleRouter);
router.use("/onboarding", onboardingRouter);
router.use("/invoices", invoicesRouter);
router.use("/admin", adminRouter);
router.use("/payments", paymentsRouter);

export default router;
