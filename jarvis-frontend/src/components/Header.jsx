import React from 'react';

const Header = ({ activePersonality, onSwitch, personalities }) => {
  return (
    <div className="header">
      <div className="status-dot"></div>
      <h1>J.A.R.V.I.S. Interface</h1>
      
      <div className="header-controls">
        {/* Notice the curly braces around onSwitch below! */}
        <select 
          className="personality-selector"
          value={activePersonality}
          onChange={onSwitch}
          title="Switch J.A.R.V.I.S. Personality Matrix"
        >
          {Object.keys(personalities).map(key => (
            <option key={key} value={key}>
              {personalities[key].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Header;