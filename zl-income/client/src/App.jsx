import { useState, useCallback, useEffect } from 'react';
import { ConfigProvider, Tabs } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import KpiCards from './components/KpiCards';
import FilterBar from './components/FilterBar';
import ChartSection from './components/ChartSection';
import DeptTable from './components/DeptTable';
import VisitDashboard from './pages/VisitDashboard';
import { fetchLatestDate } from './api';
import './App.css';

export default function App() {
  const [filters, setFilters] = useState(null);
  const [searchTrigger, setSearchTrigger] = useState(0);
  const [latestInfo, setLatestInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('income');

  useEffect(() => {
    fetchLatestDate().then(d => {
      if (d) {
        setLatestInfo(d);
        setFilters({ year: d.year, quarter: d.quarter, month: d.month });
      }
    }).catch(() => {
      setFilters({});
    });
  }, []);

  const handleSearch = useCallback(() => {
    setSearchTrigger((s) => s + 1);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setSearchTrigger((s) => s + 1);
  }, []);

  if (!filters) {
    return (
      <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#2c5ea8', borderRadius: 6, fontFamily: "'Noto Sans SC', -apple-system, sans-serif" } }}>
        <div className="app-container">
          <header className="app-header">
            <div className="logo-area"><div className="logo-icon">东</div><span className="logo-text">东云川 · 科室看板</span></div>
          </header>
          <main className="app-main"><div className="app-loading">正在加载数据…</div></main>
        </div>
      </ConfigProvider>
    );
  }

  return (
    <ConfigProvider locale={zhCN} theme={{ token: { colorPrimary: '#2c5ea8', borderRadius: 6, fontFamily: "'Noto Sans SC', -apple-system, sans-serif" } }}>
      <div className="app-container">
        <header className="app-header">
          <div className="logo-area">
            <div className="logo-icon">东</div>
            <span className="logo-text">东云川 · 科室看板</span>
            <span className="logo-subtitle">Dashboard</span>
          </div>
          <div className="header-right">
            <span className="dot"></span>
            数据更新至 {latestInfo ? `${latestInfo.year}-${latestInfo.month}` : '加载中…'}
          </div>
        </header>

        <main className="app-main">
          <div className="sticky-toolbar">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              style={{ marginBottom: -24 }}
              items={[
                { key: 'income', label: '💰 科室收入看板' },
                { key: 'visit', label: '👥 科室人次看板' },
              ]}
            />
            <FilterBar filters={filters} onChange={handleFilterChange} onSearch={handleSearch} />
          </div>

          {activeTab === 'income' ? (
            <>
              <KpiCards filters={filters} />
              <ChartSection filters={filters} />
              <DeptTable filters={filters} searchTrigger={searchTrigger} />
            </>
          ) : (
            <VisitDashboard filters={filters} />
          )}
        </main>

        <footer className="app-footer">
          东云川科技 © {new Date().getFullYear()} · 数据来源：ads_dept_income / ads_dept_income_mjz_day_dim / ads_dept_income_day / ads_dept_work_ops_m_day / ads_dept_business_area_day / ads_dept_income_zy_dim
        </footer>
      </div>
    </ConfigProvider>
  );
}
