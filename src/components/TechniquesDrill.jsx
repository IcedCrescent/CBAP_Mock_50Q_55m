import React, { useEffect, useMemo, useState } from "react";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Flag,
} from "lucide-react";

/**
 * CBAP KA10 Techniques – Mobile Drill App
 * Bank: 100 questions (fixed bank generated from technique facts)
 * Session: 30 questions
 * Timer: 40 minutes
 * Controls: Start / Pause / Resume / New / Submit
 * Review: score + highlight + explanation (paraphrased notes)
 *
 * NOTE (Copyright): I can't include verbatim multi-sentence BABOK quotes.
 * Explanations are paraphrased study notes aligned to BABOK concepts.
 */

const SESSION_SIZE = 30;
const TIMER_SECONDS = 40 * 60;

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleWithoutReplacement(arr, n, rand) {
  const idx = Array.from({ length: arr.length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => arr[i]);
}

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const TECH = [
  { name: "Acceptance and Evaluation Criteria", purpose: "Define measurable conditions for accepting requirements or evaluating solution/option performance.", strength: "Creates objective decision rules and reduces subjective debate.", limitation: "Poor criteria lead to false confidence; requires stakeholder alignment and data availability." },
  { name: "Backlog Management", purpose: "Organize, refine, and sequence requirements for incremental delivery.", strength: "Supports change and prioritization in iterative delivery.", limitation: "Can become noisy without clear ownership and definition of ready/done." },
  { name: "Benchmarking", purpose: "Compare performance or practices against peers/standards to set targets.", strength: "Provides external reference points and realism in goals.", limitation: "Comparable data may be hard to find; context differences can mislead." },
  { name: "Brainstorming", purpose: "Generate many ideas quickly from diverse stakeholders.", strength: "Fast ideation and encourages creativity.", limitation: "Needs facilitation; can bias toward loud voices and shallow ideas." },
  { name: "Business Cases", purpose: "Justify an initiative by comparing costs, benefits, and risks.", strength: "Supports funding decisions and value clarity.", limitation: "Estimates carry uncertainty; can be politicized if assumptions aren’t explicit." },
  { name: "Business Model Canvas", purpose: "Describe how an organization creates, delivers, and captures value.", strength: "Shared high-level view across business and product stakeholders.", limitation: "High-level; needs deeper analysis for detailed requirements." },
  { name: "Concept Modelling", purpose: "Define and relate domain concepts to align understanding.", strength: "Reduces terminology conflicts and ambiguity.", limitation: "Requires SME time; models can drift if not maintained." },
  { name: "Data Dictionary", purpose: "Standardize definitions, formats, and allowed values for data elements.", strength: "Improves consistency across teams and reduces defects.", limitation: "Maintenance effort is high in fast-changing domains." },
  { name: "Data Flow Diagrams", purpose: "Show how data moves and transforms across processes/systems.", strength: "Clarifies boundaries, sources, and destinations.", limitation: "May not show timing/state; can oversimplify complex logic." },
  { name: "Decision Analysis", purpose: "Compare options using criteria (often weighted) to recommend a choice.", strength: "Transparent and defensible trade-off decisions.", limitation: "Results depend on criteria/weights quality; can create false precision." },
  { name: "Decision Trees", purpose: "Visualize branching decisions and consequences.", strength: "Makes conditional outcomes explicit.", limitation: "Can explode in complexity; assumptions must be validated." },
  { name: "Document Analysis", purpose: "Extract requirements/constraints from existing artifacts.", strength: "Fast start when documentation exists; reduces repeated elicitation.", limitation: "Documents may be outdated or biased; need validation." },
  { name: "Estimation", purpose: "Predict effort, cost, or duration to support planning and trade-offs.", strength: "Supports feasibility and sequencing.", limitation: "High uncertainty early; sensitive to assumptions and unknowns." },
  { name: "Focus Groups", purpose: "Elicit insights via moderated discussion with a small representative group.", strength: "Rich qualitative input and interaction.", limitation: "Not statistically representative; group dynamics can bias results." },
  { name: "Functional Decomposition", purpose: "Break scope into smaller functions/features to ensure coverage.", strength: "Improves completeness and manageability.", limitation: "Can lose end-to-end value view if over-decomposed." },
  { name: "Interface Analysis", purpose: "Identify inputs/outputs and integrations between systems/components.", strength: "Prevents missed integration requirements.", limitation: "Needs technical info; may miss human handoffs if too technical." },
  { name: "Interviews", purpose: "Elicit detailed information from individuals.", strength: "Deep understanding and flexibility.", limitation: "Time-consuming; subject to bias and availability." },
  { name: "KPIs / Metrics", purpose: "Measure performance and value delivery over time.", strength: "Enables evidence-based decisions.", limitation: "Bad metrics drive bad behavior; proxies can mislead." },
  { name: "Lessons Learned", purpose: "Capture what worked/didn’t and improvements for future.", strength: "Supports continuous improvement.", limitation: "Low value if not actioned; can become blame-focused." },
  { name: "Mind Mapping", purpose: "Organize ideas and show relationships for synthesis.", strength: "Fast structuring of complex information.", limitation: "Not precise; may require follow-up artifacts for agreement." },
  { name: "MoSCoW", purpose: "Prioritize items into Must/Should/Could/Won’t.", strength: "Simple and widely understood.", limitation: "Can be gamed; needs clear criteria and governance." },
  { name: "Observation", purpose: "Understand real work as performed, including exceptions.", strength: "Reveals tacit knowledge and true workflows.", limitation: "May be limited by access/privacy; observation can influence behavior." },
  { name: "Process Modelling (BPMN)", purpose: "Represent process steps, decisions, and handoffs.", strength: "Creates shared understanding across stakeholders.", limitation: "Can be over-detailed; requires modelling skill." },
  { name: "Prototyping / Wireframes", purpose: "Make solution concepts tangible for early feedback.", strength: "Reduces misunderstanding and supports validation.", limitation: "May bias stakeholders toward UI over needs; not final design." },
  { name: "Risk Analysis", purpose: "Identify, assess, and plan responses to risks.", strength: "Improves decision-making and mitigation.", limitation: "Subjective scoring; needs updates as context changes." },
  { name: "RACI Matrix", purpose: "Clarify responsibilities: Responsible/Accountable/Consulted/Informed.", strength: "Reduces role confusion and handoff failures.", limitation: "Can become political; must reflect real authority." },
  { name: "Root Cause Analysis", purpose: "Identify underlying causes behind symptoms.", strength: "Avoids fixing symptoms only; supports sustainable change.", limitation: "Needs evidence; can become speculative without data." },
  { name: "Scenarios", purpose: "Explore how users/system behave in realistic situations.", strength: "Improves coverage of alternate paths and exceptions.", limitation: "Can be time-intensive; needs validation." },
  { name: "State Modelling", purpose: "Describe states and transitions triggered by events/conditions.", strength: "Clarifies lifecycle behavior and rules.", limitation: "Not ideal for end-to-end process flow; can be complex." },
  { name: "Stakeholder Map / Personas", purpose: "Identify stakeholders, influence, needs, and engagement approach.", strength: "Tailors communication and reduces missed stakeholder impact.", limitation: "Must be kept current; can oversimplify individuals." },
  { name: "Surveys / Questionnaires", purpose: "Collect input from many people efficiently.", strength: "Scales for distributed stakeholders.", limitation: "Low depth; question design strongly affects validity." },
  { name: "SWOT", purpose: "Assess strengths/weaknesses/opportunities/threats.", strength: "Simple strategic framing.", limitation: "High-level; subjective without evidence." },
  { name: "Use Cases", purpose: "Capture user goals and interaction flows including alternates.", strength: "Clarifies functional scope and exceptions.", limitation: "Can become heavy; needs discipline to keep value-focused." },
  { name: "User Stories", purpose: "Express requirements in user-value form for iterative delivery.", strength: "Supports incremental refinement and acceptance criteria.", limitation: "Can be vague without good acceptance criteria and definition of ready." },
  { name: "Vendor Assessment", purpose: "Evaluate vendors/solutions against criteria.", strength: "Supports transparent selection.", limitation: "Biased demos and incomplete info can distort decisions." },
];

function buildBank100() {
  const out = [];
  let id = 1;

  const purposeTemplate = (t) => ({
    id: id++,
    stem: `A BA needs to choose an approach to achieve the following objective: ${t.purpose} Which technique BEST fits?`,
    correct: t.name,
    distractors: shuffle(
      TECH.filter((x) => x.name !== t.name).map((x) => x.name),
      mulberry32((id * 997) >>> 0)
    ).slice(0, 3),
    explanation: `This technique is primarily used to ${t.purpose.toLowerCase()} It works best when stakeholders need a shared, structured way to achieve that objective. A key strength is that it ${t.strength.toLowerCase()} A key limitation to watch is that ${t.limitation.toLowerCase()}`,
  });

  const limitationTemplate = (t) => ({
    id: id++,
    stem: `A team plans to use ${t.name} in an initiative. Which limitation or risk should the BA MOST likely watch for?`,
    correct: t.limitation,
    distractors: shuffle(
      TECH.filter((x) => x.name !== t.name).map((x) => x.limitation),
      mulberry32((id * 991) >>> 0)
    ).slice(0, 3),
    explanation: `For ${t.name}, the key value is that it ${t.strength.toLowerCase()} However, it can break down when ${t.limitation.toLowerCase()} A BA should plan mitigations around that limitation so outputs remain reliable.`,
  });

  TECH.forEach((t) => {
    out.push(purposeTemplate(t));
    out.push(limitationTemplate(t));
  });

  const rand = mulberry32(123456);
  while (out.length < 100) {
    const t = TECH[Math.floor(rand() * TECH.length)];
    if (rand() < 0.5) {
      out.push({
        id: id++,
        stem: `A BA selects ${t.name} for an upcoming task. Which statement BEST describes a key strength of this technique?`,
        correct: t.strength,
        distractors: shuffle(
          TECH.filter((x) => x.name !== t.name).map((x) => x.strength),
          mulberry32((id * 983) >>> 0)
        ).slice(0, 3),
        explanation: `A key strength of ${t.name} is that it ${t.strength.toLowerCase()} This helps create alignment and improve decision quality. Still watch for ${t.limitation.toLowerCase()} to keep results trustworthy.`,
      });
    } else {
      out.push({
        id: id++,
        stem: `A BA is trying to achieve this goal: ${t.purpose} Which technique is MOST appropriate?`,
        correct: t.name,
        distractors: shuffle(
          TECH.filter((x) => x.name !== t.name).map((x) => x.name),
          mulberry32((id * 977) >>> 0)
        ).slice(0, 3),
        explanation: `This goal matches the typical purpose of ${t.name}: ${t.purpose} It is effective because it ${t.strength.toLowerCase()} Be mindful that ${t.limitation.toLowerCase()} so outcomes remain reliable.`,
      });
    }
  }

  return out.slice(0, 100);
}

const BANK_100 = buildBank100();

function buildSession(seed) {
  const rand = mulberry32(seed);
  const chosen = sampleWithoutReplacement(BANK_100, SESSION_SIZE, rand);
  return chosen.map((q) => {
    const opts = shuffle([q.correct, ...q.distractors], rand);
    return {
      id: q.id,
      stem: q.stem,
      options: opts,
      correctIndex: opts.indexOf(q.correct),
      explanation: q.explanation,
    };
  });
}

export default function TechniquesDrill() {
  const [seed, setSeed] = useState(() => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);
  const [session, setSession] = useState(() => buildSession(seed));

  const [started, setStarted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [showGrid, setShowGrid] = useState(false);

  const current = session[index];

  useEffect(() => {
    if (!started || submitted || !running) return;
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [started, submitted, running, timeLeft]);

  useEffect(() => {
    if (!started || submitted) return;
    if (timeLeft === 0) {
      setSubmitted(true);
      setRunning(false);
      setShowGrid(true);
    }
  }, [timeLeft, started, submitted]);

  const score = useMemo(() => {
    let correct = 0;
    let answered = 0;
    const wrongIdx = [];
    session.forEach((q, i) => {
      const a = answers[i];
      if (a !== undefined) {
        answered++;
        if (a === q.correctIndex) correct++;
        else wrongIdx.push(i);
      }
    });
    return { correct, answered, total: session.length, wrongIdx, unanswered: session.length - answered };
  }, [answers, session]);

  const start = () => {
    setStarted(true);
    setSubmitted(false);
    setRunning(true);
    setTimeLeft(TIMER_SECONDS);
    setIndex(0);
    setAnswers({});
    setFlagged({});
    setShowGrid(false);
  };

  const newSession = () => {
    const newSeed = ((seed + 0x9e3779b9) ^ Date.now()) >>> 0;
    setSeed(newSeed);
    setSession(buildSession(newSeed));
    setStarted(false);
    setSubmitted(false);
    setRunning(false);
    setTimeLeft(TIMER_SECONDS);
    setIndex(0);
    setAnswers({});
    setFlagged({});
    setShowGrid(false);
  };

  const submit = () => {
    setSubmitted(true);
    setRunning(false);
    setShowGrid(true);
  };

  const pick = (optIdx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [index]: optIdx }));
  };

  const toggleFlag = () => setFlagged((prev) => ({ ...prev, [index]: !prev[index] }));

  const gridBorder = (i) => {
    const a = answers[i];
    if (!submitted) return a !== undefined ? "border-slate-400" : "border-slate-200";
    if (a === undefined) return "border-slate-200";
    return a === session[i].correctIndex ? "border-emerald-400" : "border-rose-400";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button onClick={() => window.location.hash = ""} className="mb-2 flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors">
              <ChevronLeft className="h-4 w-4 mr-1" /> Main Menu
            </button>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Techniques Drill (100Q Bank)</h1>
            <p className="text-sm text-slate-600">30 questions/session • 40-minute timer • Purpose/Strength/Limitations</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {started && (
              <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 border ${timeLeft <= 300 ? "border-rose-400 bg-rose-50" : "bg-white"}`}>
                <Timer className="h-4 w-4" />
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
            )}

            {!started ? (
              <button onClick={start} className="px-4 py-2 rounded-2xl bg-black text-white font-medium flex items-center gap-2">
                <Play className="h-4 w-4" /> Start
              </button>
            ) : (
              <>
                <button
                  onClick={() => setRunning((r) => !r)}
                  disabled={submitted || timeLeft === 0}
                  className="px-4 py-2 rounded-2xl border bg-white font-medium flex items-center gap-2"
                >
                  {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {running ? "Pause" : "Resume"}
                </button>
                <button onClick={() => setShowGrid((v) => !v)} className="px-4 py-2 rounded-2xl border bg-white font-medium flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4" /> Grid
                </button>
                <button onClick={toggleFlag} className="px-4 py-2 rounded-2xl border bg-white font-medium flex items-center gap-2">
                  <Flag className="h-4 w-4" /> {flagged[index] ? "Unflag" : "Flag"}
                </button>
                <button onClick={newSession} className="px-4 py-2 rounded-2xl border bg-white font-medium flex items-center gap-2">
                  <RotateCcw className="h-4 w-4" /> New
                </button>
                <button
                  onClick={submit}
                  disabled={submitted || score.answered === 0}
                  className={`px-4 py-2 rounded-2xl font-medium ${submitted || score.answered === 0 ? "bg-slate-200 text-slate-500" : "bg-black text-white"}`}
                >
                  Submit
                </button>
              </>
            )}
          </div>
        </div>

        {started && (
          <div className="rounded-2xl border bg-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm text-slate-700">Progress: <span className="font-semibold">{index + 1}/{session.length}</span> • Answered: <span className="font-semibold">{score.answered}/{score.total}</span></div>
            {submitted && (
              <div className="text-sm text-slate-700">Score: <span className="font-semibold">{score.correct}/{score.total}</span> • Wrong: <span className="font-semibold">{score.answered - score.correct}</span> • Unanswered: <span className="font-semibold">{score.unanswered}</span></div>
            )}
          </div>
        )}

        {started && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-slate-900 leading-relaxed"><span className="font-semibold">Q{index + 1}.</span> {current.stem}</p>
              {submitted && answers[index] !== undefined && (
                answers[index] === current.correctIndex
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  : <XCircle className="h-5 w-5 text-rose-600" />
              )}
            </div>

            <div className="grid gap-2">
              {current.options.map((opt, optIdx) => {
                const chosen = answers[index] === optIdx;
                const correct = submitted && optIdx === current.correctIndex;
                const wrongChosen = submitted && chosen && optIdx !== current.correctIndex;
                return (
                  <button
                    key={optIdx}
                    onClick={() => pick(optIdx)}
                    disabled={submitted}
                    className={
                      "w-full text-left rounded-xl border px-4 py-3 " +
                      (chosen ? "border-black" : "border-slate-200") +
                      (submitted && correct ? " bg-emerald-50 border-emerald-300" : "") +
                      (submitted && wrongChosen ? " bg-rose-50 border-rose-300" : "")
                    }
                  >
                    <span className="mr-2 font-semibold">{String.fromCharCode(65 + optIdx)}.</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            {submitted && (
              <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-700">
                <span className="font-semibold">Explanation:</span> {current.explanation}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                className="px-4 py-2 rounded-2xl border bg-white font-medium flex items-center gap-2"
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <button
                className="px-4 py-2 rounded-2xl border bg-white font-medium flex items-center gap-2"
                onClick={() => setIndex((i) => Math.min(session.length - 1, i + 1))}
                disabled={index === session.length - 1}
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {started && showGrid && (
          <div className="rounded-2xl border bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Question Grid</p>
              {submitted && <p className="text-sm text-slate-600">Tap a number to review.</p>}
            </div>
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {session.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => { setIndex(i); setShowGrid(false); }}
                  className={`h-9 rounded-xl border text-sm font-medium bg-white ${gridBorder(i)} ${flagged[i] ? "ring-2 ring-amber-400" : ""}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500">
          Bank: 100 fixed questions • Session draws 30 random questions each time you press New.
        </div>
      </div>
    </div>
  );
}
