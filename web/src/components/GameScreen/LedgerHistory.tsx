import React from 'react';
import type { LedgerLog } from '../../hooks/useGameState';

interface LedgerHistoryProps {
  logs: LedgerLog[];
}

export const LedgerHistory: React.FC<LedgerHistoryProps> = ({ logs }) => {
  return (
    <div className="bg-[#0f260f] border border-[#2a4a1a] rounded-lg p-3 font-mono flex-1 min-h-[140px] flex flex-col">
      <div className="text-[10px] font-bold text-[#6a8a4a] mb-2 uppercase tracking-wider flex justify-between">
        <span>🔗 LEDGER TRANSACTIONS</span>
        <span className="text-[9px] text-[#8bac0f]">Stellar Network</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 text-[9px] text-[#7a9a5a] max-h-[160px]">
        {logs.length === 0 ? (
          <div className="text-[#3a5c1a] italic text-center py-4">// NO ON-CHAIN TRANSACTIONS RECORDED</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="bg-[#0a1a0a] border border-[#2a4a1a] p-2 rounded space-y-1">
              <div className="flex justify-between font-bold">
                <span className="text-[#8bac0f]">{log.action.toUpperCase()}</span>
                {log.ledger > 0 && <span className="text-emerald-400">L#{log.ledger}</span>}
              </div>
              {log.hash !== 'SYSTEM' && (
                <div className="text-[8px] text-[#527038] truncate">
                  Hash:{' '}
                  <a
                    href={`https://explorer.stellar.org/${import.meta.env.VITE_STELLAR_NETWORK === 'PUBLIC' ? 'public' : 'testnet'}/tx/${log.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#8bac0f] underline font-mono"
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
