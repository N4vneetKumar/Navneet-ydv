const { getMessaging } = require('../config/firebase');
const env = require('../config/env');
const { query } = require('../config/postgres');

async function sendPush(fcmToken, title, body, data = {}) {
  if (!fcmToken) return { sent: false, reason: 'no_token' };

  try {
    const messaging = getMessaging();
    await messaging.send({
      token: fcmToken,
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      android: { priority: 'high' },
    });
    return { sent: true };
  } catch (err) {
    console.warn('FCM send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

async function sendSms(phone, message) {
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    console.log(`[SMS STUB] To ${phone}: ${message}`);
    return { sent: false, reason: 'twilio_not_configured' };
  }

  try {
    const twilio = require('twilio')(env.twilio.accountSid, env.twilio.authToken);
    await twilio.messages.create({
      body: message,
      from: env.twilio.phoneNumber,
      to: phone.startsWith('+') ? phone : `+91${phone}`,
    });
    return { sent: true };
  } catch (err) {
    console.warn('SMS send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

async function notifyUser(userId, title, body, data = {}, smsFallback = null) {
  const { rows } = await query('SELECT fcm_token, phone, notification_enabled FROM users WHERE id = $1', [userId]);
  if (!rows.length) return;

  const user = rows[0];
  if (!user.notification_enabled) return;

  const pushResult = await sendPush(user.fcm_token, title, body, data);
  if (!pushResult.sent && smsFallback) {
    await sendSms(user.phone, smsFallback);
  }
}

async function notifyAllAdmins(title, body, data = {}) {
  const { rows } = await query(`SELECT id FROM users WHERE role = 'admin' AND is_active = true`);
  await Promise.all(rows.map((admin) => notifyUser(admin.id, title, body, data)));
}

module.exports = { sendPush, sendSms, notifyUser, notifyAllAdmins };
