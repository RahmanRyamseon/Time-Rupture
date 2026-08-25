import type { Metadata } from "next";
import SubmitForm from "@/components/SubmitForm";

export const metadata: Metadata = {
  title: "Submit a Meme",
  description:
    "Submit a meme to Meme Maloom for review — include the language, region, category and cultural context so our editors can explain it properly.",
};

export default function SubmitPage() {
  return (
    <div className="relative">
      <div aria-hidden="true" className="bg-mesh-light pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70" />
      <div className="relative mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-bold tracking-widest text-gradient uppercase">
            Add to the archive
          </p>
          <h1 className="font-display mt-1 text-3xl font-bold text-navy-900 sm:text-4xl">
            Submit a meme
          </h1>
          <p className="mt-2 text-navy-600">
            Know a meme that deserves the Meme Maloom explainer treatment?
            Tell us about it. Every submission is reviewed by our editors
            before it goes live.
          </p>
        </header>
        <SubmitForm />
      </div>
    </div>
  );
}
