# Codex marketplace submission

Requirements checked against [OpenAI's submission guide](https://developers.openai.com/plugins/deploy/submission) on 2026-09-30. Package validation is not marketplace approval.

## Build the upload

Run `bun scripts/package-codex.ts` from the repository (requires Bun and the system `zip` command). Upload `dist/you-codex.zip`, not a ZIP of the repository or the `.codex-plugin` directory alone. Run `bun test scripts/tests/package-codex.test.ts` to inspect the generated archive; this check also requires `unzip`.

The archive contains the Codex manifest, one `.mcp.json` endpoint (`https://api.you.com/mcp`), `skills/you-web`, its required icon, and the license. It excludes the portable root manifest, which otherwise takes precedence over Codex metadata. It copies only explicit public files, never environment files or credentials.

The portal currently connects only one MCP server per plugin. This initial submission therefore covers web search and public-page reading. Finance, managed research, free-profile, and integration-discovery skills remain available in the existing multi-platform package, but are excluded from this upload because they depend on other endpoints. Maintainers must approve this narrower listing scope before submission. Use separate submissions or a verified consolidated endpoint to offer the other workflows; do not advertise them as bundled here.

The square SVG reuses the two brand-mark paths from the public You.com homepage logo, retrieved 2026-09-30 from https://you.com. It has explicit 64 × 64 dimensions, a self-contained gradient, and no remote assets. The existing banner is unchanged. Confirm brand approval before publication.

## Complete before submitting

1. Run the normal semantic release workflow if this is an update; the builder inherits the source Codex version. Keep the paired repository marketplace version aligned. Do not overwrite an existing published version with changed contents.
2. Sign into https://platform.openai.com/plugins in the correct organization/project. Choose the verified You.com developer identity. Organization owners can submit; other members need Apps Management Write.
3. Upload the ZIP. Review metadata and skill scan findings and correct required errors. Confirm that the support issues page, website, privacy policy, and terms URLs are accessible and identify the publisher.
4. Connect the main endpoint and complete the portal's domain verification. Serve the exact challenge token at the provided `/.well-known/openai-apps-challenge` URL; do not replace another plugin's token.
5. Verify production Streamable HTTP and the portal's supported authentication flow. If OAuth is used, check UserInfo email/email_verified and openid/email scope requirements against the [authentication guide](https://developers.openai.com/plugins/build/auth). Repository metadata changes cannot implement these server-side requirements.
6. Execute the five positive and three negative cases imported from the ZIP with a dedicated reviewer test account. They are proposed scenarios, not recorded passing results. Adjust tool names and expected behavior to match the scanned tools. Confirm search and contents are exposed by this endpoint and that the negative retrieval-instruction scenario uses a controlled test page.
7. Record the walkthrough and enter its accessible URL in Review details (or add `review.demo_recording_url` to the generated metadata in the builder). Enter private reviewer credentials and login instructions only in the secure dashboard, never in Git or the ZIP. Ensure reviewer access works without interactive MFA, email codes, or payment setup.
8. Resolve MCP setup and required scan failures. Complete the policy attestations and submit for review. Publish only after approval.

No demo URL, credentials, domain verification, live authentication validation, or successful execution of review cases is fabricated by the builder. These remain publisher/server work. Eligible hosted-tool updates are scanned separately; future skill, metadata, or package MCP configuration changes require a new ZIP.
