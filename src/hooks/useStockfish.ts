import { useEffect, useRef, useState, useCallback } from 'react';

export interface EngineAnalysis {
  score: number | null;      // centipawns, white's perspective
  mate: number | null;       // moves to mate, white's perspective (negative = black mates)
  depth: number;
  bestMove: string | null;   // UCI format e.g. "e2e4"
  pv: string[];              // principal variation in UCI format
  isAnalyzing: boolean;
}

const EMPTY: EngineAnalysis = { score: null, mate: null, depth: 0, bestMove: null, pv: [], isAnalyzing: false };

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [analysis, setAnalysis] = useState<EngineAnalysis>(EMPTY);
  const currentFenRef = useRef<string | null>(null);
  const isWhiteRef = useRef(true);

  useEffect(() => {
    const worker = new Worker('/stockfish-18-lite-single.js');
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<string>) => {
      const line = e.data;

      if (line === 'uciok') {
        worker.postMessage('setoption name Threads value 1');
        worker.postMessage('isready');
        return;
      }
      if (line === 'readyok') {
        setReady(true);
        return;
      }

      if (line.startsWith('info') && line.includes('score') && line.includes('depth')) {
        const depthM = line.match(/depth (\d+)/);
        const cpM = line.match(/score cp (-?\d+)/);
        const mateM = line.match(/score mate (-?\d+)/);
        const pvM = line.match(/ pv (.+)/);

        const depth = depthM ? parseInt(depthM[1]) : 0;
        if (depth < 1) return;

        // Scores from stockfish are from side-to-move's perspective
        const flip = isWhiteRef.current ? 1 : -1;

        setAnalysis(prev => ({
          ...prev,
          depth,
          score: cpM ? parseInt(cpM[1]) * flip : prev.score,
          mate: mateM ? parseInt(mateM[1]) * flip : (cpM ? null : prev.mate),
          pv: pvM ? pvM[1].trim().split(' ') : prev.pv,
          isAnalyzing: true,
        }));
      }

      if (line.startsWith('bestmove')) {
        const m = line.match(/bestmove (\S+)/);
        if (m && m[1] !== '(none)') {
          setAnalysis(prev => ({ ...prev, bestMove: m[1], isAnalyzing: false }));
        } else {
          setAnalysis(prev => ({ ...prev, isAnalyzing: false }));
        }
      }
    };

    worker.postMessage('uci');

    return () => {
      worker.postMessage('quit');
      worker.terminate();
    };
  }, []);

  const analyze = useCallback((fen: string) => {
    if (!workerRef.current || !ready) return;
    currentFenRef.current = fen;
    // Determine side to move from FEN
    isWhiteRef.current = fen.split(' ')[1] === 'w';
    setAnalysis(prev => ({ ...prev, isAnalyzing: true, bestMove: null, pv: [] }));
    workerRef.current.postMessage('stop');
    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage('go depth 20');
  }, [ready]);

  const stop = useCallback(() => {
    workerRef.current?.postMessage('stop');
    setAnalysis(prev => ({ ...prev, isAnalyzing: false }));
  }, []);

  return { analysis, analyze, stop, ready };
}
