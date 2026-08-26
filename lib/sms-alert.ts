/** Optional SMS delivery through Twilio. Leave the environment variables empty to disable it safely. */
export async function sendReferralSms(to: string | null | undefined, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!to || !accountSid || !authToken || !from) return { delivered: false, reason: "not_configured" };

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: from, Body: message });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  return { delivered: response.ok, reason: response.ok ? undefined : await response.text() };
}
