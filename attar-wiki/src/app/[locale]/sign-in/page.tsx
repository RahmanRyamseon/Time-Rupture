import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/metadata";
import { SignInForm } from "./SignInForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return pageMetadata("/sign-in", locale, t("auth.title"), null, { robots: { index: false } });
}

export default async function SignInPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");
  return (
    <div className="container-wiki py-12">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("intro")}</p>
        <SignInForm googleEnabled={process.env.NEXT_PUBLIC_AUTH_GOOGLE === "true"} />
      </div>
    </div>
  );
}
