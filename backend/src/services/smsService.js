const axios = require('axios');

// Supported providers: Twilio, Fast2SMS, 2Factor, MSG91
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_PHONE_NUMBER;
const fast2SmsKey = process.env.FAST2SMS_API_KEY;
const twoFactorKey = process.env.TWO_FACTOR_API_KEY;
const msg91Key = process.env.MSG91_AUTH_KEY;
const msg91TemplateId = process.env.MSG91_OTP_TEMPLATE_ID;

let twilioClient = null;
if (twilioSid && twilioToken) {
    try {
        const twilio = require('twilio');
        twilioClient = twilio(twilioSid, twilioToken);
    } catch (e) {
        console.warn('[SMS] Twilio package not available:', e.message);
    }
}

exports.sendOTP = async (phone, otp) => {
    let rawDigits = phone.replace(/\D/g, '');
    // If phone has 91 prefix (12 digits), extract 10-digit national number
    const nationalNumber = rawDigits.length === 12 && rawDigits.startsWith('91') 
        ? rawDigits.slice(2) 
        : rawDigits.slice(-10);
    const formattedE164 = `+91${nationalNumber}`;

    console.log(`📡 [SMS DISPATCH] Initiating SMS dispatch for ${formattedE164} (OTP: ${otp})...`);

    let sent = false;
    let providerUsed = 'none';
    let details = {};

    // 1. Try Fast2SMS (India Transactional & OTP route)
    if (fast2SmsKey) {
        try {
            console.log(`[SMS] Sending via Fast2SMS to ${nationalNumber}...`);
            const res = await axios.get('https://www.fast2sms.com/dev/bulkV2', {
                params: {
                    authorization: fast2SmsKey,
                    variables_values: otp,
                    route: 'otp',
                    numbers: nationalNumber
                }
            });
            if (res.data && res.data.return) {
                console.log(`✅ [SMS SUCCESS] Fast2SMS delivered OTP to ${nationalNumber}`);
                return { success: true, provider: 'Fast2SMS', data: res.data };
            }
        } catch (err) {
            console.error(`❌ [SMS ERROR] Fast2SMS failed:`, err.response?.data || err.message);
        }
    }

    // 2. Try 2Factor.in
    if (twoFactorKey) {
        try {
            console.log(`[SMS] Sending via 2Factor to ${nationalNumber}...`);
            const res = await axios.get(`https://2factor.in/API/V1/${twoFactorKey}/SMS/${nationalNumber}/${otp}/OTP1`);
            if (res.data && res.data.Status === 'Success') {
                console.log(`✅ [SMS SUCCESS] 2Factor delivered OTP to ${nationalNumber}`);
                return { success: true, provider: '2Factor', data: res.data };
            }
        } catch (err) {
            console.error(`❌ [SMS ERROR] 2Factor failed:`, err.response?.data || err.message);
        }
    }

    // 3. Try MSG91
    if (msg91Key && msg91TemplateId) {
        try {
            console.log(`[SMS] Sending via MSG91 to ${nationalNumber}...`);
            const res = await axios.post('https://api.msg91.com/api/v5/otp', {
                template_id: msg91TemplateId,
                mobile: `91${nationalNumber}`,
                otp: otp
            }, {
                headers: { authkey: msg91Key }
            });
            console.log(`✅ [SMS SUCCESS] MSG91 response:`, res.data);
            return { success: true, provider: 'MSG91', data: res.data };
        } catch (err) {
            console.error(`❌ [SMS ERROR] MSG91 failed:`, err.response?.data || err.message);
        }
    }

    // 4. Try Twilio
    if (twilioClient && twilioFrom) {
        try {
            console.log(`[SMS] Sending via Twilio to ${formattedE164}...`);
            const message = await twilioClient.messages.create({
                body: `Your SwasthyaSetu / HealthNexus verification code is: ${otp}. Do not share this code with anyone.`,
                from: twilioFrom,
                to: formattedE164
            });
            console.log(`✅ [SMS SUCCESS] Twilio delivered OTP. SID: ${message.sid}`);
            return { success: true, provider: 'Twilio', sid: message.sid };
        } catch (err) {
            console.error(`❌ [SMS ERROR] Twilio failed:`, err.message);
        }
    }

    // If no external SMS gateway API credentials are configured in .env:
    console.log(`\n============================================================`);
    console.log(`ℹ️ [SMS GATEWAY NOTICE] No active SMS API keys found in backend/.env.`);
    console.log(`📲 Target Number : ${formattedE164}`);
    console.log(`🔐 Generated OTP  : ${otp}`);
    console.log(`💡 To deliver real carrier SMS to Indian mobile numbers, configure:`);
    console.log(`   - FAST2SMS_API_KEY=<your_free_key> in backend/.env OR`);
    console.log(`   - TWILIO_ACCOUNT_SID & TWILIO_AUTH_TOKEN & TWILIO_PHONE_NUMBER OR`);
    console.log(`   - TWO_FACTOR_API_KEY=<key>`);
    console.log(`============================================================\n`);

    return { 
        success: true, 
        mocked: true, 
        provider: 'Simulator', 
        phone: formattedE164, 
        otp: otp 
    };
};

exports.sendFamilyInviteSMS = async (phone, { requesterName, relation, code, link }) => {
    const rawDigits = String(phone || '').replace(/\D/g, '');
    const nationalNumber = rawDigits.length === 12 && rawDigits.startsWith('91') 
        ? rawDigits.slice(2) 
        : rawDigits.slice(-10);
    const formattedE164 = `+91${nationalNumber}`;

    const text = `Swasthya Health: ${requesterName || 'A family member'} has invited you to connect as ${relation || 'Family'}. Verification Code: ${code}. Link: ${link || 'https://swasthya-zeta.vercel.app/family/accept'}`;

    console.log(`📡 [SMS DISPATCH] Family Invitation SMS to ${formattedE164}: "${text}"`);

    // Use sendOTP infrastructure for delivery
    const res = await exports.sendOTP(phone, code);
    return {
        ...res,
        messageText: text
    };
};

