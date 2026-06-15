// Client helper: asks our route handler to email the Application ID.
// Best-effort — failures don't block the registration flow.

export async function emailApplicationId(payload: {
  email: string;
  applicationId: string;
  fullName: string;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/registration/email-id", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
