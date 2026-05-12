import { Router, Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { pool } from '@workspace/db';
import { requireAuth } from '../lib/auth.js';

const router = Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  console.log('Razorpay Config Check:', { keyId: !!keyId, keySecret: !!keySecret });
  if (!keyId || !keySecret) throw new Error('Razorpay keys not configured');
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function getMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendInvoiceEmail(params: {
  to: string;
  userName: string;
  businessName: string;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  appointmentId: number;
  invoiceId: number;
  amount: number;
  tax: number;
  total: number;
  paymentId: string;
  city: string;
  address: string;
}) {
  try {
    const transporter = getMailTransporter();
    const formatCurrency = (n: number) =>
      '₹' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const paidDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booking Confirmed — VaidyaLink</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#003740,#00565e);padding:32px 36px;text-align:center">
        <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:0.5px">VaidyaLink</p>
        <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75)">Your Health & Wellness Booking Platform</p>
      </td></tr>

      <!-- Success banner -->
      <tr><td style="background:#ecfdf5;padding:24px 36px;text-align:center;border-bottom:1px solid #d1fae5">
        <div style="width:56px;height:56px;background:#16a34a;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;font-size:28px;line-height:56px">✓</div>
        <p style="margin:0;font-size:20px;font-weight:700;color:#15803d">Booking Confirmed!</p>
        <p style="margin:6px 0 0;font-size:14px;color:#166534">Payment received — your appointment is all set.</p>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:28px 36px 8px">
        <p style="margin:0;font-size:15px;color:#374151">Hi <strong>${params.userName}</strong>,</p>
        <p style="margin:10px 0 0;font-size:14px;color:#6b7280;line-height:1.7">
          Your appointment at <strong>${params.businessName}</strong> has been confirmed. Below are your booking details and payment receipt.
        </p>
      </td></tr>

      <!-- Booking Details Card -->
      <tr><td style="padding:16px 36px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
          <tr><td style="background:#003740;padding:12px 20px">
            <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase">Appointment Details</p>
          </td></tr>
          <tr><td style="padding:20px">
            <table width="100%" cellpadding="0" cellspacing="6">
              <tr>
                <td width="40%" style="font-size:13px;color:#6b7280;padding:5px 0">Business</td>
                <td style="font-size:13px;font-weight:600;color:#111827;padding:5px 0">${params.businessName}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Service</td>
                <td style="font-size:13px;font-weight:600;color:#111827;padding:5px 0">${params.serviceName}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Date</td>
                <td style="font-size:13px;font-weight:600;color:#111827;padding:5px 0">${new Date(params.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Time</td>
                <td style="font-size:13px;font-weight:600;color:#111827;padding:5px 0">${params.startTime} – ${params.endTime}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Location</td>
                <td style="font-size:13px;color:#374151;padding:5px 0">${params.address}${params.city ? ', ' + params.city : ''}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Appointment ID</td>
                <td style="font-size:13px;font-weight:600;color:#003740;padding:5px 0">#${params.appointmentId}</td>
              </tr>
            </table>
          </td></tr>
        </table>
      </td></tr>

      <!-- Invoice / Payment Receipt -->
      <tr><td style="padding:0 36px 16px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
          <tr><td style="background:#003740;padding:12px 20px">
            <p style="margin:0;font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase">Payment Receipt</p>
          </td></tr>
          <tr><td style="padding:20px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Invoice #</td>
                <td align="right" style="font-size:13px;color:#374151;padding:5px 0">INV-${String(params.invoiceId).padStart(6,'0')}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Payment ID</td>
                <td align="right" style="font-size:12px;color:#374151;font-family:monospace;padding:5px 0">${params.paymentId}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Payment Date</td>
                <td align="right" style="font-size:13px;color:#374151;padding:5px 0">${paidDate}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:5px 0">Payment Method</td>
                <td align="right" style="font-size:13px;color:#374151;padding:5px 0">Razorpay</td>
              </tr>
              <tr><td colspan="2" style="border-top:1px dashed #e2e8f0;padding-top:12px;padding-bottom:4px"></td></tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:4px 0">${params.serviceName}</td>
                <td align="right" style="font-size:13px;color:#374151;padding:4px 0">${formatCurrency(params.amount)}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#6b7280;padding:4px 0">GST (18%)</td>
                <td align="right" style="font-size:13px;color:#374151;padding:4px 0">${formatCurrency(params.tax)}</td>
              </tr>
              <tr><td colspan="2" style="border-top:2px solid #003740;margin-top:8px;padding-top:4px"></td></tr>
              <tr>
                <td style="font-size:15px;font-weight:700;color:#111827;padding:8px 0 0">Total Paid</td>
                <td align="right" style="font-size:18px;font-weight:800;color:#003740;padding:8px 0 0">${formatCurrency(params.total)}</td>
              </tr>
            </table>
            <div style="background:#ecfdf5;border-radius:8px;padding:10px 14px;margin-top:16px;display:flex;align-items:center;gap:8px">
              <span style="color:#16a34a;font-weight:700;font-size:13px">✓ Payment Successful</span>
            </div>
          </td></tr>
        </table>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:8px 36px 32px;text-align:center">
        <p style="margin:0 0 16px;font-size:13px;color:#6b7280">Need to reschedule or have a question? Contact the business directly or visit your appointments.</p>
        <a href="https://${process.env.APP_DOMAIN || 'localhost:3000'}/appointments" style="display:inline-block;background:#003740;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">View My Appointments</a>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 36px;text-align:center">
        <p style="margin:0;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} VaidyaLink · This is an automated receipt. Please keep it for your records.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"VaidyaLink" <${process.env.GMAIL_USER}>`,
      to: params.to,
      subject: `Booking Confirmed — ${params.serviceName} at ${params.businessName} on ${new Date(params.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
      html,
    });
  } catch (err) {
    console.error('Invoice email failed:', err);
  }
}

// POST /api/payments/create-order
router.post('/create-order', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const { service_id, slot_id, provider_id } = req.body;
    if (!service_id || !slot_id || !provider_id) {
      return res.status(400).json({ error: 'service_id, slot_id, provider_id required' });
    }

    const slotResult = await pool.query(
      `SELECT sl.* FROM slots sl 
       LEFT JOIN resources r ON r.id = sl.resource_id 
       WHERE sl.id = $1 AND sl.status = 'available' AND (r.id IS NULL OR r.is_active = true)`,
      [slot_id]
    );
    if (slotResult.rows.length === 0) {
      return res.status(409).json({ error: 'Slot is no longer available' });
    }

    const serviceResult = await pool.query('SELECT * FROM services WHERE id = $1', [service_id]);
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Service not found' });
    }
    const service = serviceResult.rows[0];
    const amount = Number(service.price);
    const tax = amount * 0.18;
    const total = Math.round((amount + tax) * 100);

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: total,
      currency: 'INR',
      receipt: `booking_${auth.userId}_${slot_id}_${Date.now()}`,
      notes: {
        user_id: String(auth.userId),
        service_id: String(service_id),
        slot_id: String(slot_id),
        provider_id: String(provider_id),
      },
    });

    return res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      service_name: service.name,
      service_price: amount,
      tax,
      total: amount + tax,
    });
  } catch (err) {
    console.error('Razorpay Create Order Error Detail:', err);
    req.log?.error({ err }, 'Create Razorpay order error');
    return res.status(500).json({ error: 'Failed to create payment order', details: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/payments/verify
router.post('/verify', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      provider_id,
      slot_id,
      service_id,
      notes,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(503).json({ error: 'Payment service not configured' });

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed — invalid signature' });
    }

    const client = await pool.connect();
    let appointmentId: number;
    let invoiceId: number;
    let amount: number;
    let tax: number;
    let total: number;

    try {
      await client.query('BEGIN');

      const slotResult = await client.query(
        `SELECT sl.* FROM slots sl 
         LEFT JOIN resources r ON r.id = sl.resource_id 
         WHERE sl.id = $1 AND (r.id IS NULL OR r.is_active = true) FOR UPDATE`,
        [slot_id]
      );
      if (slotResult.rows.length === 0 || slotResult.rows[0].status !== 'available') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Slot was taken while payment was processing' });
      }
      const slot = slotResult.rows[0];

      const serviceResult = await client.query('SELECT * FROM services WHERE id = $1', [service_id]);
      if (serviceResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Service not found' });
      }
      const service = serviceResult.rows[0];
      const effectiveResourceId = slot.resource_id || null;

      await client.query(
        'UPDATE slots SET status = $1, locked_by = $2, locked_at = NOW(), updated_at = NOW() WHERE id = $3',
        ['booked', auth.userId, slot_id]
      );

      const apptResult = await client.query(
        `INSERT INTO appointments (patient_id, provider_id, slot_id, service_id, resource_id, status, notes)
         VALUES ($1, $2, $3, $4, $5, 'upcoming', $6)`,
        [auth.userId, provider_id, slot_id, service_id, effectiveResourceId, notes || null]
      );
      const insertId = (apptResult.result as any).insertId;
      const apptSelect = await client.query('SELECT * FROM appointments WHERE id = $1', [insertId]);
      const appointment = apptSelect.rows[0];
      appointmentId = appointment.id;

      amount = Number(service.price);
      tax = amount * 0.18;
      total = amount + tax;

      const invoiceResult = await client.query(
        `INSERT INTO invoices (appointment_id, patient_id, provider_id, amount, tax, total, status, payment_method, payment_reference, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid', 'razorpay', $7, NOW())`,
        [appointmentId, auth.userId, provider_id, amount, tax, total, razorpay_payment_id]
      );
      invoiceId = (invoiceResult.result as any).insertId;

      await client.query('COMMIT');

      // Fetch details for email (outside transaction)
      const [userRow, providerRow] = await Promise.all([
        pool.query('SELECT full_name, email FROM users WHERE id = $1', [auth.userId]),
        pool.query('SELECT business_name, address, city FROM providers WHERE id = $1', [provider_id]),
      ]);

      const user = userRow.rows[0];
      const provider = providerRow.rows[0];

      if (user?.email) {
        sendInvoiceEmail({
          to: user.email,
          userName: user.full_name || 'there',
          businessName: provider?.business_name || 'the business',
          serviceName: service.name,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          appointmentId,
          invoiceId,
          amount,
          tax,
          total,
          paymentId: razorpay_payment_id,
          city: provider?.city || '',
          address: provider?.address || '',
        });
      }

      return res.status(201).json({
        message: 'Payment verified & appointment booked',
        appointment: {
          id: appointmentId,
          status: 'upcoming',
          invoice_id: invoiceId,
          total,
          payment_id: razorpay_payment_id,
        },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log?.error({ err }, 'Verify payment error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/payments/test-checkout
// TEST MODE ONLY: creates order + simulates payment server-side (no Razorpay modal)
router.post('/test-checkout', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  const keyId = process.env.RAZORPAY_KEY_ID || '';
  if (!keyId.startsWith('rzp_test_')) {
    return res.status(403).json({ error: 'test-checkout is only available in Razorpay test mode' });
  }

  try {
    const { service_id, slot_id, provider_id, notes, phone } = req.body;
    if (!service_id || !slot_id || !provider_id) {
      return res.status(400).json({ error: 'service_id, slot_id, provider_id required' });
    }

    if (phone) {
      await pool.query('UPDATE users SET phone = $1 WHERE id = $2', [phone, auth.userId]);
    }

    // Create Razorpay order
    const serviceResult = await pool.query('SELECT * FROM services WHERE id = $1', [service_id]);
    if (serviceResult.rows.length === 0) return res.status(404).json({ error: 'Service not found' });
    const service = serviceResult.rows[0];
    const amount = Number(service.price);
    const tax = amount * 0.18;
    const total = Math.round((amount + tax) * 100);

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: total,
      currency: 'INR',
      receipt: `test_booking_${auth.userId}_${slot_id}_${Date.now()}`,
    });

    // Simulate a test payment ID and compute valid signature server-side
    const fakePaymentId = `pay_TEST_AUTO_${Date.now()}`;
    const keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const signature = crypto
      .createHmac('sha256', keySecret)
      .update(`${order.id}|${fakePaymentId}`)
      .digest('hex');

    // Run booking transaction (same as /verify)
    const client = await pool.connect();
    let appointmentId: number;
    let invoiceId: number;

    try {
      await client.query('BEGIN');

      const slotResult = await client.query(
        `SELECT sl.* FROM slots sl 
         LEFT JOIN resources r ON r.id = sl.resource_id 
         WHERE sl.id = $1 AND (r.id IS NULL OR r.is_active = true) FOR UPDATE`,
        [slot_id]
      );
      if (slotResult.rows.length === 0 || slotResult.rows[0].status !== 'available') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Slot is no longer available' });
      }
      const slot = slotResult.rows[0];
      const effectiveResourceId = slot.resource_id || null;

      await client.query(
        'UPDATE slots SET status = $1, locked_by = $2, locked_at = NOW(), updated_at = NOW() WHERE id = $3',
        ['booked', auth.userId, slot_id]
      );

      const apptResult = await client.query(
        `INSERT INTO appointments (patient_id, provider_id, slot_id, service_id, resource_id, status, notes)
         VALUES ($1, $2, $3, $4, $5, 'upcoming', $6)`,
        [auth.userId, provider_id, slot_id, service_id, effectiveResourceId, notes || null]
      );
      const apptInsertId = (apptResult.result as any).insertId;
      appointmentId = apptInsertId;

      const invoiceResult = await client.query(
        `INSERT INTO invoices (appointment_id, patient_id, provider_id, amount, tax, total, status, payment_method, payment_reference, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'paid', 'razorpay_test', $7, NOW())`,
        [appointmentId, auth.userId, provider_id, amount, tax, amount + tax, fakePaymentId]
      );
      invoiceId = (invoiceResult.result as any).insertId;

      await client.query('COMMIT');

      // Send invoice email async
      const [userRow, providerRow] = await Promise.all([
        pool.query('SELECT full_name, email FROM users WHERE id = $1', [auth.userId]),
        pool.query('SELECT business_name, address, city FROM providers WHERE id = $1', [provider_id]),
      ]);
      const user = userRow.rows[0];
      const provider = providerRow.rows[0];
      if (user?.email) {
        sendInvoiceEmail({
          to: user.email,
          userName: user.full_name || 'there',
          businessName: provider?.business_name || 'the business',
          serviceName: service.name,
          date: slot.date,
          startTime: slot.start_time,
          endTime: slot.end_time,
          appointmentId,
          invoiceId,
          amount,
          tax,
          total: amount + tax,
          paymentId: fakePaymentId,
          city: provider?.city || '',
          address: provider?.address || '',
        });
      }

      return res.status(201).json({
        message: 'Test payment auto-completed',
        appointment: { id: appointmentId, status: 'upcoming', invoice_id: invoiceId, total: amount + tax, payment_id: fakePaymentId },
        _debug: { order_id: order.id, payment_id: fakePaymentId, signature },
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log?.error({ err }, 'Test checkout error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});



// GET /api/payments/appointment/:id — fetch appointment summary for success page
router.get('/appointment/:id', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;

  try {
    const result = await pool.query(
      `SELECT
         a.id, a.status, a.notes,
         s.date, s.start_time, s.end_time,
         svc.name AS service_name, svc.price AS service_price,
         p.business_name, p.address, p.city,
         u.full_name AS patient_name,
         i.id AS invoice_id, i.total, i.tax, i.payment_reference, i.paid_at
       FROM appointments a
       JOIN slots s ON s.id = a.slot_id
       JOIN services svc ON svc.id = a.service_id
       JOIN providers p ON p.id = a.provider_id
       JOIN users u ON u.id = a.patient_id
       LEFT JOIN invoices i ON i.appointment_id = a.id
       WHERE a.id = $1 AND a.patient_id = $2`,
      [req.params.id, auth.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    return res.json({ appointment: result.rows[0] });
  } catch (err) {
    req.log?.error({ err }, 'Fetch appointment error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
