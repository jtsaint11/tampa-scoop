// Server-only content and notes. The browser imports Slide.tsx, never this file.
export const presentation = {
  version: "1",
  title: "Make your point",
  slides: [
    {
      title: "One idea at a time",
      body: "A clear story starts with a single thought.",
      notes: ["**Open** with the idea you want people to remember."],
    },
    {
      title: "Show what changes",
      body: "Before. After. Why it matters.",
      notes: [
        "**Contrast** the two situations.",
        "Pause before the conclusion.",
      ],
    },
    {
      title: "Leave a next step",
      body: "What should your audience do now?",
      notes: ["**Close** with one concrete action."],
    },
  ],
};
