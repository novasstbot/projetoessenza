export type EmailTemplate = {
  id: string;
  key: string;
  name: string;
  subject: string;
  html: string;
  variables: string[];
  created_at: string;
  updated_at: string;
};

export type EmailCampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "canceled";

export type EmailCampaign = {
  id: string;
  name: string;
  template_id: string;
  status: EmailCampaignStatus;
  scheduled_at: string | null;
  created_at: string;
};

export type EmailLogStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed";
