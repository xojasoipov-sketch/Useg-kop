import React from 'react';
import ReactDOM from 'react-dom';
import { useReducer } from 'react';
import './styles.css';
import { rootReducer, initialState } from './reducers';
import MemoriesPanel from './components/MemoriesPanel';
import SMMAIPanel from './components/SMMAIPanel';

const App = () => {
  const [state, dispatch] = useReducer(rootReducer, initialState);

  return React.createElement('div', { className: 'app' },
    React.createElement('h1', null, '📱 OmniCode'),
    React.createElement('div', { className: 'tabs' },
      state.tabs.map(tab => React.createElement('button', {
        key: tab.id,
        className: `tab-btn ${state.activeTab === tab.id ? 'active' : ''}`,
        onClick: () => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })
      }, tab.label))
    ),
    state.activeTab === 'smm-ai' ? React.createElement(SMMAIPanel, { state, dispatch }) : 
    state.activeTab === 'memories' ? React.createElement(MemoriesPanel, { state, dispatch }) : null
  );
};

ReactDOM.render(React.createElement(App), document.getElementById('root'));