const sendSMS = async (mobileNumber, otpCode) => {
  const cleanMobile = mobileNumber.replace(/\D/g, '');
  console.log(`[SMS SIMULATION] Target: +91${cleanMobile} | OTP: ${otpCode}`);
  return { simulated: true };
};

module.exports = sendSMS;
