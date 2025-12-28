
export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
  GAME_OVER = 'GAME_OVER'
}

export interface Point {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface Balloon {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  points: number;
  isPopping: boolean;
  popProgress: number;
  speed: number;
  waveOffset: number;
  waveAmplitude: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  active: boolean;
  trail: Point[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  radius: number;
}

export interface LevelConfig {
  number: number;
  balloonCount: number;
  balloonSpeedRange: [number, number];
  targetScore: number;
  shotsAvailable: number;
  wind: number;
  themeName: string;
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  date: string;
  level: number;
}
