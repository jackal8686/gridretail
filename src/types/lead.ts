export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "radio"
  | "checkbox"
  | "date"
  | "number";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "is_empty"
  | "is_not_empty";

export interface FieldCondition {
  fieldId: string;
  operator: ConditionOperator;
  value?: string;
}

export interface FormFieldValidation {
  required?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customErrorMessage?: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string | boolean | string[];
  options?: Array<{ label: string; value: string }>;
  validation?: FormFieldValidation;
  conditions?: FieldCondition[];
  conditionLogic?: "and" | "or";
  width?: "full" | "half";
}

export interface FormStep {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
}

export type FormPresentationMode = "embedded" | "modal" | "page";
export type FormLayoutType = "single_column" | "two_column";
export type PostSubmissionAction = "message" | "redirect";

export interface FormSettings {
  presentationMode: FormPresentationMode;
  layout: FormLayoutType;
  submitButtonText: string;
  postSubmissionAction: PostSubmissionAction;
  successMessage: string;
  redirectUrl?: string;
  triggerButtonText?: string; // For modal mode
  enableHoneypot?: boolean;
  rateLimitPerMinute?: number;
}

export interface LeadFormVersion {
  id: string;
  formId: string;
  storeId: string;
  version: number;
  name: string;
  description?: string;
  steps: FormStep[];
  settings: FormSettings;
  publishedAt: string;
  publishedBy: string;
  changeSummary?: string;
}

export interface LeadForm {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  currentDraft: {
    steps: FormStep[];
    settings: FormSettings;
    updatedAt: string;
  };
  publishedVersion?: number;
  publishedSettings?: FormSettings;
  publishedSteps?: FormStep[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Converted"
  | "Lost";

export interface LeadNote {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface LeadActivity {
  id: string;
  storeId: string;
  leadId: string;
  actorId?: string;
  actorName?: string;
  type:
    | "submission"
    | "status_change"
    | "note_added"
    | "assigned"
    | "reminder_created"
    | "reminder_completed";
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface LeadReminder {
  id: string;
  storeId: string;
  leadId: string;
  title: string;
  dueAt: string;
  assignedTo?: string;
  status: "pending" | "completed" | "dismissed";
  createdAt: string;
  completedAt?: string;
}

export interface LeadSubmission {
  id: string;
  storeId: string;
  leadId: string;
  formId: string;
  formVersion: number;
  formName: string;
  data: Record<string, unknown>;
  submittedFieldsSnapshot: FormField[];
  ipAddress?: string;
  userAgent?: string;
  idempotencyKey?: string;
  isTest: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  storeId: string;
  fullName: string;
  email?: string;
  emailNormalized?: string;
  phone?: string;
  phoneNormalized?: string;
  company?: string;
  status: LeadStatus;
  source: string; // e.g. Form Name, CSV Import
  assignedTo?: string; // User ID
  assignedToName?: string;
  firstSubmissionAt: string;
  lastSubmissionAt: string;
  submissionCount: number;
  tags?: string[];
  notes?: LeadNote[];
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAnalyticsOverview {
  totalFormViews: number;
  totalSubmissions: number;
  conversionRate: number; // percentage (0 - 100)
  totalLeads: number;
  leadsByStatus: Record<LeadStatus, number>;
  submissionsOverTime: Array<{ date: string; count: number }>;
}
