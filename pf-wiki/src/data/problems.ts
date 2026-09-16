import type { ProblemEntry } from "@/lib/types";

/**
 * Every entry is a distillation of published EPFO guidance plus the fixes
 * people report actually working on forums (including r/epfoindia and its
 * live successor r/EPFO — r/epfoindia's mods redirected the community there
 * and it no longer accepts new posts/comments), Quora, and personal-finance
 * sites. See each entry's `sources` for where it was sourced from, and
 * `lastVerified` for when. A curated raw archive of the Reddit posts and
 * comments these entries draw on lives in `data/reddit-archive/` (fetched
 * via the Arctic Shift download tool, https://arctic-shift.photon-reddit.com/).
 * This is not official EPFO guidance — see the disclaimer on every page and
 * always cross-check on epfindia.gov.in.
 */
export const PROBLEMS: ProblemEntry[] = [
  {
    slug: "uan-not-activating",
    category: "uan-login",
    title: "UAN won't activate, or the activation OTP never arrives",
    short:
      "Activation fails silently, or the OTP never lands, because the number or Aadhaar details EPFO holds don't match what you're using.",
    symptoms: [
      "\"Activate UAN\" on the member portal errors out or does nothing after OTP entry",
      "OTP never arrives on your current phone number",
      "Portal says UAN is already activated but you can't log in",
    ],
    likelyCauses: [
      "The mobile number you're entering isn't the one your employer originally registered against your UAN — OTP-based activation checks that number, not your current one",
      "Your name, date of birth, or gender in EPFO records don't exactly match your Aadhaar, which silently blocks activation",
      "Your employer has never filed even one Electronic Challan cum Return (ECR) for you — the UAN exists on paper but has no activatable record yet",
      "Your Aadhaar-linked mobile number itself is inactive or was changed and never re-linked",
    ],
    fixSteps: [
      "Confirm with HR/payroll exactly which mobile number is registered against your UAN — don't assume it's your current number.",
      "If that number is wrong or dead, ask your employer to correct it in the EPFO employer portal before you attempt OTP activation again.",
      "If OTP still doesn't arrive, use face authentication instead: open the UMANG app, go to EPFO services, and complete UAN activation via biometric face auth — this bypasses SMS entirely.",
      "If activation still fails, check that your name/DOB/gender match your Aadhaar exactly (even a middle name or spelling difference is enough to block it) and get it corrected first.",
      "If your employer hasn't filed any ECR for you yet, that has to happen before UAN activation will work — chase payroll, not the portal.",
    ],
    communitySolutions: [
      "Several members report the UMANG app's face-authentication route working immediately after weeks of failed SMS-OTP attempts — worth trying before anything else if you have a smartphone.",
      "People who kept getting silent failures found the actual blocker was a spelling mismatch between their EPFO name and Aadhaar name (e.g. a missing surname) — fixing that in Aadhaar first, then retrying, worked.",
      "When HR is slow to confirm the registered number, asking payroll directly for a screenshot of the UAN record (rather than just asking \"what number did you register\") got faster answers.",
      "On r/epfoindia, members with a UMANG face-auth failure traced it to the same name-mismatch cause — the fix that worked was correcting the mismatch before retrying, not retrying repeatedly.",
      "For UMANG OTPs specifically, several r/epfoindia posters report the failure is a sync error between EPFO and UIDAI servers, not a wrong number — clearing the app cache and reinstalling UMANG fixed it for them.",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in with your UAN, Member ID, and employer details if nothing above works.",
      "Visit your jurisdictional EPFO regional office with salary slips and photo ID as a last resort.",
    ],
    sources: [
      { title: "UAN Not Activated? How to Fix EPF UAN Activation Problem Online — CitizenNest", url: "https://www.citizennest.com/guide/epf-uan-not-activated-fix" },
      { title: "UAN Activation and Login Problems: How to Fix Every Issue on EPFO Portal — Orbit Careers", url: "https://orbitcareers.com/uan-activation-problems-2026/" },
      { title: "UAN Activation Errors & Fixes (OTP, Name, DOB & Mobile) — Kustodian.life", url: "https://kustodian.life/resources/uan-activation-errors-fixes-otp-name-dob-mobile-2026-guide" },
      { title: "Not receiving SMS from EPFO site to activate UAN — any solutions? (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1mq0mq5/not_receiving_sms_from_epfo_site_to_activate_uan/" },
      { title: "Umang issue: unable to activate uan (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1mj373r/umang_issue_unable_to_activate_uan/" },
      { title: "UMANG app not sending OTP (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1n9cm3c/umang_app_not_sending_otp/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["uan", "otp", "activation", "umang", "login", "aadhaar"],
  },
  {
    slug: "multiple-uan-duplicate",
    category: "uan-login",
    title: "You ended up with two (or more) UAN numbers",
    short:
      "A new employer issues a fresh UAN instead of reusing your old one — you now have split PF balances under two logins.",
    symptoms: [
      "You have separate UANs from a previous and a current employer",
      "Your PF balance from an old job doesn't show up under your current UAN",
      "The transfer-claim form flags a duplicate UAN when you try to move funds",
    ],
    likelyCauses: [
      "A new employer didn't ask for or use your existing UAN and generated a brand-new one for you",
      "Aadhaar wasn't seeded on one of the UANs at the time, so EPFO's systems couldn't automatically recognise you as the same person",
    ],
    fixSteps: [
      "Make sure Aadhaar is seeded and verified on both UANs first — merging is only possible once both are Aadhaar-linked.",
      "Log in to the member portal and raise a transfer request from the old (inactive) UAN to your current, active one via the One Claim/OTCP transfer flow.",
      "EPFO's system automatically detects the duplicate during this transfer request, deactivates the old UAN, and links its service history and balance to your active UAN.",
      "You'll get an SMS confirming the old UAN's deactivation once the merge completes.",
      "If the automated flow doesn't trigger, email uanepf@epfindia.gov.in with both UAN numbers and ask them to merge/deactivate the duplicate manually.",
    ],
    communitySolutions: [
      "People who tried to fix this by contacting the old employer first often wasted time — going straight to Aadhar-seeding both UANs and filing the transfer request was faster in most reported cases.",
      "A few members report the uanepf@epfindia.gov.in email route working within a couple of weeks when the automatic online merge silently failed.",
      "On r/epfoindia, the exact click-path people report working is: log in to the new (active) UAN → Online Services → \"One Member, One EPF Account (Transfer Request)\" → enter the old UAN → verify and submit.",
      "One r/epfoindia poster whose employer never actioned a merge request found raising an EPFiGMS grievance specifically titled \"Duplicate UAN / Transfer of Service\", asking for the old UAN to be deactivated, got it handled directly rather than through the employer.",
    ],
    officialEscalation: [
      "Email uanepf@epfindia.gov.in with both UANs if the online transfer-triggered merge doesn't go through.",
      "Raise it as a grievance on epfigms.gov.in citing both UAN numbers if email gets no response.",
    ],
    sources: [
      { title: "Merge Two UAN EPF Accounts — Complete Procedure — BankBazaar", url: "https://www.bankbazaar.com/saving-schemes/how-to-merge-two-uan-epf-accounts.html" },
      { title: "How to Merge Two UAN Numbers of EPF Account Online? — Angel One", url: "https://www.angelone.in/knowledge-center/savings-schemes/how-to-merge-two-uan-numbers" },
      { title: "Do you have more than two UAN numbers for EPF? Here's how to merge them — Zee Business", url: "https://www.zeebiz.com/personal-finance/epfo/news-easy-steps-to-merge-or-deactivate-multiple-uans-linked-to-epfo-account-employees-provident-fund-stst-240370" },
      { title: "Merging of UAN numbers (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1o790mb/merging_of_uan_numbers/" },
      { title: "Duplicate UAN Created (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1uduugm/duplicate_uan_created/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["uan", "duplicate", "merge", "transfer"],
  },
  {
    slug: "kyc-pending-employer-approval",
    category: "kyc",
    title: "KYC stuck at \"Pending for Approval\"",
    short:
      "You've submitted PAN/bank/Aadhaar KYC on the portal but it just sits pending because it needs employer sign-off — or your employer is gone.",
    symptoms: [
      "KYC status shows \"Pending for Approval\" for weeks",
      "Claims get rejected citing incomplete KYC even though you submitted documents",
      "Your company has shut down or stopped responding, so there's no one left to approve it",
    ],
    likelyCauses: [
      "Most KYC types still route through the employer portal for digital sign-off, and HR simply hasn't approved it yet",
      "Since April 2025, bank-account KYC specifically no longer needs employer approval — but many members don't know this and keep waiting on HR unnecessarily",
      "The employer has closed down or is unresponsive, so approval will never come through normal channels",
    ],
    fixSteps: [
      "For bank account KYC: this stopped requiring employer approval in April 2025 — verification now happens directly with the bank, so check if it's already gone through before chasing HR.",
      "For PAN/Aadhaar KYC still pending: ask HR directly to log in to the EPFO employer portal and approve it under Members → KYC Approval — this is usually the single fastest fix.",
      "If your Aadhaar name and date of birth match your UAN records exactly, submit Aadhaar-based KYC — it can get auto-approved digitally without any employer step at all.",
      "If the company has closed or HR won't respond, file a grievance on epfigms.gov.in describing the situation, or visit your regional EPFO office in person with original ID documents.",
    ],
    communitySolutions: [
      "Multiple people report that switching from PAN-KYC to Aadhaar-KYC (when the Aadhaar details match exactly) skipped the employer-approval wait entirely.",
      "For closed companies, visiting the regional office in person with original Aadhaar/PAN and a printed grievance reference number got resolutions faster than waiting online.",
      "A r/epfoindia thread from someone whose bank KYC sat pending for weeks was told directly: employer approval is no longer required for bank KYC at all — it's verified only by the bank/NPCI now, so a pending status there means the delay is on the bank's side, not HR's.",
      "One employer-side reply on r/epfoindia named a specific, less obvious blocker: EPFO had been rejecting that employer's Digital Signature Certificate (DSC) for weeks, silently stalling KYC approval for 25+ employees at once — worth asking HR explicitly whether their DSC is the holdup.",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in citing your UAN and that the employer is unresponsive or closed.",
      "Visit the regional EPFO office with original identity documents if the employer no longer exists.",
    ],
    sources: [
      { title: "If the employer has not approved the KYC details... — Quora", url: "https://www.quora.com/If-the-employer-has-not-approved-the-KYC-details-and-the-company-has-stopped-3-years-ago-and-the-local-EPFO-office-has-stopped-processing-offline-KYC-what-should-I-do-now" },
      { title: "EPFO KYC Stuck? Update Bank, PAN, Aadhaar Without Employer Approval 2026 — PlanivestFin", url: "https://www.planivestfin.com/blog/epfo-kyc-update-without-employer-2026" },
      { title: "EPF KYC Not Verified: Common Errors & Quick Fixes — Kustodian.life", url: "https://kustodian.life/resources/epf-kyc-bank-verification-fix-guide" },
      { title: "EPFO Bank KYC approval time after resignation — how long does it take? (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1q2ofkp/epfo_bank_kyc_approval_time_after_resignation_how/" },
      { title: "Employer not approving pan KYC (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1i6ej3o/employer_not_approving_pan_kyc/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["kyc", "employer approval", "aadhaar", "bank seeding"],
  },
  {
    slug: "name-dob-mismatch",
    category: "kyc",
    title: "Name or date of birth doesn't match Aadhaar — claims keep failing",
    short:
      "EPFO cross-checks your identity against Aadhaar; any mismatch, even a missing middle name, silently blocks KYC, activation, and claims.",
    symptoms: [
      "Claim or KYC rejected citing an identity/Aadhaar mismatch",
      "Name spelling in EPFO records differs from Aadhaar (e.g. missing surname, different spelling)",
      "Date of birth differs by a few years between EPFO records and Aadhaar",
    ],
    likelyCauses: [
      "The employer entered your details slightly wrong when first registering your UAN and it was never corrected",
      "Your Aadhaar itself was updated later (e.g. after a correction) and EPFO records were never synced",
    ],
    fixSteps: [
      "Decide whether the mismatch is minor (spelling only) or major (a different name entirely, or a DOB gap of more than 3 years) — this determines the required proof.",
      "For online correction: log in to the Member Unified Portal, go to Manage → Joint Declaration, select the relevant Member ID, and upload proof (Aadhaar, PAN, passport, birth certificate, marksheet).",
      "The request is forwarded to your employer's dashboard for digital sign-off; once they approve, it moves to the Regional PF Office for final updating.",
      "For the offline route: download the Joint Declaration Form, fill in both the EPFO-recorded (wrong) and correct details, get it signed and stamped by your employer, and attach self-attested proof copies.",
      "Expect 15–30 days for the correction to reflect, sometimes longer — don't resubmit a claim until you've confirmed the correction actually went through.",
    ],
    communitySolutions: [
      "People with a former employer no longer around used their next/current employer to co-sign the Joint Declaration where the older employer's approval was strictly required to be re-verified against records already on file — check with your regional office whether this applies to your case.",
      "Uploading a marksheet or birth certificate alongside Aadhaar (not Aadhaar alone) sped up approval for DOB corrections larger than a year or two in multiple reported cases.",
      "On r/epfoindia, someone stuck for six months traced the actual blocker to their employer's own e-sign/DSC failing every time they tried to approve the Joint Declaration — not the correction itself — so if approval keeps silently failing, ask HR to confirm their DSC is working, not just whether they've \"approved\" it.",
      "A separate r/epfoindia case noted EPFO doesn't auto-sync a later Aadhaar correction — if you fixed your DOB in Aadhaar after your UAN was created, EPFO still shows the old value until you file the Joint Declaration yourself.",
      "For a stuck Joint Declaration specifically, one r/EPFO commenter's advice: find your regional PF office and email the Regional Officer (RO) directly and politely — \"the file must be stuck under him and if he wants he can clear it in one hour.\"",
    ],
    officialEscalation: [
      "Track the Joint Declaration status under Manage → Joint Declaration on the member portal.",
      "If it stalls past 30 days, file a grievance on epfigms.gov.in referencing the Joint Declaration submission date.",
    ],
    relatedForms: ["Joint Declaration Form"],
    sources: [
      { title: "PF Joint Declaration Form: When and How to Use It in EPFO — Bajaj Finserv", url: "https://www.bajajfinserv.in/investments/joint-declaration-form-epf" },
      { title: "EPFO Name Correction: Fix Name, DOB & Gender Mismatch — Pension Bazaar", url: "https://www.pensionbazaar.com/epf/epfo-details-correction-process/" },
      { title: "UAN Name, DOB or Joining-Date Mismatch Blocking PF? Fix Matrix", url: "https://righttoinformation.wiki/practical-guides/epfo-uan-name-dob-joining-date-mismatch-pf-withdrawal" },
      { title: "Stuck with EPFO Name Correction for 6+ Months (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1n96oc3/stuck_with_epfo_name_correction_for_6_months_will/" },
      { title: "DOB mismatch between Aadhaar and EPF record (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1tow94x/dob_mismatch_between_aadhaar_and_epf_record/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["kyc", "aadhaar", "name mismatch", "joint declaration", "dob"],
  },
  {
    slug: "claim-rejected-generic",
    category: "claims",
    title: "PF claim rejected — how to read the remark and reapply",
    short:
      "Most rejections are fixable: the portal tells you why in a \"remarks\" field most people never check before panicking.",
    symptoms: [
      "Claim status shows \"Rejected\" with no obvious explanation on first glance",
      "You've resubmitted the same claim and it was rejected again",
    ],
    likelyCauses: [
      "A small spelling or DOB mismatch between EPFO records and Aadhaar (see [Name or date of birth doesn't match Aadhaar](/problem/name-dob-mismatch/))",
      "Incomplete or unverified KYC (see [KYC stuck at \"Pending for Approval\"](/problem/kyc-pending-employer-approval/))",
      "Incorrect or unverified bank account details on file",
      "Mismatch between the employment period in your claim and what the employer's records show",
      "Outstanding dues or an unresolved break in service records",
      "EPS (pension) dates are incorrectly present on your record even though you were never an EPS member for that period — this specifically blocks Form 19 final-settlement claims and needs a Joint Declaration to set them to NULL before the claim can succeed",
    ],
    fixSteps: [
      "Go to Track Claim Status on the member portal and open the specific claim — the \"remarks\" column names the actual rejection reason.",
      "Match that reason to the relevant fix: KYC pending → get employer/Aadhaar approval; name/DOB mismatch → file a Joint Declaration; bank details wrong → re-verify KYC bank seeding.",
      "Confirm the correction has actually taken effect in your profile (check KYC status or passbook) before resubmitting — reapplying too early just repeats the rejection.",
      "File a fresh claim once the underlying issue is resolved; there's usually no separate \"appeal\" process, you just reapply.",
    ],
    communitySolutions: [
      "People who kept getting rejected without checking remarks first wasted multiple 7–10 day processing cycles — reading the remarks field before resubmitting is the single biggest time-saver reported.",
      "Several members found their real issue was a stale bank IFSC after switching branches — re-verifying bank KYC from scratch (not just checking the account number) fixed it.",
      "A widely-shared r/epfoindia breakdown lists the 7 most common actual rejection reasons (UAN not activated, KYC not approved/Error 404, bank IFSC changed, Date of Exit not updated, name/DOB mismatch, among others) — worth a skim before assuming your case is unusual.",
      "Another r/epfoindia poster's tip: \"Find the actual rejection reason: Login → Track Claim Status → check the Remarks column. Most people miss this and keep reapplying blindly.\"",
      "A detailed r/EPFO account of an 8-month rejection cycle traced it to EPS dates showing on the record despite never being an EPS member — the fix was filing a Joint Declaration specifically to set those EPS dates to NULL, which the employer had to help push through physically at the EPFO office before the claim would go through.",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in with the claim ID and rejection remark if the reason listed doesn't match your actual situation.",
      "A parallel grievance at dpg.gov.in (Directorate of Public Grievances) is worth trying if EPFiGMS stalls — several claimants report it moving faster, especially during the [EPFO 3.0 migration backlog](/problem/epfo-3-0-migration-claims-stuck/).",
    ],
    sources: [
      { title: "EPF Claim Rejection Reasons: How to Reapply After a Rejected PF Claim — ClearTax", url: "https://cleartax.in/s/epf-claim-rejected-reasons-and-how-to-apply-again" },
      { title: "PF Withdrawal Claim Rejected? Common Reasons & How to Fix Them — Ujjivan SFB", url: "https://www.ujjivansfb.bank.in/banking-blogs/personal-finance/pf-withdrawal-claim-rejected-reasons" },
      { title: "Reasons for EPF Claim Rejection & How to Reapply — Kotak Life", url: "https://www.kotaklife.com/insurance-guide/retirement/epfo-claim-rejected-reason" },
      { title: "EPF Claim Getting Rejected? These are the 7 actual reasons + fixes (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1s3qxvf/epf_claim_getting_rejected_these_are_the_7_actual/" },
      { title: "EPF claim rejected 2026 guide: error codes, EPS mismatch fix, and grievance method that works (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1sjih9g/epf_claim_rejected_2026_guide_error_codes_eps/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["claim", "rejected", "reapply", "remarks"],
  },
  {
    slug: "withdrawal-after-resignation",
    category: "claims",
    title: "Withdrawing full PF after resigning with no new job (Form 19)",
    short:
      "Full final settlement via Form 19 requires two continuous months of unemployment and an updated Date of Exit — most delays trace back to one of those two.",
    symptoms: [
      "Form 19 claim rejected or blocked immediately after resigning",
      "Portal won't let you file the claim yet even though you've already left the company",
    ],
    likelyCauses: [
      "Date of Exit hasn't been updated in the EPFO database — employers sometimes delay or forget this step",
      "You're trying to file before completing the mandatory two-month unemployment waiting period (except for permanent emigration or a female member resigning for marriage)",
    ],
    fixSteps: [
      "Confirm your Date of Exit is updated on the member portal — chase your former employer's HR if it isn't; you can't proceed without this.",
      "Wait out the two continuous months of unemployment before filing for a full withdrawal via Form 19 — you can withdraw up to 75% earlier if needed, and claim the remaining 25% after the full two months.",
      "Ensure KYC (Aadhaar, PAN, bank account) is complete and verified before filing — an incomplete KYC will bounce the claim regardless of the waiting period.",
      "Log in to the Unified Member Portal, go to Online Services → Claim (Form 31, 19 & 10C), and submit; processing typically takes 7–10 working days once accepted.",
    ],
    communitySolutions: [
      "People who filed the 75% partial claim immediately, then the remaining 25% after two full months, generally reported smoother processing than trying to wait for one full 100% claim.",
      "Several reported the fix for a stuck Date of Exit was a direct message to the ex-employer's payroll contact rather than the EPFO portal — the update has to come from the employer side.",
      "A recurring tip across r/epfoindia threads: you can mark your own exit date yourself (via the portal's \"mark exit\" option) once a month has passed, rather than waiting on the employer to do it — then apply for the full Form 19 after the full two months.",
      "One poster's exact sequence, confirmed by several replies: \"first mark your exit date of service ... apply for form 19 after 2 months of unemployment for full [withdrawal]\", with Form 10C for the pension portion claimable the next day.",
    ],
    officialEscalation: [
      "File a grievance on epfigms.gov.in if your former employer won't update the Date of Exit despite repeated requests.",
    ],
    relatedForms: ["Form 19"],
    sources: [
      { title: "Form 19: EPF Withdrawal Process & Eligibility Guide — Qandle", url: "https://www.qandle.com/glossary-form-19" },
      { title: "PF Form 19: What is it, Benefits & How to Fill EPF Form 19 — Bajaj Finserv", url: "https://www.bajajfinserv.in/investments/pf-form-19" },
      { title: "Complete Guide to Withdrawing PF and EPF After Leaving a Job — Canara HSBC Life", url: "https://www.canarahsbclife.com/blog/retirement-plan/how-to-withdraw-pf-and-epf-after-leaving-a-job" },
      { title: "PF Full withdrawal - Form-19 with 15g after 2 months of unemployment (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1pc5ab9/pf_full_withdrawal_form19_with_15g_after_2_months/" },
      { title: "PF Withdrawal (Unemployed for more than 2 months) (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1hboge0/pf_withdrawal_unemployed_for_more_than_2_months/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["form 19", "withdrawal", "resignation", "unemployment", "date of exit"],
  },
  {
    slug: "partial-withdrawal-advance",
    category: "claims",
    title: "Partial withdrawal (advance) for medical, marriage, or a house — Form 31",
    short:
      "Form 31 lets you pull money out without closing your account, but each purpose has its own eligibility, cap, and frequency limit.",
    symptoms: [
      "Unsure which form to use for a mid-career withdrawal without resigning",
      "Advance claim rejected for exceeding a purpose-specific limit or frequency cap",
    ],
    likelyCauses: [
      "Applying for a purpose your service length doesn't yet qualify for (e.g. housing requires 5 years of service)",
      "Exceeding how many times a purpose can be claimed — marriage and education advances are capped at three uses each",
      "Missing required proof (hospital admission/bills for medical, invitation/ID proof for marriage)",
    ],
    fixSteps: [
      "Match your purpose to its real limit before applying: education/marriage up to 50% of your own contribution (max 3 times each); housing 12–36 months' wages after 5 years of service; medical treatment up to actual expenses, claimable whenever a genuine need arises.",
      "Gather the purpose-specific proof first — medical needs admission/bill proof, marriage needs proof it's for you, a child, or a sibling.",
      "Log in to the Unified Member Portal, go to Online Services → Claim (Form 31, 19 & 10C), select Form 31, and choose the correct purpose code — picking the wrong code is a common cause of rejection.",
      "Expect settlement in roughly 7–15 working days once the claim is accepted.",
    ],
    communitySolutions: [
      "Members report medical-purpose claims processing fastest when the hospital bill/estimate was uploaded at time of filing rather than promised as a follow-up document.",
      "For housing advances, several people found the 5-year service-length rule is checked automatically and silently fails the claim with no clear message — verify your continuous service length first if you're anywhere near the boundary.",
      "A r/epfoindia poster whose Form 31 was rejected for \"insufficient service\" despite the portal showing 5+ years traced it to a mismatch in their employer's wage records — the fix was getting the employer to file a revised Form 3A rather than resubmitting the same claim.",
      "For marriage claims specifically, a r/epfoindia commenter's exact path: \"log in to the UAN portal, go to Online Services, select Claim Form-31, choose 'Marriage' as the purpose, and upload your wedding [proof]\" — picking the wrong purpose code is a repeat cause of rejection.",
    ],
    officialEscalation: [
      "File a grievance on epfigms.gov.in with the claim ID if a purpose-eligible claim is rejected without a clear stated reason.",
    ],
    relatedForms: ["Form 31"],
    sources: [
      { title: "EPF Advance Withdrawal: Rules, Limits & Form 31 Explained — m.Stock", url: "https://www.mstock.com/articles/how-to-withdraw-epf-in-advance" },
      { title: "EPF Form 31 – Partial Withdrawal — Paisabazaar", url: "https://www.paisabazaar.com/saving-schemes/epf-form-31/" },
      { title: "What Is EPF Form 31?: Eligibility, Withdrawal Rules & Claim Process — Bajaj Finserv", url: "https://www.bajajfinserv.in/investments/epf-form-31" },
      { title: "EPFO rejected my Form-31 saying \"insufficient service\" while their own portal showed 5+ years (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1uswb2c/epfo_rejected_my_form31_saying_insufficient/" },
      { title: "PF withdrawal for marriage, only 5 years experience (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1u1f08r/pf_withdrawal_for_marriage_only_5_years_experience/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["form 31", "advance", "medical", "marriage", "housing"],
  },
  {
    slug: "transfer-otp-not-received",
    category: "transfer",
    title: "PF transfer stuck: the OTP never arrives",
    short:
      "Transfer OTPs go to your Aadhaar-linked number specifically — DND settings and stale Aadhaar mobile links are the two most common culprits.",
    symptoms: [
      "OTP for a PF transfer claim never lands on your phone",
      "Transfer request seems to hang indefinitely without an OTP prompt going through",
    ],
    likelyCauses: [
      "DND (Do Not Disturb) is active on your number, which can block the SMS",
      "Your mobile number isn't actually linked to Aadhaar, or the linked number is outdated",
      "Temporary server load — EPFO servers reportedly restart overnight",
    ],
    fixSteps: [
      "Deactivate DND on your number via your telecom operator's app or by texting the deactivation code, then retry.",
      "Verify your Aadhaar-linked mobile number is current at the nearest Aadhaar enrollment centre if you suspect it's outdated — the OTP only ever goes to that number.",
      "Retry during early morning hours if it fails repeatedly at other times — several users report better luck when servers aren't under peak load.",
      "Remember that Aadhaar-linked UAN with complete KYC no longer strictly needs employer approval for a straightforward transfer — check if your case even needs the OTP step depended on by your specific flow.",
    ],
    communitySolutions: [
      "Multiple users on social media resolved a persistent no-OTP issue by tweeting the specifics (UAN, described issue, no personal documents) at the official @socialepfo handle, which several report gets a faster human response than the grievance portal.",
      "Turning off DND fixed it outright for a large share of people who tried it before escalating further.",
      "A specific fix posted on r/EPFO for the \"One Member One EPF Account\" flow: if OTP fails when you select \"Old PF Account Number\" in step 1, restart the transfer and choose the UAN option instead — several people confirmed this resolved a persistent \"Failed to get OTP\" error.",
      "For claims stuck for months on \"OTP retrieval failed\", a r/epfoindia poster's experience was that this traces to an Aadhaar service outage on EPFO/UIDAI's side, not anything wrong with your account — a grievance citing the exact error text got it escalated.",
    ],
    officialEscalation: [
      "Tweet the issue (without personal documents) to @socialepfo for a faster first response.",
      "Visit the nearest EPFO office with all documents if the OTP issue persists after DND and Aadhaar checks.",
    ],
    sources: [
      { title: "Unable to Process OTP Request in EPF: What to Do? — HR Cabin", url: "https://www.hrcabin.com/unable-to-process-otp-request-epf/" },
      { title: "OTP is Not Coming From EPFO Portal, Say Several Users on Social Media Platforms — DQ India", url: "https://www.dqindia.com/otp-not-coming-epfo-portal-say-several-users-social-media-platforms/" },
      { title: "Now EPFO members can change personal details, transfer EPF online without employer's intervention — Tribune India", url: "https://www.tribuneindia.com/news/now-epfo-members-can-change-personal-details-transfer-epf-online-without-employers-intervention" },
      { title: "[FIX] One Member One EPF Account Transfer \"Failed to get OTP\" error (r/EPFO)", url: "https://www.reddit.com/r/EPFO/comments/1v4386t/fix_one_member_one_epf_account_transfer_failed_to/" },
      { title: "EPF claim stuck for 4+ months due to OTP error - grievance closed (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1qi0qdt/epf_claim_stuck_for_4_months_due_to_otp_error/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["transfer", "otp", "dnd", "aadhaar"],
  },
  {
    slug: "transfer-claim-rejected",
    category: "transfer",
    title: "PF transfer claim rejected after changing jobs",
    short:
      "Since the OTCP (One Member One EPF Account) rules, most transfers no longer need employer approval at all — but incomplete Aadhaar/KYC still blocks them.",
    symptoms: [
      "Transfer claim shows as rejected instead of moving your old balance to your current UAN",
      "Confusion over whether the previous or current employer needs to approve it",
    ],
    likelyCauses: [
      "UAN isn't Aadhaar-linked, or KYC isn't fully complete — both are now prerequisites for the employer-approval-free transfer route",
      "A duplicate UAN exists from the old job (see [You ended up with two (or more) UAN numbers](/problem/multiple-uan-duplicate/)) and needs merging before the transfer can go through cleanly",
    ],
    fixSteps: [
      "Confirm your UAN is Aadhaar-linked and KYC (PAN, bank, Aadhaar) is fully verified — employees can now initiate a transfer to their new account without approval from either employer once these are in place.",
      "If the claim still gets rejected, check whether it's actually a [duplicate-UAN situation](/problem/multiple-uan-duplicate/) blocking it, and follow the merge steps there first.",
      "Refile the transfer claim through Online Services → One Member One EPF Account (Transfer Request) once KYC/Aadhaar issues are resolved.",
    ],
    communitySolutions: [
      "Several members who assumed they still needed old-employer sign-off found the claim went through immediately once Aadhaar-linking and KYC were completed — the employer-approval step is often not actually required anymore.",
      "A r/epfoindia poster who kept getting \"Rejected by field office\" traced it to their previous employer never updating exit details — the working fix reported was using the portal's own \"mark exit\" option to set the exit date yourself, matching your relieving letter, instead of waiting on the employer.",
      "For a transfer stuck on a Date of Joining mismatch, the reported fix on r/epfoindia was: Member Portal → Manage → Joint Declaration → submit a correction for Date of Joining, then ask the ex-employer's HR to approve it on their portal.",
      "A r/EPFO poster whose transfer from a named employer kept failing even after the employer confirmed the funds had already been sent found the passbook portal's claims section simply said \"module not available\" — giving no rejection reason at all. If your rejected transfer shows no remark whatsoever, that's a known EPFO 3.0-era gap, not something wrong on your end; escalate by grievance rather than repeatedly resubmitting.",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in with the transfer claim ID if it's rejected despite complete KYC and Aadhaar linking.",
      "If the passbook portal shows no rejection reason at all (e.g. \"module not available\"), file a grievance describing that exactly — this is a reported gap in the post-migration system, not a data problem you can self-diagnose.",
    ],
    sources: [
      { title: "EPF Transfer Claim Rejected? How to Fix PF Transfer When Changing Jobs — CitizenNest", url: "https://www.citizennest.com/guide/epf-transfer-claim-rejected-fix" },
      { title: "EPFO Guidelines – PF Transfer Delayed? Know What to do Next — Times Bull", url: "https://www.timesbull.com/epfo-guidelines-pf-transfer-delayed-know-what-to-do-next" },
      { title: "Now EPFO members can change personal details, transfer EPF online without employer's intervention — Tribune India", url: "https://www.tribuneindia.com/news/now-epfo-members-can-change-personal-details-transfer-epf-online-without-employers-intervention" },
      { title: "EPFO Transfer claim with \"Rejected by field office\" status (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1nrui34/epfo_transfer_claim_with_rejected_by_field_office/" },
      { title: "Claim rejected? Transfer stuck? UAN mismatch? KYC issue? (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1ud7knp/claim_rejected_transfer_stuck_uan_mismatch_kyc/" },
      { title: "EPFO Account Transfer – How I Solved Repeated Rejections (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1pblmqx/epfo_account_transfer_how_i_solved_repeated/" },
      { title: "Claim keeps getting rejected (r/EPFO)", url: "https://www.reddit.com/r/EPFO/comments/1wcbbpg/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["transfer", "rejected", "otcp", "aadhaar", "kyc"],
  },
  {
    slug: "employer-not-depositing-pf",
    category: "employer",
    title: "Employer deducted PF from your salary but never deposited it",
    short:
      "Your payslip shows a PF deduction every month, but your passbook shows no matching credit — this is a compliance failure you can act on directly.",
    symptoms: [
      "Salary slip shows PF deducted, but EPFO passbook shows missing or partial months",
      "Employer avoids questions or gives vague answers about the missing contributions",
    ],
    likelyCauses: [
      "The employer collected the deduction but simply never filed or paid the corresponding Electronic Challan cum Return (ECR)",
      "Financial distress or deliberate non-compliance by the employer",
    ],
    fixSteps: [
      "Check your EPF passbook on the member portal against your salary slips month by month to confirm exactly which periods are missing.",
      "Raise it internally first with HR, payroll, or finance and ask specifically why the ECR wasn't filed for those months.",
      "Gather evidence: salary slips showing the deduction, UAN details, any written employer communication, and passbook screenshots.",
      "File a formal grievance on the EPFiGMS portal (epfigms.gov.in), attaching that evidence and specifying the exact missing months.",
      "If EPFO's response is slow or the employer remains unresponsive, a written complaint to the local PF authority backed by the same documents can trigger an inspection.",
    ],
    communitySolutions: [
      "People who documented exact missing months (not just \"my PF isn't showing\") in the grievance got clearer, faster responses than vague complaints.",
      "In cases of prolonged non-payment, some employees report that a police complaint under IPC Sections 406/409 (criminal breach of trust) added pressure that got the employer to pay up faster — this is a serious step, best combined with the EPFO grievance rather than instead of it.",
      "A detailed r/LegalAdviceIndia walkthrough for filing on EPFiGMS: \"Go to the EPFIGMS portal at epfigms.gov.in → Click on the Register Grievance tab → Enter your UAN, security code, and click Get Details → Enter [grievance details]\" — several people found following these exact steps (rather than the general EPFO help pages) avoided a rejected/incomplete grievance.",
      "On r/mumbai, someone whose employer hadn't deposited PF for over a year outlined an escalation ladder: file the EPFO grievance first, then an RTI to EPFO if it stalls, with a police complaint under IPC 406/409 or a Labour Commissioner complaint as the next steps if that also goes nowhere.",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in with UAN, employer details, and the missing contribution period.",
      "Submit a written complaint with documentation to your local EPF authority if the online grievance stalls.",
      "A criminal complaint under IPC Sections 406/409 is a legal option for deliberate, prolonged non-deposit — consider getting labour-law advice before filing.",
    ],
    sources: [
      { title: "EPFO Guide: What happens if an employer doesn't deposit Provident Fund deductions into PF account? — Zee Business", url: "https://www.zeebiz.com/personal-finance/epfo/news-epfo-guide-consequences-for-employers-not-depositing-provident-fund-deductions-stst-242065" },
      { title: "Missing PF Contributions? Step-by-Step Guide To Check Your EPF Passbook and File a Grievance — LatestLY", url: "https://www.latestly.com/business/missing-pf-contributions-step-by-step-guide-to-check-your-epf-passbook-and-file-a-grievance-7604111.html" },
      { title: "PF Not Deposited by Employer: EPFO Complaint and Legal Notice — JuriGram", url: "https://jurigram.com/blog/labour-law/pf-not-deposited-by-employer-epfo-complaint-and-legal-notice" },
      { title: "PF deducted but not credited (r/LegalAdviceIndia)", url: "https://www.reddit.com/r/LegalAdviceIndia/comments/1ibxyoc/pf_deducted_but_not_credited/" },
      { title: "My company hasn't deposited my PF for over a year (r/mumbai)", url: "https://www.reddit.com/r/mumbai/comments/1m5hwe1/my_company_hasnt_deposited_my_pf_for_over_a_year/" },
      { title: "Employer not crediting PF (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1lfwpie/employer_not_crediting_pf/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["employer", "non-compliance", "ecr", "grievance", "missing contributions"],
  },
  {
    slug: "higher-pension-eps-pending",
    category: "pension",
    title: "Higher EPS pension application stuck in \"pending\"",
    short:
      "Following the 2022 Supreme Court judgment, over a million higher-pension applications were filed — a meaningful share are still stuck in processing.",
    symptoms: [
      "Higher pension (EPS) application status shows pending for months with no update",
      "No option to even start a fresh higher-pension application now",
    ],
    likelyCauses: [
      "The employer hasn't uploaded the required wage detail records EPFO needs to compute the higher pension amount",
      "Regional office backlog — some zones report thousands of pending cases",
      "The application window for new opt-ins has closed; this is only relevant to people who already applied within the eligible period",
    ],
    fixSteps: [
      "Check your application status on the member portal under the higher-pension option tracker.",
      "If the delay traces to your employer not uploading wage details, follow up with them directly — EPFO gave employers repeated deadline extensions specifically for this, and it's the single biggest bottleneck.",
      "If your case has been pending well beyond typical processing time, file a grievance on epfigms.gov.in citing your application reference number.",
      "Note that as of the most recent official update, there is no live window to submit a brand-new higher-pension opt-in — this process only applies to applications already filed within the eligible period.",
    ],
    communitySolutions: [
      "Members in badly backlogged regions (several zones report over 1,000 pending cases each) found direct follow-up with their regional office, not just the online grievance, got faster movement.",
      "Confirming with your employer that wage records were actually uploaded — not just assuming they were — surfaced the real blocker in several reported cases.",
      "A r/epfoindia thread tracking the government's own numbers reports 98.5% of higher-pension applications processed, with roughly 22,000 still pending and no published timeline — useful context if your own case feels unusually slow.",
      "One applicant on r/epfoindia reported that messaging their regional field office directly on WhatsApp, rather than only checking the portal, got a specific status reply (\"pending at DA accounts\") the portal itself never showed.",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in with your higher-pension application reference number.",
      "Follow up with your regional EPFO office directly if your zone is known to have a large backlog.",
    ],
    sources: [
      { title: "Higher EPS 95 Pension: EPFO received 15.24 lakh applications where cases are still pending — Business Today", url: "https://www.businesstoday.in/personal-finance/news/story/higher-eps-95-pension-epfo-received-15-24-lakh-applications-where-cases-are-still-pending-548620-2026-08-12" },
      { title: "Waiting for higher EPFO pension? Govt announces 4 steps to speed up claims — Business Standard", url: "https://www.business-standard.com/amp/finance/personal-finance/waiting-for-higher-epfo-pension-govt-announces-4-steps-to-speed-up-claims-126081400983_1.html" },
      { title: "Higher Pension option under EPFO — Government clarification on pending claims", url: "https://www.govtstaff.com/2026/08/higher-pension-option-under-epfo-government-clarification-on-pending-claims.html" },
      { title: "EPFO Rejects Over 11 Lakh Higher-Pension Claims—Only ~22k pending (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1mcz5m5/epfo_rejects_over_11_lakh_higherpension/" },
      { title: "Ask Me Anything About EPF, EPS, PF Transfers, Withdrawals & Rejected Claims (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1u9x35o/ama_ask_me_anything_about_epf_eps_pf_transfers/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["eps", "pension", "higher pension", "supreme court"],
  },
  {
    slug: "e-nomination-not-saving",
    category: "nomination",
    title: "e-Nomination won't save, or keeps throwing a mismatch error",
    short:
      "A missing profile photo and cross-checks against your Aadhaar-linked data cause most silent e-nomination failures.",
    symptoms: [
      "e-Nomination form won't submit even though every field looks filled in correctly",
      "A \"mismatch\" error appears between the EPF and EPS nominee sections",
      "The nominee/e-sign verification step fails or times out",
    ],
    likelyCauses: [
      "No profile photo uploaded — a current photo is mandatory for e-nomination and its absence blocks submission with no clear error message",
      "Nominee details don't exactly match Aadhaar-linked records (spelling, date format, or gender field differences)",
      "Browser cache/cookie issues, or a UAN whose Aadhaar isn't fully linked",
    ],
    fixSteps: [
      "Log in to the Unified Member Portal, go to Profile, and upload/update a recent passport-size photo — confirm it's visible on your profile before doing anything else.",
      "Go to Manage → E-Nomination and re-enter family/nominee details, matching every field (name spelling, full date of birth, gender) exactly to Aadhaar.",
      "If a mismatch error persists, log out completely, clear your browser cache and cookies, and retry in an incognito window or a different browser.",
      "If it specifically says Aadhaar isn't linked to your UAN, contact your employer's HR to initiate Aadhaar seeding, or visit an EPFO office for manual linking.",
    ],
    communitySolutions: [
      "The profile-photo requirement is easy to miss entirely since the form doesn't always flag it clearly — multiple people who were stuck for weeks found this was the actual blocker.",
      "Clearing cache/cookies and switching browsers resolved recurring \"mismatch\" errors for several users when the data itself looked correct.",
      "A specific browser tip repeated across r/epfoindia: when e-signing throws \"An Unexpected error has occurred\" in Chrome, switching to Firefox let the same e-nomination go through without changing anything else.",
      "One r/epfoindia poster's profile-photo upload kept silently failing to save — their exact wording was that the nominee \"will get blocked after 5 [login] attempts\", so if a photo upload isn't sticking, stop retrying blindly and check the photo file itself (size/format) before you hit that limit.",
    ],
    officialEscalation: [
      "File a grievance on epfigms.gov.in describing the exact error message if the steps above don't resolve it.",
    ],
    sources: [
      { title: "Are you unable to complete your EPF e-nomination? This profile photo issue could be the reason — Upstox", url: "https://upstox.com/news/personal-finance/latest-updates/are-you-unable-to-complete-your-epf-e-nomination-this-profile-photo-issue-could-be-the-reason/article-196997/" },
      { title: "Users facing difficulties updating nominee details on EPF portal — HR Katha", url: "https://www.hrkatha.com/news/users-facing-difficulties-updating-nominee-details-on-epf-portal/" },
      { title: "Glitches mar EPFO portal's working, members struggle to file nomination — Tribune India", url: "https://www.tribuneindia.com/news/nation/glitches-mar-epfo-portals-working-members-struggle-to-file-nomination-364170" },
      { title: "Anyone facing issues with e-signing the e-Nomination on EPFO portal? (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1jnd7tf/anyone_facing_issues_with_esigning_the/" },
      { title: "Trying to update my profile picture to file e-nomination, nothing happens (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1um6nxe/trying_to_update_my_profile_picture_to_file/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["nomination", "e-nomination", "profile photo", "eps"],
  },
  {
    slug: "death-claim-without-nomination",
    category: "nomination",
    title: "Filing a PF death claim when there's no registered nominee",
    short:
      "Without a nominee on file, legal heirs must prove entitlement with extra documents most families don't expect to need.",
    symptoms: [
      "A member has died without ever completing e-nomination",
      "Family is unsure which forms to file or what proof is required",
      "Claim rejected over missing legal-heir documentation or an Aadhaar mismatch on the death certificate",
    ],
    likelyCauses: [
      "No nominee was ever registered, so EPFO requires proof of legal heirship (a succession certificate or legal heir certificate) before releasing funds",
      "Aadhaar name/DOB mismatches on submitted documents, or an incomplete heir declaration (a commonly missed detail is omitting a surviving mother from the list of heirs)",
    ],
    fixSteps: [
      "If there is a registered nominee, they file the claim directly — nominee status takes priority over any other claimant.",
      "If there's no nominee but there are family members, funds are distributed equally among them per EPFO rules; if there are no family members either, legal heirs can claim.",
      "For legal heirs with no valid nomination on record, file Form 51F — the form specifically for death cases without a listed nominee.",
      "Assemble the full document set: Form 20 (PF), Form 10D (pension, if applicable), Form 5IF (EDLI insurance), the member's death certificate, Aadhaar, bank proof, and a succession/legal-heir certificate.",
      "Double-check every name and DOB against Aadhaar before submitting — even minor mismatches are a leading cause of rejection in death claims specifically.",
      "Make sure the heir declaration lists every legal heir correctly, including a surviving parent — omissions here are a common, avoidable rejection reason.",
    ],
    communitySolutions: [
      "Families who got a succession certificate from a local court in parallel with filing Form 51F (rather than waiting for EPFO to ask for it) avoided a second round-trip on the claim.",
      "Re-verifying every name spelling against Aadhaar before submission, rather than after a rejection, saved weeks for several families in reported cases.",
      "A r/personalfinanceindia thread warns against a specific mistake: adding an e-nomination after the member has already died — EPFO discards it as invalid since the member was deceased at the time it was filed, so don't waste time trying to backfill a nomination and go straight to the legal-heir route.",
      "Several r/epfoindia replies converge on the same core document list for a no-nominee claim: Form 20, Aadhaar of both the deceased and the claimant, PAN of both, a cancelled cheque, a photograph of the claimant, plus the succession or family-member certificate.",
    ],
    officialEscalation: [
      "File a grievance on epfigms.gov.in citing the deceased member's UAN if the claim stalls or is rejected without a clear reason.",
      "Consult a local labour-law advisor for succession certificate requirements, which vary by state.",
    ],
    relatedForms: ["Form 20", "Form 10D", "Form 5IF", "Form 51F"],
    sources: [
      { title: "Check EPF Claim After the Death of a Subscriber and its Process — BankBazaar", url: "https://www.bankbazaar.com/saving-schemes/know-about-epf-claim-after-the-death-of-a-subscriber.html" },
      { title: "EPF Death Claim Process in India: Step-by-Step Guide for Legal Heirs — Kustodian.life", url: "https://kustodian.life/resources/epf-death-claim-process-india" },
      { title: "Form 51F EPF: How Legal Heirs Can Claim PF Without Nomination — Kustodian.life", url: "https://www.kustodian.life/resources/form-51f-epf-how-legal-heirs-can-claim-pf-without-nomination" },
      { title: "Death PF Claim with No Nominee (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1shp6n2/death_pf_claim_with_no_nominee/" },
      { title: "EPFO CLAIM AFTER DEATH || No E-Nomination (r/personalfinanceindia)", url: "https://www.reddit.com/r/personalfinanceindia/comments/1s33txa/epfo_claim_after_death_no_enomination/" },
      { title: "PF Withdrawl querry when employee is dead with no nominee (r/personalfinanceindia)", url: "https://www.reddit.com/r/personalfinanceindia/comments/1g1u21q/pf_withdrawl_querry_when_employee_is_dead_with_no/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["death claim", "nomination", "legal heir", "succession certificate"],
  },
  {
    slug: "tds-on-withdrawal",
    category: "tax",
    title: "Why was tax (TDS) deducted from my PF withdrawal?",
    short:
      "TDS only applies before 5 years of continuous service and above ₹50,000 — and jumps to 20% if you didn't submit your PAN.",
    symptoms: [
      "Withdrawn amount is less than the passbook balance, with no clear explanation",
      "TDS deducted despite feeling like you'd worked \"long enough\"",
    ],
    likelyCauses: [
      "Withdrawal happened before completing 5 years of continuous eligible service, and the amount exceeded ₹50,000",
      "PAN wasn't linked/submitted at the time of withdrawal, triggering the higher 20% TDS rate instead of 10%",
      "Eligible Form 15G/15H wasn't submitted where it could have prevented deduction",
    ],
    fixSteps: [
      "Check your continuous service length first — withdrawals after 5 full years of continuous eligible service are generally exempt from TDS under Section 10(12) of the Income-tax Act.",
      "If under 5 years and over ₹50,000, 10% TDS applies with PAN on file, or 20% without PAN — confirm your PAN was correctly linked before you filed the claim, for future withdrawals.",
      "If you were eligible (income below the taxable threshold), Form 15G (or 15H for senior citizens) can be submitted before withdrawal to avoid TDS altogether — check this before filing your next claim, since it can't undo TDS already deducted.",
      "Any TDS already deducted still appears in your Form 26AS and can be claimed back through your income tax return if your actual tax liability is lower than what was withheld.",
    ],
    communitySolutions: [
      "People who withdrew close to 5 years' service but were surprised by TDS often found their \"continuous service\" clock had actually reset due to a transfer gap or duplicate UAN — worth double-checking your actual continuous-service date before assuming an error.",
      "Filing the income tax return and claiming the TDS credit (rather than trying to get EPFO to \"undo\" it) is the practical path once tax has already been deducted.",
      "A r/epfoindia poster who withdrew after 3.5 years and lost ₹30k to TDS made the point plainly: EPFO doesn't warn you before deducting it, and the withdrawal amount alone (not your final tax liability) decides whether TDS applies at all — plan for it before you submit the claim, not after.",
      "Multiple r/IndiaTax and r/epfoindia threads confirm the same practical outcome: TDS deducted under Section 192A is not the same as final tax owed, and if your total income is below the taxable threshold, filing an ITR gets the full amount refunded — one poster titled their thread exactly that: \"Successfully got the refund for the TDS deducted on PF withdrawal.\"",
    ],
    officialEscalation: [
      "TDS already deducted is not reversible by EPFO directly — recover it, if applicable, through your income tax return using the Form 26AS credit.",
    ],
    relatedForms: ["Form 15G", "Form 15H"],
    sources: [
      { title: "Income Tax on EPF Withdrawal | PF Withdrawal Taxability — ClearTax", url: "https://cleartax.in/s/pf-balance-withdrawal-incometax" },
      { title: "EPFO rules on TDS for EPF withdrawal: When your PF money is taxed — Upstox", url: "https://upstox.com/news/personal-finance/investing/epfo-rules-on-tds-for-epf-withdrawal-when-your-pf-money-is-taxed/article-193478/" },
      { title: "TDS on PF Withdrawal: Rules, Rates, & How to Minimise Tax — Bajaj Finserv", url: "https://www.bajajfinserv.in/investments/tds-on-pf-withdrawal" },
      { title: "\"Withdrew my PF after 3.5 years, got ₹30k cut as TDS. EPFO didn't warn...\" (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1s2j6sp/withdrew_my_pf_after_35_years_got_30k_cut_as_tds/" },
      { title: "Successfully got the refund for the TDS deducted on PF withdrawal (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1u9xs94/successfully_got_the_refund_for_the_tds_deducted/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["tax", "tds", "form 15g", "form 15h", "5 year rule"],
  },
  {
    slug: "passbook-not-updated-interest",
    category: "passbook",
    title: "Passbook not updating, or annual interest missing",
    short:
      "Monthly contributions and annual interest post on very different timelines — most \"missing interest\" worries are just timing.",
    symptoms: [
      "Recent monthly contribution isn't showing in the passbook yet",
      "Annual interest for the last financial year hasn't appeared",
      "Passbook shows a gap or \"break\" in some months' contributions",
    ],
    likelyCauses: [
      "Normal processing lag — monthly contributions post within roughly 3–7 working days after the employer deposits them, and interest is credited annually, typically finalised and visible between April and September of the following year",
      "The employer actually missed depositing contributions for some months, which delays that year's interest finalisation for the whole account",
      "KYC or UAN issues creating processing delays generally",
      "An unmerged duplicate UAN splitting your contribution history across two records",
    ],
    fixSteps: [
      "Check the timing first — if it's before roughly July–September for annual interest, or within a week of an employer deposit for monthly contributions, this is likely still normal processing, not an error.",
      "Log in to the EPFO Member Passbook portal and check month-by-month for any contribution \"break\" — a missing month from the employer will delay that year's interest finalisation.",
      "If a specific employer month is missing, that's actually an [employer non-deposit issue](/problem/employer-not-depositing-pf/) — follow that entry for how to escalate it directly.",
      "Confirm your UAN, KYC, and bank details are all correct and complete, since processing delays compound when any of these are outstanding.",
      "If interest is still missing well after the typical window, or contributions are missing with no explanation, file a grievance with your UAN, PF number, a description of the issue, and a passbook screenshot.",
    ],
    communitySolutions: [
      "Many \"missing interest\" grievances turn out to be pure timing — several members report the entry appearing on its own within the April–September window without any action needed.",
      "When a specific month was genuinely missing, treating it as an employer non-deposit issue (not a passbook bug) and escalating to the employer directly got it resolved faster than repeatedly refreshing the passbook.",
      "A less obvious cause reported on r/epfoindia: EPFO can stop crediting interest on an account that has had no contributions for 2–3 years — if that's your situation, the fix isn't a grievance at all, it's [merging that dormant account into your active UAN](/problem/multiple-uan-duplicate/).",
      "One r/epfoindia poster noted that even once the passbook service comes back up, a newly-appeared interest figure may be \"provisional\" and actually reflect last year's number rather than the current year's — worth checking the dates on the entry itself before assuming it's wrong or final.",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in with UAN, PF number, and a passbook screenshot if interest or contributions remain missing well past the normal window.",
    ],
    sources: [
      { title: "EPF Interest for FY 2025-26 Not Credited? Reasons & Solutions — Square Insurance", url: "https://www.squareinsurance.in/blog/general-awareness/epf-interest-not-credited" },
      { title: "EPF Interest Not Credited? Reasons, Timeline & Solutions — Pension Bazaar", url: "https://www.pensionbazaar.com/epf/epf-interest-not-credited/" },
      { title: "EPF Passbook Errors: Common Issues & Solutions Guide — Pension Bazaar", url: "https://www.pensionbazaar.com/epf/epf-passbook-errors/" },
      { title: "Interest not credited for 2+ years (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1mv9ksr/interest_not_credited_for_2_years/" },
      { title: "PF Interest Not Credited Yet for FY 2025–26. Anyone Else Facing This? (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1trpw2i/pf_interest_not_credited_yet_for_fy_202526_anyone/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["passbook", "interest", "delay", "grievance"],
  },
  {
    slug: "epfo-3-0-migration-claims-stuck",
    category: "claims",
    title: "Claim stuck at \"Claim Submitted at Portal\" since the EPFO 3.0 migration",
    short:
      "EPFO's July 2026 system migration ('EPFO 3.0') left a large backlog of claims frozen at the very first status stage for weeks — this is a known, widespread event, not something wrong with your account specifically.",
    symptoms: [
      "Claim status has shown \"Claim Submitted at Portal\" for over a week with zero movement, even though it was filed around early July 2026",
      "Status flips backward — from \"processing\" or \"under process\" back to \"Claim Submitted at Portal\" — instead of moving forward",
      "A grievance about the delay gets a templated reply blaming \"migration\" or a bank's \"technical issue\" rather than a real update",
      "Two people who filed on the same day see wildly different outcomes — one gets paid in a day, another waits a month, with no visible pattern",
    ],
    likelyCauses: [
      "EPFO ran a large-scale system migration (\"EPFO 3.0\") starting around early July 2026, which is officially confirmed as having caused a period of \"Scheduled System Migration and Temporary Service Unavailability\"",
      "Post-migration processing appears to run in batches that are not strictly first-come-first-served, so filing date alone doesn't predict when a claim moves",
      "Some rejections during this period trace to new-system quirks specific to the migration — e.g. a \"PAN not verified\" flag appearing on claims where PAN was actually verified before the migration",
    ],
    fixSteps: [
      "Don't panic or resubmit repeatedly if your claim has only been stuck a few days — during and shortly after the migration window, multi-week stalls at this exact stage were common and usually resolved without any action.",
      "Check Track Claim Status for a specific rejection remark first — if one exists, treat it like [any other rejection](/problem/claim-rejected-generic/) rather than assuming it's purely a migration backlog.",
      "If it's been stuck for multiple weeks with no remark at all, file a grievance via EPFiGMS citing the exact claim ID and filing date, and separately via the DPG portal (dpg.gov.in) — several people report DPG grievances moving faster than EPFiGMS ones during this backlog.",
      "As a last resort if grievances go nowhere, some claimants report success publicly tagging @socialepfo, your regional EPFO handle, and the Ministry of Labour on X/Twitter with the claim ID and UAN (no other personal documents) — treat this as a genuine but unofficial escalation channel, not a first step.",
    ],
    communitySolutions: [
      "A r/epfoindia thread with 74 comments (\"EPFO 3.0 WITHDRAWL (Amount Received)\") captured the general mood well: multiple commenters independently described the post-migration processing as \"lottery\"/\"random batch\" rather than ordered by filing date — don't read your neighbor's faster approval as a sign something is specifically wrong with your claim.",
      "One reply in that thread gave the most concrete, checkable advice for why a claim might specifically be stuck rather than just \"in the batch\": \"Check the KYC, min service 12 months, service history clean then raise grievance.\"",
      "A detailed r/EPFO post titled \"My PF Withdrawal (Form 19) got finally settled AFTER I did these 2 things\" describes an 8-month ordeal where the claim was rejected repeatedly, in that case because EPS dates were incorrectly present despite never being an EPS member. The two things that reportedly unstuck it: (1) filing a grievance on the DPG portal (dpg.gov.in), which the poster called more effective than EPFiGMS and (2) publicly tagging official EPFO and Ministry of Labour handles on X with the claim ID and UAN.",
      "An official-looking EPFO News post on r/EPFO titled simply \"Temporary\" (57 upvotes) is the closest thing to an acknowledgment in the wild: \"Important Notice: Scheduled System Migration and Temporary Service Unavailability, EPFO services will be made available after restoration.\" — confirms this was a known, systemic event, not an isolated fault.",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in with your claim ID, UAN, and filing date.",
      "File a parallel grievance at the Directorate of Public Grievances portal, dpg.gov.in — multiple claimants report faster movement there during this backlog than through EPFiGMS alone.",
      "As a last resort, publicly tag @socialepfo and your regional EPFO office's handle on X/Twitter with your claim ID and UAN (never post other personal documents publicly).",
    ],
    sources: [
      { title: "EPFO 3.0 WITHDRAWL (Amount Received) (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1uw9fxi/" },
      { title: "System Upgrade or System Downgrade?? (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1uwci2j/" },
      { title: "My PF Withdrawal (Form 19) got finally settled AFTER I did these 2 things (r/EPFO)", url: "https://www.reddit.com/r/EPFO/comments/1we4r05/" },
      { title: "Whoever made EPFO 3.0 compliance & Governance, kindly resign immediately (r/EPFO)", url: "https://www.reddit.com/r/EPFO/comments/1wdovk0/" },
      { title: "Temporary [EPFO migration notice] (r/EPFO)", url: "https://www.reddit.com/r/EPFO/comments/1wdvfh1/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["epfo 3.0", "migration", "claim stuck", "submitted at portal", "dpg", "2026"],
  },
  {
    slug: "delinking-request-stuck-pending",
    category: "claims",
    title: "A \"Delinking\" request to remove a wrong employer from your service history never clears",
    short:
      "Delinking removes an incorrect or unwanted past-employer entry from your EPFO service history — and while it's stuck pending, it can block every withdrawal, sometimes for months.",
    symptoms: [
      "Every claim gets blocked with an error tied to service history or a pending delinking request, even though the claim itself looks otherwise eligible",
      "The delinking request status has shown \"pending\" for weeks or months with no movement",
      "A short, unwanted stint at a past employer (sometimes just days) is still showing in your EPFO service history and won't go away",
    ],
    likelyCauses: [
      "A delinking request was filed to remove that old employer's entry, and it is stuck in EPFO's internal approval queue — especially likely during or after the EPFO 3.0 migration window, which several people report broke visibility into pending manual requests entirely",
      "The PF from that short-term employer was already transferred or merged into a later employer's account — per an EPFO circular cited by multiple commenters, a delinking request can never actually be approved once that transfer has happened, so it sits pending indefinitely instead of being resolved either way",
    ],
    fixSteps: [
      "Check whether the PF from the employer you're trying to delink was ever transferred/merged into a later account. If it was, an approval is not coming — the request needs to be rejected, not approved, to clear the block.",
      "File a grievance that explicitly asks EPFO to reject the pending delinking request (citing its request ID) rather than a generic \"please process my delinking\" grievance — this is the specific ask that reportedly gets it resolved.",
      "If the online grievance goes nowhere, try emailing your regional PF office (Regional Officer) directly with the request ID, and as a parallel channel, a grievance on the DPG portal (dpg.gov.in).",
      "If a claim was already rejected specifically because of the pending delinking request, you can typically resubmit it once the delinking request itself is cleared (approved or rejected) — don't keep resubmitting the claim while delinking is still pending, it will keep failing the same way.",
    ],
    communitySolutions: [
      "The single most specific, confirmed-working tip from r/EPFO: \"Copy this request id and raise a grievance asking them to reject the request from your pending applications... There was a rule that if we transfer pf from that short term employer then it can never be delinked.\" One poster reported their delink request was rejected within two weeks of that specific grievance — and once rejected (not approved), they were able to raise claims again.",
      "A second commenter confirmed the same rule independently: \"If pf is already transferred for that short term employer then it can never be delinked to maintain epfo records... Just got the application rejected this week and able to raise claims now.\"",
      "Several people report the EPFO 3.0 migration itself made this worse — one reply put it bluntly: \"the 'upgrade' broke a lot of things. They can't see the request to manually delink, even if they want to,\" with a physical, in-person claim at the regional office suggested as the fallback when the online system can't see the request at all.",
      "One poster's advice on getting a stuck file actually looked at: find your regional PF office and email the Regional Officer (RO) directly and politely with the specifics — \"the file must be stuck under him and if he wants he can clear it in one hour.\"",
    ],
    officialEscalation: [
      "File a grievance at epfigms.gov.in that specifically asks for the pending delinking request (cite its request ID) to be rejected, if the underlying PF was already transferred elsewhere.",
      "File a parallel grievance at dpg.gov.in (Directorate of Public Grievances) if EPFiGMS stalls.",
      "Email your regional PF office's Regional Officer directly, and as a last resort, submit a physical claim in person at the regional EPFO office.",
    ],
    sources: [
      { title: "Whoever made EPFO 3.0 compliance & Governance, kindly resign immediately (r/EPFO)", url: "https://www.reddit.com/r/EPFO/comments/1wdovk0/" },
      { title: "Unexpected EPFO employment entry from insurance advisor role — trying to understand how this could happen (r/epfoindia)", url: "https://www.reddit.com/r/epfoindia/comments/1uwbb0p/" },
    ],
    lastVerified: "2026-09-15",
    tags: ["delinking", "service history", "claim blocked", "grievance", "epfo 3.0"],
  },
];

export function problemBySlug(slug: string): ProblemEntry | undefined {
  return PROBLEMS.find((p) => p.slug === slug);
}

export function problemsByCategory(categorySlug: string): ProblemEntry[] {
  return PROBLEMS.filter((p) => p.category === categorySlug);
}

export function relatedProblems(entry: ProblemEntry, limit = 4): ProblemEntry[] {
  return PROBLEMS.filter((p) => p.category === entry.category && p.slug !== entry.slug).slice(0, limit);
}
