import { useEffect, useState } from 'react';
import { Card, Skeleton } from 'antd';
import { CaretUpOutlined, CaretDownOutlined, MinusOutlined } from '@ant-design/icons';
import { TeamOutlined, HomeOutlined, AlertOutlined, BankOutlined, ExperimentOutlined, LoginOutlined, CalendarOutlined, MedicineBoxOutlined, ClockCircleOutlined, RiseOutlined } from '@ant-design/icons';
import { fetchVisitSummary } from '../api';

const formatCount = (v) => {
  if (v == null) return '-';
  const n = Number(v);
  if (n >= 10000) return `${(n / 10000).toFixed(2)} 万`;
  return n.toLocaleString('zh-CN');
};

function calcYoY(current, previous) {
  if (!previous || previous === 0 || current == null) return null;
  return ((Number(current) - Number(previous)) / Number(previous)) * 100;
}

function YoYBadge({ yoy }) {
  if (yoy == null) return <MinusOutlined style={{ color: '#94a3b8', fontSize: 12 }} />;
  const isUp = yoy > 0;
  const color = isUp ? '#e03131' : '#059669';
  const Icon = isUp ? CaretUpOutlined : CaretDownOutlined;
  return <span style={{ color, fontSize: 12, fontWeight: 600 }}><Icon style={{ fontSize: 10 }} /> {Math.abs(yoy).toFixed(2)}%</span>;
}

export default function VisitKpiCards({ filters }) {
  const [result, setResult] = useState({ current: null, previous: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVisitSummary(filters).then(setResult).catch(console.error).finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  const { current, previous } = result;

  const KPI = [
    { key: 'total', title: '科室总人次', icon: <TeamOutlined />, color: '#2c5ea8', showYoY: true, prevKey: 'total', format: formatCount },
    { key: 'outpatient', title: '门诊人次', icon: <HomeOutlined />, color: '#6366f1', showYoY: false, format: formatCount },
    { key: 'emergency', title: '急诊人次', icon: <AlertOutlined />, color: '#f59e0b', showYoY: false, format: formatCount },
    { key: 'inpatient', title: '住院人次', icon: <BankOutlined />, color: '#0ea5e9', showYoY: true, prevKey: 'total', format: formatCount },
    { key: 'ops', title: '手术例数', icon: <ExperimentOutlined />, color: '#be123c', showYoY: true, prevKey: 'ops', format: formatCount },
    { key: 'discharges', title: '出院人次', icon: <LoginOutlined />, color: '#0891b2', showYoY: true, prevKey: 'discharges', format: formatCount },
    { key: 'avg_stay_days', title: '平均住院天数', icon: <CalendarOutlined />, color: '#7c3aed', showYoY: true, prevKey: 'avg_stay_days', format: (v) => v != null ? `${v} 天` : '-' },
    { key: 'level34_ops', title: '三四级手术例数', icon: <MedicineBoxOutlined />, color: '#d97706', showYoY: true, prevKey: 'level34_ops', format: formatCount },
    { key: 'weekend_inpatient', title: '周末住院人次', icon: <ClockCircleOutlined />, color: '#059669', showYoY: true, prevKey: 'weekend_inpatient', format: formatCount },
    { key: 'em_admission', title: '急诊入院人次', icon: <RiseOutlined />, color: '#ef4444', showYoY: true, prevKey: 'em_admission', format: formatCount },
  ];

  return (
    <div className="kpi-grid animate-in stagger-1">
      {KPI.map((cfg) => {
        const val = current ? current[cfg.key] : null;
        const prevVal = cfg.showYoY && previous ? previous[cfg.prevKey] : null;
        const yoy = cfg.showYoY ? calcYoY(val, prevVal) : null;
        return (
          <Card key={cfg.key} bordered={false} className="kpi-card" bodyStyle={{ padding: '14px 18px' }}
            style={{ borderRadius: 10, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)', transition: 'box-shadow 0.2s, transform 0.2s', cursor: 'default' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            {loading ? <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} /> : <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>
                <span style={{ color: cfg.color, marginRight: 4 }}>{cfg.icon}</span>{cfg.title}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em', marginBottom: 4, lineHeight: 1.3 }}>
                {cfg.format(val)}
              </div>
              {cfg.showYoY ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>同期 {previous ? cfg.format(prevVal) : '-'}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>同比</span>
                  <YoYBadge yoy={yoy} />
                </div>
              ) : <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>&nbsp;</div>}
            </>}
          </Card>
        );
      })}
    </div>
  );
}
