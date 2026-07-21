import React from 'react';
import type { LedgerLog } from '../../hooks/useGameState';

interface LedgerHistoryProps {
  logs: LedgerLog[];
}

export const LedgerHistory: React.FC<LedgerHistoryProps> = ({ logs }) => {
  return (
    <div className="bg-[#0c051a] border border-[#2d124d] rounded-lg p-3 font-mono flex-1 min-h-[140px] flex flex-col">
      <div className="text-[10px] font-bold text-[#a397db] mb-2 uppercase tracking-wider flex justify-between">
        <span>🔗 LEDGER TRANSACTIONS</span>
        <span className="text-[9px] text-[#00f3ff]">Stellar Network</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 text-[9px] text-[#a99eff] max-h-[160px]">
        {logs.length === 0 ? (
          <div className="text-[#5b518c] italic text-center py-4">// NO ON-CHAIN TRANSACTIONS RECORDED</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="bg-[#120726] border border-[#230f3f] p-2 rounded space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-[#00f3ff]">{log.action.toUpperCase()}</span>
                {log.ledger > 0 && <span className="text-emerald-400">L#{log.ledger}</span>}
              </div>
              {log.hash !== 'SYSTEM' && (
                <div className="text-[8px] text-[#786eb3] truncate">
                  Hash:{' '}
                  <a
                    href={`https://explorer.stellar.org/tx/${log.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#00f3ff] underline font-mono"
                  >
                    {log.hash}
                  </a>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
