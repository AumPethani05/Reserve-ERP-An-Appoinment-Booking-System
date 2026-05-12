import { Router, Request, Response } from 'express';
import { pool } from '@workspace/db';
import { generateTokens, hashPassword, comparePassword, verifyRefreshToken, requireAuth } from '../lib/auth.js';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

const router = Router();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(to: string, otp: string, userName: string): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    await transporter.sendMail({
      from: `"VaidyaLink" <${process.env.GMAIL_USER}>`,
      to,
      subject: 'Your VaidyaLink Verification Code',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 24px"><h2>Hi ${userName},</h2><p>Your verification code is:</p><div style="background:#003740;color:#fff;font-size:32px;font-weight:800;letter-spacing:8px;padding:16px;border-radius:12px;text-align:center">${otp}</div><p>This code expires in 5 minutes.</p></div>`,
    });
    return true;
  } catch {
    return false;
  }
}

async function getFullUser(userId: number) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.full_name, u.role, u.is_verified, u.phone, u.avatar_url, p.id as provider_id, p.business_name, p.is_onboarded, p.is_approved
     FROM users u LEFT JOIN providers p ON p.user_id = u.id WHERE u.id = $1`,
    [userId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  const user: any = { id: row.id, email: row.email, full_name: row.full_name, role: row.role, is_verified: !!row.is_verified, phone: row.phone, avatar_url: row.avatar_url };
  if (row.provider_id) {
    user.provider = {
      id: row.provider_id,
      business_name: row.business_name,
      is_onboarded: !!row.is_onboarded,
      is_approved: !!row.is_approved
    };
  }
  return user;
}

router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, phone, password, full_name, role } = req.body;
    if (!email || !phone || !password || !full_name) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    const validRoles = ['patient', 'provider'];
    const userRole = validRoles.includes(role) ? role : 'patient';

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'An account with this email already exists' });

    const password_hash = await hashPassword(password);
    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const result = await pool.query(
      `INSERT INTO users (email, phone, password_hash, full_name, role, is_verified, otp_code, otp_expires_at, otp_attempts)
       VALUES ($1, $2, $3, $4, $5, false, $6, $7, 0)`,
      [email, phone, password_hash, full_name, userRole, hashedOtp, otpExpiresAt]
    );
    const insertId = (result.result as any).insertId;
    
    // Auto-create a placeholder provider profile so services/resources work immediately
    if (userRole === 'provider') {
      await pool.query(
        `INSERT IGNORE INTO providers (user_id, business_name, specialty, category, is_onboarded, is_approved)
         VALUES ($1, $2, 'General', 'other', false, false)`,
        [insertId, full_name]
      );
    }

    const user = await getFullUser(insertId);

    await sendOTPEmail(email, otp, full_name);

    const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.status(201).json({ message: 'Account created! Check your email for the verification code.', user, ...tokens });
  } catch (err) {
    req.log?.error({ err }, 'Signup error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });
    const fullUser = await getFullUser(user.id);

    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({
      message: 'Login successful',
      user: fullUser,
      ...tokens,
    });
  } catch (err) {
    req.log?.error({ err }, 'Login error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  const auth = requireAuth(req, res);
  if (!auth) return;
  try {
    const user = await getFullUser(auth.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    req.log?.error({ err }, 'Get me error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token not found' });
    const payload = verifyRefreshToken(refreshToken);
    const tokens = generateTokens({ userId: payload.userId, email: payload.email, role: payload.role });
    res.cookie('refreshToken', tokens.refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ message: 'Token refreshed', ...tokens });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp || otp.length !== 6) return res.status(400).json({ error: 'Email and 6-digit OTP required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];

    if (user.is_verified) return res.json({ message: 'Email already verified', user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, is_verified: true } });
    if (!user.otp_code) return res.status(400).json({ error: 'No OTP found. Request a new one.' });
    if (user.otp_expires_at && new Date() > new Date(user.otp_expires_at)) return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    if ((user.otp_attempts || 0) >= 5) return res.status(429).json({ error: 'Too many attempts. Request a new OTP.' });

    const isValid = await bcrypt.compare(otp, user.otp_code);
    if (!isValid) {
      await pool.query('UPDATE users SET otp_attempts = otp_attempts + 1, updated_at = NOW() WHERE id = $1', [user.id]);
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    await pool.query('UPDATE users SET is_verified = true, otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0, updated_at = NOW() WHERE id = $1', [user.id]);
    
    const fullUser = await getFullUser(user.id);
    return res.json({ message: 'Email verified successfully', user: fullUser });
  } catch (err) {
    req.log?.error({ err }, 'Verify OTP error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/resend-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = result.rows[0];
    if (user.is_verified) return res.json({ message: 'Email is already verified' });

    if (user.otp_expires_at) {
      const lastSentAt = new Date(user.otp_expires_at).getTime() - 5 * 60 * 1000;
      const timeSince = Date.now() - lastSentAt;
      if (timeSince < 60000) {
        const waitSecs = Math.ceil((60000 - timeSince) / 1000);
        return res.status(429).json({ error: `Please wait ${waitSecs}s before requesting a new OTP` });
      }
    }

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query('UPDATE users SET otp_code = $1, otp_expires_at = $2, otp_attempts = 0, updated_at = NOW() WHERE id = $3', [hashedOtp, otpExpiresAt, user.id]);

    const sent = await sendOTPEmail(email, otp, user.full_name);
    return res.json({ message: sent ? 'New OTP sent to your email.' : 'Failed to send OTP.', success: sent });
  } catch (err) {
    req.log?.error({ err }, 'Resend OTP error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
