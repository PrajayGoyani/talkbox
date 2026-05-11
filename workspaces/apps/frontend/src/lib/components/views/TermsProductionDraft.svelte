<script lang="ts">
  import { routerStore } from "$state/router.svelte";
</script>

<div class="max-w-4xl mx-auto px-4 py-12 prose dark:prose-invert">
  <div
    class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl mb-8 text-amber-800 dark:text-amber-200 text-sm italic"
  >
    <strong>Draft Component:</strong> This version of the Terms of Use includes production-grade updates for real payments
    and is for future reference only.
  </div>

  <button
    onclick={() => routerStore.navigate("/")}
    class="mb-8 text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-2"
  >
    ← Back to Home
  </button>

  <h1 class="text-4xl font-extrabold mb-8">Terms of Use (Production Draft)</h1>

  <p class="text-slate-500 mb-8 italic text-sm">Draft Updated: April 2026</p>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">1. Acceptance of Terms</h2>
    <p>
      By accessing and using Talkbox, you agree to be bound by these Terms of Use, all applicable laws and regulations,
      and any third-party payment processor terms.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">5. Subscription Plans & Payments</h2>
    <p>
      Talkbox offers a Free tier and a Pro subscription. By subscribing to the Pro plan, you gain access to increased
      usage limits, including up to 5 active sessions and unlimited message history. Payments are securely processed via <strong
        >[Processor Name, e.g., Stripe]</strong
      >. Your financial data is subject to the [Processor Name] Privacy Policy and Terms of Service.
    </p>
    <p class="mt-4">
      <strong>Auto-Renewal:</strong> Subscriptions automatically renew at the end of the billing period unless canceled at
      least 24 hours before the renewal date.
    </p>
    <p class="mt-4">
      <strong>Pricing Changes:</strong> Talkbox reserves the right to change subscription pricing upon 30 days' notice to
      active subscribers via email or in-app notification.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">6. Cancellation & Refund Policy</h2>
    <p>
      <strong>Cancellation:</strong> You may cancel your Pro subscription at any time via your Account Settings. Upon cancellation,
      you will maintain Pro access until the end of your current billing period, after which your account will revert to the
      Free tier.
    </p>
    <p class="mt-4">
      <strong>Refunds:</strong> We offer a 14-day satisfaction guarantee. Refund requests made within 14 days of the initial
      purchase will be honored, provided the service has not been excessively used. After 14 days, all subscription purchases
      are final and non-refundable.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">7. Taxes</h2>
    <p>
      Listed prices may or may not include regional taxes (VAT/GST/Sales Tax) depending on your location. The final
      amount, including applicable taxes, will be shown at checkout.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">8. Payment Disputes</h2>
    <p>
      Unauthorized chargebacks or payment disputes will result in immediate suspension of the Pro subscription and may
      lead to permanent account termination at the discretion of Talkbox.
    </p>
  </section>

  <section class="mb-12">
    <h2 class="text-2xl font-bold mb-4">9. Data Deletion</h2>
    <p>
      Users may choose to delete individual messages or entire chat threads. Please be advised that user-initiated
      deletion is permanent. Once a message is deleted by the user, it is removed from our active systems and cannot be
      recovered or restored by the Talkbox team.
    </p>
  </section>
</div>

<!--

If you transition from the current simulation to real payments (e.g., via Stripe or PayPal), the **Terms of Use** would need several critical "production-grade" updates to protect the platform and provide clarity to customers:

### 1. Payment Processing Disclosure
You must explicitly mention that payments are handled by a third-party processor.
*   **Addition**: "Payments are processed via [Processor Name]. Your financial data is subject to the [Processor Name] Privacy Policy and Terms of Service."

### 2. Auto-Renewal & Billing Cycles
Real payments usually involve recurring billing which must be transparently disclosed to avoid "hidden charge" complaints.
*   **Addition**: Explain that subscriptions automatically renew at the end of the billing period unless canceled 24-48 hours before the renewal date.

### 3. Cancellation Policy
You need to define what happens when a user stops paying.
*   **Addition**: "You may cancel your Pro subscription at any time via your Account Settings. Upon cancellation, you will maintain Pro access until the end of your current billing period, after which your account will revert to the Free tier."

### 4. Refund Policy Evolution
While "No Refunds" is common, many production apps offer a grace period to stay competitive or comply with regional laws (like EU consumer rights).
*   **Change**: You might switch from "Strict No-Refunds" to a "14-day Satisfaction Guarantee" or explicitly list exceptions (e.g., technical failure of the service).

### 5. Taxes & Fees
Prices in a simulation are simple, but real transactions involve regional taxes.
*   **Addition**: Clarify whether listed prices include or exclude Sales Tax, VAT, or GST.

### 6. Chargebacks & Disputes
To protect against fraud, you need a clause about payment reversals.
*   **Addition**: "Unauthorized chargebacks or payment disputes will result in immediate suspension of the Pro subscription and may lead to permanent account termination."

### 7. Right to Change Pricing
You need the legal right to adjust prices in the future.
*   **Addition**: "Tablebox reserves the right to change subscription pricing upon 30 days' notice to active subscribers."

***

> [!TIP]
> **Recommended Next Step**: If you decide to go live, it’s best to use a template from a service like **Stripe Tax/Billing** or consult with a legal professional, as localized consumer protection laws (especially in the EU and California) have strict requirements for subscription disclosures.

-->
