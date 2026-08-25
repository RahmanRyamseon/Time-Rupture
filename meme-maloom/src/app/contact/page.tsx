import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Meme Maloom team.",
};

export default function ContactPage() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="bg-mesh-light pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" />
      <div className="relative mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-xs font-bold tracking-widest text-gradient uppercase">Say hi</p>
        <h1 className="font-display mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">
          Contact us
        </h1>
        <p className="mt-2 text-navy-600">
          Questions, corrections, copyright requests or just want to tell us
          about a meme we&apos;re missing? Send a note — a human reads every one.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <a
            href="mailto:hello@mememaloom.in"
            className="rounded-full bg-violet-50 px-4 py-2 font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            hello@mememaloom.in
          </a>
          <a
            href="mailto:copyright@mememaloom.in"
            className="rounded-full bg-violet-50 px-4 py-2 font-semibold text-violet-700 transition hover:bg-violet-100"
          >
            copyright@mememaloom.in
          </a>
        </div>
        <div className="mt-6">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
