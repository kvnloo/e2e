import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ternEngine } from "../tern/src/index.ts";

const pane = process.env.TERN_QA_PANE;

export default {
  tests: "src/explore/**/*.e2e.ts",
  timeout: 900_000,
  actionTimeout: 60_000,
  targets: [
    {
      name: "hermes-tern",
      engine: ternEngine({
        ...(pane === undefined ? { command: ["zsh", "-lc", "printf 'missing TERN_QA_PANE\\n'"] } : { pane }),
        ...(process.env.TERN_CONTROL === undefined ? {} : { control: process.env.TERN_CONTROL }),
      }),
      app: {},
    },
  ],
  agents: {
    default: {
      model: createOpenAICompatible({
        name: "groq",
        baseURL: "https://api.groq.com/openai/v1",
        apiKey: process.env.GROQ_API_KEY,
      })("openai/gpt-oss-20b"),
      context: [
        "The pane is the Hermes Tern frontend, ui-tsp, on preview/tern-frontend.",
        "The screen text is a capture, not a widget tree. Tool card chrome may be missing from the text.",
        "You can press keys and type text. You cannot click.",
        "Do not approve a dangerous command. Do not type a secret value.",
        "A collapsed card should show a short preview and a more-lines badge.",
        "A failed shell should stay error, stay folded, and show an exit code.",
        "Approval, clarify, and secret should open a prompt overlay and should not answer themselves.",
        "Resume should open the sessions overlay. The model control should open the model picker.",
        "A busy turn should not close the surface.",
        "Keyword, string, and number tokens should use different colors.",
        "If the capture cannot show a feature, report that limit. Name the command that would prove it.",
      ].join(" "),
    },
  },
};
