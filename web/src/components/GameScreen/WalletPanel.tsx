import React from 'react';
import type { WalletState } from '../../blockchain/WalletConnector';

interface WalletPanelProps {
  wallet: WalletState;
  onConnect: () => void;
  onDisconnect: () => void;
}

export const WalletPanel: React.FC<WalletPanelProps> = ({
  wallet,
  onConnect,
  onDisconnect,
}) => {
  return (
    <div className="bg-[#0f260f] border border-[#2a4a1a] rounded-lg p-4 font-mono shadow-[0_0_15px_rgba(15,38,15,0.4)]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-[#6a8a4a]">🌐 DECENTRALIZED IDENTITY</span>
        <span
          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
            wallet.isConnected
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-red-950 text-red-400 border border-red-800'
          }`}
        >
          {wallet.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </div>

      {wallet.isConnected ? (
        <div className="space-y-2">
          <div className="text-xs text-[#e0f8d0] flex justify-between bg-[#0a1a0a] p-2 rounded border border-[#2a4a1a] overflow-hidden">
            <span>Public Key:</span>
            <span
              className="text-[#8bac0f] text-[10px] self-center truncate max-w-[200px]"
              title={wallet.publicKey || ''}
            >
              {wallet.publicKey}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-[#e0f8d0] px-2">
            <span>Account Balance:</span>
            <span className="text-[#306230] font-bold">{wallet.balance} XLM</span>
          </div>
          <button
            onClick={onDisconnect}
            className="w-full mt-2 bg-red-950 hover:bg-red-900 border border-red-800 text-red-200 text-xs font-bold py-1.5 rounded transition uppercase tracking-wider cursor-pointer"
          >
            Disconnect Ledger Account
          </button>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-[#527038] mb-3">Connect via Freighter or Stellar extension wallet.</p>
          <button
            onClick={onConnect}
            className="w-full bg-[#9bbc0f] hover:bg-[#a8cc1a] text-black text-xs font-bold py-2 rounded transition uppercase tracking-wider shadow-[0_0_10px_rgba(139,172,15,0.4)] cursor-pointer"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
};
