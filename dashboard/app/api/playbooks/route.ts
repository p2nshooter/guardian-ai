import { NextRequest, NextResponse } from "next/server";
import { getDB, dbQuery, dbFirst, dbRun, newId, now } from "@/lib/db";

export const runtime = "edge";
export const dynamic = "force-dynamic";

// GET — public catalog (no auth required for browsing)
export async function GET(req: NextRequest) {
  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const category = url.searchParams.get("category");

  // Single playbook detail
  if (slug) {
    const pb = await dbFirst<any>(db, `SELECT p.*, c.name as category_name, c.slug as category_slug FROM playbooks p LEFT JOIN playbook_categories c ON c.id = p.category_id WHERE p.slug = ? AND p.is_active = 1`, [slug]);
    if (!pb) return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
    // Get reviews
    const reviews = await dbQuery(db, `SELECT rating, comment, created_at FROM playbook_reviews WHERE playbook_id = ? AND is_approved = 1 ORDER BY created_at DESC LIMIT 20`, [pb.id]);
    return NextResponse.json({ playbook: pb, reviews });
  }

  // Catalog listing
  const categories = await dbQuery(db, `SELECT * FROM playbook_categories WHERE is_active = 1 ORDER BY sort_order`);
  
  let playbooks;
  if (category) {
    playbooks = await dbQuery(db, `SELECT p.*, c.name as category_name, c.slug as category_slug FROM playbooks p LEFT JOIN playbook_categories c ON c.id = p.category_id WHERE c.slug = ? AND p.is_active = 1 ORDER BY p.is_featured DESC, p.sort_order, p.created_at DESC`, [category]);
  } else {
    playbooks = await dbQuery(db, `SELECT p.*, c.name as category_name, c.slug as category_slug FROM playbooks p LEFT JOIN playbook_categories c ON c.id = p.category_id WHERE p.is_active = 1 ORDER BY p.is_featured DESC, p.sort_order, p.created_at DESC`);
  }
  
  const bundles = await dbQuery(db, `SELECT * FROM playbook_bundles WHERE is_active = 1 ORDER BY is_featured DESC, sort_order`);
  const featured = await dbQuery(db, `SELECT p.*, c.name as category_name FROM playbooks p LEFT JOIN playbook_categories c ON c.id = p.category_id WHERE p.is_featured = 1 AND p.is_active = 1 ORDER BY p.sort_order LIMIT 6`);

  return NextResponse.json({ categories, playbooks, bundles, featured });
}

// POST — purchase or review
export async function POST(req: NextRequest) {
  let body: any = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  let db: any;
  try { db = getDB(req); } catch {
    return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  // ── Initiate purchase (redirect to checkout) ──
  if (body.action === "checkout") {
    const { playbook_id, bundle_id, email, name, gateway } = body;
    if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!gateway) return NextResponse.json({ error: "Payment method is required" }, { status: 400 });

    let item_name = "";
    let amount = 0;
    let meta: Record<string, string> = { email, name: name || email, gateway, type: "playbook" };

    if (bundle_id) {
      const bundle = await dbFirst<any>(db, `SELECT * FROM playbook_bundles WHERE id = ? AND is_active = 1`, [bundle_id]);
      if (!bundle) return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
      item_name = bundle.name;
      amount = bundle.price_usd;
      meta.bundle_id = bundle_id;
      meta.type = "playbook_bundle";
    } else if (playbook_id) {
      const pb = await dbFirst<any>(db, `SELECT * FROM playbooks WHERE id = ? AND is_active = 1`, [playbook_id]);
      if (!pb) return NextResponse.json({ error: "Playbook not found" }, { status: 404 });
      item_name = pb.name;
      amount = pb.price_usd;
      meta.playbook_id = playbook_id;
    } else {
      return NextResponse.json({ error: "playbook_id or bundle_id required" }, { status: 400 });
    }

    // Use the existing checkout flow
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://axto.io";
    meta.item_name = item_name;
    meta.amount_usd = String(amount);
    meta.source = "playbook";

    // Route to checkout API
    const checkoutRes = await fetch(`${appUrl}/api/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pkg: `playbook_${playbook_id || bundle_id}`,
        gateway,
        email,
        name: name || email,
        billing: "once",
        source: "playbook",
        playbook_meta: meta,
      }),
    });
    const checkoutData = await checkoutRes.json();
    return NextResponse.json(checkoutData);
  }

  // ── Submit review ──
  if (body.action === "review") {
    const { playbook_id, email, rating, comment } = body;
    if (!playbook_id || !email || !rating) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    
    // Check purchase
    const purchase = await dbFirst(db, `SELECT id FROM playbook_purchases WHERE playbook_id = ? AND client_email = ? AND status = 'completed'`, [playbook_id, email]);
    if (!purchase) return NextResponse.json({ error: "You must purchase this playbook before reviewing" }, { status: 403 });
    
    // Check existing review
    const existing = await dbFirst(db, `SELECT id FROM playbook_reviews WHERE playbook_id = ? AND client_email = ?`, [playbook_id, email]);
    if (existing) return NextResponse.json({ error: "You already reviewed this playbook" }, { status: 409 });

    await dbRun(db, `INSERT INTO playbook_reviews (id, playbook_id, client_email, rating, comment, created_at) VALUES (?,?,?,?,?,?)`,
      [newId(), playbook_id, email, Math.min(5, Math.max(1, rating)), comment || "", now()]);
    
    // Update average rating
    const avg = await dbFirst<any>(db, `SELECT AVG(rating) as avg, COUNT(*) as cnt FROM playbook_reviews WHERE playbook_id = ? AND is_approved = 1`, [playbook_id]);
    if (avg) {
      await dbRun(db, `UPDATE playbooks SET rating_avg = ?, rating_count = ?, updated_at = ? WHERE id = ?`, [avg.avg || 0, avg.cnt || 0, now(), playbook_id]);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
