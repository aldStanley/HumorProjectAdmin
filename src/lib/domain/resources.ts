export type Field = {
  key: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "boolean"
    | "number"
    | "select"
    | "relation"
    | "json";
  required?: boolean;
  max?: number;
  options?: string[];
  relation?: string;
  nullable?: boolean;
  readonly?: boolean;
};
export type Resource = {
  title: string;
  singular: string;
  description: string;
  table: string;
  mode: "read" | "crud" | "update";
  titleKey: string;
  fields: Field[];
  columns: string[];
  order?: string;
};
const created: Field = { key: "created_at", label: "Created", readonly: true };
export const resources: Record<string, Resource> = {
  "prompt-chains": {
    title: "Prompt chains",
    singular: "Prompt chain",
    description:
      "The pipelines behind the punchlines. Inspect each chain and its ordered steps.",
    table: "prompt_chains",
    mode: "read",
    titleKey: "name",
    columns: ["name", "description", "version"],
    fields: [
      { key: "name", label: "Name" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "version", label: "Version", type: "number" },
      created,
    ],
  },
  "prompt-steps": {
    title: "Prompt chain steps",
    singular: "Prompt step",
    description:
      "Inspect model choices, input/output formats, and the exact system prompts.",
    table: "prompt_chain_steps",
    mode: "read",
    titleKey: "name",
    columns: ["name", "chain_id", "step_order", "model_id"],
    order: "step_order",
    fields: [
      { key: "name", label: "Name" },
      {
        key: "chain_id",
        label: "Chain",
        type: "relation",
        relation: "prompt_chains",
      },
      { key: "step_order", label: "Order", type: "number" },
      {
        key: "model_id",
        label: "Model",
        type: "relation",
        relation: "llm_models",
      },
      { key: "input_kind", label: "Input" },
      { key: "output_format", label: "Output format" },
      { key: "system_prompt", label: "System prompt", type: "textarea" },
    ],
  },
  "prompt-mix": {
    title: "Prompt chain mix",
    singular: "Mix entry",
    description:
      "Enable or pause chains and adjust their relative traffic weights for admin caption generation. Zero total weight pauses generation.",
    table: "prompt_chain_mix",
    mode: "update",
    titleKey: "chain_id",
    columns: ["chain_id", "weight", "enabled", "updated_at"],
    fields: [
      {
        key: "chain_id",
        label: "Chain",
        type: "relation",
        relation: "prompt_chains",
        readonly: true,
      },
      {
        key: "weight",
        label: "Relative weight (0–1000)",
        type: "number",
        required: true,
        max: 1000,
      },
      { key: "enabled", label: "Enabled", type: "boolean" },
      { key: "updated_at", label: "Updated", readonly: true },
    ],
  },
  terms: {
    title: "Terms",
    singular: "Term",
    description:
      "The lab’s vocabulary. Enabled definitions are supplied as context to the admin caption writer.",
    table: "terms",
    mode: "crud",
    titleKey: "term",
    columns: ["term", "definition", "enabled"],
    fields: [
      { key: "term", label: "Term", required: true, max: 100 },
      {
        key: "definition",
        label: "Definition",
        type: "textarea",
        required: true,
        max: 2000,
      },
      { key: "enabled", label: "Enabled", type: "boolean" },
      created,
    ],
  },
  examples: {
    title: "AI generation examples",
    singular: "Example",
    description:
      "Curate examples for the caption writer. Assign a chain or leave it blank to use across all chains.",
    table: "ai_generation_examples",
    mode: "crud",
    titleKey: "output_caption",
    columns: ["output_caption", "chain_id", "enabled"],
    fields: [
      {
        key: "chain_id",
        label: "Chain (optional)",
        type: "relation",
        relation: "prompt_chains",
        nullable: true,
      },
      {
        key: "image_id",
        label: "Reference image (optional)",
        type: "relation",
        relation: "caption_images",
        nullable: true,
      },
      {
        key: "input_description",
        label: "Input description",
        type: "textarea",
        required: true,
        max: 4000,
      },
      {
        key: "output_caption",
        label: "Example caption",
        type: "textarea",
        required: true,
        max: 240,
      },
      {
        key: "notes",
        label: "Notes",
        type: "textarea",
        max: 2000,
        nullable: true,
      },
      { key: "enabled", label: "Enabled", type: "boolean" },
      created,
    ],
  },
  models: {
    title: "LLM models",
    singular: "Model",
    description:
      "Manage model records and vision capabilities. Referenced models cannot be deleted. The current runner supports Google Gemini.",
    table: "llm_models",
    mode: "crud",
    titleKey: "name",
    columns: ["name", "model_identifier", "provider_id", "enabled"],
    fields: [
      {
        key: "provider_id",
        label: "Provider",
        type: "relation",
        relation: "llm_providers",
        required: true,
      },
      { key: "name", label: "Display name", required: true, max: 100 },
      {
        key: "model_identifier",
        label: "Provider model identifier",
        required: true,
        max: 150,
      },
      {
        key: "supports_vision",
        label: "Accepts image inputs",
        type: "boolean",
      },
      { key: "enabled", label: "Enabled", type: "boolean" },
      created,
    ],
  },
  providers: {
    title: "LLM providers",
    singular: "Provider",
    description:
      "Manage provider records. API credentials stay in server environment variables and are never stored in these records.",
    table: "llm_providers",
    mode: "crud",
    titleKey: "name",
    columns: ["name", "provider_type", "enabled"],
    fields: [
      { key: "name", label: "Name", required: true, max: 100 },
      {
        key: "provider_type",
        label: "Provider type",
        type: "select",
        options: ["google", "openai", "anthropic", "other"],
        required: true,
      },
      { key: "enabled", label: "Enabled", type: "boolean" },
      created,
    ],
  },
  requests: {
    title: "Generation requests",
    singular: "Request",
    description:
      "Admin generations recorded from this release onward. Older generations were not logged. A running request may indicate an interrupted or timed-out run.",
    table: "generation_requests",
    mode: "read",
    titleKey: "id",
    columns: ["id", "chain_id", "status", "created_at"],
    fields: [
      { key: "user_id", label: "Requested by" },
      {
        key: "chain_id",
        label: "Chain",
        type: "relation",
        relation: "prompt_chains",
      },
      { key: "status", label: "Status" },
      { key: "input_metadata", label: "Input metadata", type: "json" },
      { key: "error_message", label: "Failure", type: "textarea" },
      created,
      { key: "completed_at", label: "Completed" },
    ],
  },
  responses: {
    title: "LLM responses",
    singular: "Response",
    description:
      "Inspect per-step model output, prompt snapshots, response metadata, and latency. Uploaded image bytes and API keys are never logged.",
    table: "llm_responses",
    mode: "read",
    titleKey: "id",
    columns: ["request_id", "model_id", "http_status", "latency_ms"],
    fields: [
      { key: "request_id", label: "Generation request" },
      {
        key: "step_id",
        label: "Prompt step",
        type: "relation",
        relation: "prompt_chain_steps",
      },
      {
        key: "model_id",
        label: "Model",
        type: "relation",
        relation: "llm_models",
      },
      { key: "http_status", label: "HTTP status", type: "number" },
      { key: "latency_ms", label: "Latency (ms)", type: "number" },
      { key: "prompt_snapshot", label: "Prompt snapshot", type: "textarea" },
      { key: "output_text", label: "Output", type: "textarea" },
      {
        key: "response_payload",
        label: "Provider response metadata",
        type: "json",
      },
      created,
    ],
  },
  "signup-domains": {
    title: "Allowed signup domains",
    singular: "Domain",
    description:
      "New registrations must match an enabled domain OR email when either list has enabled entries. Empty lists allow all registrations. Existing users are unaffected; these lists never grant superadmin access.",
    table: "allowed_signup_domains",
    mode: "crud",
    titleKey: "domain",
    columns: ["domain", "notes", "enabled"],
    fields: [
      { key: "domain", label: "Domain (without @)", required: true, max: 253 },
      {
        key: "notes",
        label: "Notes",
        type: "textarea",
        nullable: true,
        max: 1000,
      },
      { key: "enabled", label: "Enabled", type: "boolean" },
      created,
    ],
  },
  "email-whitelist": {
    title: "Whitelisted emails",
    singular: "Email address",
    description:
      "Allow individual email addresses to register even if their domain is not listed. Existing users and admin roles are unchanged.",
    table: "whitelisted_email_addresses",
    mode: "crud",
    titleKey: "email",
    columns: ["email", "notes", "enabled"],
    fields: [
      { key: "email", label: "Email address", required: true, max: 254 },
      {
        key: "notes",
        label: "Notes",
        type: "textarea",
        nullable: true,
        max: 1000,
      },
      { key: "enabled", label: "Enabled", type: "boolean" },
      created,
    ],
  },
};
export type RecordRow = { id: string; [key: string]: unknown };
export type Choice = { value: string; label: string };
export type Choices = Record<string, Choice[]>;
export function getResource(slug: string) {
  return Object.hasOwn(resources, slug) ? resources[slug] : undefined;
}
export function validateFields(
  resource: Resource,
  input: unknown,
): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid record.");
  const raw = input as Record<string, unknown>;
  const fields = resource.fields.filter((f) => !f.readonly);
  if (Object.keys(raw).some((k) => !fields.some((f) => f.key === k)))
    throw new Error("This record contains fields that cannot be edited.");
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    let value = raw[f.key];
    if (f.type === "boolean") {
      if (typeof value !== "boolean")
        throw new Error(`${f.label}: choose on or off.`);
      out[f.key] = value;
      continue;
    }
    if (f.type === "number") {
      if (
        typeof value !== "number" ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > (f.max ?? 2147483647)
      )
        throw new Error(
          `${f.label}: enter a whole number between 0 and ${f.max ?? 2147483647}.`,
        );
      out[f.key] = value;
      continue;
    }
    if ((value === "" || value === null) && f.nullable) {
      out[f.key] = null;
      continue;
    }
    if (typeof value !== "string")
      throw new Error(`${f.label}: enter a value.`);
    value = value.trim();
    if (f.required && !value) throw new Error(`${f.label} is required.`);
    if ((value as string).length > (f.max ?? 4000))
      throw new Error(`${f.label} is too long.`);
    if (f.type === "select" && !f.options?.includes(value as string))
      throw new Error(`${f.label}: choose a valid option.`);
    if (
      f.type === "relation" &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value as string,
      )
    )
      throw new Error(`${f.label}: choose a record.`);
    if (f.key === "domain") {
      value = (value as string).toLowerCase();
      if (
        !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(
          value as string,
        ) ||
        (value as string).includes("..")
      )
        throw new Error(
          "Enter a domain such as columbia.edu, without @ or a URL.",
        );
    }
    if (f.key === "email") {
      value = (value as string).toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value as string))
        throw new Error("Enter a valid email address.");
    }
    out[f.key] = value;
  }
  return out;
}
