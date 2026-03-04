import { Link } from 'react-router-dom'

export default function TermsAndPrivacy() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="border-b border-slate-700 px-4 py-3">
        <Link
          to="/"
          className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
        >
          ← Back
        </Link>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
        <h1 className="text-2xl font-bold mb-8">Terms of Service & Privacy Statement</h1>
        <p className="text-slate-400 text-sm mb-8">
          Last updated: February 2026. This tool is operated by Andrew Sleight.
        </p>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Terms of Service</h2>
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>
              By using the Player Eligibility tool you agree to these terms. The tool is provided for informational use to help check player eligibility based on rounds data. You must obtain and upload CSV data from the official Bowls Victoria results portals. Results from this tool are indicative only; you are responsible for verifying any eligibility decisions using official sources (e.g. Bowls Victoria spreadsheets) before relying on them.
            </p>
            <p>
              You must not misuse the service (e.g. attempt unauthorised access, interfere with other users, or use the tool for purposes other than checking eligibility). We may suspend or terminate access if we believe these terms have been breached.
            </p>
            <p>
              The tool and its content are copyright © Andrew Sleight. You may use the tool in accordance with these terms but may not copy, modify, or redistribute the software or content without permission.
            </p>
            <p>
              The service is provided &quot;as is&quot;. We do not guarantee availability, accuracy, or fitness for a particular purpose. To the extent permitted by law, we exclude liability for any loss or damage arising from use of the tool.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Privacy Statement</h2>
          <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
            <p>
              We collect and process only what is needed to run the Player Eligibility tool: account information (email, sign-in method) for authentication, and the CSV data you upload (rounds/member data) so the eligibility checks can run. Feedback you send is also stored so we can respond.
            </p>
            <p>
              <strong>Authentication and data storage:</strong> We use Google Firebase for authentication, database, and file storage. Your account data and uploaded CSV files are stored in Firebase. By signing in (including with Google), you agree to Firebase’s processing of your data as described in Google’s privacy policy.
            </p>
            <p>
              <strong>Email:</strong> Password reset and feedback emails are sent via Resend from andrew@asleight.com. We do not use your email for marketing unless you have opted in separately.
            </p>
            <p>
              We do not sell your personal data. We may share data only where required by law or to protect rights and safety. We retain your data for as long as your account exists and as needed for legal or operational purposes after that.
            </p>
            <p>
              You can request access to or deletion of your data by contacting us (e.g. via the Feedback link in the app). If you use Google sign-in, you can also manage your Google account and data in your Google account settings.
            </p>
            <p>
              We may update this statement from time to time. Continued use of the tool after changes means you accept the updated statement.
            </p>
          </div>
        </section>

        <p className="text-slate-500 text-sm">
          For questions about these terms or privacy, use the Feedback link in the app.
        </p>
      </main>
    </div>
  )
}
