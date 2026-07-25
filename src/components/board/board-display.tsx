'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Radio, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import type { Board } from '@/lib/types';

export function BoardDisplay() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [heartbeatCount, setHeartbeatCount] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/boards');
        const data = await res.json();
        setBoards(data.boards);
        if (data.boards.length > 0) setSelectedBoard(data.boards[0]);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedBoard) return;
    const interval = setInterval(() => {
      setHeartbeatCount((prev) => prev + 1);
      // Simulate heartbeat
      fetch('/api/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedBoard.id, lastHeartbeat: new Date().toISOString() }),
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [selectedBoard]);

  const handleBoardSelect = (boardId: string) => {
    const board = boards.find((b) => b.id === boardId);
    if (board) setSelectedBoard(board);
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-80 rounded-lg" /></div>;
  }

  const isAlerting = !!selectedBoard?.displayMessage;
  const countdown = selectedBoard?.eta || 0;
  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Board Display Simulator</h1>
          <p className="text-sm text-muted-foreground">IoT display board client preview</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedBoard?.id || ''} onValueChange={handleBoardSelect}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Select board" /></SelectTrigger>
            <SelectContent>
              {boards.map((board) => (
                <SelectItem key={board.id} value={board.id}>{board.boardName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            <Wifi className="h-3 w-3 mr-1" /> Heartbeats: {heartbeatCount}
          </Badge>
        </div>
      </div>

      {/* Simulated LED Display */}
      <div className={`rounded-xl border-2 p-8 text-center transition-all duration-500 ${isAlerting ? 'bg-black text-red-500 border-red-500 emergency-pulse' : 'bg-black/90 text-green-400 border-green-500/50'}`}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <Radio className="h-5 w-5" />
          <span className="text-xs font-mono uppercase tracking-widest opacity-70">Lifeline Display Board</span>
        </div>

        {selectedBoard && (
          <>
            <p className="text-xs font-mono opacity-50 mb-4">{selectedBoard.boardName}</p>

            {isAlerting ? (
              <div className="space-y-6">
                <div className="text-5xl md:text-7xl font-bold tracking-tight">
                  🚑 {selectedBoard.displayMessage}
                </div>

                <div className="flex items-center justify-center gap-6 text-xl md:text-3xl font-mono">
                  <div>
                    <p className="text-xs opacity-50 mb-1">ETA</p>
                    <p className="font-bold">
                      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                    </p>
                  </div>
                  {selectedBoard.direction && (
                    <div>
                      <p className="text-xs opacity-50 mb-1">FROM</p>
                      <p className="font-bold">{selectedBoard.direction}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500 emergency-pulse" />
                  <span className="text-xs uppercase tracking-widest font-bold">Emergency In Progress</span>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-4xl md:text-5xl font-bold opacity-80">✓ Clear</div>
                <p className="text-lg opacity-60">No active emergencies</p>
                <div className="flex items-center justify-center gap-2">
                  <Wifi className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-mono opacity-50">Connected — Monitoring</span>
                </div>
              </div>
            )}
          </>
        )}

        {!selectedBoard && (
          <div className="text-3xl opacity-50">No Board Selected</div>
        )}
      </div>

      {/* Board Info Cards */}
      {selectedBoard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant={selectedBoard.status === 'ACTIVE' ? 'outline' : 'secondary'} className="mt-1">
                {selectedBoard.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-xs font-mono mt-1">{selectedBoard.latitude.toFixed(4)}, {selectedBoard.longitude.toFixed(4)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Radius</p>
              <p className="text-sm font-bold mt-1">{selectedBoard.radius}m</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Heartbeat</p>
              <p className="text-sm font-bold mt-1 text-green-600">Active</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
