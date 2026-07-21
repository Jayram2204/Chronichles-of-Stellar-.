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
    <div className="bg-[#0c051a] border border-[#2d124d] rounded-lg p-4 font-mono shadow-[0_0_15px_rgba(30,11,54,0.4)]">
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs font-bold text-[#a397db]">🌐 DECENTRALIZED IDENTITY</span>
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
          <div className="text-xs text-[#d2c9ff] flex justify-between bg-[#150a29] p-2 rounded border border-[#230f3f] overflow-hidden">
            <span>Public Key:</span>
            <span
              className="text-[#00f3ff] text-[10px] self-center truncate max-w-[200px]"
              title={wallet.publicKey || ''}
            >
              {wallet.publicKey}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-[#d2c9ff] px-2">
            <span>Account Balance:</span>
            <span className="text-[#ff0055] font-bold">{wallet.balance} XLM</span>
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
          <p className="text-xs text-[#857ab3] mb-3">Connect via Freighter or Stellar extension wallet.</p>
          <button
            onClick={onConnect}
            className="w-full bg-[#00f3ff] hover:bg-[#33f5ff] text-black text-xs font-bold py-2 rounded transition uppercase tracking-wider shadow-[0_0_10px_rgba(0,243,255,0.4)] cursor-pointer"
          >
            Connect Wallet
          </button>
        </div>
      )}
    </div>
  );
};
