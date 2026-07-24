'use client';

import { Card, CardContent } from '@/components/ui/card';
import { EMERGENCY_TIPS } from '@/lib/constants';

export function EmergencyTips() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Emergency Tips</h1>
        <p className="text-sm text-muted-foreground">Important safety tips for responding to emergency vehicles</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {EMERGENCY_TIPS.map((tip, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{tip.icon}</span>
                <div>
                  <h3 className="font-semibold text-sm">{tip.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{tip.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
