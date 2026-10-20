import { useState, type FormEvent } from "react";
import { api, ApiClientError } from "@/lib/api";
import { useDocumentMeta } from "@/lib/seo";
import { useSettings } from "@/app/providers/SettingsProvider";
import { useLang } from "@/app/providers/LanguageProvider";
import { Turnstile } from "@/components/Turnstile";
import { Spinner } from "@/components/ui/states";
import { contactSchema } from "@shared/validation";

export default function ContactPage() {
  const { settings } = useSettings();
  const { t } = useLang();
  useDocumentMeta({ title: t("Contact", "Contact"), description: t("Contactez Arkane Production pour vos projets.", "Get in touch with Arkane Production about your projects.") });

  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = contactSchema.safeParse({ ...form, turnstileToken: token || "x" });
    if (!parsed.success) {
      setError(t("Veuillez vérifier les champs du formulaire.", "Please check the form fields."));
      return;
    }
    if (!token) {
      setError(t("Veuillez compléter la vérification anti-robot.", "Please complete the anti-robot check."));
      return;
    }
    setStatus("submitting");
    try {
      await api.post("/contact", { ...form, turnstileToken: token });
      setStatus("success");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch (err) {
      setStatus("idle");
      setError(err instanceof ApiClientError ? err.message : t("Envoi impossible. Réessayez.", "Couldn't send. Please try again."));
    }
  };

  if (status === "success") {
    return (
      <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
        <p className="eyebrow">{t("Message envoyé", "Message sent")}</p>
        <h1 className="mt-5 font-display text-4xl font-black tracking-tightest md:text-6xl">{t("Merci.", "Thank you.")}</h1>
        <p className="mt-5 max-w-md text-fg-muted">
          {t("Votre message a bien été reçu. Nous revenons vers vous rapidement.", "Your message has been received. We'll get back to you shortly.")}
        </p>
        <button type="button" className="btn-outline mt-8" onClick={() => setStatus("idle")}>{t("Envoyer un autre message", "Send another message")}</button>
      </div>
    );
  }

  return (
    <div className="container-page pt-28 md:pt-36">
      <div className="grid gap-12 pb-20 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
        <div>
          <p className="eyebrow">{t("Contact", "Contact")}</p>
          <h1 className="mt-5 font-display text-[clamp(2.25rem,5vw,4.5rem)] font-black leading-[0.98] tracking-tightest">
            {t("Parlons de votre projet.", "Let's talk about your project.")}
          </h1>
          <p className="mt-6 max-w-sm text-base leading-relaxed text-fg-muted">
            {t("Une question, un devis, une collaboration ? Écrivez-nous, nous répondons rapidement.", "A question, a quote, a collaboration? Write to us — we reply quickly.")}
          </p>
          <ul className="mt-8 space-y-2 text-sm text-fg-muted">
            {settings?.contactEmail && <li><a href={`mailto:${settings.contactEmail}`} className="hover:text-fg">{settings.contactEmail}</a></li>}
            {settings?.contactPhone && <li>{settings.contactPhone}</li>}
            {settings?.address && <li className="text-fg-subtle">{settings.address}</li>}
          </ul>
        </div>

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="field-label">{t("Nom", "Name")} *</label>
              <input id="name" className="field-input" value={form.name} onChange={set("name")} required maxLength={120} />
            </div>
            <div>
              <label htmlFor="phone" className="field-label">{t("Téléphone", "Phone")}</label>
              <input id="phone" className="field-input" value={form.phone} onChange={set("phone")} maxLength={30} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="field-label">Email</label>
            <input id="email" type="email" className="field-input" value={form.email} onChange={set("email")} maxLength={180} />
          </div>
          <div>
            <label htmlFor="subject" className="field-label">{t("Sujet", "Subject")} *</label>
            <input id="subject" className="field-input" value={form.subject} onChange={set("subject")} required maxLength={160} />
          </div>
          <div>
            <label htmlFor="message" className="field-label">Message *</label>
            <textarea id="message" className="field-input min-h-[160px] resize-y" value={form.message} onChange={set("message")} required maxLength={4000} />
          </div>

          <Turnstile onVerify={setToken} onExpire={() => setToken("")} />
          {error && <p className="text-sm text-fg-strong">{error}</p>}

          <button type="submit" className="btn-primary" disabled={status === "submitting"}>
            {status === "submitting" ? <Spinner className="h-4 w-4" /> : t("Envoyer le message", "Send message")}
          </button>
        </form>
      </div>
    </div>
  );
}
