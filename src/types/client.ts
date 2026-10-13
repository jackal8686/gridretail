export interface Client {
  id: string;
  name: string;
  company: string;
  contactEmail: string;
  contactPhone: string;
  industry: string;
  storeCount: number;
  lastActive: string;
  status: "Active" | "Prospect" | "Archived";
  assignedAccountManager: string;
}
