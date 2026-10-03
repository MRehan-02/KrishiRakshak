import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { useT } from '../i18n/useT';
import ListenButton from '../components/ListenButton';

export function Assistant() {
  const { user, profile } = useAuth();
  const { language } = useLang();
  const { t } = useT();

  const [messages, setMessages] = useState([
    {
      id: 'msg-welcome',
      role: 'assistant',
      text: t('assistant_welcome'),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [contextData, setContextData] = useState({
    crop: 'Tomato',
    latestScan: 'Tomato Early Blight',
    weather: 'Moderate fungal risk, humidity 74%',
  });

  const chatBottomRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load context from latest scan and active crop
  useEffect(() => {
    async function loadFarmerContext() {
      if (!user?.id) return;
      try {
        const { data: scan } = await supabase
          .from('scans')
          .select('crop, disease')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scan) {
          setContextData((prev) => ({
            ...prev,
            crop: scan.crop || prev.crop,
            latestScan: `${scan.crop} - ${scan.disease}`,
          }));
        }
      } catch (err) {
        console.warn('Assistant context fetch notice:', err);
      }
    }

    loadFarmerContext();
  }, [user]);

  // Speech Recognition (Voice Input)
  const handleVoiceInput = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    const langMap = { en: 'en-IN', mr: 'mr-IN', hi: 'hi-IN' };
    recognition.lang = langMap[language] || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInputText(transcript);
        sendMessage(transcript);
      }
    };

    recognition.start();
  };

  // Send Message
  const sendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      let replyText = null;

      // 1. Attempt Supabase edge function 'assistant-chat'
      try {
        const { data, error } = await supabase.functions.invoke('assistant-chat', {
          body: {
            message: query,
            language: language || 'en',
            context: contextData,
          },
        });

        if (!error && data?.reply) {
          replyText = data.reply;
        }
      } catch (fnErr) {
        console.warn('Edge function invoke fallback:', fnErr);
      }

      // 2. Reliable smart fallback if edge function is offline
      if (!replyText) {
        const fallbacks = {
          mr: `तुमच्या प्रश्नासाठी धन्यवाद: "${query}". पिकांवरील रोगांसाठी प्रथम जैविक उपायांचा वापर करा (उदा. ५% निंबोळी अर्क किंवा ट्रायकोडर्मा). जास्त प्रादुर्भाव असल्यास योग्य कीटकनाशक वापरा आणि फवारणीनंतर काढणीचा कालावधी पाळा. गंभीर समस्येसाठी नेहमी जवळच्या कृषी विस्तार अधिकाऱ्यांशी संपर्क साधा.`,
          hi: `आपके प्रश्न के लिए धन्यवाद: "${query}"। फसल में बीमारी या कीट नियंत्रण के लिए पहले जैविक उपचार (जैसे ट्राइकोडर्मा या नीम तेल) अपनाएं। आवश्यकता पड़ने पर ही अनुशंसित कीटनाशक का छिड़काव करें। गंभीर मामलों में हमेशा नजदीकी कृषि अधिकारी से पुष्टि करें।`,
          en: `Thank you for your question: "${query}". For healthy crop management, adopt Integrated Pest Management (IPM) including Trichoderma and neem-based bio-pesticides. Always verify pesticide doses and confirm with an extension officer for serious cases.`,
        };
        replyText = fallbacks[language] || fallbacks.en;
      }

      const assistantMessage = {
        id: 'ast-' + Date.now(),
        role: 'assistant',
        text: replyText,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.warn('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: 'ast-err-' + Date.now(),
          role: 'assistant',
          text: t('error_generic') + ' ' + t('assistant_disclaimer'),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col h-[calc(100vh-95px)] justify-between space-y-4">
      {/* Header with Context Pill */}
      <div className="bg-white rounded-2xl p-4 border border-[#D7E7D5] shadow-sm flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>🤖</span> {t('assistant_title')}
          </h1>
          <p className="text-xs text-slate-500">
            {t('assistant_subtitle')}
          </p>
        </div>
        <div className="text-[11px] font-semibold px-3 py-1 bg-[#E8F5E9] text-[#1B5E20] rounded-full border border-[#D7E7D5]">
          🌱 Crop Context: {contextData.crop}
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 bg-white rounded-3xl p-4 sm:p-6 border border-[#D7E7D5] shadow-inner overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full bg-[#E8F5E9] border border-[#D7E7D5] flex items-center justify-center text-base flex-shrink-0">
                  🌱
                </div>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#2E7D32] text-white rounded-tr-none shadow-sm'
                    : 'bg-[#F6FBF4] text-slate-900 border border-[#D7E7D5] rounded-tl-none shadow-sm space-y-2'
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Text to Speech button on assistant messages */}
                {!isUser && (
                  <div className="pt-2 border-t border-slate-200/50 flex justify-end">
                    <ListenButton text={m.text} />
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#E8F5E9] flex items-center justify-center text-sm">
              🌱
            </div>
            <div className="bg-[#F6FBF4] border border-[#D7E7D5] p-3 rounded-2xl flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 rounded-full bg-[#2E7D32] animate-ping"></div>
              <span>Thinking in {language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="bg-white p-2 rounded-2xl border border-[#D7E7D5] shadow-lg flex items-center gap-2"
      >
        <button
          type="button"
          onClick={handleVoiceInput}
          aria-label={t('assistant_voice_btn')}
          className={`min-h-[46px] min-w-[46px] rounded-xl flex items-center justify-center transition ${
            listening
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <span className="text-xl">🎙️</span>
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={listening ? t('assistant_listening') : t('assistant_placeholder')}
          className="flex-1 min-h-[46px] px-3.5 text-sm bg-transparent focus:outline-none text-slate-900 placeholder-slate-400"
        />

        <button
          type="submit"
          disabled={loading || !inputText.trim()}
          className="min-h-[46px] px-5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-sm shadow transition disabled:opacity-50 flex items-center gap-1.5"
        >
          <span>{t('assistant_send_btn')}</span>
          <span>➤</span>
        </button>
      </form>
    </div>
  );
}

export default Assistant;
