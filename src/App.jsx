import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp, collection, addDoc, getDocs, deleteDoc, query, orderBy } from 'firebase/firestore';

// --- Firebase 配置 ---
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
  { id: 'cabin', name: 'Phase 6: 太空艙 (結尾)', color: 'bg-slate-950', textColor: 'text-cyan-400' },
];

const ENERGY_TYPES = [
  { id: 'red', label: '紅 - 勇氣', icon: '🔴', bg: 'bg-red-500' },
  { id: 'blue', label: '藍 - 冷靜', icon: '🔵', bg: 'bg-blue-500' },
  { id: 'yellow', label: '黃 - 愛', icon: '🟡', bg: 'bg-yellow-400' },
  { id: 'purple', label: '紫 - 方向', icon: '🟣', bg: 'bg-purple-600' }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('entry'); 
  const [passwordInput, setPasswordInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState([]); 
  const [msgCount, setMsgCount] = useState(0);
  const [gameState, setGameState] = useState({
    currentPhase: 'intro',
    unlockedEnergies: [],
    isMessageOpen: false,
    lastUpdate: null
  });

  // 1. 初始化驗證
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth Fail:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 2. 監聽全域遊戲狀態與留言
  useEffect(() => {
    if (!user) return;
    const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'states', 'global');
    const msgCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');

    const unsubGame = onSnapshot(gameRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGameState({
          currentPhase: data.currentPhase || 'intro',
          unlockedEnergies: Array.isArray(data.unlockedEnergies) ? data.unlockedEnergies : [],
          isMessageOpen: data.isMessageOpen || false,
          lastUpdate: data.lastUpdate
        });
      } else {
        setDoc(gameRef, {
          currentPhase: 'intro',
          unlockedEnergies: [],
          isMessageOpen: false,
          lastUpdate: serverTimestamp()
        });
      }
    }, (err) => console.error("Listen Error:", err));

    const unsubMsgs = onSnapshot(msgCol, (snap) => {
      setMsgCount(snap.size);
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    }, (err) => console.error("Msg Listen Error:", err));

    return () => { unsubGame(); unsubMsgs(); };
  }, [user]);

  // 全域更新函數
  const forceUpdate = async (newData) => {
    if (!user) return;
    try {
      const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'states', 'global');
      await setDoc(gameRef, {
        ...newData,
        lastUpdate: serverTimestamp()
      }, { merge: true });
      return true;
    } catch (err) {
      console.error("Update Error:", err);
      return false;
    }
  };

  // 留言功能切換與清除邏輯
  const toggleMessageFeature = async () => {
    const nextState = !gameState.isMessageOpen;
    if (!nextState && user) {
      try {
        const msgCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
        const snap = await getDocs(msgCol);
        const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      } catch (err) {
        console.error("Clear Messages Error:", err);
      }
    }
    await forceUpdate({ ...gameState, isMessageOpen: nextState });
  };

  // 能量開關邏輯
  const toggleEnergy = async (colorId) => {
    let newEnergies = [...(gameState.unlockedEnergies || [])];
    if (newEnergies.includes(colorId)) {
      newEnergies = newEnergies.filter(id => id !== colorId);
    } else {
      newEnergies.push(colorId);
    }
    await forceUpdate({ ...gameState, unlockedEnergies: newEnergies });
  };

  const submitMessage = async () => {
    if (!messageInput.trim() || !user) return;
    try {
      const msgCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
      await addDoc(msgCol, { text: messageInput, userId: user.uid, timestamp: serverTimestamp() });
      setMessageInput('');
      const toast = document.createElement('div');
      toast.className = "fixed top-10 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-full z-50 animate-bounce shadow-lg font-bold";
      toast.innerText = "❄️ 能量已傳送！";
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    } catch (err) { console.error(err); }
  };

  // --- 視圖控制 ---

  // 1. 大螢幕模式 (由指揮官開啟)
  if (view === 'display') {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-12 flex flex-col overflow-hidden">
        <div className="flex justify-between items-end mb-12 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-6xl font-black italic tracking-tighter text-cyan-400 mb-2">ENERGY MONITOR</h1>
            <p className="text-slate-500 font-bold tracking-[0.5em] text-sm uppercase">夏凱納航太中心 · 即時能量監控系統</p>
          </div>
          <div className="text-right">
            <div className="text-slate-500 text-xs font-black mb-1 uppercase tracking-widest">Captured Energy Units</div>
            <div className="text-7xl font-black text-white tabular-nums">{msgCount}</div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
           <div className="flex flex-wrap justify-center gap-6 content-start transition-all duration-1000">
            {messages.length === 0 ? (
              <div className="mt-40 text-slate-800 text-5xl font-black italic animate-pulse tracking-widest text-center w-full">
                WAITING FOR INCOMING SIGNALS...
              </div>
            ) : (
              messages.map((m, idx) => (
                <div key={m.id} 
                  className={`p-8 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-2xl transition-all duration-500 animate-fade-in-up
                    ${idx === 0 ? 'scale-110 border-cyan-400/50 bg-white/10 ring-4 ring-cyan-400/10' : 'scale-100'}
                  `}
                >
                  <p className="text-3xl font-bold tracking-tight">{m.text}</p>
                  <div className="mt-3 flex items-center gap-2 opacity-30">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Signal Source: {m.userId?.slice(-4).toUpperCase()}</span>
                  </div>
                </div>
              ))
            )}
           </div>
        </div>

        <div className="mt-8 flex justify-between items-center opacity-20 text-[10px] font-black tracking-[1em] uppercase">
          <span>SYSTEM RUNNING OK</span>
          <span>SYSCAL PHASE: {gameState.currentPhase}</span>
          <span>{new Date().toLocaleTimeString()}</span>
        </div>
        
        <button onClick={() => setView('commander')} className="fixed bottom-4 right-4 bg-white/10 p-2 px-4 rounded-full text-[10px] font-bold hover:bg-white/20 transition-all border border-white/20">BACK TO CONTROL</button>
      </div>
    );
  }

  // 2. 密碼驗證頁
  if (view === 'password') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <h2 className="text-xl font-black mb-6 tracking-widest text-cyan-400 italic">COMMANDER LOGIN</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (passwordInput === COMMANDER_PASSWORD) { setView('commander'); setPasswordInput(''); }
          else { alert("密碼錯誤！"); setPasswordInput(''); }
        }} className="flex flex-col gap-4 w-full max-w-xs">
          <input type="password" placeholder="請輸入密碼" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
            className="p-5 rounded-3xl bg-slate-800 border-2 border-slate-700 text-center text-2xl tracking-[0.5em] outline-none" autoFocus />
          <button type="submit" className="bg-cyan-600 p-5 rounded-3xl font-black shadow-xl">驗證進入</button>
          <button type="button" onClick={() => setView('entry')} className="text-slate-500 text-sm mt-4 text-center">返回入口</button>
        </form>
      </div>
    );
  }

  // 3. 入口頁
  if (view === 'entry') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-white">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-[32px] flex items-center justify-center shadow-2xl text-5xl">🚀</div>
          <h1 className="text-4xl font-black mb-2 italic">高科技の能量卡</h1>
          <p className="text-slate-500 mb-12 font-bold tracking-[0.4em] text-[10px]">HIGH-TECH ENERGY CARD</p>
          <div className="space-y-4 w-full max-w-xs mx-auto">
            <button onClick={() => setView('soldier')} className="w-full bg-white text-slate-900 py-6 rounded-[24px] font-black text-xl shadow-2xl">啟用能量卡</button>
            <button onClick={() => setView('password')} className="w-full bg-slate-900/50 border border-slate-800 text-slate-500 py-4 rounded-[20px] text-xs font-black tracking-widest uppercase">指揮官專屬</button>
          </div>
        </div>
      </div>
    );
  }

  // 4. 指揮官控制台 (整合大螢幕入口)
  if (view === 'commander') {
    return (
      <div className="min-h-screen bg-gray-100 p-4 text-slate-800">
        <div className="max-w-md mx-auto pb-20">
          <header className="flex justify-between items-center mb-6 py-2">
            <h2 className="text-2xl font-black italic tracking-tighter">CONTROL PANEL</h2>
            <button onClick={() => setView('entry')} className="text-[10px] font-black p-2 px-4 bg-white border rounded-xl shadow-sm">登出系統</button>
          </header>
          
          <div className="space-y-6">
            {/* 大螢幕牆入口 - 整合在這裡 */}
            <section className="bg-slate-900 rounded-[40px] p-6 shadow-xl border border-slate-800 text-white">
              <h3 className="text-[10px] font-black text-slate-500 mb-4 uppercase tracking-widest">投影監控輸出</h3>
              <button 
                onClick={() => setView('display')}
                className="w-full p-6 rounded-[24px] bg-cyan-600 hover:bg-cyan-500 font-black flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95"
              >
                <span className="text-2xl">📺</span>
                <span className="text-lg">開啟大螢幕能量牆</span>
              </button>
              <p className="text-[10px] text-center mt-3 text-slate-500 font-bold uppercase tracking-widest italic">點擊後請將視窗投影至主螢幕</p>
            </section>

            <section className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">留言互動控制</h3>
              <button 
                onClick={toggleMessageFeature}
                className={`w-full p-6 rounded-[24px] font-black flex items-center justify-between border-4 transition-all ${
                  gameState.isMessageOpen ? 'bg-blue-500 text-white border-blue-600 shadow-lg' : 'bg-gray-100 text-gray-400 border-transparent'
                }`}
              >
                <span>新兵留言功能: {gameState.isMessageOpen ? '開啟中' : '關閉中'}</span>
                <span className="text-2xl">{gameState.isMessageOpen ? '💬' : '🚫'}</span>
              </button>
              <p className="text-[10px] text-center mt-3 text-slate-400 font-bold uppercase tracking-widest">目前收到留言：{msgCount} 則</p>
            </section>

            <section className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">當前任務階段</h3>
              <div className="grid gap-2">
                {PHASES.map(p => (
                  <button key={p.id} onClick={() => forceUpdate({ ...gameState, currentPhase: p.id })}
                    className={`p-5 rounded-[20px] text-left font-black transition-all border-4 flex items-center justify-between ${
                      gameState.currentPhase === p.id ? `${p.color} ${p.textColor} border-slate-900 shadow-md` : 'bg-gray-50 border-transparent text-slate-300'
                    }`}>
                    <span>{p.name}</span>
                    {gameState.currentPhase === p.id && <span className="text-xl animate-pulse">★</span>}
                  </button>
                ))}
              </div>
            </section>

            <section className="bg-white rounded-[40px] p-6 shadow-sm border border-slate-200">
              <h3 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest">能量發放控制</h3>
              <div className="grid grid-cols-2 gap-3">
                {ENERGY_TYPES.map(e => {
                  const active = gameState.unlockedEnergies?.includes(e.id);
                  return (
                    <button key={e.id} onClick={() => toggleEnergy(e.id)}
                      className={`p-6 rounded-[24px] font-black transition-all border-4 flex flex-col items-center justify-center ${
                        active ? `${e.bg} text-white border-slate-900 shadow-lg` : 'bg-gray-50 border-transparent text-slate-200'
                      }`}>
                      <span className="text-3xl mb-1">{active ? '💎' : '⚪'}</span>
                      <span className="text-[10px] font-black">{e.label} {active ? '(ON)' : ''}</span>
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

  // 5. 新兵端 (不變)
  const activePhase = PHASES.find(p => p.id === gameState.currentPhase) || PHASES[0];
  const isCurrentEnergyUnlocked = gameState.unlockedEnergies?.includes(gameState.currentPhase);

  return (
    <div className={`min-h-screen transition-colors duration-1000 ${activePhase.color} flex flex-col p-6 text-white font-sans overflow-hidden`}>
      <div className="flex justify-between items-start mb-8">
        <div className="bg-black/20 backdrop-blur-3xl px-4 py-2 rounded-2xl border border-white/10 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest">ID:{user?.uid ? user.uid.slice(-4).toUpperCase() : '...'}</span>
        </div>
        <div className="flex flex-col items-end gap-2">
            <button onClick={() => setView('entry')} className="text-[10px] font-black opacity-30 px-4 py-2 border border-white/20 rounded-full">EXIT</button>
            {gameState.isMessageOpen && (
                <div className="bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-xl text-[12px] font-black border border-white/30 shadow-lg animate-fade-in flex items-center gap-2">
                  <span className="text-sm">💬</span>
                  <span>{msgCount}</span>
                </div>
            )}
        </div>
      </div>

      <div className={`flex-1 flex flex-col items-center justify-center text-center ${activePhase.textColor}`}>
        <div className="w-40 h-40 mb-10 bg-white/10 backdrop-blur-3xl rounded-[48px] flex items-center justify-center border border-white/20 text-7xl shadow-2xl relative transition-transform duration-500">
          {gameState.currentPhase === 'intro' && "📡"}
          {gameState.currentPhase === 'red' && "🌋"}
          {gameState.currentPhase === 'blue' && "🧊"}
          {gameState.currentPhase === 'yellow' && "🌸"}
          {gameState.currentPhase === 'purple' && "🌪️"}
          {gameState.currentPhase === 'cabin' && "🛸"}
          {isCurrentEnergyUnlocked && (
            <div className="absolute -top-4 -right-4 bg-white text-3xl p-2 rounded-full shadow-2xl animate-bounce">✨</div>
          )}
        </div>
        
        <h2 className="text-4xl font-black mb-5 tracking-tighter italic">
          {gameState.currentPhase === 'intro' && "任務啟動"}
          {gameState.currentPhase === 'red' && "焱炎火山"}
          {gameState.currentPhase === 'blue' && "遠古冰川"}
          {gameState.currentPhase === 'yellow' && "恆溫花室"}
          {gameState.currentPhase === 'purple' && "暴塵沙漠"}
          {gameState.currentPhase === 'cabin' && "回到太空艙"}
        </h2>

        <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[40px] max-w-[340px] border border-white/10 shadow-2xl mb-8">
          <p className="text-lg font-bold leading-relaxed tracking-wide">
            {gameState.currentPhase === 'intro' && "初次任務！採集瑪姆斯伊莫星的四種關鍵能量。"}
            {gameState.currentPhase === 'red' && <>赤日炎炎似火燒，<br/>野田禾稻半枯焦。</>}
            {gameState.currentPhase === 'blue' && <>冰天雪窖兩離隔，<br/>欲破冰牆用感恩。</>}
            {gameState.currentPhase === 'yellow' && <>風輕日暖心煦暢，<br/>竟成邁進的阻擋？</>}
            {gameState.currentPhase === 'purple' && <>漫天黃沙蔽前光，<br/>孰知雙目豈窺詳。</>}
            {gameState.currentPhase === 'cabin' && "任務圓滿達成！準備返航，向所有支持你的地球人發送平安訊號吧！"}
          </p>
        </div>

        {gameState.currentPhase === 'blue' && gameState.isMessageOpen && (
          <div className="w-full max-w-xs space-y-4 animate-fade-in">
            <input type="text" value={messageInput} onChange={(e) => setMessageInput(e.target.value)} placeholder="寫下你的感恩心聲..."
              className="w-full p-5 rounded-3xl bg-white/20 border-2 border-white/30 text-white placeholder:text-white/50 outline-none text-center font-bold" />
            <button onClick={submitMessage} className="w-full bg-white text-blue-600 py-4 rounded-3xl font-black shadow-xl active:scale-95 transition-all">發送能量留言</button>
          </div>
        )}

        {isCurrentEnergyUnlocked && (
          <div className="mt-6 bg-white py-4 px-10 rounded-full text-slate-900 font-black text-sm animate-bounce shadow-2xl">
            ✨ 能量採集成功 ✨
          </div>
        )}
      </div>

      <div className="mt-auto bg-black/40 backdrop-blur-3xl rounded-[48px] p-10 border border-white/10 shadow-2xl">
        <div className="flex justify-around items-center gap-4">
          {ENERGY_TYPES.map(e => {
            const active = gameState.unlockedEnergies?.includes(e.id);
            return (
              <div key={e.id} className={`w-14 h-14 rounded-[20px] flex items-center justify-center border-2 transition-all duration-700 ${
                active ? 'bg-white border-white scale-110 shadow-lg' : 'bg-white/5 border-white/5 opacity-10'
              }`}>
                <span className="text-2xl">{e.icon}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
