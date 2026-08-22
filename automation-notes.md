# Automation Notes: n8n, Twilio, and Demo-Safe Alternatives

## Current finding
The current automation issue is **not primarily a Twilio payment problem**.

The observed blockers are:

1. `Credentials for 'Basic Auth' are not set.`
2. `Node type "n8n-nodes-base.respondToWebhook" is not known.`
3. Backend can reach n8n, but n8n returns 404 until the workflow is active.

This means the automation path is failing mainly because of **workflow configuration / compatibility**, not because the backend trigger is broken.

---

## Important behavior in n8n
Setting Twilio values in container environment variables does **not automatically populate node credentials**.

Even if these exist in Docker env:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`
- `FIELD_WORKER_PHONE_NUMBER`

The workflow node still usually needs one of:
- an n8n credential object attached to the node
- expressions that explicitly read env vars
- manual values entered directly into the node

So env vars being present is **not enough by itself**.

---

## What the current screenshots/logs imply

### 1. Backend side
Backend automation is working far enough to:
- score beneficiary risk
- persist the score
- trigger the automation path
- call the n8n webhook

### 2. n8n side
The workflow is still not production-ready because:
- the webhook workflow may not be active
- the Twilio/HTTP auth node is not fully configured
- the imported `Respond to Webhook` node may be incompatible with the current n8n version

---

## Why this is probably not a Twilio billing issue
If this were primarily a Twilio payment/account problem, the likely symptoms would be things like:
- Twilio 401/403 auth failures
- trial-account recipient restrictions
- sender-number limitations
- message delivery rejection

But the current failure occurs earlier, at workflow/node configuration level.

Billing or account restrictions may still matter later, but they do **not** appear to be the first blocker.

---

## Recommended demo-safe alternatives to Twilio
If the goal is a reliable hackathon/demo automation story, Twilio should be treated as **optional**, not required.

### Option 1 — Log/return the message only
Workflow steps:
- receive webhook
- format the SMS text
- log it / return success response

Best for:
- proving automation fired
- avoiding external delivery dependencies
- lowest demo risk

### Option 2 — Email instead of SMS
Use:
- SMTP / Gmail / Outlook node

Best for:
- easier setup
- easier live verification
- still shows real outbound action

### Option 3 — Slack / Discord / Telegram notification
Use:
- Slack incoming webhook
- Discord webhook
- Telegram bot

Best for:
- visible, fast, demo-friendly notification
- less telephony complexity than Twilio

### Option 4 — Africa's Talking instead of Twilio
Best if actual SMS matters and you want a more regionally aligned provider.

Tradeoff:
- still requires account setup and credentials
- still more complex than a webhook/email demo path

---

## Recommendation
For demo reliability, prefer this path:

1. Keep backend automation trigger as-is.
2. Make Twilio optional.
3. Use an n8n workflow that:
   - receives the webhook
   - formats the alert message
   - logs it, returns it, or sends it through email/Slack
4. Only enable Twilio if credentials and workflow compatibility are fully verified.

This preserves the product story:
- risk scoring works
- automation fires
- a notification is generated

without introducing unnecessary demo fragility.

---

## If continuing with Twilio later
Checklist:
- confirm the workflow is imported
- confirm the webhook path matches `inuka-risk-alert`
- activate the workflow in n8n
- replace or recreate the broken `Respond to Webhook` node if needed
- attach a valid credential object or explicit env expressions to the SMS node
- verify recipient number format and Twilio account restrictions

---

## Decision note
**Recommended for demo:** switch to a demo-safe automation path (log/email/Slack) and treat Twilio as an optional enhancement rather than a critical dependency.
