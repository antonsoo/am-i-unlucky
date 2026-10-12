// Exact synthetic models; these are not claims about a game's actual rates.
export const browserCases = [
  {
    name: "first-try-common-drop",
    query: { mode: "simple", rate: "90%", n: "1", k: "1", got: "1" },
    expected: { earlier: 0, tied: 0.9, later: 0.1 },
  },
  {
    name: "second-roll-guarantee",
    query: {
      mode: "pity",
      base: "1",
      soft: "1",
      inc: "0",
      hard: "1",
      feat: ".5",
      guar: "1",
      pity0: "0",
      g0: "0",
      target: "1",
      budget: "2",
      actual: "2",
    },
    expected: { earlier: 0.5, tied: 0.5, later: 0 },
  },
];
