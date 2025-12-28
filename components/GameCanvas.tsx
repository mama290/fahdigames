
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameStatus, LevelConfig, Balloon, Projectile, Point, Particle } from '../types';
import { GRAVITY, ELASTICITY, MAX_STRETCH, FRICTION, BALLOON_COLORS } from '../constants';
import { soundService } from '../services/soundService';

interface GameCanvasProps {
  status: GameStatus;
  level: LevelConfig;
  score: number;
  shotsUsed: number;
  onScoreUpdate: (s: number) => void;
  onShot: () => void;
  onLevelComplete: () => void;
  onGameOver: () => void;
  speedMultiplier: number;
  balloonSpeedMultiplier: number;
  manualWind: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  status, level, onScoreUpdate, onShot, onLevelComplete, onGameOver, score, shotsUsed, speedMultiplier, balloonSpeedMultiplier, manualWind
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
  // Physics & Game Data
  const balloons = useRef<Balloon[]>([]);
  const projectiles = useRef<Projectile[]>([]);
  const particles = useRef<Particle[]>([]);
  const slingshot = useRef({
    anchor: { x: 100, y: 0 },
    drag: { x: 100, y: 0 },
    isDragging: false,
    active: true,
  });

  const [mousePos, setMousePos] = useState<Point>({ x: 0, y: 0 });

  // Initialize Balloons for a level
  const spawnBalloon = useCallback(() => {
    const radius = 18 + Math.random() * 22; // Range 18 to 40
    const speed = level.balloonSpeedRange[0] + Math.random() * (level.balloonSpeedRange[1] - level.balloonSpeedRange[0]);
    const x = 300 + Math.random() * (window.innerWidth - 400);
    
    // Higher score for smaller balloons. 
    // Smallest (18) -> ~200 points, Largest (40) -> ~50 points
    const points = Math.round((45 - radius) * 7.5);

    return {
      id: Math.random().toString(36).substr(2, 9),
      x,
      y: window.innerHeight + 100,
      radius,
      color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
      points: points,
      isPopping: false,
      popProgress: 0,
      speed: speed,
      waveOffset: Math.random() * Math.PI * 2,
      waveAmplitude: 10 + Math.random() * 30
    };
  }, [level]);

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      if (balloons.current.length === 0) {
        balloons.current = Array.from({ length: level.balloonCount }).map(spawnBalloon);
      }
    }
  }, [status, level, spawnBalloon]);

  const createPopParticles = (x: number, y: number, color: string) => {
    soundService.playPop();
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i;
      const speed = 2 + Math.random() * 4;
      particles.current.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 1.0,
        radius: 2 + Math.random() * 3
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (status !== GameStatus.PLAYING) return;
    
    // Fix: Prevent starting a new shot if the player has no shots left
    if (shotsUsed >= level.shotsAvailable) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const dist = Math.sqrt((x - slingshot.current.anchor.x) ** 2 + (y - slingshot.current.anchor.y) ** 2);
    if (dist < 50) {
      slingshot.current.isDragging = true;
      soundService.playStretch();
    }
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    setMousePos({ x, y });

    if (slingshot.current.isDragging) {
      const dx = x - slingshot.current.anchor.x;
      const dy = y - slingshot.current.anchor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > MAX_STRETCH) {
        const ratio = MAX_STRETCH / dist;
        slingshot.current.drag = {
          x: slingshot.current.anchor.x + dx * ratio,
          y: slingshot.current.anchor.y + dy * ratio,
        };
      } else {
        slingshot.current.drag = { x, y };
      }
    }
  };

  const handleMouseUp = () => {
    if (!slingshot.current.isDragging) return;
    
    slingshot.current.isDragging = false;
    soundService.playShot();
    
    const dx = slingshot.current.anchor.x - slingshot.current.drag.x;
    const dy = slingshot.current.anchor.y - slingshot.current.drag.y;
    
    const elasticityWithMultiplier = ELASTICITY * speedMultiplier;

    projectiles.current.push({
      x: slingshot.current.anchor.x,
      y: slingshot.current.anchor.y,
      vx: dx * elasticityWithMultiplier,
      vy: dy * elasticityWithMultiplier,
      radius: 8,
      active: true,
      trail: []
    });
    
    onShot();
    slingshot.current.drag = { ...slingshot.current.anchor };
  };

  const update = () => {
    if (status !== GameStatus.PLAYING) return;

    balloons.current.forEach(b => {
      if (!b.isPopping) {
        b.y -= b.speed * balloonSpeedMultiplier;
        b.x += Math.sin(Date.now() / 500 + b.waveOffset) * 0.5 + level.wind + (manualWind * 0.5);
        
        if (b.y < -100) {
          b.y = window.innerHeight + 100;
          b.x = 300 + Math.random() * (window.innerWidth - 400);
        }
        if (b.x < -100) b.x = window.innerWidth + 100;
        if (b.x > window.innerWidth + 100) b.x = -100;
      } else {
        b.popProgress += 0.1;
      }
    });

    balloons.current = balloons.current.filter(b => b.popProgress < 1.0);

    projectiles.current.forEach(p => {
      if (!p.active) return;
      
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > 15) p.trail.shift();

      p.vy += GRAVITY;
      p.vx += manualWind * 0.05;
      
      p.x += p.vx;
      p.y += p.vy;

      balloons.current.forEach(b => {
        if (!b.isPopping) {
          const dist = Math.sqrt((p.x - b.x) ** 2 + (p.y - b.y) ** 2);
          if (dist < p.radius + b.radius) {
            b.isPopping = true;
            onScoreUpdate(b.points);
            createPopParticles(b.x, b.y, b.color);
          }
        }
      });

      if (p.y > window.innerHeight + 100 || p.x > window.innerWidth + 100 || p.x < -100) {
        p.active = false;
      }
    });

    particles.current.forEach(p => {
      p.x += p.vx + (manualWind * 0.2);
      p.y += p.vy;
      p.vy += 0.1;
      p.life -= 0.02;
    });
    particles.current = particles.current.filter(p => p.life > 0);

    if (score >= level.targetScore) {
       onLevelComplete();
    } else if (shotsUsed >= level.shotsAvailable && projectiles.current.every(p => !p.active)) {
       onGameOver();
    }

    if (balloons.current.length < level.balloonCount) {
        balloons.current.push(spawnBalloon());
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 64px "Fredoka One", cursive';
    ctx.fillText('Fahdi balloon popper', ctx.canvas.width / 2, ctx.canvas.height / 2 - 20);
    ctx.font = '700 24px "Quicksand", sans-serif';
    ctx.fillText('ver 1.1', ctx.canvas.width / 2, ctx.canvas.height / 2 + 30);
    ctx.restore();

    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(400, 200, 60, 0, Math.PI * 2);
    ctx.arc(460, 200, 80, 0, Math.PI * 2);
    ctx.arc(520, 200, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(window.innerWidth - 300, 400, 50, 0, Math.PI * 2);
    ctx.arc(window.innerWidth - 240, 400, 70, 0, Math.PI * 2);
    ctx.arc(window.innerWidth - 180, 400, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    const anchor = slingshot.current.anchor;
    ctx.strokeStyle = '#4A3728';
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(anchor.x - 10, anchor.y + 10);
    ctx.lineTo(anchor.x - 10, anchor.y + 120);
    ctx.stroke();

    if (slingshot.current.isDragging) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(anchor.x - 15, anchor.y);
      ctx.lineTo(slingshot.current.drag.x, slingshot.current.drag.y);
      ctx.stroke();
    }

    projectiles.current.forEach(p => {
      if (!p.active) return;
      
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 4;
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.stroke();
      }

      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.arc(p.x - 2, p.y - 2, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    balloons.current.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.isPopping) {
        ctx.scale(1 + b.popProgress * 0.5, 1 - b.popProgress * 0.8);
        ctx.globalAlpha = 1 - b.popProgress;
      }
      
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, b.radius, b.radius * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(10, b.radius * 0.6);
      ctx.font = `bold ${fontSize}px "Fredoka One", cursive`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;
      ctx.fillText(b.points.toString(), 0, 0);
      ctx.restore();

      ctx.beginPath();
      ctx.moveTo(-5, b.radius * 1.15);
      ctx.lineTo(5, b.radius * 1.15);
      ctx.lineTo(0, b.radius * 1.3);
      ctx.fill();

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, b.radius * 1.3);
      ctx.bezierCurveTo(5, b.radius * 1.6, -5, b.radius * 1.9, 0, b.radius * 2.2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.beginPath();
      ctx.ellipse(-b.radius * 0.4, -b.radius * 0.4, b.radius * 0.2, b.radius * 0.3, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });

    particles.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    if (slingshot.current.isDragging) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(anchor.x + 15, anchor.y);
      ctx.lineTo(slingshot.current.drag.x, slingshot.current.drag.y);
      ctx.stroke();
      
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(slingshot.current.drag.x, slingshot.current.drag.y, 10, 0, Math.PI * 2);
      ctx.fill();

      const dx = anchor.x - slingshot.current.drag.x;
      const dy = anchor.y - slingshot.current.drag.y;
      const elasticityWithMultiplier = ELASTICITY * speedMultiplier;
      
      let px = anchor.x;
      let py = anchor.y;
      let pvx = dx * elasticityWithMultiplier;
      let pvy = dy * elasticityWithMultiplier;
      
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.moveTo(px, py);
      for (let i = 0; i < 30; i++) {
        pvy += GRAVITY;
        pvx += manualWind * 0.05;
        px += pvx;
        py += pvy;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#5D4636';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(anchor.x + 10, anchor.y + 10);
    ctx.lineTo(anchor.x + 10, anchor.y + 120);
    ctx.stroke();
  };

  const animate = useCallback((time: number) => {
    if (status !== GameStatus.PAUSED) {
      update();
    }
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) draw(ctx);
    requestRef.current = requestAnimationFrame(animate);
  }, [status, level, score, shotsUsed, speedMultiplier, balloonSpeedMultiplier, manualWind]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        slingshot.current.anchor = { x: 100, y: window.innerHeight - 200 };
        slingshot.current.drag = { ...slingshot.current.anchor };
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleMouseDown}
      onTouchMove={handleMouseMove}
      onTouchEnd={handleMouseUp}
      className="absolute inset-0 cursor-crosshair"
    />
  );
};

export default GameCanvas;
