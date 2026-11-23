type WelcomeTemplateInput = {
  customerName: string;
};

export function renderWelcomeTemplate({ customerName }: WelcomeTemplateInput) {
  const subject = "Bem-vinda à Essenza Perfumaria & Cosméticos";
  const html = `
    <div style="font-family: 'Manrope', Arial, sans-serif; background:#FAF7F0; padding:32px;">
      <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:12px; padding:32px;">
        <h1 style="color:#2A1B30; font-size:20px; margin-bottom:16px;">Olá, ${customerName}!</h1>
        <p style="color:#2A1B30; font-size:14px; line-height:1.6;">
          Seja bem-vinda à Essenza Perfumaria &amp; Cosméticos. A partir de agora
          você receberá novidades, lançamentos e condições especiais em primeira mão.
        </p>
        <p style="color:#B08A49; font-size:13px; margin-top:24px;">Essenza Perfumaria &amp; Cosméticos</p>
      </div>
    </div>
  `;
  return { subject, html };
}
