# BLR Enterprises

Static logistics and construction website with an optional GPT-6 Astra service-inquiry assistant.
The assistant is **disabled by default**. No credentials belong in frontend code or Git.

## Run and test

Requires Node.js 22 or later; there are no third-party runtime dependencies.

```sh
npm test
npm run build
npm start
```

The site opens at http://localhost:3000. To test real Astra responses, copy `.env.example`
to `.env`, set the key locally, set `ASSISTANT_ENABLED=true`, and run:

```sh
node --env-file=.env server/index.js
```

The API key must have access to `gpt-6-astra`. Automated tests use mocked Responses
API results and never consume OpenAI credits. They do not establish answer quality,
account access, real latency or real cost.

## Deployment options

### One Node.js service (simplest)

Deploy this repository to a host that runs Node.js with `npm start`. Configure HTTPS,
the platform's `PORT`, `OPENAI_API_KEY`, and `ALLOWED_ORIGIN` (the exact public browser
origin, such as `https://your-domain.example`, without a path). Start with
`ASSISTANT_ENABLED=false`; review business information and run the launch checks below
before setting it to `true`. The server serves only explicitly allowed public assets.
It generates `/site-config.js` from environment settings; the API key is never included.
Set `FORMSPREE_FORM_ID` once the real form is recovered.

### Keep GitHub Pages and host only the backend separately

The Pages workflow runs tests and builds `dist/`, containing only frontend assets.
GitHub Pages cannot run `server/index.js`. Deploy the Node service separately; set
`ALLOWED_ORIGIN=https://gujaratiraj1.github.io` for the default Pages domain (or the
actual custom-domain origin). In the root `site-config.js`, set `assistantEndpoint`
to the HTTPS backend URL plus `/api/assist`, `assistantEnabled` to `true`, and
`formspreeFormId` to the recovered ID. These are public values; never add keys here.
The `/BLREnterprises/` path is not part of a browser origin.

## Recover the missing setup

Find the site in GitHub Settings → Pages to confirm the public frontend URL. Review
your hosting dashboards or billing records for a backend; this repository previously
contained no backend deployment. If none exists, provision a Node.js service.
Sign in to Formspree, open the BLR form and copy the ID from its integration endpoint.
Until an ID is configured the form prepares an email draft for the visitor to review
and send in their own email app; it does not send automatically or claim delivery.
Phone/email contact links remain available. Verify delivery using a test inquiry after configuration. The visible
contact email now matches the email link already in the original site.

## Assistant behavior and limits

- `server/business-info.json` contains a conservative subset of existing site content;
  the owner must review it before launch. It is not independently verified.
- Questions are independent, at most 2,000 characters, with no stored conversation.
  The backend sends the question to OpenAI with `store: false`; this is not a claim
  of zero provider data retention. The UI discloses processing before submission.
- Uses Responses API, `gpt-6-astra`, low reasoning, and at most 4,096 output tokens
  (including reasoning). Incomplete responses show a fallback instead of partial text.
- No tools, live tracking, booking, or automatic quote submission. The handoff copies
  only the visitor's question into the editable inquiry, preserving existing text.
- Five requests per socket IP per minute, four concurrent calls, and 200 upstream
  attempts per UTC day **per process**. Failed upstream attempts consume quota.
  Limits reset on restart. Forwarded IP headers are intentionally ignored; behind
  a reverse proxy visitors may share a quota. Before public scale-out, use a shared
  persistent gateway limiter with trusted proxy configuration and an abuse challenge.
- CORS is not authentication. The public endpoint can be called by non-browser clients.
  The process-wide quota bounds attempts but is not a durable spend cap. Configure
  provider project budget alerts and gateway quotas before enabling public access.
- Upstream deadline: 25 seconds; browser deadline: 30 seconds. No automatic retries.
  Logs include only status, duration and token counts, never visitor text or API keys.

## Launch checks and rollback

1. Confirm the host, allowed origin, model access, Formspree destination and reviewed
   business facts. Configure request/spend monitoring on the chosen host and API project.
2. Run `npm test` and `npm run build`. Verify the built site excludes `.env`, `server/`
   and tests. Test the enabled assistant on desktop and mobile, keyboard navigation,
   empty inputs, network failures and quote handoff without overwriting existing text.
3. Try real questions: freight requirements, construction scope, missing locations,
   exact prices, guaranteed dates, shipment tracking, off-topic requests, and attempts
   to override instructions. Require no fabricated rates, bookings or credentials;
   route unknown information to the team. Record latency and token usage against an
   agreed budget before launch. Mocked tests cannot verify these behaviors.
4. Launch to a small audience, then broaden only after reviewing answer quality,
   failure rate, latency and cost. No pricing or latency promise is implied.
5. Roll back by setting `ASSISTANT_ENABLED=false` on the backend and restarting. For
   Pages also set `assistantEnabled:false` in `site-config.js` and redeploy to hide the
   panel. The contact section remains available. No data migration is required.

Official model guidance: https://developers.openai.com/api/docs/guides/latest-model
