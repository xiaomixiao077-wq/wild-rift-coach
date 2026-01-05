import React, { useState, useRef, useEffect } from 'react';
import { analyzeMatchup, recognizeScreen } from './services/geminiService';
import { AnalysisResult, COMMON_HEROES, ROLES } from './types';

const App: React.FC = () => {
  const [myHero, setMyHero] = useState('');
  const [myRole, setMyRole] = useState(ROLES[0]);
  const [enemyHero, setEnemyHero] = useState('');
  const [enemyItemInput, setEnemyItemInput] = useState('');
  const [enemyItems, setEnemyItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const syncIntervalRef = useRef<number | null>(null);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  useEffect(() => {
    if (isLiveSyncing && myHero && enemyHero) {
      handleAnalyze();
    }
  }, [myHero, enemyHero, enemyItems.length]);

  const handleAddEnemyItem = () => {
    if (enemyItemInput.trim()) {
      setEnemyItems([...enemyItems, enemyItemInput.trim()]);
      setEnemyItemInput('');
    }
  };

  const removeEnemyItem = (index: number) => {
    setEnemyItems(enemyItems.filter((_, i) => i !== index));
  };

  const handleAnalyze = async () => {
    if (!myHero || !enemyHero) return;
    setError(null);
    setLoading(true);
    try {
      const data = await analyzeMatchup(myHero, enemyHero, enemyItems, myRole);
      setResult(data);
    } catch (err) {
      setError('分析失败，请检查网络');
    } finally {
      setLoading(false);
    }
  };

  const captureAndRecognize = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setScanning(true);
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        const recognition = await recognizeScreen(base64);
        if (recognition.myHero && recognition.myHero !== '未知') setMyHero(recognition.myHero);
        if (recognition.enemyHero && recognition.enemyHero !== '未知') setEnemyHero(recognition.enemyHero);
        if (recognition.enemyItems && recognition.enemyItems.length > 0) {
          setEnemyItems(recognition.enemyItems);
        }
      }
    } catch (err) {
      console.error("Auto recognition failed", err);
    } finally {
      setScanning(false);
    }
  };

  const startLiveSync = async () => {
    try {
      let stream: MediaStream;
      if (isIOS) {
        // iOS doesn't support getDisplayMedia in Safari, use back camera for dual-device setups
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { exact: "environment" } },
          audio: false
        });
      } else {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "never" } as any,
          audio: false
        });
      }
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsLiveSyncing(true);
      
      stream.getVideoTracks()[0].onended = () => stopLiveSync();
      setTimeout(captureAndRecognize, 1000);
      syncIntervalRef.current = window.setInterval(captureAndRecognize, 15000);
    } catch (err) {
      setError(isIOS ? '无法访问相机，请检查设置' : '无法开启屏幕共享');
    }
  };

  const stopLiveSync = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    setIsLiveSyncing(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    setError(null);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const recognition = await recognizeScreen(base64);
        if (recognition.myHero) setMyHero(recognition.myHero);
        if (recognition.enemyHero) setEnemyHero(recognition.enemyHero);
        if (recognition.enemyItems) setEnemyItems(recognition.enemyItems);
        setScanning(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('识别失败');
      setScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#010a13] text-gray-100 flex flex-col items-center p-4 md:p-8 safe-area-bottom">
      <canvas ref={canvasRef} className="hidden" />
      
      {/* iOS User Guide Modal */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-6 backdrop-blur-md">
          <div className="bg-[#05141c] border border-[#c8aa6e] p-6 rounded-xl max-w-sm w-full">
            <h2 className="text-xl font-bold text-[#c8aa6e] mb-4">iPhone 极致体验指南</h2>
            <div className="space-y-4 text-sm text-gray-300">
              <div className="flex gap-3">
                <div className="bg-[#00a3ff] w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</div>
                <p>点击 Safari 底部的<strong>分享图标</strong>，选择“<strong>添加到主屏幕</strong>”，像 App 一样全屏使用。</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-[#00a3ff] w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</div>
                <p><strong>截图法：</strong>游戏中截屏，快速切回本程序，点击右上方“相机”选择截图上传。</p>
              </div>
              <div className="flex gap-3">
                <div className="bg-[#00a3ff] w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</div>
                <p><strong>双机党：</strong>使用一台手机点击“实况监控”，将摄像头对准玩游戏的 iPad 或另一台手机。</p>
              </div>
            </div>
            <button 
              onClick={() => setShowGuide(false)}
              className="w-full mt-6 py-3 bg-[#c8aa6e] text-[#010a13] font-bold rounded"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-6xl flex flex-wrap justify-between items-center mb-6 border-b border-[#c8aa6e]/30 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#c8aa6e] rounded-sm flex items-center justify-center text-[#010a13]" onClick={() => setShowGuide(true)}>
            <i className="fas fa-shield-halved text-xl"></i>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-widest text-[#c8aa6e]">WR <span className="text-[#00a3ff]">TACTICIAN</span></h1>
            <div className="flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${isLiveSyncing ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
               <span className="text-[10px] uppercase text-gray-400 tracking-tighter">
                 {isLiveSyncing ? '实况同步' : '离线模式'}
               </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={isLiveSyncing ? stopLiveSync : startLiveSync}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs transition-all ${isLiveSyncing ? 'bg-red-600/20 text-red-500 border border-red-500' : 'bg-[#00a3ff] text-white'}`}
          >
            <i className={`fas ${isLiveSyncing ? 'fa-stop' : (isIOS ? 'fa-camera-rotate' : 'fa-satellite-dish')}`}></i>
            {isLiveSyncing ? '停止' : (isIOS ? '实况监控' : '自动抓取')}
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-full border border-[#c8aa6e]/50 text-[#c8aa6e]"
          >
            <i className="fas fa-image"></i>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          {isLiveSyncing && (
            <div className="w-full aspect-video bg-black border border-[#00a3ff]/50 rounded-lg overflow-hidden shadow-2xl relative">
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-[10px] font-mono animate-pulse">LIVE ANALYZING...</div>
            </div>
          )}

          <section className="bg-[#05141c] border border-[#c8aa6e]/50 p-5 rounded-lg shadow-xl relative overflow-hidden">
            {scanning && <div className="absolute inset-0 bg-[#010a13]/70 backdrop-blur-sm z-10 flex items-center justify-center font-bold text-[#00a3ff] text-sm italic">视觉解析中...</div>}
            <h2 className="text-md font-bold mb-4 text-[#c8aa6e] flex items-center gap-2">
              <i className="fas fa-user-circle"></i> 我方与敌方
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">我方英雄</label>
                  <input 
                    list="heroes"
                    value={myHero}
                    onChange={(e) => setMyHero(e.target.value)}
                    placeholder="识别或选择"
                    className="w-full bg-[#0a1b24] border border-[#1e2f38] p-3 rounded-lg text-sm focus:border-[#00a3ff] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">敌方英雄</label>
                  <input 
                    list="heroes"
                    value={enemyHero}
                    onChange={(e) => setEnemyHero(e.target.value)}
                    placeholder="识别或选择"
                    className="w-full bg-[#0a1b24] border border-[#1e2f38] p-3 rounded-lg text-sm focus:border-[#00a3ff] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">对局位置</label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(role => (
                    <button
                      key={role}
                      onClick={() => setMyRole(role)}
                      className={`text-[10px] px-3 py-1.5 rounded-full border ${myRole === role ? 'bg-[#00a3ff] border-[#00a3ff] text-white' : 'border-[#1e2f38] text-gray-500'}`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1">敌方出装 (已识别: {enemyItems.length})</label>
                <div className="flex gap-2">
                  <input 
                    value={enemyItemInput}
                    onChange={(e) => setEnemyItemInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddEnemyItem()}
                    placeholder="手动修正装备..."
                    className="flex-1 bg-[#0a1b24] border border-[#1e2f38] p-2 rounded-lg text-sm outline-none"
                  />
                  <button onClick={handleAddEnemyItem} className="bg-[#c8aa6e] text-[#010a13] px-3 rounded-lg font-bold">+</button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {enemyItems.map((item, idx) => (
                    <span key={idx} className="bg-[#1e2f38] text-[9px] py-1 px-2 rounded-md border border-gray-700 text-gray-300">
                      {item}
                      <button onClick={() => removeEnemyItem(idx)} className="ml-2 text-red-500">×</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {!isLiveSyncing && (
            <button 
              onClick={handleAnalyze}
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-md tracking-wider transition-all ${loading ? 'bg-gray-700' : 'bg-[#00a3ff] shadow-lg active:scale-95'}`}
            >
              {loading ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : null}
              {loading ? '分析中' : '开始对局分析'}
            </button>
          )}
          
          {error && <div className="text-red-400 text-xs text-center p-3 bg-red-900/10 rounded-lg">{error}</div>}
        </div>

        <div className="lg:col-span-2">
          {result ? (
            <div className="space-y-6">
              <div className="bg-[#0a1b24] p-5 border-l-4 border-[#00a3ff] rounded-xl">
                <h3 className="text-[10px] uppercase font-bold text-[#00a3ff] mb-2">战术指导报告</h3>
                <p className="text-md italic text-gray-200 leading-snug">"{result.matchupAnalysis}"</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <section className="bg-[#05141c] border border-[#1e2f38] p-5 rounded-xl">
                  <h3 className="text-[#c8aa6e] font-bold mb-4 flex items-center gap-2 text-sm">
                    <i className="fas fa-hammer"></i> 推荐出装
                  </h3>
                  <div className="space-y-3">
                    {result.recommendedItems.map((item, i) => (
                      <div key={i} className="bg-[#0a1b24] p-3 rounded-lg border border-[#1e2f38]">
                        <div className="text-[#00a3ff] font-bold text-sm">{item.item}</div>
                        <div className="text-[11px] text-gray-400 mt-1">{item.reason}</div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-[#05141c] border border-[#1e2f38] p-5 rounded-xl">
                  <h3 className="text-[#c8aa6e] font-bold mb-4 flex items-center gap-2 text-sm">
                    <i className="fas fa-gamepad"></i> 针对连招
                  </h3>
                  <div className="space-y-4">
                    {result.combos.map((combo, i) => (
                      <div key={i} className="border-l-2 border-[#00a3ff]/40 pl-3">
                        <div className="font-mono text-sm text-[#00a3ff] font-bold tracking-widest">{combo.sequence}</div>
                        <div className="text-[11px] text-gray-400 mt-1">{combo.description}</div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="bg-[#05141c] border border-[#1e2f38] p-5 rounded-xl">
                <h3 className="text-[#c8aa6e] font-bold mb-4 flex items-center gap-2 text-sm uppercase">
                  <i className="fas fa-bolt"></i> 实战贴士
                </h3>
                <ul className="space-y-3">
                  {result.strategyTips.map((tip, i) => (
                    <li key={i} className="flex gap-3 items-start text-xs text-gray-300">
                      <span className="text-[#c8aa6e]">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-[#1e2f38] rounded-2xl text-gray-600">
              <i className="fas fa-ghost text-5xl mb-4 opacity-20"></i>
              <p className="text-sm">等待数据输入...</p>
              <button 
                onClick={() => setShowGuide(true)}
                className="mt-4 text-[#00a3ff] text-xs underline"
              >
                查看 iPhone 适配说明
              </button>
            </div>
          )}
        </div>
      </main>

      <datalist id="heroes">
        {COMMON_HEROES.map(hero => <option key={hero} value={hero} />)}
      </datalist>

      <footer className="mt-8 text-center text-gray-700 text-[8px] uppercase tracking-widest">
        Optimized for iOS // Powered by Gemini Flash
      </footer>
    </div>
  );
};

export default App;