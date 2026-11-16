import { useState } from 'react';
import { Files, LockOpen } from 'lucide-react';
import { AppHeader } from 'engineering-ui';
import CombineTab from './CombineTab';
import UnlockTab from './UnlockTab';

type Tab = 'combine' | 'unlock';

export default function App() {
  const [tab, setTab] = useState<Tab>('combine');
  return (
    <div className="min-h-screen bg-slate-100">
      <AppHeader<Tab>
        name="PeeDeeEff"
        tabs={[
          { key: 'combine', label: 'Combine', icon: <Files className="w-4 h-4" /> },
          { key: 'unlock', label: 'Unlock', icon: <LockOpen className="w-4 h-4" /> }
        ]}
        activeTab={tab}
        onTab={setTab}
      />
      {/* Both tabs stay mounted so each keeps its files when switching. */}
      <main className="max-w-7xl mx-auto p-3">
        <div hidden={tab !== 'combine'}>
          <CombineTab />
        </div>
        <div hidden={tab !== 'unlock'}>
          <UnlockTab />
        </div>
      </main>
    </div>
  );
}
