import React, { useState, useEffect } from "react";
import MockExam from "./components/MockExam";
import DrillBank from "./components/DrillBank";
import TechniquesDrill from "./components/TechniquesDrill";
import Flashcards from "./components/Flashcards";
import { BookOpen, Target, LayoutDashboard, Wrench, Layers } from "lucide-react";

export default function App() {
  const [route, setRoute] = useState(() => window.location.hash.replace("#", "") || "home");

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash.replace("#", "") || "home");
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  if (route === "mock") return <MockExam />;
  if (route === "drill") return <DrillBank />;
  if (route === "techniques") return <TechniquesDrill />;
  if (route === "flashcards") return <Flashcards />;

  // Home Menu
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto bg-white border h-16 w-16 flex items-center justify-center rounded-2xl shadow-sm mb-6">
            <LayoutDashboard className="h-8 w-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">CBAP Prep Center</h1>
          <p className="text-lg text-slate-600">Choose your practice mode below to begin.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 pt-4">
          <div 
            onClick={() => navigate("mock")}
            className="group cursor-pointer bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all hover:border-indigo-300"
          >
            <div className="bg-indigo-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="h-6 w-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-900">Full Mock Exam</h2>
            <p className="text-slate-600 pr-2 leading-relaxed">
              Take a comprehensive 50-question simulated exam with a 55-minute timer based on the static study bank.
            </p>
          </div>

          <div 
            onClick={() => navigate("drill")}
            className="group cursor-pointer bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all hover:border-emerald-300"
          >
            <div className="bg-emerald-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Target className="h-6 w-6 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-900">KA Drill Bank</h2>
            <p className="text-slate-600 pr-2 leading-relaxed">
              Drill specific Knowledge Areas (e.g., KA4, KA5) with dynamically generated mini-scenarios (30Q / 40m).
            </p>
          </div>

          <div 
            onClick={() => navigate("techniques")}
            className="group cursor-pointer bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all hover:border-amber-300"
          >
            <div className="bg-amber-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Wrench className="h-6 w-6 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-900">Techniques Drill</h2>
            <p className="text-slate-600 pr-2 leading-relaxed">
              Drill 50 key BA techniques (KA10). Identify purposes, strengths, and limitations with a dynamic 100Q bank.
            </p>
          </div>

          <div 
            onClick={() => navigate("flashcards")}
            className="group cursor-pointer bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all hover:border-violet-300"
          >
            <div className="bg-violet-50 w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Layers className="h-6 w-6 text-violet-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2 text-slate-900">Formula Flashcards</h2>
            <p className="text-slate-600 pr-2 leading-relaxed">
              Master formulas, definitions, meanings, and avoid key exam traps with interactive flipping and targeted retesting.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
