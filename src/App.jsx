import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Timer, RotateCcw, Flag, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, XCircle, BookOpen, Pause, Play
} from "lucide-react";

/**
 * CBAP Mock Exam (bank converted from CBAP_for_quizwhizzer.xlsx)
 * - Each session: 50 questions (randomized)
 * - Timer: 55 minutes, auto-submit at 0
 * - Click-to-select answers (responsive)
 * - After submit: score + review wrong questions
 */

import BANK from "./cbap_bank_min.json";
const SESSION_SIZE = 50;
const TIMER_SECONDS = 55 * 60;
const STORAGE_KEY = "cbap_mock_state_v1";

function formatTime(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

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

function pickRandom(arr, n, rand) {
  const idx = Array.from({ length: arr.length }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, n).map((i) => arr[i]);
}

function normalizeQ(q) {
  return String(q || "").replace(/\s+/g, " ").trim();
}

export default function CBAPMock50Q55M() {
  const saved = useMemo(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return JSON.parse(s);
    } catch (e) {}
    return null;
  }, []);

  const [started, setStarted] = useState(saved?.started ?? false);
  const [submitted, setSubmitted] = useState(saved?.submitted ?? false);
  const [timeLeft, setTimeLeft] = useState(saved?.timeLeft ?? TIMER_SECONDS);
  const [running, setRunning] = useState(false); // ALWAYS paused when loaded or reloaded
  const [index, setIndex] = useState(saved?.index ?? 0);
  const [answers, setAnswers] = useState(saved?.answers ?? {});
  const [flagged, setFlagged] = useState(saved?.flagged ?? {});
  const [showGrid, setShowGrid] = useState(false);
  const [showExplanations, setShowExplanations] = useState(true);
  const [seed, setSeed] = useState(saved?.seed ?? (() => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0));

  useEffect(() => {
    if (!started && !submitted) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ started, submitted, timeLeft, index, answers, flagged, seed }));
  }, [started, submitted, timeLeft, index, answers, flagged, seed]);

  const rand = useMemo(() => mulberry32(seed), [seed]);

  const session = useMemo(() => {
    const chosen = pickRandom(BANK, Math.min(SESSION_SIZE, BANK.length), rand);
    return chosen.map((q, idx) => {
      const optsRaw = [q.correct, ...(q.distractors || [])].map((x) => String(x).trim());
      const opts = shuffle(optsRaw, rand);
      const correctIndex = opts.indexOf(String(q.correct).trim());
      return {
        sid: idx + 1,
        qid: q.id,
        question: normalizeQ(q.question),
        options: opts,
        correctIndex,
        explanation: q.explanation ? String(q.explanation) : "",
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const current = session[index];

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
    return {
      correct,
      answered,
      total: session.length,
      wrongIdx,
      unanswered: session.length - answered,
    };
  }, [answers, session]);

  const progress = Math.round(((index + 1) / session.length) * 100);

  useEffect(() => {
    if (!running || submitted || !started) return;
    if (timeLeft <= 0) return;
    const id = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [running, submitted, started, timeLeft]);

  useEffect(() => {
    if (!started || submitted) return;
    if (timeLeft === 0) {
      setSubmitted(true);
      setRunning(false);
      setShowGrid(true);
    }
  }, [timeLeft, started, submitted]);

  const start = () => {
    setStarted(true);
    setSubmitted(false);
    setAnswers({});
    setFlagged({});
    setIndex(0);
    setShowGrid(false);
    setTimeLeft(TIMER_SECONDS);
    setRunning(true);
  };

  const newSession = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSeed((s) => ((s + 0x9e3779b9) ^ Date.now()) >>> 0);
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

  return (
    <div className="min-h-screen bg-slate-50 p-3 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">CBAP Mock — 50 Questions / 55 Minutes</h1>
            <p className="text-sm text-slate-600">Tap to select answers (no typing). Mobile responsive.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {started && !submitted && (
              <div className={`flex items-center gap-2 rounded-2xl px-3 py-2 border ${timeLeft <= 300 ? "border-rose-400 bg-rose-50" : "bg-white"} ${!running ? "opacity-50" : ""}`}>
                <Timer className="h-4 w-4" />
                <span className="font-mono font-semibold">{formatTime(timeLeft)}</span>
              </div>
            )}
            {!started ? (
              <Button className="rounded-2xl" onClick={start}>Start Session</Button>
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

        {!started ? (
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Session rules</CardTitle>
              <CardDescription>50 random questions per session • 55-minute timer • Review wrong answers after submit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-xl">Bank: {BANK.length} questions</Badge>
                <Badge variant="outline" className="rounded-xl">Session: 50</Badge>
                <Badge variant="outline" className="rounded-xl">Timer: 55:00</Badge>
              </div>
              <Button className="rounded-2xl" onClick={start}>Start Session</Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 sm:p-6 space-y-4">
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
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-xl">Q {index + 1}/50</Badge>
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

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <Separator />

              <p className="text-slate-900 leading-relaxed whitespace-pre-wrap">{current.question}</p>

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

              {submitted && (
                <div className="rounded-2xl border bg-white p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="h-4 w-4 text-slate-700" />
                    <p className="font-semibold">Review</p>
                    <Badge variant="outline" className="rounded-xl">Correct: {String.fromCharCode(65 + current.correctIndex)}</Badge>
                  </div>
                  <p className="text-sm text-slate-700">Your answer: {answers[index] === undefined ? "—" : String.fromCharCode(65 + answers[index])}</p>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={showExplanations} onCheckedChange={(v) => setShowExplanations(Boolean(v))} />
                    <span className="text-sm text-slate-700">Show explanation (if provided)</span>
                  </div>
                  {showExplanations && current.explanation && (
                    <p className="text-sm text-slate-700"><span className="font-semibold">Explanation:</span> {current.explanation}</p>
                  )}
                  {!current.explanation && (
                    <p className="text-xs text-slate-500">No explanation provided in source for this question.</p>
                  )}
                </div>
              )}

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
                      <div className="text-sm text-slate-700">Answered: {score.answered}/50</div>
                    )}
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
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
                          {score.wrongIdx.map((wi) => (
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

        <div className="text-xs text-slate-500">Source bank: converted from CBAP_for_quizwhizzer.xlsx (questions + 4 options + optional explanation).</div>
      </div>
    </div>
  );
}
