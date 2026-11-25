import { NextRequest, NextResponse } from "next/server";
import { LeadFormRepository } from "@/lib/repositories/lead-form.repository";
import { LeadSubmissionRepository } from "@/lib/repositories/lead-submission.repository";
import { LeadRepository } from "@/lib/repositories/lead.repository";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { FormField, FieldCondition } from "@/types/lead";

// Simple IP-based in-memory rate limiter for public forms
const ipSubmissionsMap = new Map<string, number[]>();

function checkRateLimit(ip: string, limitPerMinute = 5): boolean {
  const now = Date.now();
  const timestamps = (ipSubmissionsMap.get(ip) || []).filter((t) => now - t < 60000);
  if (timestamps.length >= limitPerMinute) {
    return false;
  }
  timestamps.push(now);
  ipSubmissionsMap.set(ip, timestamps);
  return true;
}

function evaluateCondition(
  cond: FieldCondition,
  formData: Record<string, unknown>
): boolean {
  const rawVal = formData[cond.fieldId];
  const strVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
  const targetVal = (cond.value || "").trim();

  switch (cond.operator) {
    case "equals":
      return strVal.toLowerCase() === targetVal.toLowerCase();
    case "not_equals":
      return strVal.toLowerCase() !== targetVal.toLowerCase();
    case "contains":
      return strVal.toLowerCase().includes(targetVal.toLowerCase());
    case "is_empty":
      return strVal === "";
    case "is_not_empty":
      return strVal !== "";
    default:
      return true;
  }
}

function isFieldVisible(field: FormField, formData: Record<string, unknown>): boolean {
  if (!field.conditions || field.conditions.length === 0) return true;

  if (field.conditionLogic === "or") {
    return field.conditions.some((cond) => evaluateCondition(cond, formData));
  }
  return field.conditions.every((cond) => evaluateCondition(cond, formData));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; formId: string }> }
) {
  try {
    const { slug, formId } = await params;
    const store = await StoreRepository.findBySlug(slug);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const form = await LeadFormRepository.findById(store.id, formId);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Determine active steps/settings (published if available, fallback to draft)
    const activeSteps = form.publishedSteps || form.currentDraft.steps;
    const activeSettings = form.publishedSettings || form.currentDraft.settings;
    const activeVersion = form.publishedVersion || 1;

    // Client IP & User Agent
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    // Rate Limiting Check
    const allowedLimit = activeSettings.rateLimitPerMinute || 5;
    if (!checkRateLimit(clientIp, allowedLimit)) {
      return NextResponse.json(
        { error: "Too many submission attempts. Please wait a minute before retrying." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // 1. Honeypot check
    if (activeSettings.enableHoneypot !== false) {
      if (body._website_url_trap && String(body._website_url_trap).trim().length > 0) {
        // Honeypot triggered by spam bot: silently succeed or return error without saving
        return NextResponse.json({
          success: true,
          message: activeSettings.successMessage,
        });
      }
    }

    const formData: Record<string, unknown> = body.data || {};
    const isTest = Boolean(body.isTest);
    const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : undefined;

    // Check idempotency
    if (idempotencyKey) {
      const existingSub = await LeadSubmissionRepository.findByIdempotencyKey(
        store.id,
        idempotencyKey
      );
      if (existingSub) {
        return NextResponse.json({
          success: true,
          submissionId: existingSub.id,
          message: activeSettings.successMessage,
          isDuplicate: true,
        });
      }
    }

    // 2. Server-side validation of active visible fields
    const allActiveFields = activeSteps.flatMap((s) => s.fields);
    const visibleFields = allActiveFields.filter((f) => isFieldVisible(f, formData));
    const validationErrors: Record<string, string> = {};

    let extractedFullName = "Anonymous Lead";
    let extractedEmail: string | undefined = undefined;
    let extractedPhone: string | undefined = undefined;
    let extractedCompany: string | undefined = undefined;

    for (const field of visibleFields) {
      const val = formData[field.id];
      const strVal = val !== undefined && val !== null ? String(val).trim() : "";

      if (field.validation?.required && !strVal) {
        validationErrors[field.id] = field.validation.customErrorMessage || `${field.label} is required.`;
      }

      // Format validations
      if (strVal && field.type === "email") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(strVal)) {
          validationErrors[field.id] = "Please enter a valid email address.";
        } else {
          extractedEmail = strVal;
        }
      }

      if (strVal && field.type === "phone") {
        extractedPhone = strVal;
      }

      // Detect full name or company if labelled as such
      const lowerLabel = field.label.toLowerCase();
      if (strVal && (lowerLabel.includes("name") || field.id.includes("name"))) {
        extractedFullName = strVal;
      }
      if (strVal && (lowerLabel.includes("company") || field.id.includes("company"))) {
        extractedCompany = strVal;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      return NextResponse.json(
        { error: "Validation failed", errors: validationErrors },
        { status: 400 }
      );
    }

    const submittedAt = new Date().toISOString();

    // 3. Upsert Lead (Duplicate detection & merge engine)
    const { lead } = await LeadRepository.upsertLeadFromSubmission(store.id, {
      fullName: extractedFullName,
      email: extractedEmail,
      phone: extractedPhone,
      company: extractedCompany,
      source: form.name,
      submittedAt,
    });

    // 4. Save Immutable Submission Record with Field Snapshot
    const submission = await LeadSubmissionRepository.create({
      storeId: store.id,
      leadId: lead.id,
      formId: form.id,
      formVersion: activeVersion,
      formName: form.name,
      data: formData,
      submittedFieldsSnapshot: visibleFields,
      ipAddress: clientIp,
      userAgent,
      idempotencyKey,
      isTest,
      createdAt: submittedAt,
    });

    // Validate internal redirect URL if configured
    let safeRedirectUrl: string | undefined = undefined;
    if (activeSettings.postSubmissionAction === "redirect" && activeSettings.redirectUrl) {
      const target = activeSettings.redirectUrl.trim();
      // Ensure redirect is internal and relative
      if (target.startsWith("/") && !target.startsWith("//")) {
        safeRedirectUrl = target;
      }
    }

    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      leadId: lead.id,
      message: activeSettings.successMessage,
      redirectUrl: safeRedirectUrl,
    });
  } catch (error) {
    console.error("Error processing form submission:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred processing your submission." },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; formId: string }> }
) {
  try {
    const { slug, formId } = await params;
    const store = await StoreRepository.findBySlug(slug);

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const form = await LeadFormRepository.findById(store.id, formId);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Return the active published version definition, falling back to draft if none published
    const steps = form.publishedSteps || form.currentDraft.steps;
    const settings = form.publishedSettings || form.currentDraft.settings;
    const version = form.publishedVersion || 1;

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        description: form.description,
        version,
        steps,
        settings,
      },
    });
  } catch (error) {
    console.error("Error fetching form:", error);
    return NextResponse.json({ error: "Failed to fetch form" }, { status: 500 });
  }
}
