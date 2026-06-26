import { apiGet } from "./client";
import { withFreshAuth } from "./auth";

const BYPASS = process.env.NEXT_PUBLIC_AUTH_BYPASS !== "false";
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type RegisteredPerson = {
  subjectId: string;
  applicationId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  status: string;
  currentStage: number;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
};

export type ApplicationStatus = {
  subjectId: string;
  status: string;
  currentStage: number;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function normalizeRegisteredPerson(raw: unknown): RegisteredPerson {
  const obj = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) ?? {};
  return {
    subjectId: String(obj.subjectId ?? obj.subjectID ?? obj.id ?? ""),
    applicationId: String(obj.applicationId ?? obj.applicationNumber ?? obj.registrationNumber ?? ""),
    fullName: String(obj.fullName ?? obj.name ?? ""),
    email: String(obj.email ?? ""),
    phoneNumber: String(obj.phoneNumber ?? obj.phone ?? ""),
    status: String(obj.status ?? ""),
    currentStage: Number.isFinite(Number(obj.currentStage ?? obj.current_stage ?? 0))
      ? Number(obj.currentStage ?? obj.current_stage ?? 0)
      : 0,
    emailVerified: Boolean(obj.emailVerified ?? obj.email_verified ?? false),
    isActive: Boolean(obj.isActive ?? obj.active ?? false),
    createdAt: String(obj.createdAt ?? obj.created_at ?? ""),
  };
}

function normalizeApplicationStatus(raw: unknown): ApplicationStatus {
  const obj = (raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {}) ?? {};
  return {
    subjectId: String(obj.subjectId ?? obj.subjectID ?? obj.id ?? ""),
    status: String(obj.status ?? ""),
    currentStage: Number.isFinite(Number(obj.currentStage ?? obj.current_stage ?? 0))
      ? Number(obj.currentStage ?? obj.current_stage ?? 0)
      : 0,
    emailVerified: Boolean(obj.emailVerified ?? obj.email_verified ?? false),
    isActive: Boolean(obj.isActive ?? obj.active ?? false),
    createdAt: String(obj.createdAt ?? obj.created_at ?? ""),
    updatedAt: String(obj.updatedAt ?? obj.updated_at ?? ""),
  };
}

export async function getApplicationStatus(
  registrationId: string,
): Promise<ApplicationStatus> {
  if (BYPASS) {
    await delay(200);
    return {
      subjectId: "mock-subject-id",
      status: "PENDING_ASSESSMENT",
      currentStage: 2,
      emailVerified: true,
      isActive: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const raw = await apiGet(`/v1/registration/${encodeURIComponent(registrationId)}/status`);
  const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = payload.data ?? payload;
  return normalizeApplicationStatus(data);
}

export async function getRegisteredPeople(): Promise<RegisteredPerson[]> {
  if (BYPASS) {
    await delay(200);
    return [];
  }

  const raw = await withFreshAuth((token) => apiGet("/v1/registration/all", token));
  const payload = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const data = payload.data ?? payload;
  if (!Array.isArray(data)) return [];
  return data.map(normalizeRegisteredPerson);
}
