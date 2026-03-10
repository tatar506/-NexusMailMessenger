async function sendOTPViaEmailJS(email, code) {
    const data = {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID,
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY, // Private Key
        template_params: {
            to_email: email,
            otp_code: code
        }
    };

    try {
        const response = await axios.post('https://api.emailjs.com/api/v1.0/email/send', data, {
            headers: { 'Content-Type': 'application/json' }
        });
        console.log('✅ EmailJS Success:', response.data);
        return true;
    } catch (error) {
        // Выводим детальную ошибку в логи Render
        console.error('❌ EmailJS Error Detail:', error.response ? error.response.data : error.message);
        throw new Error('Email service failed');
    }
}
