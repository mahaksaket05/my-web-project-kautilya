import React from 'react';

function App() {
  return (
    <div style={{ textAlign: 'center', backgroundColor: '#f0f0f0', minHeight: '100vh', padding: '20px', fontFamily: 'Arial' }}>
      <h1 style={{ color: '#333' }}>✨ My Pixar Character Collection ✨</h1>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginTop: '30px' }}>
        {/* Character Cards */}
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '50px' }}>🧴</div>
          <h3>Bubbly Shampoo</h3>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '50px' }}>🪮</div>
          <h3>Confident Comb</h3>
        </div>
        <div style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '50px' }}>💨</div>
          <h3>Powerful Dryer</h3>
        </div>
      </div>
      <p style={{ marginTop: '40px', color: '#666' }}>Status: Deployment Successful! ✅</p>
    </div>
  );
}

export default App;
