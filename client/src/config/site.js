// The developer details shown on the About page and used for key requests. Edit here only.
export const DEVELOPER = {
  name: 'Tamim Rahman',
  nameBn: 'মোঃ তামিম রহমান',
  role: 'Software Developer & Technical Contributor',
  email: 'tamimrahman852@gmail.com',
  phone: '01762324527',
  whatsapp: '8801762324527',   // international format (Bangladesh +880) for wa.me links
  overview: 'A dedicated and result-oriented software developer specializing in building digital platforms, web applications, and automated utility solutions. Committed to engineering high-performance, user-centric systems and maintaining strict personal integrity, financial independence, and high standards of execution. Creator and administrator of TMK Exam Hub, an open-access digital assessment platform designed to support science-background admission candidates.',
};

export const waLink = (text) => `https://wa.me/${DEVELOPER.whatsapp}?text=${encodeURIComponent(text)}`;
export const mailLink = (subject, body) =>
  `mailto:${DEVELOPER.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
