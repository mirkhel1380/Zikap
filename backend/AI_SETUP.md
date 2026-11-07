# Limited AI website reviews

This release adds a private customer workspace at `/account/#ai-review`. It does not turn the existing manual packages into automated fulfillment, create orders, publish website edits, buy a plan or enable paid AI.

## Available before AI activation

Signed-in customers can request the existing up-to-three-page public source-HTML audit and save its evidence privately for seven days. The same crawler retains consent, robots, DNS/redirect SSRF protection, bounded bodies, per-IP/global/host quotas and its existing limitations. A source check is labelled rule-based, not AI-generated. Findings, scope and inaccessible pages remain visible. Ten recent saved checks are listed.

The AI step is separate and opt-in. Runtime requests remain off without explicit activation. On 2026-11-07 the owner confirmed Workers Free and authorized activation; the deploy helper now registers the primary Worker activation secret as true unless a build override explicitly sets false. It becomes available only with the AI binding, the private schema and the server-side flag `AI_FREE_PLAN_CONFIRMED=true`. Do not set that flag until the owner has verified the Cloudflare account is actually on **Workers Free**, with no paid AI Gateway billing arrangement. This flag is an owner's assertion, not an API verification of the billing plan. If the account moves to Paid, clear the flag before using this feature.

## Cost controls

- Fixed model: `@cf/google/gemma-4-26b-a4b-it`. No premium/provider fallback and no external model API key.
- Two generation attempts per customer per UTC day; twenty attempts total per UTC day across this application.
- Atomic database reservations happen before inference. Failed, interrupted and unknown attempts still count. Concurrent clicks cannot reserve the same check twice.
- Prompt payload is bounded to 10,000 UTF-8 bytes and eight finding codes/flags; output is limited to 512 tokens.
- One attempt per saved check, with cached successful results. No automatic model retry on timeouts, invalid output, quota or provider errors.

These caps limit this application's usage. They cannot account for other Workers, AI Gateway calls or changes to Cloudflare pricing/billing. Cloudflare documents a daily free allocation of 10,000 neurons; Workers Free refuses further operations after its limit, whereas Workers Paid can charge for usage above the allowance. Keeping a Paid account's application below a request-count target is **not** a guarantee of zero total account charges. Base Worker/D1/storage quotas remain separate.

The documented model rates at implementation were roughly 9,091 neurons per million input tokens and 27,273 per million output tokens. The short fixed prompts/output and twenty-call ceiling provide margin, but no exact invoice amount is promised. Recheck provider pricing and model availability before activation; stop rather than silently selecting a different model if it is unavailable.

## Activation

1. In the merchant's Cloudflare dashboard, verify **Workers Free** under the account's Workers plan/billing settings. This workflow does not upgrade it or add a payment method. Verify the configured binding points directly to Workers AI, not a separately billed gateway/provider.
2. The committed Wrangler configuration already declares `ai.binding = AI`. The deploy script applies `0010_ai_reviews.sql` before deployment. Adding a binding alone does not invoke inference.
3. The owner-confirmed release registers `AI_FREE_PLAN_CONFIRMED=true` through encrypted runtime-secret upload. A build secret `AI_FREE_PLAN_CONFIRMED=false` overrides that activation and must be set before moving to a Paid plan. The deploy helper transfers it only to the primary Worker via stdin. Existing runtime secrets omitted from Builds are preserved. Store `false` to disable; never put credentials in chat.
4. `/health.aiReviews` and the independent owner's **System settings** show readiness booleans. The customer workspace shows daily availability. They do not independently inspect the account's billing plan.
5. Run one owner-controlled review of a permitted public page. Check both model quality and the Workers AI usage dashboard before offering it broadly. No live inference has been performed by this release process.

## Evidence and privacy

AI receives only server-owned finding IDs, fixed check codes, severity/category and whether human review is needed. Customer account details, website addresses, raw HTML, page titles/descriptions, private reports/messages and receipt keys are not included. There is no arbitrary user prompt, tool invocation or external URL chosen by the model.

The model can explain up to three existing findings. Its structured response must refer to known IDs and pass size/shape checks. Unknown IDs or malformed output are rejected. The UI renders plain text, labels suggestions as AI-generated and warns that they may be inaccurate. The model has no authority to verify fixes or promise rankings. Suggestions can be downloaded as text; nothing is published to a customer's website.

Checks and suggestions are private to the signed-in account and expire after seven days; expired records are purged when another check is created. Logout clears rendered private content. Paid reports, payment state and email notifications are unchanged. A stuck generation is held as failed after ninety seconds rather than sent again.

## Verification

The API regression suite uses all real SQLite migrations and isolated fake audit/model transports, never the merchant's credentials or live inference. It covers disabled state, consent, authentication/origin/SSRF rejection, ownership, retention, trusted prompts, fixed model limits, atomic account/global caps, caching, concurrency, invalid response, provider failure, unknown outcomes and secret deployment isolation. Browser QA uses the actual customer assets with disposable local fixtures; it does not represent a production model response.

Official references:

- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/configuration/bindings/
- https://developers.cloudflare.com/workers-ai/models/llama-3.2-3b-instruct/

## November 7 activation and model compatibility

Rechecked official pricing/model documentation before activation. The previous Llama 3.2 3B model is scheduled for removal on November 20, 2026. The fixed replacement is Cloudflare-hosted Gemma 4 26B A4B, using the direct AI binding without Gateway configuration, reasoning disabled, JSON-object output and max_completion_tokens=512. Parse the single chat-completion choice and require finish_reason=stop; truncated, ambiguous or tool-call outputs fail closed and do not retry. There is no provider/model fallback. This release does not claim to have independently inspected the billing account or completed a real model generation.

- https://developers.cloudflare.com/workers-ai/models/gemma-4-26b-a4b-it/
- https://developers.cloudflare.com/workers-ai/get-started/workers-wrangler/
- https://developers.cloudflare.com/changelog/product/workers-ai/

## Owner operations — November 7

System settings now has a private AI operations panel. `/admin-api/ai-control` requires the separate admin session and same-origin writes. GET returns only aggregate counts for the current UTC day: reserved attempts, completed, failed and in-progress saved states, remaining application attempts, next UTC reset, fixed model and limits. These are not provider neuron counters, account-wide usage or billing totals. A crashed generation may remain in-progress until the saved check is next read and reconciled.

PATCH takes a boolean `paused` and integer `expectedVersion`; stale edits return 409. Migration `0015_ai_controls.sql` creates a singleton setting without resetting existing edits on replay. The customer readiness check honors it and the atomic reservation query checks the setting again to close a pause/reservation race. A pause blocks new generation, without removing source checks, cached results or reservations. Already-started inference may finish. Resume cannot bypass the original free-plan flag, AI binding or schema, and the UI asks the owner to reconfirm the free plan. If the service health cannot be reached, pausing remains allowed, while resuming is blocked.

The isolated regression suite now passes 148 tests, including owner authorization/origin rejection, aggregate privacy, UTC counts, stale-write protection, resume prerequisites, migration replay and the pause/reservation race. Desktop and 390 px mobile preview checked real admin assets against labeled synthetic counts, with pause/resume and the resume confirmation exercised. No production inference, customer records or production pause/resume writes were created for demonstration. The existing AI system-card array nesting was also corrected so the separate AI status card renders.
