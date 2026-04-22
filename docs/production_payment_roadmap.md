# Roadmap: Transitioning to Production Payments

This document outlines the necessary legal and technical transitions required when moving from the current **Public Preview Simulation** to **Production Real-Time Payments** (e.g., Stripe, PayPal, or LemonSqueezy).

## ⚖️ Legal & Documentation Updates

### 1. Terms of Use Refinement
The following sections in `Terms.svelte` must be expanded:
- **Payment Processing**: Name the third-party processor and link to their terms.
- **Auto-Renewal**: Explicitly state that subscriptions renew automatically.
- **Cancellation**: Define the "Cancel anytime" window (e.g., 24 hours before renewal).
- **Grace Periods**: Define access behavior if a credit card fails.
- **Dispute Resolution**: Consequences of chargebacks (e.g., immediate account suspension).

### 2. Privacy Policy Updates
- **Data Sharing**: Disclose that payment details (CC info, billing address) are shared with the payment provider.
- **PII Storage**: Clarify that Talkbox does *not* store raw Credit Card numbers (if using Stripe Elements/iFrames).

## 🛠️ Technical Integration Steps

### 1. Backend: Payment Gateway Hooks
- **Webhook Implementation**: Create a `/api/v1/payments/webhook` endpoint to listen for Stripe events:
    - `invoice.paid`: Update `subscriptionExpiresAt` in the DB.
    - `customer.subscription.deleted`: Revert user `plan` to "free".
    - `invoice.payment_failed`: Trigger an email/alert to the user.
- **Subscription Lifecycle**: Implement a cron job (Agenda) to double-check expired subscriptions even if webhooks fail.

### 2. Frontend: Checkout Experience
- **Payment Element**: Replace the current "Simulated Upgrade" button with the Stripe Payment Element.
- **Billing Portal**: Integrate a "Manage Subscription" button that redirects users to the processor's hosted billing portal (to handle card updates and receipts).

## 🧾 User Experience (UX) Checklist
- [ ] **Email Receipts**: Automated emails for every successful charge.
- [ ] **Dunning Emails**: Notifications for failed payments.
- [ ] **Invoice History**: A section in User Settings to download PDF receipts.
- [ ] **Tier Degredation Alerts**: Notify users 3 days before their access reverts to "Free" due to non-payment.

## 💰 Refund Logic Recommendations
*   **Production Standard**: Offer a **full refund within 7–14 days** if the user is unsatisfied and hasn't exceeded a specific message threshold. 
*   **Legal Note**: Ensure compliance with the **EU Consumer Rights Directive** (14-day right of withdrawal) if serving European users.

---

> [!IMPORTANT]
> **Security Audit**: Before going live with real payments, ensure your server uses HTTPS exclusively and that you are PCI-DSS compliant (using hosted fields/checkout pages handles 99% of this).
