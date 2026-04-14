import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Timer, RotateCcw, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Flag, LayoutGrid, Pause, Play } from "lucide-react";
import drillData from "../drill_bank_data.json";

/**
 * CBAP Drill Bank App (Responsive)
 * 
 * What you asked for:
 * - Areas: KA3, KA4, KA5, KA6, KA7, KA8, KA10 (custom labels)
 * - Each Area supports 2 modes:
 *    - Medium: 30 scenario MCQs, ~1 paragraph
 *    - Hard:   30 scenario MCQs, longer + traps
 * - Each session: 40 minutes, Pause/Resume
 * - Click-to-select answers (no typing)
 * - After submit: score + highlight wrong answers + review wrong list
 * 
 * Note on BABOK: BABOK v3 has 6 Knowledge Areas; "KA7/KA8/KA10" here are treated as configurable custom areas.
 * You can rename areas in AREA_CONFIG below to match your training scheme.
 */

const SESSION_QUESTIONS = 30;
const SESSION_SECONDS = 40 * 60;
const STORAGE_KEY = "cbap_drill_state_v1";

const AREA_CONFIG = {
  KA3: { label: "KA3 — Planning & Monitoring", color: "bg-amber-50 border-amber-200" },
  KA4: { label: "KA4 — Elicitation & Collaboration", color: "bg-sky-50 border-sky-200" },
  KA5: { label: "KA5 — Requirements Life Cycle", color: "bg-emerald-50 border-emerald-200" },
  KA6: { label: "KA6 — Strategy / Analysis", color: "bg-orange-50 border-orange-200" },
  KA7: { label: "KA7 — Requirements Analysis & Design", color: "bg-violet-50 border-violet-200" },
  KA8: { label: "KA8 — Solution Evaluation", color: "bg-teal-50 border-teal-200" },
  KA10:{ label: "KA10 — Techniques / Tools (Mixed)", color: "bg-slate-50 border-slate-200" },
};

// Deterministic RNG
function mulberry32(a) {
  return function() {
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

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildSession(areaKey, mode, seed) {
  const rand = mulberry32(seed);
  const bankQs = drillData[areaKey] && drillData[areaKey][mode];
  if (!bankQs) return [];

  // Map to the session format
  const qs = [];
  for (let i = 0; i < SESSION_QUESTIONS && i < bankQs.length; i++) {
    const q = bankQs[i];
    const optsRaw = [q.correct, ...(q.distractors || [])];
    // Filter out nulls/empties if any exist, just to be safe
    const validOpts = optsRaw.filter(x => x); 
    const opts = shuffle(validOpts, rand);
    const correctIndex = opts.indexOf(q.correct);

    qs.push({
      sid: q.id || (i + 1),
      stem: q.question,
      options: opts,
      correctIndex,
      keywords: [areaKey, mode, `Q${q.id || i+1}`],
      areaKey,
      mode,
    });
  }

  // Shuffle the order of the actual quizzes per session, as requested: "only swap the order of the quizzes"
  return shuffle(qs, rand);
}

export default function DrillBank() {
  const saved = useMemo(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  }, []);

  const [area, setArea] = useState(saved?.area ?? "KA4");
  const [mode, setMode] = useState(saved?.mode ?? "medium"); // medium | hard

  const [started, setStarted] = useState(saved?.started ?? false);
  const [submitted, setSubmitted] = useState(saved?.submitted ?? false);
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(saved?.timeLeft ?? SESSION_SECONDS);

  const [seed, setSeed] = useState(saved?.seed ?? (() => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0));
  const [index, setIndex] = useState(saved?.index ?? 0);
  const [answers, setAnswers] = useState(saved?.answers ?? {}); // idx -> opt
  const [flagged, setFlagged] = useState(saved?.flagged ?? {}); // idx -> bool
  const [showGrid, setShowGrid] = useState(false);
  const [reviewWrongOnly, setReviewWrongOnly] = useState(true);

  useEffect(() => {
    if (!started && !submitted) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ area, mode, started, submitted, timeLeft, seed, index, answers, flagged }));
  }, [area, mode, started, submitted, timeLeft, seed, index, answers, flagged]);

  const session = useMemo(() => buildSession(area, mode, seed), [area, mode, seed]);
  const current = session[index];

  // timer
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
      setReviewWrongOnly(true);
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

  const progress = Math.round(((index + 1) / session.length) * 100);

  const start = () => {
    setStarted(true);
    setSubmitted(false);
    setRunning(true);
    setTimeLeft(SESSION_SECONDS);
    setIndex(0);
    setAnswers({});
    setFlagged({});
    setShowGrid(false);
  };

  const newSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSeed((s) => ((s + 0x9e3779b9) ^ Date.now()) >>> 0);
    setStarted(false);
    setSubmitted(false);
    setRunning(false);
    setTimeLeft(SESSION_SECONDS);
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

  const select = (optIdx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [index]: optIdx }));
  };

  const toggleFlag = () => setFlagged((prev) => ({ ...prev, [index]: !prev[index] }));

  const gridVariant = (i) => {
    const a = answers[i];
    if (!submitted) return a !== undefined ? "outline" : "outline";
    if (a === undefined) return "outline";
    return a === session[i].correctIndex ? "default" : "destructive";
  };

  const reviewList = useMemo(() => {
    if (!submitted) return [];
    return reviewWrongOnly ? score.wrongIdx : session.map((_, i) => i);
  }, [submitted, reviewWrongOnly, score.wrongIdx, session]);

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" className="h-8 px-2 mb-2 -ml-2 text-slate-500 hover:text-slate-900" onClick={() => window.location.hash = ""}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Main Menu
            </Button>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">CBAP Drill Bank (KA3/4/5/6/7/8/10)</h1>
            <p className="text-sm text-slate-600">30 questions per session • 40 minutes • Pause/Resume • Medium/Hard</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {started && !submitted && (
              <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 border ${timeLeft <= 300 ? "border-rose-400 bg-rose-50" : "bg-white"} ${!running ? "opacity-50" : ""}`}>
                <Timer className="h-4 w-4" />
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
            )}
            {!started ? (
              <Button className="rounded-2xl" onClick={start}>Start</Button>
            ) : (
              <>
                {started && !submitted && (
                  <Button 
                    variant="outline" 
                    className={`rounded-2xl ${!running ? "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : ""}`} 
                    onClick={() => setRunning(!running)}
                  >
                    {!running ? <><Play className="h-4 w-4 mr-2" /> Resume</> : <><Pause className="h-4 w-4 mr-2" /> Pause</>}
                  </Button>
                )}
                
                {(running || submitted) && (
                  <>
                    <Button variant="outline" className="rounded-2xl" onClick={() => setShowGrid((v) => !v)}>
                      <LayoutGrid className="h-4 w-4 mr-2" /> Grid
                    </Button>
                    {!submitted && (
                      <Button variant="outline" className="rounded-2xl" onClick={toggleFlag}>
                        <Flag className="h-4 w-4 mr-2" /> {flagged[index] ? "Unflag" : "Flag"}
                      </Button>
                    )}
                  </>
                )}
                
                <Button variant="outline" className="rounded-2xl" onClick={newSession}>
                  <RotateCcw className="h-4 w-4 mr-2" /> {submitted ? "New" : "Discard"}
                </Button>
                
                {(running || submitted) && (
                  <Button className="rounded-2xl" onClick={submit} disabled={submitted || score.answered === 0}>Submit</Button>
                )}
              </>
            )}
          </div>
        </div>

        {!started && (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Select KA + Mode</CardTitle>
              <CardDescription className="text-sm">Each question includes realistic KA keywords. Hard mode includes traps.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {Object.keys(AREA_CONFIG).map((k) => (
                  <Button
                    key={k}
                    variant={area === k ? "default" : "outline"}
                    className={`rounded-2xl ${area === k ? "" : "bg-white"}`}
                    onClick={() => { setArea(k); setStarted(false); setSubmitted(false); setRunning(false); setIndex(0); setAnswers({}); setFlagged({}); setShowGrid(false); setTimeLeft(SESSION_SECONDS); }}
                  >
                    {k}
                  </Button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant={mode === "medium" ? "default" : "outline"} className="rounded-2xl" onClick={() => setMode("medium")}>Medium Mode</Button>
                <Button variant={mode === "hard" ? "destructive" : "outline"} className="rounded-2xl" onClick={() => setMode("hard")}>Hard Mode</Button>
                <Badge variant="secondary" className="rounded-xl">Session: 30Q / 40m</Badge>
                <Badge variant="outline" className="rounded-xl">{AREA_CONFIG[area].label}</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {started && (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="space-y-2 mb-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>

              {started && !submitted && !running ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
                  <Pause className="h-12 w-12 text-slate-300" />
                  <h2 className="text-2xl font-semibold">Session Paused</h2>
                  <p className="text-slate-600">Your timer and progress are automatically saved.<br/>You can close the tab and return later.</p>
                  <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                    <Button className="rounded-2xl sm:pr-8 sm:pl-6" size="lg" onClick={() => setRunning(true)}>
                      <Play className="h-5 w-5 mr-3" /> Resume Session
                    </Button>
                    <Button variant="outline" size="lg" className="rounded-2xl" onClick={newSession}>
                      Discard Session
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-xl">Q {index + 1}/{session.length}</Badge>
                  <Badge variant="outline" className="rounded-xl">{current.areaKey}</Badge>
                  <Badge variant="outline" className="rounded-xl">{current.mode.toUpperCase()}</Badge>
                  {flagged[index] && <Badge variant="destructive" className="rounded-xl">Flagged</Badge>}
                  {submitted && (
                    <Badge className="rounded-xl" variant={score.correct / score.total >= 0.7 ? "default" : "destructive"}>
                      Score: {score.correct}/{score.total}
                    </Badge>
                  )}
                </div>

                {submitted && (
                  <div className="text-sm text-slate-700">Wrong: {score.answered - score.correct} • Unanswered: {score.unanswered}</div>
                )}
              </div>

              <Separator />

              <div className="rounded-2xl border bg-white p-4">
                <p className="text-slate-900 leading-relaxed">{current.stem}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(current.keywords || []).slice(0, 6).map((kw, i) => (
                    <Badge key={i} variant="outline" className="rounded-xl">{kw}</Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                {current.options.map((opt, optIdx) => {
                  const chosen = answers[index] === optIdx;
                  const correct = submitted && optIdx === current.correctIndex;
                  const wrongChosen = submitted && chosen && optIdx !== current.correctIndex;
                  return (
                    <Button
                      key={optIdx}
                      variant={chosen ? "default" : "outline"}
                      className={
                        "justify-start text-left whitespace-normal h-auto py-3 rounded-2xl " +
                        (submitted && correct ? "border-emerald-400 bg-emerald-50 text-slate-900 hover:bg-emerald-50" : "") +
                        (submitted && wrongChosen ? "border-rose-400 bg-rose-50 text-slate-900 hover:bg-rose-50" : "")
                      }
                      onClick={() => select(optIdx)}
                      disabled={submitted}
                    >
                      <span className="mr-3 font-semibold">{String.fromCharCode(65 + optIdx)}.</span>
                      <span>{opt}</span>
                      {submitted && correct && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />}
                      {submitted && wrongChosen && <XCircle className="ml-auto h-5 w-5 text-rose-600" />}
                    </Button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" className="rounded-2xl" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={() => setIndex((i) => Math.min(session.length - 1, i + 1))} disabled={index === session.length - 1}>
                  Next <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              {showGrid && (
                <div className="rounded-2xl border bg-white p-4 space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-semibold">Question Grid</p>
                    {submitted && (
                      <div className="flex items-center gap-2">
                        <Checkbox checked={reviewWrongOnly} onCheckedChange={(v) => setReviewWrongOnly(Boolean(v))} />
                        <span className="text-sm text-slate-700">Show wrong only in review list</span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
                    {session.map((q, i) => (
                      <Button
                        key={q.sid}
                        variant={gridVariant(i)}
                        className={`rounded-xl h-9 ${flagged[i] ? "ring-2 ring-amber-400" : ""}`}
                        onClick={() => { setIndex(i); setShowGrid(false); }}
                      >
                        {i + 1}
                      </Button>
                    ))}
                  </div>

                  {submitted && (
                    <>
                      <Separator />
                      <p className="font-semibold">Review incorrect questions</p>
                      {score.wrongIdx.length === 0 ? (
                        <p className="text-sm text-slate-700">No incorrect answers 🎉</p>
                      ) : (
                        <div className="space-y-2">
                          {reviewList.filter((i) => score.wrongIdx.includes(i)).map((wi) => (
                            <Button
                              key={wi}
                              variant="outline"
                              className="w-full justify-between rounded-2xl"
                              onClick={() => { setIndex(wi); setShowGrid(false); }}
                            >
                              <span>Go to Q{wi + 1}</span>
                              <span className="text-xs text-slate-500">Your: {answers[wi] === undefined ? "—" : String.fromCharCode(65 + answers[wi])} • Correct: {String.fromCharCode(65 + session[wi].correctIndex)}</span>
                            </Button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        <div className="text-xs text-slate-500">
          Tip: If you want fully-authentic BABOK-aligned banks (30 medium + 30 hard) per area, replace TEMPLATE_MAP with your curated question sets.
        </div>
      </div>
    </div>
  );
}
