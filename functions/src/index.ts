import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { Resend } from "resend";

setGlobalOptions({ maxInstances: 10 });

const resendApiKey = defineSecret("RESEND_API_KEY");

export const sendFeedback = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to send feedback.");
    }
    const { subject = "Player Eligibility feedback", message } = request.data as {
      subject?: string;
      message?: string;
    };
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Message is required.");
    }
    const resend = new Resend(resendApiKey.value());
    const { data, error } = await resend.emails.send({
      from: "Player Eligibility <andrew@asleight.com>",
      to: ["asleighty@gmail.com"],
      subject: subject.slice(0, 200) || "Player Eligibility feedback",
      html: `<p>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p><p><small>From: ${request.auth.token.email ?? "unknown"}</small></p>`,
      replyTo: request.auth.token.email ?? undefined,
    });
    if (error) {
      throw new HttpsError("internal", error.message);
    }
    return { success: true, id: data?.id };
  }
);
