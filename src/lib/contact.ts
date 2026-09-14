export const CONTACT_TOPICS = [
  "Support",
  "Konto och data",
  "Spelbolagslistan",
  "Annonsering",
  "Press",
  "Annat",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];
