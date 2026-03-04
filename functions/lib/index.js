"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFeedback = void 0;
const firebase_functions_1 = require("firebase-functions");
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const resend_1 = require("resend");
(0, firebase_functions_1.setGlobalOptions)({ maxInstances: 10 });
const resendApiKey = (0, params_1.defineSecret)("RESEND_API_KEY");
exports.sendFeedback = (0, https_1.onCall)({ secrets: [resendApiKey] }, async (request) => {
    var _a, _b;
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "Sign in to send feedback.");
    }
    const { subject = "Player Eligibility feedback", message } = request.data;
    if (!message || typeof message !== "string" || message.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Message is required.");
    }
    const resend = new resend_1.Resend(resendApiKey.value());
    const { data, error } = await resend.emails.send({
        from: "Player Eligibility <andrew@asleight.com>",
        to: ["asleighty@gmail.com"],
        subject: subject.slice(0, 200) || "Player Eligibility feedback",
        html: `<p>${message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</p><p><small>From: ${(_a = request.auth.token.email) !== null && _a !== void 0 ? _a : "unknown"}</small></p>`,
        replyTo: (_b = request.auth.token.email) !== null && _b !== void 0 ? _b : undefined,
    });
    if (error) {
        throw new https_1.HttpsError("internal", error.message);
    }
    return { success: true, id: data === null || data === void 0 ? void 0 : data.id };
});
//# sourceMappingURL=index.js.map