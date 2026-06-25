import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RotateCcw,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Keyboard,
  Trophy,
  Check,
  X,
  RefreshCw,
  Zap
} from "lucide-react";
import rawFlashcards from "../flashcards.json";

// Fisher-Yates Shuffle
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function Flashcards() {
  const [phase, setPhase] = useState("welcome"); // welcome | study | results
  const [deck, setDeck] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({}); // { [concept]: 'correct' | 'incorrect' }
  const [isKeyboardHintsOpen, setIsKeyboardHintsOpen] = useState(true);

  // Start a fresh session with all cards
  const startNewSession = () => {
    const shuffled = shuffle(rawFlashcards);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({});
    setPhase("study");
  };

  // Start a retest session with only incorrect cards
  const startRetestSession = () => {
    const incorrectCards = rawFlashcards.filter(
      (card) => results[card.concept] === "incorrect"
    );
    if (incorrectCards.length === 0) return;
    
    const shuffled = shuffle(incorrectCards);
    setDeck(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    
    // Reset answers for the new sub-session
    const freshResults = {};
    // Carry over correct answers so our stats at the end reflect the overall deck if we want,
    // OR we can just score the current sub-session.
    // The standard Quizlet behavior is that you retest incorrect ones until they are all correct.
    // Let's reset the results for the cards being retested, while preserving the ones we already passed,
    // so we can compile a full view of the deck at the end.
    rawFlashcards.forEach((c) => {
      if (results[c.concept] === "correct") {
        freshResults[c.concept] = "correct";
      }
    });
    setResults(freshResults);
    setPhase("study");
  };

  const handleAnswer = (isCorrect) => {
    const currentCard = deck[currentIndex];
    if (!currentCard) return;

    setResults((prev) => ({
      ...prev,
      [currentCard.concept]: isCorrect ? "correct" : "incorrect",
    }));

    // Go to next card or show results
    if (currentIndex < deck.length - 1) {
      // Small animation delay to flip the card back before showing the next one
      setIsFlipped(false);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 200);
    } else {
      setPhase("results");
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (phase !== "study") return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowLeft" || e.key === "1") {
        e.preventDefault();
        handleAnswer(false);
      } else if (e.key === "ArrowRight" || e.key === "2") {
        e.preventDefault();
        handleAnswer(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, currentIndex, deck, results]);

  // Back to home page
  const handleExit = () => {
    window.location.hash = "";
  };

  // Helper values
  const totalCards = deck.length;
  const currentCard = deck[currentIndex];
  
  // Calculate correct/incorrect counts
  const correctCount = Object.values(results).filter((val) => val === "correct").length;
  const incorrectCount = Object.values(results).filter((val) => val === "incorrect").length;
  const progressPercent = totalCards > 0 ? Math.round((currentIndex / totalCards) * 100) : 0;
  
  // Calculate mastery score based on all raw cards
  const totalRawCount = rawFlashcards.length;
  const finalCorrectCount = rawFlashcards.filter(
    (c) => results[c.concept] === "correct"
  ).length;
  const masteryPercentage = Math.round((finalCorrectCount / totalRawCount) * 100);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-between p-4 sm:p-6 md:p-8">
      {/* Header bar */}
      <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-slate-200 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExit}
          className="text-slate-600 hover:text-slate-900 flex items-center gap-2 rounded-xl"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Exit to Menu</span>
        </Button>
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-violet-600" />
          <span className="font-bold text-slate-800">Formula Flashcards</span>
        </div>
        <div className="w-24"></div> {/* Spacer for alignment */}
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-4xl flex-1 flex flex-col items-center justify-center">
        {phase === "welcome" && (
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-sm text-center space-y-8">
            <div className="mx-auto bg-violet-50 h-16 w-16 flex items-center justify-center rounded-2xl mb-4">
              <Zap className="h-8 w-8 text-violet-600" />
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                Formula & Concept Flashcards
              </h1>
              <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                Test your knowledge of key CBAP formulas, definitions, meanings, and avoid critical exam traps.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 max-w-md mx-auto text-left">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
                <Check className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Shuffle Practice</h4>
                  <p className="text-xs text-slate-500">Every session is automatically randomized for better recall.</p>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
                <RefreshCw className="h-5 w-5 text-violet-500 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-semibold text-slate-800 text-sm">Smart Retesting</h4>
                  <p className="text-xs text-slate-500">Review and re-test only the cards you missed.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button
                onClick={startNewSession}
                className="w-full sm:w-auto px-8 py-6 text-base bg-violet-600 hover:bg-violet-700 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
              >
                Start Studying ({totalRawCount} Cards)
              </Button>
            </div>
          </div>
        )}

        {phase === "study" && currentCard && (
          <div className="w-full max-w-2xl flex flex-col items-center space-y-6">
            {/* Session Stats Header */}
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-sm text-slate-600 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    Card {currentIndex + 1} of {totalCards}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{correctCount}</span>
                  </span>
                  <span className="flex items-center gap-1 text-rose-600">
                    <XCircle className="h-4 w-4" />
                    <span>{incorrectCount}</span>
                  </span>
                </div>
              </div>
              <Progress value={progressPercent} className="h-2 bg-slate-100" />
            </div>

            {/* Interactive 3D Flashcard Container */}
            <div
              className="perspective-1000 w-full h-[450px] relative cursor-pointer group"
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div
                className={`w-full h-full transform-style-3d transition-transform duration-500 relative rounded-3xl shadow-md border border-slate-200 bg-white ${
                  isFlipped ? "rotate-y-180" : ""
                }`}
              >
                {/* CARD FRONT FACE */}
                <div className="absolute inset-0 backface-hidden flex flex-col justify-between p-8 sm:p-10 select-none">
                  <div className="flex items-center justify-between">
                    <Badge className="bg-violet-50 text-violet-700 hover:bg-violet-50 border-violet-100 uppercase tracking-wider font-semibold text-[10px] px-2 py-0.5">
                      Concept
                    </Badge>
                    <span className="text-xs text-slate-400">Click to flip</span>
                  </div>

                  <div className="flex-1 flex items-center justify-center text-center px-4">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-snug">
                      {currentCard.concept}
                    </h2>
                  </div>

                  <div className="text-center text-slate-400 text-xs flex items-center justify-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-pulse" />
                    <span>Click anywhere on the card to flip</span>
                  </div>
                </div>

                {/* CARD BACK FACE */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col justify-between p-6 sm:p-8 select-none overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-700 truncate pr-4 text-sm sm:text-base">
                      {currentCard.concept}
                    </h3>
                    <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-100 uppercase tracking-wider font-semibold text-[10px] px-2 py-0.5">
                      Definition / Details
                    </Badge>
                  </div>

                  {/* Card Back Content Stack */}
                  <div className="flex-1 py-4 flex flex-col gap-3 overflow-y-auto text-left">
                    {/* Formula/Definition */}
                    <div className="bg-indigo-50/60 border border-indigo-100/80 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">
                        Formula / Definition
                      </div>
                      <div className="text-base sm:text-lg font-bold text-slate-800 font-mono break-words leading-tight">
                        {currentCard.formula_definition}
                      </div>
                    </div>

                    {/* Meaning */}
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Meaning
                      </div>
                      <div className="text-slate-700 text-sm leading-relaxed">
                        {currentCard.meaning}
                      </div>
                    </div>

                    {/* Exam Trap */}
                    {currentCard.exam_trap && (
                      <div className="bg-rose-50/70 border border-rose-100/80 rounded-2xl p-4">
                        <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">
                          <AlertTriangle className="h-3 w-3" />
                          Exam Trap
                        </div>
                        <div className="text-rose-700 text-sm font-semibold leading-snug">
                          {currentCard.exam_trap}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-center text-slate-400 text-xs border-t border-slate-100 pt-3">
                    <span>Click anywhere on the card to flip back</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Answer Control Buttons */}
            <div className="w-full grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnswer(false);
                }}
                className="py-6 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center gap-2 border font-bold text-sm sm:text-base transition-all active:scale-95"
              >
                <X className="h-5 w-5" />
                <span>Needs Practice</span>
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAnswer(true);
                }}
                className="py-6 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center gap-2 border font-bold text-sm sm:text-base transition-all active:scale-95"
              >
                <Check className="h-5 w-5" />
                <span>Got It</span>
              </Button>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="w-full border border-slate-200/80 rounded-2xl bg-white p-4">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => setIsKeyboardHintsOpen(!isKeyboardHintsOpen)}
              >
                <div className="flex items-center gap-2 text-slate-600 text-xs font-semibold">
                  <Keyboard className="h-4 w-4 text-slate-400" />
                  <span>Keyboard Shortcuts Hint</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-slate-400">
                  {isKeyboardHintsOpen ? "Hide" : "Show"}
                </Badge>
              </div>

              {isKeyboardHintsOpen && (
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                  <div className="flex flex-col items-center justify-center gap-1 bg-slate-50 p-2 rounded-xl">
                    <kbd className="px-2 py-0.5 text-[10px] font-bold text-slate-800 bg-white border border-slate-200 rounded-md shadow-sm">
                      Space
                    </kbd>
                    <span className="text-[10px] text-slate-500">Flip Card</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1 bg-slate-50 p-2 rounded-xl">
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-800 bg-white border border-slate-200 rounded-md shadow-sm">
                        ←
                      </kbd>
                      <span className="text-[10px] text-slate-400">or</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-800 bg-white border border-slate-200 rounded-md shadow-sm">
                        1
                      </kbd>
                    </div>
                    <span className="text-[10px] text-rose-600 font-semibold">Needs Work</span>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-1 bg-slate-50 p-2 rounded-xl">
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-800 bg-white border border-slate-200 rounded-md shadow-sm">
                        →
                      </kbd>
                      <span className="text-[10px] text-slate-400">or</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-800 bg-white border border-slate-200 rounded-md shadow-sm">
                        2
                      </kbd>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold">Got It</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {phase === "results" && (
          <div className="w-full max-w-3xl space-y-6">
            {/* Results Header Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="bg-yellow-50 h-16 w-16 flex items-center justify-center rounded-2xl shrink-0">
                  <Trophy className="h-8 w-8 text-yellow-500 animate-bounce" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Session Complete!</h2>
                  <p className="text-slate-500 text-sm mt-0.5">Here is how you performed on this deck.</p>
                </div>
              </div>

              {/* Mastery Score Circle */}
              <div className="text-center sm:text-right flex flex-col items-center sm:items-end justify-center">
                <div className="text-3xl sm:text-4xl font-extrabold text-violet-600">
                  {masteryPercentage}%
                </div>
                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">
                  Mastery Rate
                </div>
              </div>
            </div>

            {/* Quick breakdown metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider">
                    Got It
                  </span>
                  <span className="text-2xl font-black text-emerald-800">{finalCorrectCount}</span>
                </div>
                <CheckCircle2 className="h-8 w-8 text-emerald-500/70" />
              </div>
              <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-rose-600 uppercase tracking-wider">
                    Needs Practice
                  </span>
                  <span className="text-2xl font-black text-rose-800">
                    {totalRawCount - finalCorrectCount}
                  </span>
                </div>
                <XCircle className="h-8 w-8 text-rose-500/70" />
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid sm:grid-cols-2 gap-4">
              {totalRawCount - finalCorrectCount > 0 ? (
                <Button
                  onClick={startRetestSession}
                  className="py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl shadow-md hover:shadow-lg font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Retest Wrong Cards ({totalRawCount - finalCorrectCount})</span>
                </Button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center text-emerald-800 text-sm font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>Perfect Score! All concepts mastered!</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={startNewSession}
                className="py-6 border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl shadow-sm font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Restart Full Deck</span>
              </Button>
            </div>

            {/* Review List */}
            <div className="space-y-4">
              <h3 className="text-lg font-extrabold text-slate-800 pt-2">Deck Concept Review</h3>
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {rawFlashcards.map((card) => {
                  const status = results[card.concept];
                  const isCorrect = status === "correct";
                  return (
                    <div
                      key={card.concept}
                      className={`border rounded-2xl p-4 bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:shadow-md ${
                        isCorrect
                          ? "border-emerald-100 hover:border-emerald-200"
                          : status === "incorrect"
                          ? "border-rose-100 hover:border-rose-200"
                          : "border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="space-y-1.5 flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-base">{card.concept}</h4>
                          {status && (
                            <Badge
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full hover:bg-transparent ${
                                isCorrect
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 border"
                                  : "bg-rose-50 text-rose-700 border-rose-100 border"
                              }`}
                            >
                              {isCorrect ? "Got It" : "Needs Practice"}
                            </Badge>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="font-bold text-slate-500 block">Formula / Definition:</span>
                            <span className="font-mono text-slate-800 font-semibold break-words bg-slate-50 border border-slate-100 rounded-md px-1.5 py-0.5 inline-block mt-0.5">
                              {card.formula_definition}
                            </span>
                          </div>
                          {card.exam_trap && (
                            <div>
                              <span className="font-bold text-rose-500 flex items-center gap-0.5">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                Exam Trap:
                              </span>
                              <span className="text-rose-700 font-medium">{card.exam_trap}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer copyright space */}
      <footer className="w-full max-w-4xl text-center py-6 text-slate-400 text-xs border-t border-slate-100 mt-8">
        <p>© CBAP Prep Flashcards. All standard formulas are aligned to BABOK v3 guidelines.</p>
      </footer>
    </div>
  );
}
