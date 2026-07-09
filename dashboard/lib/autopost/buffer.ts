/* ==============================================================================
 * Copyright (c) 2024-2026 Axto AI. All rights reserved.
 * Platform Architecture: AXTO (axto.io) - Sovereign AI Infrastructure
 * Maintained by: Axto AI <hello@axto.io>
 * Proprietary and Confidential. Unauthorized copying is strictly prohibited.
 * ==============================================================================
 *
 * AXTO AutoPost — Buffer Integration (GraphQL Ideas API)
 *
 * IMPORTANT — what this actually does: Buffer's GraphQL API creates an
 * "Idea" (a draft in Buffer's content calendar), not a live publish to a
 * social platform the way Ayrshare's REST API does. An Idea still needs a
 * human (or a separate Buffer automation) to turn it into a scheduled post
 * inside Buffer's own dashboard. Callers must not present this as
 * equivalent to postViaAyrshare() -- label it "sent to Buffer as a draft",
 * never "published".
 * ============================================================================ */

const BUFFER_GRAPHQL_URL = "https://graph.buffer.com/graphql";

export interface BufferIdeaResult {
  success: boolean;
  ideaId?: string;
  error?: string;
}

export interface BufferCredentials {
  accessToken: string;
  organizationId: string;
}

// Reads the admin-configured Buffer credentials from the same encrypted
// payment_gateways table used for Stripe/PayPal/Resend (gateway='buffer').
export async function getBufferCredentials(db: any): Promise<BufferCredentials | null> {
  try {
    const { decryptObj } = await import("@/lib/gateway-crypto");
    const row: any = await db.prepare(
      `SELECT credentials_enc FROM payment_gateways WHERE gateway = 'buffer' AND is_active = 1`
    ).first();
    if (!row?.credentials_enc) return null;
    const creds = await decryptObj<{ access_token?: string; organization_id?: string }>(row.credentials_enc);
    if (!creds?.access_token || !creds?.organization_id) return null;
    return { accessToken: creds.access_token, organizationId: creds.organization_id };
  } catch {
    return null;
  }
}

export async function createBufferIdea(
  accessToken: string,
  organizationId: string,
  title: string,
  text: string
): Promise<BufferIdeaResult> {
  if (!accessToken) return { success: false, error: "Buffer access token not configured" };
  if (!organizationId) return { success: false, error: "Buffer organization ID not configured" };

  const query = `
    mutation CreateIdea($input: CreateIdeaInput!) {
      createIdea(input: $input) {
        ... on Idea {
          id
          content { title text }
        }
        ... on CreateIdeaProblem {
          message
        }
      }
    }
  `;

  try {
    const res = await fetch(BUFFER_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: {
          input: {
            organizationId,
            content: { title, text },
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data: any = await res.json();

    if (data.errors?.length) {
      return { success: false, error: data.errors.map((e: any) => e.message).join("; ") };
    }

    const result = data.data?.createIdea;
    if (result?.message) {
      // CreateIdeaProblem union member
      return { success: false, error: result.message };
    }
    if (result?.id) {
      return { success: true, ideaId: result.id };
    }

    return { success: false, error: "Unexpected response from Buffer" };
  } catch (e: any) {
    return { success: false, error: e.message || "Network error" };
  }
}
