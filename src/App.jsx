import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import StoreHome from './store/StoreHome.jsx';
import GameDetail from './store/GameDetail.jsx';
import PlayPage from './store/PlayPage.jsx';
import SoonPage from './store/SoonPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreHome />} />
      <Route path="/navinha" element={<GameDetail id="navinha" />} />
      <Route path="/defesa" element={<GameDetail id="defesa" />} />
      <Route path="/jogar/:id" element={<PlayPage />} />
      <Route path="/em-breve" element={<SoonPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
