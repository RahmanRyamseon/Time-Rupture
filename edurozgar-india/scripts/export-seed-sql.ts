import { opportunities } from "../src/lib/data/opportunities";

function sqlStr(v: string | undefined | null): string {
  if (v === undefined || v === null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

function sqlArr(v: string[]): string {
  if (v.length === 0) return "'{}'";
  return `ARRAY[${v.map((x) => sqlStr(x)).join(", ")}]::text[]`;
}

function sqlNum(v: number | undefined | null): string {
  return v === undefined || v === null ? "NULL" : String(v);
}

function sqlBool(v: boolean): string {
  return v ? "true" : "false";
}

function sqlJson(v: unknown): string {
  return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
}

function sqlDate(v: string | undefined | null): string {
  return v ? `'${v}'` : "NULL";
}

const rows = opportunities.map((o) => {
  const cols: Record<string, string> = {
    id: sqlStr(o.id),
    title: sqlStr(o.title),
    opportunity_type: sqlStr(o.opportunity_type),
    sub_type: sqlStr(o.sub_type),
    provider_name: sqlStr(o.provider_name),
    provider_type: sqlStr(o.provider_type),
    description: sqlStr(o.description),
    state: sqlStr(o.state),
    district: sqlStr(o.district),
    location: sqlStr(o.location),
    education_level: sqlArr(o.education_level),
    course_or_post: sqlStr(o.course_or_post),
    qualification: sqlStr(o.qualification),
    subject: sqlStr(o.subject),
    gender_eligibility: sqlStr(o.gender_eligibility),
    minority_eligibility: sqlJson(o.minority_eligibility),
    muslim_eligibility: sqlJson(o.muslim_eligibility),
    other_category_eligibility: sqlArr(o.other_category_eligibility),
    income_limit: sqlStr(o.income_limit),
    minimum_marks: sqlStr(o.minimum_marks),
    age_minimum: sqlNum(o.age_minimum),
    age_maximum: sqlNum(o.age_maximum),
    age_relaxation: sqlStr(o.age_relaxation),
    vacancies: sqlNum(o.vacancies),
    salary_or_benefit: sqlStr(o.salary_or_benefit),
    scholarship_amount: sqlStr(o.scholarship_amount),
    application_fee: sqlStr(o.application_fee),
    opening_date: sqlDate(o.opening_date),
    closing_date: sqlDate(o.closing_date),
    correction_deadline: sqlDate(o.correction_deadline),
    exam_date: sqlDate(o.exam_date),
    admit_card_date: sqlDate(o.admit_card_date),
    result_date: sqlDate(o.result_date),
    selection_process: sqlStr(o.selection_process),
    required_documents: sqlArr(o.required_documents),
    official_notification_url: sqlStr(o.official_notification_url),
    official_application_url: sqlStr(o.official_application_url),
    official_source_domain: sqlStr(o.official_source_domain),
    application_method: sqlStr(o.application_method),
    status: sqlStr(o.status),
    last_verified_date: sqlDate(o.last_verified_date),
    next_verification_date: sqlDate(o.next_verification_date),
    source_excerpt: sqlStr(o.source_excerpt),
    editor_notes: sqlStr(o.editor_notes),
    no_application_fee: sqlBool(o.no_application_fee),
    disability_eligible: sqlBool(o.disability_eligible),
    first_generation_learner_priority: sqlBool(o.first_generation_learner_priority),
    rural_ews_priority: sqlBool(o.rural_ews_priority),
    created_at: sqlStr(o.created_at),
    updated_at: sqlStr(o.updated_at),
  };
  const colVals = Object.values(cols).join(", ");
  return `(${colVals})`;
});

const colNames = [
  "id", "title", "opportunity_type", "sub_type", "provider_name", "provider_type", "description",
  "state", "district", "location", "education_level", "course_or_post", "qualification", "subject",
  "gender_eligibility", "minority_eligibility", "muslim_eligibility", "other_category_eligibility",
  "income_limit", "minimum_marks", "age_minimum", "age_maximum", "age_relaxation", "vacancies",
  "salary_or_benefit", "scholarship_amount", "application_fee", "opening_date", "closing_date",
  "correction_deadline", "exam_date", "admit_card_date", "result_date", "selection_process",
  "required_documents", "official_notification_url", "official_application_url", "official_source_domain",
  "application_method", "status", "last_verified_date", "next_verification_date", "source_excerpt",
  "editor_notes", "no_application_fee", "disability_eligible", "first_generation_learner_priority",
  "rural_ews_priority", "created_at", "updated_at",
].join(", ");

const updatableCols = colNames.split(", ").filter((c) => c !== "id");
let sql =
  `insert into public.opportunities (${colNames}) values\n${rows.join(",\n")}\n` +
  `on conflict (id) do update set\n` +
  updatableCols.map((c) => `  ${c} = excluded.${c}`).join(",\n") +
  ";\n\n";

// One source_checks row per official URL per opportunity, so the daily job has something to watch.
const sourceRows: string[] = [];
for (const o of opportunities) {
  sourceRows.push(`(${sqlStr(o.id)}, 'official_notification_url', ${sqlStr(o.official_notification_url)})`);
  sourceRows.push(`(${sqlStr(o.id)}, 'official_application_url', ${sqlStr(o.official_application_url)})`);
}
sql +=
  `insert into public.source_checks (opportunity_id, url_type, url) values\n${sourceRows.join(",\n")}\n` +
  `on conflict (opportunity_id, url_type) do update set url = excluded.url;\n`;

process.stdout.write(sql);
