// Forwards an Application ID to the backend so it can email the applicant.
// Uses the same app-wide backend base (BACKEND_API_BASE_URL); API_BASE_URL can
// still override it for a separate email service. Configure via env:
//   BACKEND_API_BASE_URL (or API_BASE_URL), API_SECRET_KEY (optional),
//   REGISTRATION_EMAIL_PATH

type Payload = {
  email?: string;
  applicationId?: string;
  fullName?: string;
};

export async function POST(request: Request) {
  let body: Payload | null = null;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return Response.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!body?.email || !body?.applicationId) {
    return Response.json(
      { ok: false, error: "email_and_applicationId_required" },
      { status: 400 },
    );
  }

  const base = process.env.API_BASE_URL || process.env.BACKEND_API_BASE_URL;
  if (!base) {
    // No backend configured locally — succeed as a no-op so the UI flow continues.
    console.warn(
      "[email-id] no backend base (BACKEND_API_BASE_URL/API_BASE_URL) set; skipping email dispatch",
    );
    return Response.json({ ok: true, skipped: true });
  }

  const path = process.env.REGISTRATION_EMAIL_PATH ?? "/registration/application-id";

  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.API_SECRET_KEY
          ? { Authorization: `Bearer ${process.env.API_SECRET_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        email: body.email,
        applicationId: body.applicationId,
        fullName: body.fullName ?? "",
      }),
    });

    if (!res.ok) {
      return Response.json(
        { ok: false, error: "backend_error", status: res.status },
        { status: 502 },
      );
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[email-id] dispatch failed", err);
    return Response.json({ ok: false, error: "dispatch_failed" }, { status: 502 });
  }
}
