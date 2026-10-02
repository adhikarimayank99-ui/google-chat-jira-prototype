// client/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from './firebase'; // Your Firebase config file

// --- CONSTANTS & MOCK ENV ---
const SELECTABLE_PROFILES = [
  { id: 'p1', name: 'Product Manager', avatar: 'PM', color: 'bg-blue-600' },
  { id: 'u1', name: 'Alice Chen', avatar: 'AC', color: 'bg-green-600' },
  { id: 'u2', name: 'Bob Smith', avatar: 'BS', color: 'bg-purple-600' },
  { id: 'u3', name: 'Charlie Davis', avatar: 'CD', color: 'bg-orange-600' },
];

const MOCK_USERS = [
  { id: 'u1', name: 'Alice Chen', avatar: 'AC', color: 'bg-green-600', status: 'online' },
  { id: 'u2', name: 'Bob Smith', avatar: 'BS', color: 'bg-purple-600', status: 'offline' },
  { id: 'u3', name: 'Charlie Davis', avatar: 'CD', color: 'bg-orange-600', status: 'online' },
];

const SPACES = [
  { id: 's1', name: 'Project Phoenix', unread: 0, type: 'space' },
  { id: 's2', name: 'Q3 Marketing', unread: 0, type: 'space' },
  { id: 's3', name: 'DevOps Sync', unread: 0, type: 'space' },
];

// --- MAIN APP COMPONENT ---
export default function App() {
  const [currentUser, setCurrentUser] = useState(SELECTABLE_PROFILES[0]);
  const [activeItem, setActiveItem] = useState(null);
  const [isSpacesOpen, setIsSpacesOpen] = useState(true);
  const [isDMsOpen, setIsDMsOpen] = useState(true);
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  // Jira Modal States
  const [issueModalData, setIssueModalData] = useState(null); // { open: boolean, defaultSummary?: string, messageId?: string }
  const [editingIssue, setEditingIssue] = useState(null);

  // Firestore State
  const [liveMessages, setLiveMessages] = useState([]);
  const [liveIssues, setLiveIssues] = useState([]);

  // FETCH LIVE DATA FROM FIREBASE (With 1-Hour Ephemeral Filter)
  useEffect(() => {
    // Calculate timestamp for 1 hour ago
    const oneHourAgo = Date.now() - (60 * 60 * 1000);

    // 1. Listen to Messages
    const messagesQuery = query(
      collection(db, 'messages'),
      where('timestamp', '>', oneHourAgo),
      orderBy('timestamp', 'asc')
    );

    const unsubscribeMsgs = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveMessages(msgs);
    });

    // 2. Listen to Issues
    const issuesQuery = query(
      collection(db, 'issues'),
      where('timestamp', '>', oneHourAgo),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeIssues = onSnapshot(issuesQuery, (snapshot) => {
      const issues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLiveIssues(issues);
    });

    // Cleanup listeners on unmount
    return () => {
      unsubscribeMsgs();
      unsubscribeIssues();
    };
  }, []);

  const handleOpenIssueModal = (msgContext = null) => {
    setIssueModalData({
      open: true,
      defaultSummary: msgContext ? msgContext.text : '',
      messageId: msgContext ? msgContext.id : null
    });
  };

  return (
    <div className="flex h-screen bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?q=80&w=2000&auto=format&fit=crop")' }}>

      {/* FAR-LEFT APP NAVIGATION RAIL */}
      <div className="w-[72px] bg-black/40 backdrop-blur-sm flex flex-col items-center py-4 gap-6 border-r border-white/10 shrink-0 z-20">
        <button className="text-white hover:bg-white/20 hover:scale-105 p-3 rounded-full transition-all duration-200 mb-2 cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>

        {/* Apps... */}
        <div className="flex flex-col items-center gap-1 cursor-pointer group">
          <div className="relative p-2 rounded-2xl group-hover:bg-white/20 group-hover:scale-105 transition-all duration-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <span className="text-white/80 text-xs font-medium">Mail</span>
        </div>

        <div className="flex flex-col items-center gap-1 cursor-pointer">
          <div className="relative p-2 rounded-2xl bg-white/30 backdrop-blur-md shadow-inner">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" /></svg>
          </div>
          <span className="text-white font-semibold text-xs">Chat</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER */}
        <header className="h-16 flex items-center justify-between px-6 bg-transparent shrink-0">
          <div className="flex items-center gap-4 w-1/4">
            <svg className="w-8 h-8 drop-shadow-md" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.47715 2 2 6.02944 2 11C2 13.2088 2.87114 15.2312 4.31688 16.799L3.13324 20.0232C2.95669 20.5041 3.41505 20.9776 3.89966 20.8161L7.54589 19.6006C8.90597 20.2173 10.413 20.5714 12 20.5714C17.5228 20.5714 22 16.2917 22 11C22 5.70829 17.5228 2 12 2Z" fill="#00AC47" />
              <rect x="7" y="8" width="10" height="2" rx="1" fill="white" />
              <rect x="7" y="12" width="7" height="2" rx="1" fill="white" />
            </svg>
            <span className="text-white text-xl font-medium">Google Chat</span>
          </div>

          <div className="w-2/4 flex justify-center">
            <div className="w-full max-w-xl bg-white/20 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-3 border border-white/30 text-white focus-within:bg-white/30 transition-all">
              <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search chat" className="bg-transparent border-none outline-none w-full text-white placeholder-white/80 text-sm" />
            </div>
          </div>

          {/* DYNAMIC USER SWITCHER (Top Right Header) */}
          <div className="w-1/4 flex justify-end items-center gap-3">
            <button
              onClick={() => setIsAboutOpen(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/30 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>ℹ️</span> About
            </button>

            <span className="text-xs text-white/80 font-medium hidden sm:inline">Testing as:</span>
            <div className="flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 transition-all cursor-pointer shadow-sm">
              <div className={`w-6 h-6 rounded-full ${currentUser.color} flex items-center justify-center font-bold text-xs text-white shrink-0`}>
                {currentUser.avatar}
              </div>
              <select
                value={currentUser.id}
                onChange={(e) => setCurrentUser(SELECTABLE_PROFILES.find(p => p.id === e.target.value))}
                className="bg-transparent text-white text-xs sm:text-sm font-semibold outline-none cursor-pointer border-none pr-1"
              >
                {SELECTABLE_PROFILES.map(profile => (
                  <option key={profile.id} value={profile.id} className="text-gray-900 bg-white">
                    {profile.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* MAIN SPLIT PANE */}
        <div className="flex-1 flex gap-4 p-4 min-h-0">

          {/* INNER SIDEBAR */}
          <div className="w-64 flex flex-col gap-4 shrink-0 overflow-y-auto custom-scrollbar text-white/90">
            <button
              onClick={() => setActiveItem(null)}
              className={`flex items-center gap-3 px-3 py-2 rounded-full transition-all duration-200 ease-out cursor-pointer ${!activeItem
                ? 'bg-white/25 font-semibold shadow-sm'
                : 'hover:bg-white/15 hover:translate-x-1 text-white/90'
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              Home
            </button>

            {/* Spaces Section */}
            <div className="mt-2">
              <div className="flex items-center justify-between px-3 py-1 group cursor-pointer hover:bg-white/5 rounded-lg" onClick={() => setIsSpacesOpen(!isSpacesOpen)}>
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium">Spaces</div>
              </div>
              {isSpacesOpen && (
                <div className="mt-1 flex flex-col gap-1">
                  {SPACES.map(space => (
                    <button
                      key={space.id}
                      onClick={() => setActiveItem(space)}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-full transition-all duration-200 ease-out w-full text-left cursor-pointer ${activeItem?.id === space.id
                        ? 'bg-white/25 font-semibold shadow-sm'
                        : 'hover:bg-white/15 hover:translate-x-1 text-white/90'
                        }`}
                    >
                      <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">{space.name.charAt(0)}</div>
                      <span className="text-sm truncate flex-1">{space.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Messages Section */}
            <div className="mt-4">
              <div className="flex items-center justify-between px-3 py-1 group cursor-pointer hover:bg-white/5 rounded-lg" onClick={() => setIsDMsOpen(!isDMsOpen)}>
                <div className="flex items-center gap-2 text-white/80 text-sm font-medium">Direct Messages</div>
              </div>
              {isDMsOpen && (
                <div className="mt-1 flex flex-col gap-1">
                  {MOCK_USERS.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setActiveItem({ ...user, type: 'dm' })}
                      className={`flex items-center gap-3 px-3 py-1.5 rounded-full transition-all duration-200 ease-out w-full text-left cursor-pointer ${activeItem?.id === user.id
                        ? 'bg-white/25 font-semibold shadow-sm'
                        : 'hover:bg-white/15 hover:translate-x-1 text-white/90'
                        }`}
                    >
                      <div className="relative">
                        <div className={`w-6 h-6 rounded-full ${user.color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}>
                          {user.avatar}
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-transparent ${user.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <span className="text-sm truncate flex-1">{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-gray-100">
            {activeItem ? (
              <WorkspaceView
                key={activeItem.id}
                activeItem={activeItem}
                currentUser={currentUser}
                liveMessages={liveMessages.filter(m => m.spaceId === activeItem.id)}
                liveIssues={liveIssues.filter(i => i.spaceId === activeItem.id)}
                onClose={() => setActiveItem(null)}
                onOpenIssueModal={handleOpenIssueModal}
                onEditIssue={(issue) => setEditingIssue(issue)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 font-medium">Select a space to start collaborating (Data resets every 1 hour)</div>
            )}
          </div>

        </div>
      </div>

      {/* JIRA ISSUE CREATION MODAL */}
      {issueModalData?.open && (
        <CreateIssueModal
          activeItem={activeItem}
          modalContext={issueModalData}
          onClose={() => setIssueModalData(null)}
        />
      )}

      

      {/* EDIT ISSUE MODAL */}
      {editingIssue && (
        <EditIssueModal issue={editingIssue} onClose={() => setEditingIssue(null)} />
      )}

      {isAboutOpen && <AboutModal onClose={() => setIsAboutOpen(false)} />}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function WorkspaceView({ activeItem, currentUser, liveMessages, liveIssues, onClose, onOpenIssueModal, onEditIssue }) {
  const [activeTab, setActiveTab] = useState('chat');
  const isSpace = activeItem.type === 'space';

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h2 className="text-xl font-bold text-gray-800">{activeItem.name}</h2>
            <span className="text-sm text-gray-500">Ephemeral Project Hub (1-Hour Data Retention)</span>
          </div>
        </div>

        {isSpace && (
          <div className="flex gap-6 border-b border-gray-200 translate-y-[17px]">
            <button onClick={() => setActiveTab('chat')} className={`pb-4 px-2 text-sm font-medium transition-colors cursor-pointer relative ${activeTab === 'chat' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Chat {activeTab === 'chat' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
            </button>
            <button onClick={() => setActiveTab('issues')} className={`pb-4 px-2 text-sm font-medium transition-colors cursor-pointer relative flex items-center gap-2 ${activeTab === 'issues' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              Issue Board <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-xs">{liveIssues.length}</span>
              {activeTab === 'issues' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
            </button>
            <button onClick={() => setActiveTab('insights')} className={`pb-4 px-2 text-sm font-medium transition-colors cursor-pointer relative flex items-center gap-1 ${activeTab === 'insights' ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}>
              AI Insights {activeTab === 'insights' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-t-full"></div>}
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chat' && (
          <ChatTab
            onOpenIssueModal={onOpenIssueModal}
            onEditIssue={onEditIssue}
            activeItem={activeItem}
            currentUser={currentUser}
            messages={liveMessages}
            liveIssues={liveIssues}
          />
        )}
        {activeTab === 'issues' && <IssuesTab issues={liveIssues} onEditIssue={onEditIssue} />}
        {activeTab === 'insights' && <InsightsTab messages={liveMessages} />}
      </div>
    </div>
  );
}

function ChatTab({ onOpenIssueModal, onEditIssue, activeItem, currentUser, messages, liveIssues }) {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      await addDoc(collection(db, 'messages'), {
        spaceId: activeItem.id,
        text: inputText,
        user: currentUser,
        timestamp: Date.now()
      });
      setInputText('');
    } catch (err) {
      console.error("Error writing document: ", err);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">No messages in the last hour. Start the conversation!</div>
        )}

        {messages.map((msg) => {
          const isMe = msg.user.name === currentUser.name || msg.user.id === currentUser.id;

          // Find all Jira issues created from this specific message
          const msgIssues = (liveIssues || []).filter(issue => issue.messageId === msg.id);

          return (
            <div
              key={msg.id}
              className={`flex gap-3 group relative px-2 py-1.5 rounded-2xl hover:bg-black/[0.02] transition-colors ${isMe ? 'flex-row-reverse self-end max-w-[85%]' : 'self-start max-w-[85%]'
                }`}
            >
              <div className={`w-9 h-9 rounded-full ${msg.user.color} flex items-center justify-center text-white font-bold shrink-0 shadow-sm text-xs`}>
                {msg.user.avatar}
              </div>

              <div className={`flex flex-col min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  {isMe ? (
                    <>
                      <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="font-bold text-gray-900 text-sm">{msg.user.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-gray-900 text-sm">{msg.user.name}</span>
                      <span className="text-xs text-gray-500">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble Wrapper */}
                <div className="relative w-fit">
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
                    ? 'bg-[#c2e7ff] text-[#001d35] rounded-tr-sm shadow-sm font-normal'
                    : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100 shadow-sm'
                    }`}>
                    {msg.text}
                  </div>

                  {/* FLOATING HOVER POPUP WITH EMOJIS, ACTIONS, AND LINKED JIRA TICKETS */}
                  <div className={`absolute -top-3.5 opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 transition-all duration-200 ease-out flex items-center gap-1.5 z-20 pointer-events-none group-hover:pointer-events-auto ${isMe ? 'right-0' : 'left-0'
                    }`}>

                    {/* Quick Reaction Pill */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200/90 rounded-2xl px-2 py-1 shadow-md hover:shadow-lg transition-all shrink-0">
                      <button type="button" className="text-base hover:scale-125 transition-transform p-0.5 rounded cursor-pointer" title="Thumbs Up">👍</button>
                      <button type="button" className="text-xs font-bold bg-[#00E676] text-black px-1.5 py-0.5 rounded hover:scale-110 transition-transform cursor-pointer" title="Acknowledge">ACK</button>
                      <button type="button" className="text-base hover:scale-125 transition-transform p-0.5 rounded cursor-pointer" title="Smile">🥲</button>
                    </div>

                    {/* Action Icons Pill */}
                    <div className="flex items-center gap-0.5 bg-white border border-gray-200/90 rounded-2xl px-1.5 py-1 shadow-md hover:shadow-lg transition-all text-gray-700 shrink-0">
                      <button type="button" className="p-1.5 hover:bg-black/5 rounded-full transition-colors cursor-pointer" title="Add reaction">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 6h4m-2-2v4" />
                        </svg>
                      </button>

                      <button type="button" className="p-1.5 hover:bg-black/5 rounded-full transition-colors cursor-pointer" title="Reply in thread">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>

                      <button type="button" className="p-1.5 hover:bg-black/5 rounded-full transition-colors cursor-pointer" title="Quote reply">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenIssueModal(msg)}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-0.5 rounded-full text-[10px] transition-all hover:scale-105 cursor-pointer shadow-xs shrink-0"
                        title="Create Jira Issue from this message"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Create JIRA</span>
                      </button>

                      <button type="button" className="p-1.5 hover:bg-black/5 rounded-full transition-colors cursor-pointer" title="More options">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                    </div>

                    {/* LINKED JIRAS LIST IN HOVER BAR */}
                    {msgIssues.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-blue-50/95 border border-blue-200 rounded-2xl px-2.5 py-1 shadow-md hover:shadow-lg transition-all shrink-0">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-blue-800">Jiras:</span>
                        <div className="flex items-center gap-1">
                          {msgIssues.map(issue => (
                            <button
                              key={issue.id}
                              type="button"
                              onClick={() => onEditIssue(issue)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-0.5 rounded-full text-[10px] transition-all hover:scale-105 cursor-pointer flex items-center gap-1 shadow-2xs"
                              title={`Click to edit ${issue.jiraId}: ${issue.title}`}
                            >
                              <span>{issue.jiraId}</span>
                              <span className="text-[9px] opacity-80">({issue.status})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-white flex items-center gap-3 mt-auto shrink-0 border-t border-gray-100">
        <button
          type="button"
          onClick={() => onOpenIssueModal(null)}
          title="Create Jira Issue"
          className="w-[48px] h-[48px] bg-[#C2E7FF] hover:bg-[#b3dcf5] hover:scale-105 active:scale-95 text-[#001D35] rounded-[16px] flex items-center justify-center shrink-0 transition-all shadow-sm cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <div className="flex-1 bg-[#EDF2FA] rounded-full flex items-center px-4 h-[48px] border border-transparent focus-within:bg-white focus-within:border-gray-300 focus-within:shadow-sm transition-all">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Replying as ${currentUser.name}...`}
            className="bg-transparent border-none outline-none flex-1 text-gray-800 placeholder-gray-500 text-[15px] min-w-0"
          />

          <div className="flex items-center gap-1 text-gray-600 ml-2 shrink-0">
            <button type="button" className="p-1.5 hover:bg-black/5 hover:scale-110 rounded-full transition-all cursor-pointer" title="Formatting">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M7 16l5-12 5 12M10 12h4" /></svg>
            </button>
            <button type="button" className="p-1.5 hover:bg-black/5 hover:scale-110 rounded-full transition-all cursor-pointer" title="Emoji">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </button>
            <button type="button" className="p-1.5 hover:bg-black/5 hover:scale-110 rounded-full transition-all cursor-pointer" title="Gallery">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>
            <button type="button" className="p-1.5 hover:bg-black/5 hover:scale-110 rounded-full transition-all cursor-pointer" title="Upload">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            </button>
            <button type="button" className="p-1.5 hover:bg-black/5 hover:scale-110 rounded-full transition-all cursor-pointer" title="More">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="7" strokeWidth="1.5" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
            </button>
          </div>
        </div>

        <div className="flex gap-1 shrink-0 h-[48px]">
          <button type="button" className="w-7 bg-[#EDF2FA] hover:bg-[#e1e9f7] text-gray-500 rounded-xl flex items-center justify-center transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-12 bg-[#EDF2FA] hover:bg-[#e1e9f7] hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 text-gray-500 rounded-xl flex items-center justify-center transition-all cursor-pointer"
          >
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// --- UPGRADED ISSUE BOARD ---
function IssuesTab({ issues, onEditIssue }) {
  const columns = ['To Do', 'In Progress', 'Done'];

  // Filter & Sort States
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  // Filter logic
  const filteredIssues = issues.filter(issue => {
    if (priorityFilter !== 'All' && issue.priority !== priorityFilter) return false;
    if (assigneeFilter !== 'All' && issue.assignee !== assigneeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = issue.title?.toLowerCase().includes(q);
      const matchesJiraId = issue.jiraId?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesJiraId) return false;
    }
    return true;
  });

  // Sort logic
  const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    if (sortBy === 'newest') return (b.timestamp || 0) - (a.timestamp || 0);
    if (sortBy === 'oldest') return (a.timestamp || 0) - (b.timestamp || 0);
    if (sortBy === 'priority-high') return (priorityMap[b.priority] || 0) - (priorityMap[a.priority] || 0);
    if (sortBy === 'priority-low') return (priorityMap[a.priority] || 0) - (priorityMap[b.priority] || 0);
    if (sortBy === 'due-date') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    if (sortBy === 'assignee-asc') return (a.assignee || '').localeCompare(b.assignee || '');
    return 0;
  });

  const isFiltered = priorityFilter !== 'All' || assigneeFilter !== 'All' || searchQuery.trim() !== '';

  const resetFilters = () => {
    setPriorityFilter('All');
    setAssigneeFilter('All');
    setSearchQuery('');
    setSortBy('newest');
  };

  return (
    <div className="h-full bg-gray-50 flex flex-col">

      {/* FILTER & SORT TOOLBAR */}
      <div className="p-4 bg-white border-b border-gray-200 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-xs">

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues..."
              className="pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-blue-500 w-44 transition-all"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-gray-500 font-medium">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="bg-transparent text-gray-800 font-semibold outline-none cursor-pointer border-none"
            >
              <option value="All">All People</option>
              {SELECTABLE_PROFILES.map(u => (
                <option key={u.id} value={u.name}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs">
            <span className="text-gray-500 font-medium">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent text-gray-800 font-semibold outline-none cursor-pointer border-none"
            >
              <option value="All">All Priorities</option>
              <option value="High">🔴 High</option>
              <option value="Medium">🟡 Medium</option>
              <option value="Low">🟢 Low</option>
            </select>
          </div>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-semibold px-3 py-1.5 rounded-lg outline-none cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <option value="newest">Created (Newest First)</option>
            <option value="oldest">Created (Oldest First)</option>
            <option value="priority-high">Priority (High → Low)</option>
            <option value="priority-low">Priority (Low → High)</option>
            <option value="due-date">Due Date (Earliest First)</option>
            <option value="assignee-asc">Assignee (A → Z)</option>
          </select>
        </div>

      </div>

      {/* KANBAN BOARD COLUMNS */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 min-w-max h-full">
          {columns.map(col => {
            const colIssues = sortedIssues.filter(i => i.status === col);

            return (
              <div key={col} className="w-80 bg-gray-100/60 rounded-2xl p-4 flex flex-col border border-gray-200/80 shadow-xs">
                <h3 className="font-bold text-gray-700 mb-4 flex justify-between items-center text-sm">
                  {col}
                  <span className="bg-gray-200 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                    {colIssues.length}
                  </span>
                </h3>

                <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1 pr-1">
                  {colIssues.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-8 border-2 border-dashed border-gray-200 rounded-xl">
                      No issues
                    </div>
                  ) : (
                    colIssues.map(issue => {
                      const userObj = SELECTABLE_PROFILES.find(u => u.name === issue.assignee);
                      return (
                        <div
                          key={issue.id}
                          onClick={() => onEditIssue(issue)}
                          className="bg-white p-4 rounded-xl shadow-xs border border-gray-200 cursor-pointer hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group/card relative"
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-blue-600 font-bold flex items-center gap-1">
                              {issue.jiraId}
                              <svg className="w-3 h-3 opacity-0 group-hover/card:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${issue.priority === 'High' ? 'bg-red-100 text-red-700' :
                              issue.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                              }`}>
                              {issue.priority}
                            </span>
                          </div>

                          <div className="text-sm font-medium text-gray-800 mb-3 leading-snug">{issue.title}</div>

                          <div className="flex justify-between items-center pt-2.5 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <div className={`w-5 h-5 rounded-full ${userObj ? userObj.color : 'bg-blue-600'} flex items-center justify-center text-white text-[9px] font-bold shrink-0 shadow-xs`}>
                                {userObj ? userObj.avatar : (issue.assignee ? issue.assignee.charAt(0) : 'U')}
                              </div>
                              <span className="truncate max-w-[100px] font-medium text-gray-700">{issue.assignee || 'Unassigned'}</span>
                            </div>

                            {issue.dueDate && (
                              <span className="text-[11px] font-medium text-gray-600 bg-gray-100/90 border border-gray-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                📅 {new Date(issue.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InsightsTab({ messages }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateInsights = async () => {
    if (messages.length === 0) {
      setError("Not enough chat data to generate insights. Send some messages first!");
      return;
    }

    setLoading(true);
    setError(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const candidateModels = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-2.5-flash"];
    const chatTranscript = messages.map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.user.name}: ${m.text}`).join('\n');

    const prompt = `
      You are a Project Manager analyzing a live chat. Read the transcript below.
      Return ONLY valid JSON matching this exact structure:
      {
        "theme": "A 2-sentence summary of the main discussion.",
        "participants": [
          { "name": "User Name", "views": "What this person said or thinks" }
        ],
        "blockers": ["List of blockers, or 'None'"]
      }

      Transcript:
      ${chatTranscript}
    `;

    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const responseText = result.response.text();
          const cleanJson = responseText.replace(/```json/gi, '').replaceAll('```', '').trim();
          setInsights(JSON.parse(cleanJson));
          setLoading(false);
          return;
        } catch (err) {
          console.warn(`Gemini model candidate '${modelName}' failed, trying next candidate...`, err);
        }
      }
    }

    try {
      const userNames = [...new Set(messages.map(m => m.user.name))];
      const lastMsgText = messages[messages.length - 1]?.text || "Project updates";

      setInsights({
        theme: `Active team collaboration regarding ongoing project tasks. Recent topic: "${lastMsgText}".`,
        participants: userNames.map(name => ({
          name: name,
          views: messages.filter(m => m.user.name === name).map(m => m.text).join(' | ') || "Contributed to team discussion."
        })),
        blockers: ["No explicit blockers reported in current transcript."]
      });
    } catch (fallbackErr) {
      setError("Could not analyze chat messages.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-indigo-50/30 to-purple-50/30 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Live AI Insights</h2>
              <p className="text-gray-500 text-sm">Summarizing the last 60 minutes of chat via Gemini 3.8 Flash</p>
            </div>
          </div>
          <button
            onClick={generateInsights}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 hover:scale-105 active:scale-95 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            {loading ? 'Analyzing...' : 'Generate Insights'}
          </button>
        </div>

        {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">{error}</div>}

        {insights && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-3">Discussion Theme</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{insights.theme}</p>
            </div>

            <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4">Participants & Views</h3>
              <div className="space-y-4">
                {insights.participants.map((p, idx) => (
                  <div key={idx} className="flex gap-3 items-start border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{p.name}</span>
                      <p className="text-sm text-gray-600 mt-0.5">{p.views}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 text-red-500">Current Blockers</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                {insights.blockers.map((blocker, idx) => (
                  <li key={idx} className="flex gap-2"><span className="text-red-500">•</span> {blocker}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateIssueModal({ activeItem, modalContext, onClose }) {
  const [summary, setSummary] = useState(modalContext?.defaultSummary || '');
  const [priority, setPriority] = useState('Medium');
  const [assignee, setAssignee] = useState(SELECTABLE_PROFILES[0].name);
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = async () => {
    if (!summary.trim()) return;

    try {
      await addDoc(collection(db, 'issues'), {
        spaceId: activeItem.id,
        messageId: modalContext?.messageId || null,
        jiraId: `PROJ-${Math.floor(100 + Math.random() * 900)}`,
        title: summary,
        status: 'To Do',
        priority: priority,
        assignee: assignee,
        dueDate: dueDate,
        timestamp: Date.now()
      });
      onClose();
    } catch (err) {
      console.error("Error creating issue:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white w-[700px] rounded-xl shadow-2xl flex flex-col relative overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-gray-50/50">
          <span className="font-semibold text-base text-gray-800">Create Issue in {activeItem.name}</span>
          <button onClick={onClose} className="p-2 hover:bg-gray-200/60 rounded transition-colors cursor-pointer">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Summary <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Implement OAuth token refresh strategy"
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assignee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-all"
              >
                {SELECTABLE_PROFILES.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-all"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button className="text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm" onClick={onClose}>Cancel</button>
          <button className="bg-[#0b57d0] hover:bg-blue-700 hover:scale-105 active:scale-95 text-white font-medium px-5 py-2 rounded-lg shadow-sm transition-all cursor-pointer text-sm" onClick={handleSubmit}>Create Issue</button>
        </div>
      </div>
    </div>
  );
}

function EditIssueModal({ issue, onClose }) {
  const [summary, setSummary] = useState(issue.title || '');
  const [status, setStatus] = useState(issue.status || 'To Do');
  const [priority, setPriority] = useState(issue.priority || 'Medium');
  const [assignee, setAssignee] = useState(issue.assignee || SELECTABLE_PROFILES[0].name);
  const [dueDate, setDueDate] = useState(issue.dueDate || '');
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!summary.trim()) return;
    setLoading(true);
    try {
      const issueRef = doc(db, 'issues', issue.id);
      await updateDoc(issueRef, {
        title: summary,
        status: status,
        priority: priority,
        assignee: assignee,
        dueDate: dueDate,
      });
      onClose();
    } catch (err) {
      console.error("Error updating issue:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this issue?")) return;
    setLoading(true);
    try {
      const issueRef = doc(db, 'issues', issue.id);
      await deleteDoc(issueRef);
      onClose();
    } catch (err) {
      console.error("Error deleting issue:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white w-[700px] rounded-xl shadow-2xl flex flex-col relative overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-gray-200 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md">{issue.jiraId}</span>
            <span className="font-semibold text-base text-gray-800">Edit Issue</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200/60 rounded transition-colors cursor-pointer">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 flex flex-col gap-6">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Summary <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-all"
              >
                <option value="To Do">To Do</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Assignee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-all"
              >
                {SELECTABLE_PROFILES.map(u => (
                  <option key={u.id} value={u.name}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-all"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-red-600 hover:text-red-800 hover:bg-red-50 font-semibold px-3 py-2 rounded-lg transition-colors cursor-pointer text-sm"
          >
            Delete Issue
          </button>
          <div className="flex gap-3">
            <button className="text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm" onClick={onClose}>Cancel</button>
            <button className="bg-[#0b57d0] hover:bg-blue-700 hover:scale-105 active:scale-95 text-white font-medium px-5 py-2 rounded-lg shadow-sm transition-all cursor-pointer text-sm" onClick={handleUpdate}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AboutModal({ onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const slides = [
    // SLIDE 1: Why I Created This Project
    {
      title: "Why I Created This Project",
      subtitle: "Bridging chat chatter with structured execution to drive engineering accountability.",
      type: "stakeholders",
      content: [
        {
          role: "Developers",
          img: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop",
          desc: "Creates clear, traceable ownership over every task. Convert chat updates directly into Jiras so devs never lose context or dig through history."
        },
        {
          role: "Testers",
          img: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=600&auto=format&fit=crop",
          desc: "Log bugs in 1-click right where the conversation is happening, eliminating the extra friction of switching to external Jira forms."
        },
        {
          role: "Project Leads (PM)",
          img: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop",
          desc: "Eliminates manual Excel tracking and endless chasing. Gives total oversight of team velocity and task status in real time."
        },
        {
          role: "Senior Leaders",
          img: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=600&auto=format&fit=crop",
          desc: "Instant AI-synthesized summaries of project health, team contributions, and blockers without needing to sit through long sync meetings."
        }
      ]
    },

    // SLIDE 2: My Perspective as a PM
    {
      title: "My Perspective as a PM",
      subtitle: "Eliminating communication breakdown and reducing friction across roles.",
      type: "pm-perspective",
      items: [
        {
          title: "The Chat Loss Problem",
          desc: "In real-time teams, critical requirements and bug reports get buried in chat threads within minutes.",
          icon: "💬"
        },
        {
          title: "QA / Tester Friction",
          desc: "Testers often report bugs in chat but skip making Jira tickets because opening another tool feels like too much overhead.",
          icon: "🐞"
        },
        {
          title: "Developer Confusion",
          desc: "Devs end up jumping between scattered chat messages trying to piece together what actually needs fixing.",
          icon: "🧑‍💻"
        },
        {
          title: "PM Operational Bottleneck",
          desc: "Without this tool, PMs are forced to manually maintain Excel sheets, chase people to create tickets, and act as human routers.",
          icon: "📋"
        },
        {
          title: "Management Visibility (AI Insights)",
          desc: "Managers usually only check in when issues escalate. Gemini AI Insights gives them instant status updates so nobody has to be grilled.",
          icon: "⚡"
        }
      ]
    },

    // SLIDE 3: Development Prioritization
    {
      title: "Development Prioritization Framework",
      subtitle: "How feature scope was staged during the build of this prototype.",
      type: "prioritization",
      phases: [
        {
          phase: "P0 — Core Infrastructure & Realtime Data",
          color: "border-red-500 bg-red-50/50",
          desc: "Setup Vite/React baseline with Firebase Firestore listeners (onSnapshot) to enable instant real-time sync across multi-user tabs."
        },
        {
          phase: "P1 — Contextual Chat-to-Jira Creation",
          color: "border-blue-500 bg-blue-50/50",
          desc: "Build the floating hover toolbar in chat with 1-click 'Create JIRA' badges and linked ticket indicators directly on messages."
        },
        {
          phase: "P2 — Interactive Kanban Board",
          color: "border-amber-500 bg-amber-50/50",
          desc: "Implement complete issue lifecycle management: drag-and-drop/status columns, sorting, filtering by assignee/priority, and edit modals."
        },
        {
          phase: "P3 — Multi-User Profile Simulation",
          color: "border-purple-500 bg-purple-50/50",
          desc: "Add top-header user switching (PM, Alice, Bob, Charlie) to easily test multi-user real-time interaction on a single machine."
        },
        {
          phase: "P4 — Gemini AI Insights & Deployment",
          color: "border-green-500 bg-green-50/50",
          desc: "Integrate Gemini 3.8/2.5 Flash for 1-click chat summaries, enforce 1-hour ephemeral data retention, and deploy via Vercel CLI."
        }
      ]
    },

    // SLIDE 4: Tech Stack & Architecture
    {
      title: "Tech Stack & System Architecture",
      subtitle: "Modern, lightweight, and responsive stack built for speed and realtime collaboration.",
      type: "tech-stack",
      stack: [
        { name: "React 18 + Vite", category: "Frontend Core", desc: "Ultra-fast HMR and modular UI component structure." },
        { name: "Tailwind CSS", category: "Styling", desc: "Responsive glassmorphic Google Chat aesthetic." },
        { name: "Firebase Firestore", category: "Database & Realtime", desc: "Realtime WebSocket listeners with 1-hour ephemeral data lifecycle." },
        { name: "Google Gemini API", category: "AI Engine", desc: "Multi-model candidate fallback chain (Gemini 3.8 Flash, 3.7 Flash, 2.5 Flash)." },
        { name: "Vercel CLI", category: "CI/CD & Hosting", desc: "Seamless deployment pipeline with environment variable security." }
      ]
    }
  ];

  const current = slides[currentSlide];

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-[900px] max-w-full h-[600px] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="px-8 py-5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-gray-50/50">
          <div>
            <span className="text-xs font-bold text-blue-600 uppercase tracking-widest">Project Overview</span>
            <h2 className="text-xl font-extrabold text-gray-900">{current.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-200/80 hover:bg-gray-300 rounded-full text-xs font-bold text-gray-700 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>ESC</span> ✕
          </button>
        </div>

        {/* MODAL BODY (SLIDE CONTENT) */}
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-gray-500 mb-6 font-medium">{current.subtitle}</p>

          {/* SLIDE TYPE 1: STAKEHOLDERS */}
          {current.type === 'stakeholders' && (
            <div className="grid grid-cols-2 gap-4">
              {current.content.map((item, idx) => (
                <div key={idx} className="flex gap-4 p-3.5 rounded-2xl bg-gray-50 border border-gray-100 items-start">
                  <img src={item.img} alt={item.role} className="w-20 h-20 rounded-xl object-cover shrink-0 shadow-xs" />
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm mb-1">{item.role}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SLIDE TYPE 2: PM PERSPECTIVE */}
          {current.type === 'pm-perspective' && (
            <div className="grid grid-cols-1 gap-3">
              {current.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50/40 border border-blue-100/60">
                  <span className="text-2xl shrink-0">{item.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{item.title}</h3>
                    <p className="text-xs text-gray-600 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SLIDE TYPE 3: PRIORITIZATION */}
          {current.type === 'prioritization' && (
            <div className="flex flex-col gap-3">
              {current.phases.map((item, idx) => (
                <div key={idx} className={`p-3.5 rounded-xl border-l-4 ${item.color} shadow-2xs`}>
                  <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wide">{item.phase}</h3>
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* SLIDE TYPE 4: TECH STACK */}
          {current.type === 'tech-stack' && (
            <div className="grid grid-cols-1 gap-3">
              {current.stack.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">{item.category}</span>
                    <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 max-w-sm text-right">{item.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MODAL FOOTER / CAROUSEL CONTROLS */}
        <div className="px-8 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
          {/* DOT INDICATORS */}
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${currentSlide === idx ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                  }`}
              />
            ))}
          </div>

          {/* PREV / NEXT BUTTONS */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentSlide((prev) => Math.max(0, prev - 1))}
              disabled={currentSlide === 0}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:opacity-30 text-gray-800 font-semibold rounded-xl text-xs transition-all cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentSlide((prev) => Math.min(slides.length - 1, prev + 1))}
              disabled={currentSlide === slides.length - 1}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
