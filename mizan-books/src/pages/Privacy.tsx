import { useStore } from "../lib/store";
import { Card } from "../components/ui";

// Bilingual privacy notice & terms. Facts here must match the code: local IndexedDB storage,
// no cookies/analytics, optional AI (Anthropic, US) and OpenOCR uploads. Review with counsel.
const EN = [
  ["What this app is", "Mizan Books is bookkeeping software. The business using it decides what is recorded and is responsible for its own books, VAT returns and the personal data in its documents (for example supplier and customer names)."],
  ["Where your data is kept", "Your books stay in this browser on this device (IndexedDB). We have no accounts and no server copy. Clearing the browser deletes them, so download backups. No cookies, analytics or advertising trackers are used."],
  ["When documents leave your device", "Only if you switch on AI reading (Company & settings). Then each scanned invoice or statement is sent through our Netlify server function to Anthropic (Claude) for reading, both processed in the United States. That is a transfer of data outside Bahrain under Articles 12–13 of the Personal Data Protection Law (Law No. 30 of 2018). If an OpenOCR server is connected, page images go to that server. With both off, scanning happens entirely on your device."],
  ["Retention", "We keep nothing. The AI service may keep requests for a limited period under its own terms. Bahrain VAT rules require you to keep your records for at least 5 years — that is your responsibility."],
  ["Your rights", "You can view, correct, export (backup) and delete everything in Company & settings. For questions about this site, contact its operator (contact details to be published)."],
  ["Terms", "Provided as is, without warranty. Figures, VAT treatments and return boxes are aids, not tax or legal advice; check them against the NBR forms and with your accountant or auditor before filing. Governing law: Kingdom of Bahrain."],
] as const;
const AR = [
  ["ما هو هذا التطبيق", "ميزان للدفاتر برنامج محاسبة. المنشأة التي تستخدمه هي التي تقرر ما يُسجَّل وهي المسؤولة عن دفاترها وإقراراتها الضريبية وعن البيانات الشخصية الواردة في مستنداتها (مثل أسماء الموردين والعملاء)."],
  ["أين تُحفظ بياناتك", "تبقى دفاترك في هذا المتصفح على هذا الجهاز (IndexedDB). لا توجد حسابات ولا نسخة على خوادمنا. مسح بيانات المتصفح يحذفها، لذا نزّل نسخاً احتياطية. لا نستخدم ملفات تعريف الارتباط ولا أدوات تحليل أو تتبع إعلاني."],
  ["متى تغادر المستندات جهازك", "فقط إذا فعّلت القراءة بالذكاء الاصطناعي (الإعدادات). عندها تُرسل كل فاتورة أو كشف ممسوح عبر دالة الخادم لدينا على Netlify إلى Anthropic (Claude) لقراءتها، وتتم المعالجة في الولايات المتحدة. ويُعد ذلك نقلاً للبيانات خارج البحرين وفق المادتين ١٢ و١٣ من قانون حماية البيانات الشخصية (القانون رقم ٣٠ لسنة ٢٠١٨). وإذا رُبط خادم OpenOCR تُرسل صور الصفحات إليه. عند إيقافهما يتم المسح بالكامل على جهازك."],
  ["مدة الاحتفاظ", "لا نحتفظ بأي شيء. قد تحتفظ خدمة الذكاء الاصطناعي بالطلبات لفترة محدودة وفق شروطها. تتطلب قواعد ضريبة القيمة المضافة في البحرين الاحتفاظ بالسجلات ٥ سنوات على الأقل، وهذه مسؤوليتك."],
  ["حقوقك", "يمكنك عرض كل البيانات وتصحيحها وتصديرها (نسخة احتياطية) وحذفها من الإعدادات. للاستفسار عن هذا الموقع تواصل مع مشغّله (ستُنشر بيانات التواصل)."],
  ["الشروط", "يُقدَّم البرنامج كما هو دون ضمان. الأرقام والمعالجات الضريبية وخانات الإقرار أدوات مساعدة وليست استشارة ضريبية أو قانونية؛ راجعها مع نماذج الجهاز الوطني للإيرادات ومع محاسبك أو مدققك قبل التقديم. القانون الحاكم: قانون مملكة البحرين."],
] as const;

export default function Privacy() {
  const { lang } = useStore();
  const rows = lang === "ar" ? AR : EN;
  return (
    <div className="page">
      <Card title={lang === "ar" ? "الخصوصية والشروط" : "Privacy & terms"}>
        {rows.map(([h, p]) => (<section key={h}><h3 className="sub-h">{h}</h3><p>{p}</p></section>))}
        <p className="muted small">{lang === "ar" ? "آخر تحديث: نوفمبر ٢٠٢٦" : "Last updated: November 2026"}</p>
      </Card>
    </div>
  );
}
