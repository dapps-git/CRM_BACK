const axios = require('axios');

/**
 * Send real SMS to mobile numbers in India (+91) using Fast2SMS or Twilio
 * @param {string} mobileNumber - 10 digit Indian mobile number (e.g., 9745307450)
 * @param {string} otpCode - 6 digit OTP verification code
 */
const sendSMS = async (mobileNumber, otpCode) => {
  const cleanMobile = mobileNumber.replace(/\D/g, '');
  const message = `Your Crevionads CRM verification OTP code is ${otpCode}. Valid for 10 minutes.`;

  // 1. Check Fast2SMS API Key (Popular Free/Cheap SMS Gateway in India)
  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey && !fast2smsKey.includes('your_')) {
    try {
      const response = await axios.post(
        'https://www.fast2sms.com/dev/bulkV2',
        {
          route: 'otp',
          variables_values: otpCode,
          numbers: cleanMobile,
        },
        {
          headers: {
            authorization: fast2smsKey.trim(),
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`✅ Real SMS delivered via Fast2SMS to +91${cleanMobile}:`, response.data);
      return { success: true, provider: 'Fast2SMS', data: response.data };
    } catch (err) {
      console.error('❌ Fast2SMS delivery error:', err.response?.data || err.message);
    }
  }

  // 2. Check Twilio Credentials
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

  if (twilioSid && twilioAuthToken && twilioFrom && !twilioSid.includes('your_')) {
    try {
      const twilio = require('twilio');
      const client = twilio(twilioSid.trim(), twilioAuthToken.trim());
      const res = await client.messages.create({
        body: message,
        from: twilioFrom.trim(),
        to: cleanMobile.startsWith('+') ? cleanMobile : `+91${cleanMobile}`,
      });
      console.log(`✅ Real SMS delivered via Twilio to +91${cleanMobile}:`, res.sid);
      return { success: true, provider: 'Twilio', sid: res.sid };
    } catch (err) {
      console.error('❌ Twilio delivery error:', err.message);
    }
  }

  console.log('----------------------------------------------------');
  console.log(`[SMS NOTICE] Real SMS requires FAST2SMS_API_KEY or Twilio credentials in backend/.env`);
  console.log(`[SMS OUTPUT] Target: +91${cleanMobile} | OTP: ${otpCode}`);
  console.log('----------------------------------------------------');
  return { simulated: true };
};

module.exports = sendSMS;
