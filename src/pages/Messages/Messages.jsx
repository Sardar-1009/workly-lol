import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Send, User, Loader2, MessageSquareText } from 'lucide-react';

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

  // Fetch Chats
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, 'chats'), 
      where('employerId', '==', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedChats = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedChats.sort((a, b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
      
      // Fetch Candidate info for new chats
      const candidateData = { ...candidates };
      let updated = false;
      for (const chat of fetchedChats) {
        if (!candidateData[chat.candidateId]) {
          const userDoc = await getDoc(doc(db, 'users', chat.candidateId));
          if (userDoc.exists()) {
            candidateData[chat.candidateId] = userDoc.data();
            updated = true;
          }
        }
      }
      
      if (updated) setCandidates(candidateData);
      setChats(fetchedChats);
      setLoadingChats(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Fetch Messages for active chat
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    
    setLoadingMessages(true);
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', activeChatId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoadingMessages(false);
      setTimeout(() => scrollToBottom(), 100);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'chats', activeChatId), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });
      
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeCandidate = activeChat ? candidates[activeChat.candidateId] : null;

  return (
    <div className="animate-fade-in relative h-full flex flex-col" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 8rem)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Messages</h1>
          <p style={{ color: 'var(--text-muted)' }}>Chat with matched candidates</p>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', flex: 1, gap: '1rem', overflow: 'hidden' }}>
        {/* Chats List Sidebar */}
        <div className="glass-panel" style={{ width: '320px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-card)', zIndex: 10 }}>
            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Active Chats</h3>
          </div>
          
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loadingChats ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <Loader2 className="animate-spin" color="var(--accent-primary)" size={24} />
              </div>
            ) : chats.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '2rem', textAlign: 'center' }}>No conversations yet.</p>
            ) : (
              chats.map(chat => {
                const candidate = candidates[chat.candidateId];
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
                      transition: 'background-color var(--transition-fast)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {candidate?.photoUrl ? <img src={candidate.photoUrl} alt="candidate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-muted)" />}
                      </div>
                      <div style={{ overflow: 'hidden' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {candidate?.displayName || 'Unknown Candidate'}
                        </h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {chat.lastMessage || 'Started a conversation'}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Message View Area */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!activeChatId ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, opacity: 0.5 }}>
              <MessageSquareText size={48} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>Select a chat to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: 'var(--bg-card)', zIndex: 10 }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-main)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {activeCandidate?.photoUrl ? <img src={activeCandidate.photoUrl} alt="candidate" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={20} color="var(--text-muted)" />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{activeCandidate?.displayName || 'Unknown Candidate'}</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeCandidate?.email || 'Candidate'}</p>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {loadingMessages ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Loader2 className="animate-spin" color="var(--accent-primary)" size={24} />
                  </div>
                ) : messages.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 'auto', marginBottom: 'auto' }}>No messages yet. Say hello!</p>
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
                          borderBottomLeftRadius: !isMine ? '4px' : 'var(--radius-md)'
                        }}>
                          {msg.text}
                          <div style={{ fontSize: '0.65rem', marginTop: '0.25rem', opacity: 0.7, textAlign: isMine ? 'right' : 'left' }}>
                            {msg.createdAt?.toDate?.()?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || ''}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '1rem' }}>
                  <input 
                    type="text" 
                    placeholder="Type your message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
                  />
                  <button type="submit" disabled={!newMessage.trim() || sending} className="btn btn-primary" style={{ padding: '0 1.5rem', borderRadius: 'var(--radius-full)' }}>
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
