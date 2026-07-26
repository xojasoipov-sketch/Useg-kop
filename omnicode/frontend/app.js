// OmniCode - SMM AI Panel uchun asosiy JS logika
// Yangi tab va panel qo'shish

// Asosiy holatni yangilash
const initialState = {
  ...window.omniState,
  activeTab: 'smm-ai', // Standart tabni SMM AI ga o'zgartiramiz
  smmAI: {
    telegramChannel: '',
    strategyDays: 30,
    posts: [],
    scanResults: [],
    isScanning: false,
    strategyGenerated: false,
    currentStep: 0,
    viralPosts: [],
    aiGeneratedPosts: []
  }
};

// Yangi reducer qo'shish
const smmAIReducer = (state = initialState.smmAI, action) => {
  switch (action.type) {
    case 'SET_TELEGRAM_CHANNEL':
      return { ...state, telegramChannel: action.payload };
    case 'SET_STRATEGY_DAYS':
      return { ...state, strategyDays: action.payload };
    case 'ADD_POST':
      return { ...state, posts: [...state.posts, action.payload] };
    case 'START_SCANNING':
      return { ...state, isScanning: true };
    case 'SCAN_COMPLETE':
      return { ...state, isScanning: false, scanResults: action.payload };
    case 'GENERATE_STRATEGY':
      return { ...state, strategyGenerated: true, currentStep: 1 };
    case 'ADD_VIRAL_POST':
      return { ...state, viralPosts: [...state.viralPosts, action.payload] };
    case 'ADD_AI_POST':
      return { ...state, aiGeneratedPosts: [...state.aiGeneratedPosts, action.payload] };
    case 'NEXT_STEP':
      return { ...state, currentStep: state.currentStep + 1 };
    case 'PREV_STEP':
      return { ...state, currentStep: state.currentStep - 1 };
    default:
      return state;
  }
};

// Asosiy reducerga yangi reducerni qo'shish
const rootReducer = (state = initialState, action) => {
  if (action.type.startsWith('SMM_AI_')) {
    return {
      ...state,
      smmAI: smmAIReducer(state.smmAI, action)
    };
  }
  return state;
};

// Yangi komponent: SMM AI Panel
const SMMAIPanel = ({ state, dispatch }) => {
  const [channelInput, setChannelInput] = React.useState(state.smmAI.telegramChannel);
  const [daysInput, setDaysInput] = React.useState(state.smmAI.strategyDays);
  const [postContent, setPostContent] = React.useState('');
  const [scanProgress, setScanProgress] = React.useState(0);

  // Telegram kanalini saqlash
  const handleSaveChannel = () => {
    dispatch({ type: 'SET_TELEGRAM_CHANNEL', payload: channelInput });
    alert('Telegram kanali saqlandi!');
  };

  // Strategiya kunlarini saqlash
  const handleSaveDays = () => {
    dispatch({ type: 'SET_STRATEGY_DAYS', payload: parseInt(daysInput) || 30 });
    alert('Strategiya kunlari saqlandi!');
  };

  // Post qo'shish
  const handleAddPost = () => {
    if (postContent.trim()) {
      dispatch({ type: 'ADD_POST', payload: {
        id: Date.now(),
        content: postContent,
        date: new Date().toISOString(),
        likes: 0,
        views: 0
      }});
      setPostContent('');
      alert('Post qo\'shildi!');
    }
  };

  // Skannerni boshlash (simulyatsiya)
  const handleStartScan = () => {
    dispatch({ type: 'START_SCANNING' });
    setScanProgress(0);

    // Simulyatsiya qilish
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          dispatch({ type: 'SCAN_COMPLETE', payload: [
            { postId: 1, viralScore: 95, engagement: 'Yuqori' },
            { postId: 2, viralScore: 78, engagement: 'O\'rtacha' },
            { postId: 3, viralScore: 62, engagement: 'Past' }
          ]});
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  // 30 kunlik strategiyani yaratish
  const generate30DayStrategy = () => {
    dispatch({ type: 'GENERATE_STRATEGY' });

    // Simulyatsiya qilish
    setTimeout(() => {
      dispatch({ type: 'ADD_VIRAL_POST', payload: {
        id: 1,
        title: 'Viral Post 1',
        content: 'Bu post juda viral bo\'lishi mumkin!',
        viralScore: 95,
        suggestedDate: new Date(Date.now() + 86400000).toLocaleDateString()
      }});

      dispatch({ type: 'ADD_AI_POST', payload: {
        id: 1,
        title: 'AI tomonidan yaratilgan post',
        content: 'AI yordamida yaratilgan post kontenti...',
        aiGenerated: true,
        suggestedDate: new Date(Date.now() + 172800000).toLocaleDateString()
      }});
    }, 2000);
  };

  // Keyingi qadamga o'tish
  const nextStep = () => {
    dispatch({ type: 'NEXT_STEP' });
  };

  // Oldingi qadamga qaytish
  const prevStep = () => {
    dispatch({ type: 'PREV_STEP' });
  };

  return React.createElement('div', { className: 'smm-ai-panel' },
    React.createElement('h2', null, '🤖 SMM AI Panel'),

    // 1-qadam: Telegram kanali
    state.smmAI.currentStep === 0 && React.createElement('div', { className: 'step' },
      React.createElement('h3', null, '1. Telegram Kanalini Ulash'),
      React.createElement('input', {
        type: 'text',
        value: channelInput,
        onChange: (e) => setChannelInput(e.target.value),
        placeholder: 'Telegram kanal linkini kiriting (masalan: @mychannel)',
        className: 'input-field'
      }),
      React.createElement('button', { onClick: handleSaveChannel, className: 'btn-primary' }, 'Saqlash')
    ),

    // 2-qadam: Strategiya kunlari
    state.smmAI.currentStep === 1 && React.createElement('div', { className: 'step' },
      React.createElement('h3', null, '2. Strategiya Kunlarini Tanlash'),
      React.createElement('input', {
        type: 'number',
        value: daysInput,
        onChange: (e) => setDaysInput(e.target.value),
        min: '7',
        max: '90',
        className: 'input-field'
      }),
      React.createElement('button', { onClick: handleSaveDays, className: 'btn-primary' }, 'Saqlash')
    ),

    // 3-qadam: Strategiya yaratish
    state.smmAI.currentStep === 2 && React.createElement('div', { className: 'step' },
      React.createElement('h3', null, '3. 30 Kunlik Strategiyani Yaratish'),
      !state.smmAI.strategyGenerated ? React.createElement('button', {
        onClick: generate30DayStrategy,
        className: 'btn-success'
      }, '30 Kunlik Strategiyani Yaratish') : React.createElement(React.Fragment, null,
        React.createElement('p', null, '✅ Strategiya yaratildi!'),
        React.createElement('div', { className: 'strategy-preview' },
          React.createElement('h4', null, 'Viral Postlar:'),
          state.smmAI.viralPosts.map(post => React.createElement('div', { key: post.id, className: 'post-preview' },
            React.createElement('strong', null, post.title),
            React.createElement('p', null, post.content),
            React.createElement('small', null, `Viral Score: ${post.viralScore}/100`)
          ))
        ),
        React.createElement('div', { className: 'strategy-preview' },
          React.createElement('h4', null, 'AI tomonidan yaratilgan postlar:'),
          state.smmAI.aiGeneratedPosts.map(post => React.createElement('div', { key: post.id, className: 'post-preview' },
            React.createElement('strong', null, post.title),
            React.createElement('p', null, post.content),
            React.createElement('small', null, `AI tomonidan yaratilgan`)
          ))
        )
      )
    ),

    // 4-qadam: Postlarni skaner qilish
    state.smmAI.currentStep === 3 && React.createElement('div', { className: 'step' },
      React.createElement('h3', null, '4. Postlarni Skaner Qilish'),
      !state.smmAI.isScanning ? React.createElement('button', {
        onClick: handleStartScan,
        className: 'btn-warning'
      }, 'Postlarni Skaner Qilish') : React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'scan-progress' },
          React.createElement('div', {
            className: 'progress-bar',
            style: { width: `${scanProgress}%` }
          }),
          React.createElement('span', null, `${scanProgress}%`)
        ),
        React.createElement('div', { className: 'scan-results' },
          React.createElement('h4', null, 'Skaner Natijalari:'),
          state.smmAI.scanResults.map(result => React.createElement('div', { key: result.postId, className: 'result-item' },
            React.createElement('p', null, `Post ID: ${result.postId}`),
            React.createElement('p', null, `Viral Score: ${result.viralScore}/100`),
            React.createElement('p', null, `Engagement: ${result.engagement}`)
          ))
        )
      )
    ),

    // 5-qadam: Postlarni qo'shish va boshqarish
    state.smmAI.currentStep === 4 && React.createElement('div', { className: 'step' },
      React.createElement('h3', null, '5. Postlarni Qo\'shish va Boshqarish'),
      React.createElement('textarea', {
        value: postContent,
        onChange: (e) => setPostContent(e.target.value),
        placeholder: 'Post kontentini kiriting...',
        className: 'textarea-field'
      }),
      React.createElement('button', { onClick: handleAddPost, className: 'btn-primary' }, 'Post Qo\'shish'),

      React.createElement('div', { className: 'posts-list' },
        React.createElement('h4', null, 'Sizning Postlaringiz:'),
        state.smmAI.posts.length === 0 ? React.createElement('p', null, 'Postlar mavjud emas') : state.smmAI.posts.map(post => React.createElement('div', { key: post.id, className: 'post-item' },
          React.createElement('p', null, post.content),
          React.createElement('small', null, new Date(post.date).toLocaleString())
        ))
      )
    ),

    // Navigatsiya knopkalari
    React.createElement('div', { className: 'navigation' },
      state.smmAI.currentStep > 0 && React.createElement('button', {
        onClick: prevStep,
        className: 'btn-secondary'
      }, 'Oldingi'),
      state.smmAI.currentStep < 4 && React.createElement('button', {
        onClick: nextStep,
        className: 'btn-primary'
      }, 'Keyingi'),
      state.smmAI.currentStep === 4 && React.createElement('button', {
        onClick: () => dispatch({ type: 'SET_TELEGRAM_CHANNEL', payload: '' }),
        className: 'btn-danger'
      }, 'Boshqatdan boshlash')
    )
  );
};

// Yangi tab qo'shish
const tabs = [
  ...window.omniState.tabs,
  {
    id: 'smm-ai',
    label: '🤖 SMM AI',
    content: SMMAIPanel
  }
];

// Yangilangan holat
const updatedState = {
  ...initialState,
  tabs: tabs,
  activeTab: 'smm-ai'
};

// Yangilangan reducerni qaytarish
window.omniState = updatedState;
window.omniReducer = rootReducer;