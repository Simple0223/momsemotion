import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyBIvS8hxzuj8i_71O4enrzrvck60rvrVFg",
  authDomain: "motherday2026-bb0eb.firebaseapp.com",
  projectId: "motherday2026-bb0eb",
  storageBucket: "motherday2026-bb0eb.firebasestorage.app",
  messagingSenderId: "467538073998",
  appId: "1:467538073998:web:80e9b50618891d7c7decdf",
  measurementId: "G-DGTY92Y8QY"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "motherday2026-prod"; 


const COMMANDER_PASSWORD = "2024";

const PHASES = [
  { id: 'intro', name: 'Phase 1: 登入任務', color: 'bg-slate-800', textColor: 'text-white' },
  { id: 'red', name: 'Phase 2: 焱炎火山 (紅)', color: 'bg-red-600', textColor: 'text-white' },
  { id: 'blue', name: 'Phase 3: 遠古冰川 (藍)', color: 'bg-blue-500', textColor: 'text-white' },
  { id: 'yellow', name: 'Phase 4: 恆溫花室 (黃)', color: 'bg-yellow-400', textColor: 'text-slate-900' },
  { id: 'purple', name: 'Phase 5: 暴塵沙漠 (紫)', color: 'bg-purple-600', textColor: 'text-white' },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('entry');
  const [passwordInput, setPasswordInput] = useState('');
  const [gameState, setGameState] = useState({
    currentPhase: 'intro',
    unlockedEnergies: [],
    lastUpdate: null
  });

  // 1. 初始化驗證 (遵循 RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Fail:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 2. 監聽狀態 (遵循 RULE 1 - 6段路徑)
  useEffect(() => {
    if (!user) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'states', 'global');

    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameState({
          currentPhase: data.currentPhase || 'intro',
          unlockedEnergies: Array.isArray(data.unlockedEnergies) ? data.unlockedEnergies : [],
          lastUpdate: data.lastUpdate
        });
      } else {
        // 初始建立
        setDoc(gameRef, {
          currentPhase: 'intro',
          unlockedEnergies: [],
          lastUpdate: serverTimestamp()
        });
      }
    }, (err) => console.error("Firebase Listen Error:", err));

    return () => unsubscribe();
  }, [user]);

  // 強制覆寫更新函數 - 解決無法重置的問題
  const forceUpdate = async (newData) => {
    if (!user) return;
    try {
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'states', 'global');
      // 使用 setDoc 配合 lastUpdate 確保所有裝置強制同步
      await setDoc(gameRef, {
        ...newData,
        lastUpdate: serverTimestamp()
      }, { merge: false }); // merge: false 會完全覆蓋舊數據

      return true;
    } catch (err) {
      console.error("Force Update Error:", err);
      return false;
    }
  };

  // 重置邏輯
  const handleReset = async () => {
    if (window.confirm("確定要【強制重置】所有新兵的手機畫面嗎？這將清除所有能量卡。")) {
      const success = await forceUpdate({
        currentPhase: 'intro',
        unlockedEnergies: []
      });

      if (success) {
        const toast = document.createElement('div');
        toast.className = "fixed top-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-8 py-4 rounded-3xl font-bold z-[999] shadow-2xl animate-bounce";
        toast.innerText = "🚀 系統已成功重置";
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    }
  };

  const toggleEnergy = async (color) => {
    let newEnergies = [...(gameState.unlockedEnergies || [])];
    if (newEnergies.includes(color)) {
      newEnergies = newEnergies.filter(c => c !== color);
    } else {
      newEnergies.push(color);
    }
    await forceUpdate({
      currentPhase: gameState.currentPhase,
      unlockedEnergies: newEnergies
    });
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === COMMANDER_PASSWORD) {
      setView('commander');
      setPasswordInput('');
    } else {
      alert("密碼錯誤！");
      setPasswordInput('');
    }
  };

  // ----------------渲染----------------

  if (view === 'password') {
    return (
<div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
    <h2 className="text-xl font-black mb-6 tracking-widest text-cyan-400 italic underline decoration-cyan-500/30">COMMANDER LOGIN</h2>
    <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 w-full max-w-xs">
        <input type="password"
               placeholder="請輸入密碼"
               value={passwordInput}
               onChange={(e) => setPasswordInput(e.target.value)}
        className="p-5 rounded-3xl bg-slate-800 border-2 border-slate-700 text-center text-2xl tracking-[0.5em] focus:border-cyan-500 outline-none transition-all"
        autoFocus
        />
        <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 p-5 rounded-3xl font-black shadow-xl">驗證進入</button>
        <button type="button" onClick={() => setView('entry')} className="text-slate-500 text-sm mt-4">返回入口頁面</button>
    </form>
</div>
    );
  }

  if (view === 'entry') {
    return (
<div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
    <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px]"></div>
    <div className="z-10 text-center">
        <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-[32px] flex items-center justify-center shadow-2xl rotate-12">
            <span className="text-5xl -rotate-12">🚀</span>
        </div>
        <h1 className="text-4xl font-black mb-2 tracking-tighter italic">航太中心互動</h1>
        <p className="text-slate-500 mb-12 font-bold tracking-[0.4em] text-[10px]">MISSION CONTROL INTERFACE</p>

        <div className="space-y-4 w-full max-w-xs mx-auto">
            <button onClick={() =>
                setView('soldier')}
                className="w-full bg-white text-slate-900 py-6 rounded-[24px] font-black text-xl shadow-2xl active:scale-95 transition-transform"
                >
                登入任務 (新兵)
            </button>
            <button onClick={() =>
                setView('password')}
                className="w-full bg-slate-900/50 border border-slate-800 text-slate-500 py-4 rounded-[20px] text-xs font-black tracking-widest uppercase"
                >
                進入控制台 (指揮官)
            </button>
        </div>
    </div>
</div>
    );
  }

  if (view === 'commander') {
    return (
<div className="min-h-screen bg-gray-100 p-4 text-slate-800">
    <div className="max-w-md mx-auto pb-20">
        <header className="flex justify-between items-center mb-6 py-2">
            <h2 className="text-2xl font-black italic tracking-tighter">CONTROL PANEL</h2>
            <button onClick={() => setView('entry')} className="text-[10px] font-black p-2 px-4 bg-white border rounded-xl shadow-sm">登出系統</button>
        </header>

        <div className="space-y-6">
            {/* 核心重置按鈕 */}
            <div className="bg-red-50 p-2 rounded-[32px] border border-red-100">
                <button onClick={handleReset}
                        className="w-full bg-red-600 text-white py-6 rounded-[24px] font-black text-lg shadow-xl shadow-red-200 flex items-center justify-center gap-3 active:scale-95 transition-all">
                    <span className="text-2xl">🚨</span> 重置任務進度
                </button>
                <p className="text-[10px] text-red-400 text-center mt-2 font-bold uppercase tracking-widest">排戲或新場次開始前點擊</p>
            </div>

            <section className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-200/40">
                <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em] px-2">切換當前階段</h3>
                <div className="grid gap-3">
                    {PHASES.map(p => (
                    <button key={p.id}
                            onClick={() =>
                        forceUpdate({ currentPhase: p.id, unlockedEnergies: gameState.unlockedEnergies })}
                        className={`p-6 rounded-[24px] text-left font-black transition-all border-4 flex items-center justify-between ${
                        gameState.currentPhase === p.id
                        ? `${p.color} ${p.textColor} border-slate-900 shadow-xl scale-[1.02]`
                        : 'bg-gray-50 border-transparent text-slate-300'
                        }`}
                        >
                        <span className="text-lg">{p.name}</span>
                        {gameState.currentPhase === p.id && <span className="text-2xl animate-pulse">★</span>}
                    </button>
                    ))}
                </div>
            </section>

            <section className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-200/40">
                <h3 className="text-[10px] font-black text-slate-400 mb-6 uppercase tracking-[0.2em] px-2">手動採集能量</h3>
                <div className="grid grid-cols-2 gap-4">
                    {[
                    { label: '紅 - 勇氣', id: 'red', bg: 'bg-red-500' },
                    { label: '藍 - 冷靜', id: 'blue', bg: 'bg-blue-500' },
                    { label: '黃 - 愛', id: 'yellow', bg: 'bg-yellow-400' },
                    { label: '紫 - 方向', id: 'purple', bg: 'bg-purple-600' }
                    ].map(e => {
                    const active = gameState.unlockedEnergies?.includes(e.id);
                    return (
                    <button key={e.id}
                            onClick={() =>
                        toggleEnergy(e.id)}
                        className={`p-6 rounded-[24px] font-black transition-all flex flex-col items-center justify-center h-32 border-4 ${
                        active ? `${e.bg} text-white border-slate-900 shadow-xl` : 'bg-gray-50 text-slate-200 border-transparent opacity-40'
                        }`}
                        >
                        <span className="text-4xl mb-2">{active ? '💎' : '⚪'}</span>
                        <span className="text-xs">{e.label}</span>
                    </button>
                    );
                    })}
                </div>
            </section>
        </div>
    </div>
</div>
    );
  }

  const activePhase = PHASES.find(p => p.id === gameState.currentPhase) || PHASES[0];
  const checkUnlocked = (id) => gameState.unlockedEnergies?.includes(id);

  return (
<div className={`min-h-screen transition-colors duration-1000 ${activePhase.color} flex flex-col p-6 text-white font-sans`}>
    <div className="flex justify-between items-center mb-8">
        <div className="bg-black/20 backdrop-blur-3xl px-5 py-2.5 rounded-2xl border border-white/10 flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]"></div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-90">
                ID:{user?.uid ? user.uid.slice(-4).toUpperCase() : 'SYNC'}
            </span>
        </div>
        <button onClick={() => setView('entry')} className="text-[10px] font-black opacity-30 px-4 py-2 border border-white/20 rounded-full">EXIT</button>
    </div>

    <div className={`flex-1 flex flex-col items-center justify-center text-center ${activePhase.textColor}`}>
        <div className="w-40 h-40 mb-10 relative">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-10"></div>
            <div className="relative bg-white/10 backdrop-blur-3xl w-full h-full rounded-[48px] flex items-center justify-center border border-white/20 text-7xl shadow-2xl">
                {gameState.currentPhase === 'intro' && "📡"}
                {gameState.currentPhase === 'red' && "🌋"}
                {gameState.currentPhase === 'blue' && "🧊"}
                {gameState.currentPhase === 'yellow' && "🌸"}
                {gameState.currentPhase === 'purple' && "🌪️"}
            </div>
        </div>

        <h2 className="text-5xl font-black mb-5 tracking-tighter italic drop-shadow-2xl">
            {gameState.currentPhase === 'intro' && "任務啟動"}
            {gameState.currentPhase === 'red' && "焱炎火山"}
            {gameState.currentPhase === 'blue' && "遠古冰川"}
            {gameState.currentPhase === 'yellow' && "恆溫花室"}
            {gameState.currentPhase === 'purple' && "暴塵沙漠"}
        </h2>

        <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[40px] max-w-[320px] border border-white/10 shadow-2xl">
            <p className="text-lg font-bold leading-relaxed">
                {gameState.currentPhase === 'intro' && "新兵請就位。我們正在進入母體宇宙，準備採集四種關鍵能量。"}
                {gameState.currentPhase === 'red' && "情緒衝擊波來襲！全體開啟護盾，雙手交叉護胸！"}
                {gameState.currentPhase === 'blue' && "拿出熱能手電筒（光劍）！照向舞台，用愛融化冰牆！"}
                {gameState.currentPhase === 'yellow' && "這是心靈富足的恆溫花室。感受這份平靜與神的愛。"}
                {gameState.currentPhase === 'purple' && "進入最後的暴塵沙漠。雖然看不清前方，但光一直都在。"}
            </p>
        </div>

        {checkUnlocked(gameState.currentPhase) && (
        <div className="mt-10 bg-white py-4 px-10 rounded-full text-slate-900 font-black text-sm animate-bounce shadow-[0_0_40px_rgba(255,255,255,0.5)]">
            ✨ 能量採集成功 ✨
        </div>
        )}
    </div>

    <div className="mt-auto bg-black/40 backdrop-blur-3xl rounded-[48px] p-10 border border-white/10 shadow-2xl">
        <div className="flex justify-around items-center gap-4">
            {[
            { id: 'red', icon: '🔴' },
            { id: 'blue', icon: '🔵' },
            { id: 'yellow', icon: '🟡' },
            { id: 'purple', icon: '🟣' }
            ].map(e => {
            const active = checkUnlocked(e.id);
            return (
            <div key={e.id} className="relative">
                <div className={`w-16 h-16 rounded-[20px] flex items-center justify-center transition-all duration-700 border-2 ${
                     active ? 'bg-white border-white scale-110 rotate-6 shadow-[0_0_30px_rgba(255,255,255,0.4)]' : 'bg-white/5 border-white/5 opacity-10'
                     }`}>
                    <span className="text-3xl">{e.icon}</span>
                </div>
                {active && (
                <div className="absolute -top-2 -right-2 bg-green-400 w-6 h-6 rounded-full border-4 border-slate-900 animate-pulse" />
                )}
            </div>
            );
            })}
        </div>
        <p className="text-[10px] text-center mt-8 text-white/40 font-black uppercase tracking-[0.5em] italic">Space Energy Card v2.2</p>
    </div>
</div>
  );
}