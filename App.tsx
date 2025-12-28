
import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameStatus, LevelConfig, LeaderboardEntry } from './types';
import { INITIAL_LEVEL } from './constants';
import { soundService } from './services/soundService';
import { Target, Zap, Trophy, RefreshCw, Play, Sparkles, Gauge, Wind, Medal, Calendar, User, Pause, Volume2, VolumeX, Award } from 'lucide-react';

const STATIC_ADVICE = [
  "Pull back the string and let fate fly!",
  "The wind is a fickle friend. Adjust your aim.",
  "Small balloons are worth the most. Aim small, miss small.",
  "Patience is the archer's greatest arrow.",
  "The trajectory is clear if your mind is still.",
  "Even a missed shot teaches you the path of the next.",
  "Trust the slingshot; it knows the way to the sky.",
  "Gravity is the only constant. Respect its pull.",
  "Balloons are like dreams—pop them to make room for more!",
  "A steady hand wins the highest altitude."
];

const THEMES = [
  "Sunny Skies", "Morning Mist", "Cotton Candy Clouds", "Golden Hour", 
  "Twilight Peak", "Midnight Breeze", "Stormy Vista", "Stratosphere", 
  "Aurora Reach", "Void Horizon"
];

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<LevelConfig>({ ...INITIAL_LEVEL, themeName: THEMES[0] });
  const [shotsUsed, setShotsUsed] = useState(0);
  const [advice, setAdvice] = useState(STATIC_ADVICE[0]);
  const [loading, setLoading] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [manualWind, setManualWind] = useState(0.0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('Ace');
  const [personalBest, setPersonalBest] = useState(0);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  // Robust data initialization
  useEffect(() => {
    try {
      const savedLeaderboard = localStorage.getItem('fahdi_slingshot_leaderboard');
      if (savedLeaderboard) setLeaderboard(JSON.parse(savedLeaderboard));

      const savedName = localStorage.getItem('fahdi_slingshot_player_name');
      if (savedName) setPlayerName(savedName);

      const savedBest = localStorage.getItem('fahdi_slingshot_personal_best');
      if (savedBest) setPersonalBest(parseInt(savedBest, 10) || 0);
    } catch (e) {
      console.warn("Failed to load game data, resetting to defaults", e);
      localStorage.removeItem('fahdi_slingshot_leaderboard');
      localStorage.removeItem('fahdi_slingshot_personal_best');
    }
  }, []);

  useEffect(() => {
    if (isMusicEnabled && (status === GameStatus.PLAYING)) {
      soundService.startBGM();
    } else {
      soundService.stopBGM();
    }
  }, [status, isMusicEnabled]);

  const updateLeaderboard = useCallback((finalScore: number, finalLevel: number) => {
    if (finalScore > personalBest) {
      setPersonalBest(finalScore);
      localStorage.setItem('fahdi_slingshot_personal_best', finalScore.toString());
    }

    const newEntry: LeaderboardEntry = {
      name: playerName || "Player",
      score: finalScore,
      level: finalLevel,
      date: new Date().toLocaleDateString()
    };
    
    setLeaderboard(prev => {
      const updated = [...prev, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      localStorage.setItem('fahdi_slingshot_leaderboard', JSON.stringify(updated));
      return updated;
    });
  }, [playerName, personalBest]);

  const cycleAdvice = () => {
    setAdvice(STATIC_ADVICE[Math.floor(Math.random() * STATIC_ADVICE.length)]);
  };

  const handleLevelComplete = () => {
    soundService.playWin();
    setLoading(true);
    setStatus(GameStatus.LEVEL_COMPLETE);
    updateLeaderboard(score, level.number);
    
    // Standalone mathematical progression
    const nextNum = level.number + 1;
    const nextLevelConfig: LevelConfig = {
      number: nextNum,
      balloonCount: Math.min(25, 8 + Math.floor(nextNum * 1.5)),
      balloonSpeedRange: [1 + nextNum * 0.1, 2 + nextNum * 0.2] as [number, number],
      targetScore: level.targetScore + (2500 * nextNum),
      shotsAvailable: 20 + (nextNum * 2),
      wind: (Math.random() * 4 - 2),
      themeName: THEMES[nextNum % THEMES.length],
    };
    
    setTimeout(() => {
      setLevel(nextLevelConfig);
      setLoading(false);
      cycleAdvice();
    }, 500);
  };

  const handleGameOver = () => {
    soundService.playLose();
    setStatus(GameStatus.GAME_OVER);
    updateLeaderboard(score, level.number);
    cycleAdvice();
  };

  const startGame = () => {
    localStorage.setItem('fahdi_slingshot_player_name', playerName);
    setScore(0);
    setShotsUsed(0);
    setLevel({ ...INITIAL_LEVEL, themeName: THEMES[0] });
    setStatus(GameStatus.PLAYING);
    cycleAdvice();
  };

  const nextLevel = () => {
    setShotsUsed(0);
    setStatus(GameStatus.PLAYING);
    cycleAdvice();
  };

  const togglePause = () => {
    if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
    else if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-300">
      {/* Active Game HUD */}
      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row justify-between items-start pointer-events-none gap-4">
          
          {/* Arcade High Score Badge */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-1 pointer-events-auto">
             <div className={`bg-amber-100/90 backdrop-blur border-2 border-amber-400 px-6 py-2 rounded-b-2xl shadow-xl flex items-center gap-3 transition-transform duration-300 ${score > personalBest && score > 0 ? 'scale-110 border-amber-500 bg-amber-200' : ''}`}>
                <Award className={`w-5 h-5 ${score > personalBest ? 'text-amber-600 animate-bounce' : 'text-amber-500'}`} />
                <div className="flex flex-col items-center">
                   <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest leading-none mb-1">HI-SCORE</span>
                   <span className="text-xl font-black text-amber-900 leading-none">{Math.max(score, personalBest)}</span>
                </div>
             </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 pointer-events-auto items-stretch">
            <div className="bg-white/80 backdrop-blur shadow-lg rounded-2xl p-4 flex gap-4 items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Level</span>
                <span className="text-xl md:text-2xl font-bold text-sky-900 leading-tight">{level.number}</span>
              </div>
              <div className="w-px h-8 bg-sky-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Score</span>
                <span className="text-xl md:text-2xl font-bold text-emerald-900 leading-tight">{score}</span>
              </div>
              <div className="w-px h-8 bg-sky-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Shots</span>
                <span className="text-xl md:text-2xl font-bold text-rose-900 leading-tight">
                  {Math.max(0, level.shotsAvailable - shotsUsed)}
                </span>
              </div>
            </div>

            <div className="flex flex-row gap-2 h-full">
                <div className="bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg border border-sky-100 flex flex-col justify-center min-w-[140px]">
                   <div className="flex items-center gap-2 mb-1">
                      <Gauge className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Stretch Power</span>
                   </div>
                   <input 
                      type="range" min="0.5" max="1.5" step="0.1" value={speedMultiplier} 
                      onChange={(e) => {
                        setSpeedMultiplier(parseFloat(e.target.value));
                        soundService.playStretch();
                      }}
                      className="w-full h-1.5 bg-sky-100 rounded-lg appearance-none cursor-pointer accent-sky-500 pointer-events-auto"
                   />
                </div>
                <div className="bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg border border-sky-100 flex flex-col justify-center min-w-[140px]">
                   <div className="flex items-center gap-2 mb-1">
                      <Wind className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wind {manualWind > 0 ? '→' : manualWind < 0 ? '←' : ''}</span>
                   </div>
                   <input 
                      type="range" min="-3.0" max="3.0" step="0.2" value={manualWind} 
                      onChange={(e) => {
                        setManualWind(parseFloat(e.target.value));
                        soundService.playStretch();
                      }}
                      className="w-full h-1.5 bg-sky-100 rounded-lg appearance-none cursor-pointer accent-sky-600 pointer-events-auto"
                   />
                </div>
            </div>
          </div>

          <div className="flex gap-2 pointer-events-auto">
            <button 
              onClick={() => setIsMusicEnabled(!isMusicEnabled)}
              className="bg-white/80 backdrop-blur p-4 rounded-2xl shadow-lg border-2 border-sky-100 text-sky-600 hover:bg-white transition-colors"
            >
              {isMusicEnabled ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>
            <button 
              onClick={togglePause}
              className="bg-white/80 backdrop-blur p-4 rounded-2xl shadow-lg border-2 border-sky-100 text-sky-600 hover:bg-white transition-colors"
            >
              <Pause className="w-6 h-6" />
            </button>
            <div className="bg-indigo-900/90 text-white p-3 rounded-2xl shadow-2xl border-2 border-indigo-400 max-w-[200px]">
               <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[10px] uppercase font-bold tracking-tighter text-indigo-300">Sensei M.Fahad</span>
               </div>
               <p className="text-[11px] leading-snug italic text-indigo-50 font-medium">"{advice}"</p>
            </div>
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
        manualWind={manualWind}
      />

      {/* Start Screen */}
      {status === GameStatus.START && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center w-full max-w-md border-b-8 border-sky-100 animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
               <Target className="w-10 h-10 text-sky-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-sky-900 mb-1">Fahdi</h1>
            <h2 className="text-xl md:text-2xl font-bold text-sky-400 mb-2 italic leading-none">Slingshot</h2>
            
            {personalBest > 0 && (
              <div className="mb-6 flex items-center justify-center gap-2 bg-amber-50 py-1.5 px-6 rounded-full border-2 border-amber-300 w-fit mx-auto shadow-sm">
                <Award className="w-5 h-5 text-amber-500" />
                <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Personal Best: {personalBest}</span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-2xl mb-8 border border-slate-100 text-left">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Pilot Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value.slice(0, 12))}
                  placeholder="Enter name..."
                  className="w-full bg-white border-2 border-slate-200 rounded-xl py-3 pl-10 pr-4 font-bold text-slate-700 focus:border-sky-400 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button 
              onClick={startGame}
              className="group relative w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_6px_0_0_rgba(14,165,233,1)]"
            >
              <span className="flex items-center justify-center gap-2 text-xl tracking-wide uppercase">
                <Play className="fill-current w-5 h-5" /> START MISSION
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-rose-900/60 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center w-full max-w-sm border-b-8 border-rose-100">
            <h2 className="text-3xl font-black text-slate-800 mb-2">Grounded!</h2>
            <p className="text-rose-600 font-bold mb-6 italic leading-none">The balloons escaped this time.</p>
            
            <div className="bg-slate-50 p-6 rounded-2xl mb-6 relative overflow-hidden">
               {score >= personalBest && score > 0 && (
                  <div className="absolute -right-6 -top-2 bg-amber-400 text-white text-[8px] font-black py-1 px-8 rotate-45 shadow-sm uppercase">New Hi-Score</div>
               )}
               <span className="text-slate-400 uppercase text-[10px] font-black tracking-widest block mb-1">Final Score</span>
               <span className="text-5xl font-black text-slate-800">{score}</span>
               {personalBest > score && (
                 <p className="text-[10px] text-slate-400 mt-2 font-bold">BEST: {personalBest}</p>
               )}
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl text-left border border-indigo-100 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Medal className="w-4 h-4 text-indigo-500" />
                    <p className="text-[10px] text-indigo-400 font-bold uppercase">Hall of Fame</p>
                </div>
                <div className="space-y-1.5">
                    {leaderboard.length > 0 ? leaderboard.map((entry, i) => (
                        <div key={i} className={`flex items-center justify-between text-[11px] p-1 rounded ${entry.name === playerName && entry.score === score ? 'bg-indigo-100/50' : ''}`}>
                            <div className="flex items-center gap-2 truncate">
                                <span className={`font-bold ${i === 0 ? 'text-amber-500' : 'text-slate-500'}`}>#{i+1}</span>
                                <span className="text-slate-600 truncate">{entry.name}</span>
                            </div>
                            <span className="font-mono text-indigo-600 font-bold ml-2">{entry.score}</span>
                        </div>
                    )) : <p className="text-[10px] text-slate-400 text-center py-2">No entries yet.</p>}
                </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-rose-500 hover:bg-rose-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 shadow-[0_6px_0_0_#e11d48] active:translate-y-[6px] active:shadow-none flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-6 h-6" /> RETRY MISSION
            </button>
          </div>
        </div>
      )}

      {/* Level Complete Screen */}
      {status === GameStatus.LEVEL_COMPLETE && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-900/60 backdrop-blur-md p-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center w-full max-w-sm border-b-8 border-emerald-100 animate-in slide-in-from-bottom-8 duration-500">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 mb-1">Clear!</h2>
            <p className="text-emerald-600 font-bold mb-6">Level {level.number - 1} Mastered</p>
            
            <div className="bg-slate-50 p-6 rounded-2xl mb-8">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Current Score</span>
                <span className="text-4xl font-black text-slate-800">{score}</span>
            </div>

            <button 
              onClick={nextLevel}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 shadow-[0_6px_0_0_#059669] flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Zap className="fill-current w-5 h-5" /> NEXT ALTITUDE
            </button>
          </div>
        </div>
      )}

      {/* Pause Screen */}
      {status === GameStatus.PAUSED && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center border-b-8 border-sky-100">
            <h2 className="text-4xl font-black text-sky-900 mb-8">Paused</h2>
            <button 
              onClick={togglePause}
              className="group bg-sky-500 hover:bg-sky-400 text-white font-bold p-8 rounded-full transition-all hover:scale-110 shadow-[0_8px_0_0_rgba(14,165,233,1)]"
            >
              <Play className="w-12 h-12 fill-current" />
            </button>
            <p className="mt-8 text-slate-400 font-bold uppercase tracking-widest">Click to Resume</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
