# Folio Invoice Studio

A modern, responsive, full-stack invoice generator created for the **Customizable Invoice Generator** interview exercise.

**Live preview:** https://folio-invoice-studio-preview.vercel.app

> **Demo only:** The preview has no user authentication. Use fictional customer data. Saved invoices may be accessible to anyone using the public demonstration. The configured recipient is a public disposable Yopmail inbox.

## Features

- Business and customer details, invoice number, issue/due dates, client email and notes
- Add / edit / remove line items with quantity and unit price
- USD calculation in the required order: **round each line to cents → sum lines → subtract fixed discount → calculate percentage tax → round tax → total**
- Example: 2 × $50 − $10 discount + 10% tax = **$99.00**
- Custom label/value fields: add, edit, hide/show and remove. Hidden fields are excluded from invoice/PDF output; all custom fields are excluded from calculations.
- Live preview that updates while editing, browser Print / Save as PDF (invoice only)
- Responsive desktop, tablet and mobile views, including mobile Edit / Preview tabs, focus styles and inline validation
- Saved Invoices library: list/search, reopen/edit, overwrite and delete
- Cloud persistence using private **Vercel Blob** JSON objects, one invoice per record
- Branded HTML/plaintext invoice delivery through **Gmail SMTP** (Nodemailer)
- Send flow attempts to **save the invoice before emailing it**, so an SMTP error does not discard the invoice

## Repository structure

```text
index.html             Frontend layout and responsive styles
client.js              Invoice editor, live preview, library & email dialog
api/invoices.js        CRUD endpoints using Vercel Blob
api/email.js           Validated, restricted Gmail SMTP email sender
lib/money.js           Reusable USD calculation helper
test/money.test.js     Automated rounding and tax tests
package.json           Dependencies and scripts
.env.example           Placeholder-only configuration
vercel.json            Serverless configuration
.gitignore             Secrets and local data exclusions
README.md              Setup, decisions, limitations
```

## Run locally

Requires **Node.js 20+** and a Vercel account/project for its serverless API and Blob storage.

```bash
git clone https://github.com/jagwinder-iapp/Folio-Repo-Client-TestTask.git
cd Folio-Repo-Client-TestTask
npm install
npx vercel login
npx vercel link
npx vercel env pull .env.local
npm run dev
```

Open the local URL printed by `vercel dev` (typically http://localhost:3000). You must have permission to read the linked project's environment variables. Alternatively copy `.env.example` to `.env.local` and fill in your own credentials without committing the file.

Run calculations tests:

```bash
npm test
```

**Important:** Opening `index.html` directly without a Vercel-compatible backend will not provide persistent invoice storage or SMTP.

## Vercel deployment

The live version is built as a static frontend plus Node.js Vercel Functions. Deploy by importing this repository into Vercel, linking a **private Vercel Blob** store, adding the production environment variables, then deploying. For existing Vercel projects, redeploy after changing environment variables.

### Environment variables

| Name | Example or purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Private Blob store's token, managed by Vercel |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Your Gmail sender address |
| `SMTP_PASS` | Google **App Password**, not Gmail sign-in password |
| `DEMO_EMAIL_RECIPIENT` | `Zachary@yopmail.com` |

Use Vercel **Settings → Environment Variables**. Do **not** put secrets in the GitHub repository, frontend JavaScript, README or commit history.

### Gmail SMTP setup

1. Sign in to the Google Account that will act as the sender.
2. Enable **2-Step Verification**.
3. Search Google Account settings for **App passwords**; when available create one for *Folio Invoice Studio*.
4. In Vercel add `SMTP_USER` and `SMTP_PASS`, plus host `smtp.gmail.com` and port `465`.
5. Keep `DEMO_EMAIL_RECIPIENT` set to `Zachary@yopmail.com` for this exercise.
6. Redeploy. In the invoice editor click **Send invoice**; use https://yopmail.com/en/ to manually view the public test inbox.

An SMTP success response proves the SMTP server accepted the request, **not** that the email arrived in the inbox. For production, prefer a managed transactional email provider with a verified sending domain and delivery webhooks. Gmail may impose quotas or block certain account configurations.

## Backend and storage API

| Method | URL | Result |
| --- | --- | --- |
| GET | `/api/invoices` | All saved invoice summaries |
| GET | `/api/invoices?id=UUID` | One full saved invoice |
| POST | `/api/invoices` | Validated new invoice |
| PUT | `/api/invoices?id=UUID` | Edit existing invoice |
| DELETE | `/api/invoices?id=UUID` | Delete saved invoice |
| POST | `/api/email` | Branded SMTP invoice message to locked demo recipient |

Saved records are held as private `demo-invoices/<UUID>.json` objects within Vercel Blob. The UI searches by invoice number and customer name. A fixed demo recipient is visible in the Client Email form and information popup.

## Calculation details

For each item: `lineCents = Math.round(quantity * unitPrice * 100)`. The subtotal adds these **already-rounded** line amounts. The discount is a **fixed dollar value** subtracted from subtotal before tax. Tax is then calculated on the discounted subtotal and rounded to cents. Custom fields do not affect any totals.

Try the exercise acceptance case: **2 × $50 = $100**, discount **$10**, discounted base **$90**, 10% tax **$9**, total **$99**.

Run `npm test` to test the calculation helper in isolation.

## Design choices

References were the HubSpot invoice workflow and Zoho Books customizable invoice layouts, without recreating either product. Folio uses a calm editorial style with a clear visual hierarchy, realistic sample copy, streamlined sections and a live document preview. On smaller screens, editing and previewing are split into understandable tabs. This prioritizes the user's journey from entry to validation to saving and sending.

## Decisions and limitations

- **Authentication/payments:** not required by the exercise; not built.
- **Email:** fixed single test recipient; does not attach a PDF, but includes a formatted HTML invoice and plaintext fallback.
- **PDF:** browser Print / Save as PDF, not a server-generated attachment.
- **Storage:** Vercel Blob JSON suitable for a lightweight demo, not a multi-tenant accounting ledger.
- **Security:** demo endpoints have **no authentication/authorization or rate limiting**. Do not enter real client records or financial details. Add authentication and authorization before real use.
- **Testing:** calculation unit tests are supplied; complete desktop/mobile visual QA, end-to-end storage tests and inbox delivery verification remain outstanding.
- **Video:** intentionally not created at the user's request, though the interview exercise ultimately requests a video link.
- **Time spent:** actual personal time was not measured reliably, so no number is invented. The exercise requests a 3-hour maximum; the candidate must report their own actual effort.
- **AI tools used:** ChatGPT (GPT-6) assisted with architecture, UI, JavaScript, validation, backend, and documentation. Human review is recommended before representing the work in an interview.

## Privacy

No real API keys, Gmail App Passwords, Blob tokens or client data should be pushed to this repository. Never share credentials in screenshots or commits. Rotate any key that has already been exposed publicly.
