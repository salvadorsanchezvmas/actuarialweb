const env = require('../config/env');
const { escapeHtml: e } = require('../utils/http');

const NAVY = '#232d46';
const GOLD = '#c2a76a';

/** Copy for user-facing emails. The internal notification stays in English. */
const COPY = {
  en: {
    footer: 'Actuarial Factor, LLC · 1 Alhambra Plaza, Floor PH, Coral Gables, FL 33134 · Av. Pte. Masaryk 111, Polanco, CDMX 11560',
    confirmSubject: 'We received your request — Actuarial Factor',
    confirmTitle: (name) => `Thank you, ${name}`,
    confirmPre: 'Our team will contact you shortly.',
    confirmBody: 'We have received your consultation request. A member of our actuarial team will contact you within the next business day.',
    confirmHelp: 'If you need immediate assistance, call us at <strong>+1 800-957-9196</strong> or <strong>+52 55-2155-2059</strong>.',
    confirmCta: 'Explore our practice areas',
    confirmText: (name) => `Thank you, ${name}. We have received your consultation request and will contact you shortly.`,
    welcomeSubject: 'Welcome to the Actuarial Factor newsletter',
    welcomeTitle: 'You are subscribed',
    welcomeBody: 'Thank you for subscribing. You will receive regulatory updates, market insights and news from our team.',
    welcomeCta: 'Read our latest insights',
    unsubscribe: (link) => `Don't want these emails? <a href="${link}" style="color:#5d6478">Unsubscribe</a>.`,
    welcomeText: (link) => `Thank you for subscribing to the Actuarial Factor newsletter.\nUnsubscribe: ${link}`,
    resetSubject: 'Reset your password — Actuarial Factor client portal',
    resetTitle: 'Password reset',
    resetBody: (name) => `Hello ${name}, we received a request to reset your password. This link is valid for 1 hour.`,
    resetCta: 'Reset password',
    resetIgnore: 'If you did not request this, you can ignore this email.',
    resetText: (link) => `Reset your password (valid for 1 hour): ${link}`,
  },
  es: {
    footer: 'Actuarial Factor, LLC · 1 Alhambra Plaza, Floor PH, Coral Gables, FL 33134 · Av. Pte. Masaryk 111, Polanco, CDMX 11560',
    confirmSubject: 'Recibimos su solicitud — Actuarial Factor',
    confirmTitle: (name) => `Gracias, ${name}`,
    confirmPre: 'Nuestro equipo le contactará a la brevedad.',
    confirmBody: 'Recibimos su solicitud de consulta. Un miembro de nuestro equipo actuarial le contactará dentro del siguiente día hábil.',
    confirmHelp: 'Si necesita atención inmediata, llámenos al <strong>+1 800-957-9196</strong> o al <strong>+52 55-2155-2059</strong>.',
    confirmCta: 'Conozca nuestras áreas de práctica',
    confirmText: (name) => `Gracias, ${name}. Recibimos su solicitud de consulta y le contactaremos a la brevedad.`,
    welcomeSubject: 'Bienvenido al boletín de Actuarial Factor',
    welcomeTitle: 'Su suscripción está activa',
    welcomeBody: 'Gracias por suscribirse. Recibirá actualizaciones regulatorias, tendencias del mercado y noticias de nuestro equipo.',
    welcomeCta: 'Leer nuestras publicaciones',
    unsubscribe: (link) => `¿No desea recibir estos correos? <a href="${link}" style="color:#5d6478">Cancelar suscripción</a>.`,
    welcomeText: (link) => `Gracias por suscribirse al boletín de Actuarial Factor.\nCancelar suscripción: ${link}`,
    resetSubject: 'Restablezca su contraseña — Portal de clientes de Actuarial Factor',
    resetTitle: 'Restablecer contraseña',
    resetBody: (name) => `Hola ${name}, recibimos una solicitud para restablecer su contraseña. Este enlace es válido por 1 hora.`,
    resetCta: 'Restablecer contraseña',
    resetIgnore: 'Si usted no lo solicitó, puede ignorar este correo.',
    resetText: (link) => `Restablezca su contraseña (válido por 1 hora): ${link}`,
  },
};
const copy = (lang) => COPY[lang] || COPY.en;
const withLang = (url, lang) => (lang === 'es' ? `${url}${url.includes('?') ? '&' : '?'}lang=es` : url);

/** Shared responsive email layout (table-based for email clients). */
function layout({ preheader = '', title, body, lang = 'en' }) {
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title></head>
<body style="margin:0;padding:0;background:#f6f7fa;font-family:Raleway,Arial,Helvetica,sans-serif;color:#2b3245">
<span style="display:none;max-height:0;overflow:hidden">${e(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fa;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border-radius:12px;overflow:hidden">
    <tr><td style="background:${NAVY};padding:24px 32px">
      <img src="${env.siteUrl}/assets/logos/logo-10th-white-crop.png" alt="Actuarial Factor" width="120" style="display:block;border:0">
    </td></tr>
    <tr><td style="padding:32px">
      <h1 style="margin:0 0 16px;font-size:22px;color:${NAVY}">${e(title)}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:20px 32px;background:#f6f7fa;font-size:12px;color:#5d6478;border-top:3px solid ${GOLD}">
      ${copy(lang).footer}<br>
      <a href="${withLang(env.siteUrl, lang)}" style="color:${NAVY}">actuarialfactor.com</a> · +1 800-957-9196
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const row = (label, value) =>
  value ? `<tr><td style="padding:6px 0;color:#5d6478;width:150px;vertical-align:top">${e(label)}</td><td style="padding:6px 0;font-weight:600">${e(value)}</td></tr>` : '';

const button = (href, text) =>
  `<p style="margin:24px 0"><a href="${href}" style="background:${GOLD};color:#161e34;padding:12px 24px;border-radius:4px;text-decoration:none;font-weight:700;display:inline-block">${e(text)}</a></p>`;

module.exports = {
  /** Internal notification: new consultation request (always English) */
  contactAdmin(c) {
    return {
      subject: `New consultation request — ${c.name} (${c.company})`,
      html: layout({
        title: 'New consultation request',
        preheader: `${c.name} from ${c.company}`,
        body: `<table role="presentation" width="100%" style="font-size:14px">
          ${row('Name', c.name)}${row('Company', c.company)}${row('Email', c.email)}${row('Phone', c.phone)}
          ${row('Service', c.service)}${row('Preferred date', c.preferred_date)}${row('Subject', c.subject)}
          ${row('Language', c.lang === 'es' ? 'Spanish' : 'English')}${row('Source', c.source)}
        </table>
        <p style="margin-top:20px;padding:16px;background:#f6f7fa;border-radius:8px;white-space:pre-line">${e(c.message)}</p>`,
      }),
      text: `New consultation request\n\nName: ${c.name}\nCompany: ${c.company}\nEmail: ${c.email}\nPhone: ${c.phone || '-'}\nService: ${c.service || '-'}\nPreferred date: ${c.preferred_date || '-'}\nLanguage: ${c.lang || 'en'}\n\n${c.message}`,
    };
  },

  /** Confirmation to the person who filled the form (in their language) */
  contactConfirmation(c) {
    const t = copy(c.lang);
    return {
      subject: t.confirmSubject,
      html: layout({
        lang: c.lang,
        title: t.confirmTitle(c.name),
        preheader: t.confirmPre,
        body: `<p>${t.confirmBody}</p><p>${t.confirmHelp}</p>${button(withLang(env.siteUrl + '/practice-areas', c.lang), t.confirmCta)}`,
      }),
      text: t.confirmText(c.name),
    };
  },

  newsletterWelcome(s) {
    const t = copy(s.lang);
    const unsubscribe = `${env.siteUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(s.token)}`;
    return {
      subject: t.welcomeSubject,
      html: layout({
        lang: s.lang,
        title: t.welcomeTitle,
        body: `<p>${t.welcomeBody}</p>${button(withLang(env.siteUrl + '/insights', s.lang), t.welcomeCta)}
        <p style="font-size:12px;color:#5d6478">${t.unsubscribe(unsubscribe)}</p>`,
      }),
      text: t.welcomeText(unsubscribe),
      headers: { 'List-Unsubscribe': `<${unsubscribe}>` },
    };
  },

  passwordReset(u, token) {
    const t = copy(u.lang);
    const link = withLang(`${env.siteUrl}/login?reset=${encodeURIComponent(token)}`, u.lang);
    return {
      subject: t.resetSubject,
      html: layout({
        lang: u.lang,
        title: t.resetTitle,
        body: `<p>${e(t.resetBody(u.name))}</p>${button(link, t.resetCta)}<p style="font-size:13px;color:#5d6478">${t.resetIgnore}</p>`,
      }),
      text: t.resetText(link),
    };
  },
};
