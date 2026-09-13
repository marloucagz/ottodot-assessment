export type PrefQuestion = {
  id: string;
  type: "radio" | "multi";
  codes: string[];
  heading: string;
  help?: string;
  prompt: (childName: string) => string;
};

export const PREFERENCE_QUESTIONS: PrefQuestion[] = [
  {
    id: "computer",
    type: "radio",
    codes: [
      "PREF_COMPUTER_ALL",
      "PREF_COMPUTER_MOST",
      "PREF_COMPUTER_SOME",
      "PREF_COMPUTER_ADULT",
    ],
    heading: "Using a computer in class",
    prompt: (name) => `Which of these can ${name} do on their own?`,
  },
  {
    id: "parent",
    type: "radio",
    codes: [
      "PREF_PARENT_YES",
      "PREF_PARENT_CHECKIN",
      "PREF_PARENT_UNAVAILABLE",
    ],
    heading: "During the trial",
    prompt: () =>
      "Can you stay nearby during the trial class to help with any technical hiccups?",
  },
  {
    id: "device",
    type: "multi",
    codes: [
      "PREF_DEVICE_LAPTOP",
      "PREF_DEVICE_DESKTOP",
      "PREF_DEVICE_TABLET",
      "PREF_DEVICE_PHONE",
    ],
    heading: "Devices at home",
    prompt: () => "What devices do you have available at home for the class?",
  },
  {
    id: "second",
    type: "radio",
    codes: ["PREF_SECOND_YES", "PREF_SECOND_NO", "PREF_SECOND_UNSURE"],
    heading: "Second device",
    help: "Some trial activities work best when your child can use a second device while keeping the video call open.",
    prompt: () =>
      "Can your child use a second device for the game while the video call is running?",
  },
];

export function preferenceSummaryLabels(
  capabilityIds: string[],
  catalog: Array<{ id: string; code: string; name: string }>,
) {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const selected = capabilityIds
    .map((id) => byId.get(id))
    .filter((c): c is { id: string; code: string; name: string } => Boolean(c));

  const pick = (codes: string[]) =>
    selected.filter((c) => codes.includes(c.code)).map((c) => c.name);

  return {
    computer: pick(PREFERENCE_QUESTIONS[0]!.codes),
    parent: pick(PREFERENCE_QUESTIONS[1]!.codes),
    devices: pick(PREFERENCE_QUESTIONS[2]!.codes),
    second: pick(PREFERENCE_QUESTIONS[3]!.codes),
  };
}
