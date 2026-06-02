import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import {
  collection, query, where, getDocs, getDoc,
  doc, addDoc, updateDoc, serverTimestamp, onSnapshot
} from 'firebase/firestore';
import { Send, User, Loader2, MessageSquareText, RefreshCw, Building } from 'lucide-react';

const Messages = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeChatId = searchParams.get('chat');

  const [chats, setChats] = useState([]);
  const [candidates, setCandidates] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const candidatesRef = useRef({});
  // Keep ref in sync
  useEffect(() => { candidatesRef.current = candidates; }, [candidates]);

  // ── Fetch Chats with getDocs (no composite index needed) ──────────────────
  const fetchChats = useCallback(async () => {
    if (!currentUser) return;
    setLoadingChats(true);
    try {
      const snap = await getDocs(
        query(collection(db, 'chats'), where('employerId', '==', currentUser.uid))
      );
      const fetchedChats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedChats.sort((a, b) =>
        (b.lastMessageTime?.toMillis?.() || 0) - (a.lastMessageTime?.toMillis?.() || 0)
      );

      // Enrich with candidate info
      const candidateData = { ...candidatesRef.current };
      let updated = false;
      for (const chat of fetchedChats) {
        if (chat.userId && !candidateData[chat.userId]) {
          const userDoc = await getDoc(doc(db, 'users', chat.userId));
          if (userDoc.exists()) {
            candidateData[chat.userId] = userDoc.data();
            updated = true;
          }
        }
      }
      if (updated) setCandidates(candidateData);
      setChats(fetchedChats);
    } catch (err) {
      console.error('Error fetching chats:', err);
    } finally {
      setLoadingChats(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // ── Realtime Messages for active chat (only where chatId) ─────────────────
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);

    const q = query(collection(db, 'messages'), where('chatId', '==', activeChatId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));
        setMessages(msgs);
        setLoadingMessages(false);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      (error) => {
        console.error('Messages snapshot error:', error);
        setLoadingMessages(false);
      }
    );

    return () => unsubscribe();
  }, [activeChatId]);

  // ── Send Message ──────────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChatId || !currentUser) return;

    const text = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await addDoc(collection(db, 'messages'), {
        chatId: activeChatId,
        senderId: currentUser.uid,
        text,
        timestamp: serverTimestamp(),
        isSystemMessage: false,
      });

      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: text,
        lastMessageTime: serverTimestamp(),
      });

      // Update sidebar chat preview locally
      setChats(prev =>
        prev
          .map(c => c.id === activeChatId ? { ...c, lastMessage: text, lastMessageTime: { toMillis: () => Date.now() } } : c)
          .sort((a, b) => (b.lastMessageTime?.toMillis?.() || 0) - (a.lastMessageTime?.toMillis?.() || 0))
      );
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeCandidate = activeChat ? candidates[activeChat.userId] : null;

  return (
    <div className="animate-fade-in relative h-full flex flex-col" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 8rem)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Сообщения</h1>
          <p style={{ color: 'var(--text-muted)' }}>Общайтесь с кандидатами</p>
        </div>
        <button onClick={fetchChats} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <RefreshCw size={16} /> Обновить
        </button>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
        {/* Chats Sidebar */}
        <div className="glass-panel" style={{ width: '320px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Активные чаты</h3>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loadingChats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 className="animate-spin" color="var(--accent-primary)" size={24} />
              </div>
            ) : chats.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem', textAlign: 'center' }}>
                Пока нет диалогов. Перейдите в раздел <strong>Кандидаты</strong> и нажмите <strong>Сообщение</strong>, чтобы начать чат.
              </p>
            ) : (
              chats.map(chat => {
                const candidate = candidates[chat.userId];
                const isActive = activeChatId === chat.id;
                return (
                  <div
                    key={chat.id}
                    onClick={() => setSearchParams({ chat: chat.id })}
                    style={{
                      padding: '1rem 1.5rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      backgroundColor: isActive ? 'rgba(255, 71, 87, 0.05)' : 'transparent',
                      borderLeft: isActive ? '4px solid var(--accent-primary)' : '4px solid transparent',
                      transition: 'background-color var(--transition-fast)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {candidate?.photoUrl
                          ? <img src={candidate.photoUrl} alt="candidate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <User size={20} color="var(--text-muted)" />}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {candidate?.fullName || candidate?.name || 'Неизвестный кандидат'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chat.lastMessage || 'Диалог начат'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message View */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeChatId ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.5 }}>
              <MessageSquareText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Выберите чат для начала общения</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-card)' }}>
                {/* Candidate info (left) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {activeCandidate?.photoUrl
                      ? <img src={activeCandidate.photoUrl} alt="candidate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <User size={20} color="var(--text-muted)" />}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{activeCandidate?.fullName || activeCandidate?.name || 'Неизвестный кандидат'}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeCandidate?.email || ''}</p>
                  </div>
                </div>
                {/* Employer company info (right) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {currentUser?.employerProfile?.logo
                      ? <img src={currentUser.employerProfile.logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <Building size={18} color="var(--text-muted)" />}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Вы</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>{currentUser?.employerProfile?.companyName || 'Компания'}</p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loadingMessages ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Loader2 className="animate-spin" color="var(--accent-primary)" size={24} />
                  </div>
                ) : messages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 'auto', marginBottom: 'auto' }}>
                    Пока нет сообщений. Поздоровайтесь! 👋
                  </p>
                ) : (
                  messages.map(msg => {
                    const isMine = msg.senderId === currentUser.uid;
                    return (
                      <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '70%',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: isMine ? 'var(--accent-primary)' : 'var(--bg-main)',
                          color: isMine ? '#fff' : 'var(--text-main)',
                          borderBottomRightRadius: isMine ? '4px' : 'var(--radius-md)',
                          borderBottomLeftRadius: !isMine ? '4px' : 'var(--radius-md)',
                        }}>
                          {msg.text}
                          <div style={{ fontSize: '0.65rem', marginTop: '0.25rem', opacity: 0.7, textAlign: isMine ? 'right' : 'left' }}>
                            {msg.timestamp?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Введите сообщение..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="btn btn-primary"
                    style={{ padding: '0 1.5rem', borderRadius: 'var(--radius-full)' }}
                  >
                    {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
