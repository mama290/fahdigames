
import React, { useState, useEffect, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameStatus, LevelConfig, LeaderboardEntry } from './types';
import { INITIAL_LEVEL } from './constants';
import { getOracleAdvice, getNextLevelConfig } from './services/geminiService';
import { soundService } from './services/soundService';
import { Target, Zap, Trophy, RefreshCw, Play, Sparkles, Gauge, Wind, Medal, Calendar, User, Crown, Pause, Volume2, VolumeX } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.START);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState<LevelConfig>({ ...INITIAL_LEVEL, themeName: 'Sunny Skies' });
  const [shotsUsed, setShotsUsed] = useState(0);
  const [advice, setAdvice] = useState("Pull back the string and let fate fly!");
  const [loading, setLoading] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [manualWind, setManualWind] = useState(0.0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [playerName, setPlayerName] = useState('Ace');
  const [personalBest, setPersonalBest] = useState(0);
  const [isMusicEnabled, setIsMusicEnabled] = useState(true);

  // Load persistence data on mount
  useEffect(() => {
    const savedLeaderboard = localStorage.getItem('fahdi_slingshot_leaderboard');
    if (savedLeaderboard) setLeaderboard(JSON.parse(savedLeaderboard));

    const savedName = localStorage.getItem('fahdi_slingshot_player_name');
    if (savedName) setPlayerName(savedName);

    const savedBest = localStorage.getItem('fahdi_slingshot_personal_best');
    if (savedBest) setPersonalBest(parseInt(savedBest, 10));
  }, []);

  // Music management
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

  const fetchAdvice = async () => {
    const msg = await getOracleAdvice(score, level.shotsAvailable - shotsUsed, level.number);
    setAdvice(msg);
  };

  const handleLevelComplete = async () => {
    soundService.playWin();
    setLoading(true);
    setStatus(GameStatus.LEVEL_COMPLETE);
    updateLeaderboard(score, level.number);
    const nextLevelData = await getNextLevelConfig(level.number);
    setLevel({ ...nextLevelData, number: level.number + 1 });
    setLoading(false);
    fetchAdvice();
  };

  const handleGameOver = () => {
    soundService.playLose();
    setStatus(GameStatus.GAME_OVER);
    updateLeaderboard(score, level.number);
    fetchAdvice();
  };

  const startGame = () => {
    localStorage.setItem('fahdi_slingshot_player_name', playerName);
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

  const togglePause = () => {
    if (status === GameStatus.PLAYING) setStatus(GameStatus.PAUSED);
    else if (status === GameStatus.PAUSED) setStatus(GameStatus.PLAYING);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-300">
      {/* HUD */}
      {(status === GameStatus.PLAYING || status === GameStatus.PAUSED) && (
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col md:flex-row justify-between items-start pointer-events-none gap-4">
          <div className="flex flex-col md:flex-row gap-3 pointer-events-auto items-stretch">
            {/* Scoreboard */}
            <div className="bg-white/80 backdrop-blur shadow-lg rounded-2xl p-4 flex gap-4 md:gap-5 items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">Level</span>
                <span className="text-xl md:text-2xl font-bold text-sky-900 leading-tight">{level.number}</span>
              </div>
              <div className="w-px h-8 bg-sky-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Shots</span>
                <span className="text-xl md:text-2xl font-bold text-rose-900 leading-tight">
                  {Math.max(0, level.shotsAvailable - shotsUsed)}
                </span>
              </div>
              <div className="w-px h-8 bg-sky-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Score</span>
                <span className="text-xl md:text-2xl font-bold text-emerald-900 leading-tight">{score}</span>
              </div>
              <div className="w-px h-8 bg-sky-200" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Goal</span>
                <span className="text-xl md:text-2xl font-bold text-indigo-900 leading-tight">{level.targetScore}</span>
              </div>
              {personalBest > 0 && (
                <>
                  <div className="w-px h-8 bg-sky-200" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
                      <Crown className="w-2.5 h-2.5" /> Best
                    </span>
                    <span className="text-xl md:text-2xl font-bold text-amber-900 leading-tight">{personalBest}</span>
                  </div>
                </>
              )}
            </div>

            {/* Sliders */}
            <div className="flex flex-row gap-2 h-full">
                <div className="bg-white/90 backdrop-blur p-3 rounded-2xl shadow-lg border border-sky-100 flex flex-col justify-center min-w-[140px]">
                   <div className="flex items-center gap-2 mb-1">
                      <Gauge className="w-3.5 h-3.5 text-sky-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Power</span>
                      <span className="ml-auto text-[10px] text-sky-600 font-bold">{speedMultiplier.toFixed(1)}x</span>
                   </div>
                   <input 
                      type="range" min="0.5" max="2.0" step="0.1" value={speedMultiplier} 
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
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wind</span>
                      <span className="ml-auto text-[10px] text-sky-600 font-bold">{manualWind > 0 ? '→' : manualWind < 0 ? '←' : ''} {Math.abs(manualWind).toFixed(1)}</span>
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
            <div className="bg-indigo-900/90 text-white p-3 rounded-2xl shadow-2xl border-2 border-indigo-400 max-w-[250px]">
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

      {/* Overlays */}
      {status === GameStatus.START && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center w-full max-w-md border-b-8 border-sky-100">
            <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
               <Target className="w-10 h-10 text-sky-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-sky-900 mb-1">Fahdi</h1>
            <h2 className="text-xl md:text-2xl font-bold text-sky-400 mb-6 italic leading-none">Slingshot</h2>
            
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
              className="group relative w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_6px_0_0_rgba(14,165,233,1)] hover:shadow-[0_4px_0_0_rgba(14,165,233,1)]"
            >
              <span className="flex items-center justify-center gap-2 text-xl">
                <Play className="fill-current w-5 h-5" /> TAKE FLIGHT
              </span>
            </button>
          </div>
        </div>
      )}

      {status === GameStatus.PAUSED && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-md">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl text-center border-b-8 border-sky-100">
            <h2 className="text-4xl font-black text-sky-900 mb-8">Game Paused</h2>
            <button 
              onClick={togglePause}
              className="group bg-sky-500 hover:bg-sky-400 text-white font-bold py-6 px-12 rounded-3xl transition-all hover:scale-110 shadow-[0_8px_0_0_rgba(14,165,233,1)]"
            >
              <Play className="w-12 h-12 fill-current" />
            </button>
            <p className="mt-8 text-slate-500 font-bold uppercase tracking-widest">Click to Resume</p>
          </div>
        </div>
      )}

      {status === GameStatus.LEVEL_COMPLETE && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-sky-900/60 backdrop-blur-md overflow-y-auto py-10 px-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center w-full max-w-lg">
            <div className="flex items-center justify-center gap-4 mb-6">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="text-left">
                    <h2 className="text-3xl font-black text-slate-800">Clear!</h2>
                    <p className="text-emerald-600 font-bold text-xl leading-none">Score: {score}</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-2xl text-left border border-slate-100">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Up Next</p>
                    <h3 className="text-base font-bold text-slate-700 truncate">{level.themeName || 'Mystery Skies'}</h3>
                    <div className="flex flex-col gap-1 mt-2">
                        <div className="bg-white px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100">Target: {level.targetScore}</div>
                        {score >= personalBest && (
                           <div className="bg-amber-50 text-amber-600 px-2 py-1 rounded-lg text-[9px] font-black border border-amber-100 flex items-center gap-1">
                              <Crown className="w-2 h-2" /> NEW PERSONAL BEST!
                           </div>
                        )}
                    </div>
                </div>

                <div className="bg-indigo-50/50 p-4 rounded-2xl text-left border border-indigo-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Medal className="w-4 h-4 text-indigo-500" />
                        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Hall of Fame</p>
                    </div>
                    <div className="space-y-1.5">
                        {leaderboard.map((entry, i) => (
                            <div key={i} className={`flex items-center justify-between text-[11px] p-1 rounded ${entry.name === playerName && entry.score === score ? 'bg-indigo-100/50' : ''}`}>
                                <span className={`font-bold truncate max-w-[80px] ${i === 0 ? 'text-amber-500' : 'text-slate-500'}`}>
                                    #{i+1} {entry.name}
                                </span>
                                <span className="font-mono text-indigo-600 font-bold">{entry.score}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <button 
              onClick={nextLevel}
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 shadow-[0_6px_0_0_#059669] active:shadow-none active:translate-y-[6px] flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <><Zap className="fill-current w-5 h-5" /> CONTINUE</>}
            </button>
          </div>
        </div>
      )}

      {status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-rose-900/60 backdrop-blur-md overflow-y-auto py-10 px-4">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl text-center w-full max-w-sm">
            <h2 className="text-3xl font-black text-slate-800 mb-2">Grounded!</h2>
            <p className="text-rose-600 font-bold mb-6 italic leading-none">The balloons escaped this time.</p>
            
            <div className="bg-slate-50 p-6 rounded-2xl mb-6 relative overflow-hidden">
               {score === personalBest && score > 0 && (
                  <div className="absolute -right-6 -top-2 bg-amber-400 text-white text-[8px] font-black py-1 px-8 rotate-45 shadow-sm">NEW BEST</div>
               )}
               <span className="text-slate-400 uppercase text-[10px] font-black tracking-widest block mb-1">Final Score</span>
               <span className="text-5xl font-black text-slate-800">{score}</span>
               {personalBest > score && (
                 <p className="text-[10px] text-slate-400 mt-2 font-bold">Best: {personalBest}</p>
               )}
            </div>

            <div className="bg-indigo-50/50 p-4 rounded-2xl text-left border border-indigo-100 mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Medal className="w-4 h-4 text-indigo-500" />
                    <p className="text-[10px] text-indigo-400 font-bold uppercase">Hall of Fame</p>
                </div>
                <div className="space-y-1.5">
                    {leaderboard.map((entry, i) => (
                        <div key={i} className={`flex items-center justify-between text-[11px] p-1 rounded ${entry.name === playerName && entry.score === score ? 'bg-indigo-100/50' : ''}`}>
                            <div className="flex items-center gap-2 truncate">
                                <span className={`font-bold ${i === 0 ? 'text-amber-500' : 'text-slate-500'}`}>#{i+1}</span>
                                <span className="text-slate-600 truncate">{entry.name}</span>
                                <span className="text-[9px] text-slate-400 flex items-center gap-0.5"><Calendar className="w-2 h-2"/>{entry.date}</span>
                            </div>
                            <span className="font-mono text-indigo-600 font-bold ml-2">{entry.score}</span>
                        </div>
                    ))}
                </div>
            </div>

            <button 
              onClick={startGame}
              className="w-full bg-rose-500 hover:bg-rose-400 text-white font-bold py-4 px-8 rounded-2xl transition-all hover:scale-105 shadow-[0_6px_0_0_#e11d48] active:shadow-none active:translate-y-[6px] flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-6 h-6" /> RETRY MISSION
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
