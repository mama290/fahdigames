
import React, { useState, useEffect, useRef, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameStatus, LevelConfig } from './types';
import { INITIAL_LEVEL } from './constants';
import { getOracleAdvice, getNextLevelConfig } from './services/geminiService';
import { Target, Zap, Trophy, RefreshCw, Play, Sparkles, Gauge } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<LevelConfig>({ ...INITIAL_LEVEL, themeName: 'Sunny Skies' });
  const [shotsUsed, setShotsUsed] = useState(0);
  const [advice, setAdvice] = useState("Pull back the string and let fate fly!");
  const [loading, setLoading] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);

  const fetchAdvice = async () => {
    const msg = await getOracleAdvice(score, level.shotsAvailable - shotsUsed, level.number);
    setAdvice(msg);
  };

  const handleLevelComplete = async () => {
    setLoading(true);
    setStatus(GameStatus.LEVEL_COMPLETE);
    const nextLevelData = await getNextLevelConfig(level.number);
    setLevel({ ...nextLevelData, number: level.number + 1 });
    setLoading(false);
    fetchAdvice();
  };

  const handleGameOver = () => {
    setStatus(GameStatus.GAME_OVER);
    fetchAdvice();
  };

  const startGame = () => {
    setScore(0);
    setShotsUsed(0);
    setLevel({ ...INITIAL_LEVEL, themeName: 'Sunny Skies' });
    setStatus(GameStatus.PLAYING);
    fetchAdvice();
  };

  const nextLevel = () => {
    setShotsUsed(0);
    setStatus(GameStatus.PLAYING);
    fetchAdvice();
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-300">
      {/* HUD */}
      {status === GameStatus.PLAYING && (
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
          {/* Top Left Controls Wrapper */}
          <div className="flex flex-col gap-2 pointer-events-auto">
            {/* Scoreboard */}
            <div className="bg-white/80 backdrop-blur shadow-lg rounded-2xl p-4 flex gap-6 items-center">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">Level</span>
                <span className="text-2xl font-bold text-sky-900">{level.number}</span>
              </div>
              <div className="w-px h-8 bg-sky-200" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-wider">Shots</span>
                <span className="text-2xl font-bold text-rose-900">
                  {level.shotsAvailable - shotsUsed}
                </span>
              </div>
              <div className="w-px h-8 bg-sky-200" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Score</span>
                <span className="text-2xl font-bold text-emerald-900">{score}</span>
              </div>
            </div>

            {/* Speed Slider - Now moved below scoreboard */}
            <div className="bg-white/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-sky-100 min-w-[200px] w-full max-w-sm">
               <div className="flex items-center gap-2 mb-2">
                  <Gauge className="w-4 h-4 text-sky-500" />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sling Power</span>
                  <span className="ml-auto text-sky-600 font-bold">{speedMultiplier.toFixed(1)}x</span>
               </div>
               <input 
                  type="range" 
                  min="0.5" 
                  max="2.0" 
                  step="0.1" 
                  value={speedMultiplier} 
                  onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                  className="w-full h-2 bg-sky-100 rounded-lg appearance-none cursor-pointer accent-sky-500"
               />
               <div className="flex justify-between mt-1 px-1">
                  <span className="text-[10px] text-slate-400 font-bold italic">LO</span>
                  <span className="text-[10px] text-slate-400 font-bold italic">HI</span>
               </div>
            </div>
          </div>

          {/* Oracle Advice (Top Right) */}
          <div className="max-w-xs bg-indigo-900/90 text-white p-4 rounded-2xl shadow-2xl border-2 border-indigo-400 pointer-events-auto">
             <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] uppercase font-bold tracking-tighter text-indigo-300">The Balloon Oracle</span>
             </div>
             <p className="text-sm italic font-medium leading-tight">"{advice}"</p>
          </div>
        </div>
      )}

      {/* Main Game Area */}
      <GameCanvas 
        status={status}
        level={level}
        onScoreUpdate={(s) => setScore(prev => prev + s)}
        onShot={() => setShotsUsed(prev => prev + 1)}
        onLevelComplete={handleLevelComplete}
        onGameOver={handleGameOver}
        score={score}
        shotsUsed={shotsUsed}
        speedMultiplier={speedMultiplier}
      />

      {/* Overlays */}
      {status === GameStatus.START && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center max-w-md border-b-8 border-sky-100">
            <div className="w-24 h-24 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
               <Target className="w-12 h-12 text-sky-600" />
            </div>
            <h1 className="text-5xl font-black text-sky-900 mb-2">Fahdi</h1>
            <h2 className="text-2xl font-bold text-sky-400 mb-6 italic">Slingshot</h2>
            <p className="text-slate-600 mb-8 font-medium">Pop floating balloons to advance! The Balloon Oracle is watching your every shot.</p>
            <button 
              onClick={startGame}
              className="group relative w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_6px_0_0_rgba(14,165,233,1)] hover:shadow-[0_4px_0_0_rgba(14,165,233,1)]"
            >
              <span className="flex items-center justify-center gap-2 text-xl">
                <Play className="fill-current" /> START GAME
              </span>
            </button>
          </div>
        </div>
      )}

      {status === GameStatus.LEVEL_COMPLETE && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-sky-900/60 backdrop-blur-md">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-sm">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-2">Level Clear!</h2>
            <p className="text-emerald-600 font-bold mb-6 text-xl">Score: {score}</p>
            
            <div className="bg-slate-50 p-4 rounded-xl mb-6 text-left border border-slate-100">
                <p className="text-xs text-slate-400 font-bold uppercase mb-2">Next Destination</p>
                <h3 className="text-lg font-bold text-slate-700">{level.themeName || 'Mystery Skies'}</h3>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-white p-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-100">Balloons: {level.balloonCount}</div>
                    <div className="bg-white p-2 rounded-lg text-xs font-semibold text-slate-600 border border-slate-100">Target: {level.targetScore}</div>
                </div>
            </div>

            <button 
              onClick={nextLevel}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 shadow-[0_6px_0_0_#059669] flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <><Zap className="fill-current" /> NEXT LEVEL</>
              )}
            </button>
          </div>
        </div>
      )}

      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-rose-900/60 backdrop-blur-md">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center max-w-sm">
            <h2 className="text-3xl font-black text-slate-800 mb-2">Out of Shots!</h2>
            <p className="text-rose-600 font-bold mb-6">You popped well, but the air is empty.</p>
            <div className="bg-slate-50 p-6 rounded-2xl mb-8">
               <span className="text-slate-400 uppercase text-xs font-black tracking-widest block mb-1">Final Score</span>
               <span className="text-5xl font-black text-slate-800">{score}</span>
            </div>
            <button 
              onClick={startGame}
              className="w-full bg-rose-500 hover:bg-rose-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 shadow-[0_6px_0_0_#e11d48] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-6 h-6" /> TRY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;