"use client";

import { useId, useState } from "react";

const inputClass =
  "w-full rounded-2xl border-2 border-navy-900/12 bg-white px-4 py-2.5 text-sm text-navy-900 outline-none placeholder:text-navy-400 transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/15";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const ids = { name: useId(), email: useId(), topic: useId(), message: useId() };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-[28px] border-2 border-mint-400/40 bg-mint-50 p-6 text-sm font-semibold text-mint-700">
        Thanks for reaching out — we usually reply within 2–3 business days.
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-[28px] border border-navy-900/8 bg-white p-5 shadow-card"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.name} className="text-sm font-bold text-navy-800">
            Name
          </label>
          <input id={ids.name} required className={inputClass} placeholder="Your name" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={ids.email} className="text-sm font-bold text-navy-800">
            Email
          </label>
          <input id={ids.email} type="email" required className={inputClass} placeholder="you@example.com" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.topic} className="text-sm font-bold text-navy-800">
          Topic
        </label>
        <select id={ids.topic} className={inputClass} defaultValue="General">
          <option>General</option>
          <option>Copyright / takedown request</option>
          <option>Correction to a meme explanation</option>
          <option>Partnership / press</option>
          <option>Something else</option>
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={ids.message} className="text-sm font-bold text-navy-800">
          Message
        </label>
        <textarea id={ids.message} required rows={5} className={inputClass} placeholder="How can we help?" />
      </div>
      <button
        type="submit"
        className="self-start rounded-full bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-glow-violet)] transition hover:-translate-y-0.5"
      >
        Send message
      </button>
    </form>
  );
}
