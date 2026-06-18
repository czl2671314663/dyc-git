import { useEffect, useState } from 'react';
import { Card, Skeleton } from 'antd';
import { CaretUpOutlined, CaretDownOutlined, MinusOutlined } from '@ant-design/icons';
import { TeamOutlined, HomeOutlined, AlertOutlined, BankOutlined, ExperimentOutlined, DollarOutlined, MedicineBoxOutlined, PercentageOutlined } from '@ant-design/icons';
import { fetchVisitSummary } from '../api';

const formatCount = (v) => {
  if (v == null) return '-';
  const n = Number(v);
  if (n >= 10000) return `${(n / 10000).toFixed(2)} 万`;
  return n.toLocaleString('zh-CN');
};

const toWan = (v) => {
  if (v == null) return '-';
  return `${(Number(v) / 10000).toFixed(2)} 万`;
};

const toYuan = (v) => {
  if (v == null) return '-';
  const n = Number(v);
  if (n >= 10000) return `${(n / 10000).toFixed(2)} 万`;
  return n.toFixed(2);
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

  // 派生指标
  const mzVisits = current ? (Number(current.outpatient || 0) + Number(current.emergency || 0)) : null;
  const avgOpCost = current && current.outpatient > 0 ? Number(current.outpatient_income || 0) / Number(current.outpatient) : null;
  const avgIpCost = current && current.inpatient > 0 ? Number(current.inpatient_income || 0) / Number(current.inpatient) : null;
  const drugRatio = current && current.total_income > 0 ? (Number(current.drug_income || 0) / Number(current.total_income) * 100) : null;
  const validRatio = current && current.total_income > 0 ? (Number(current.valid_income || 0) / Number(current.total_income) * 100) : null;

  const KPI = [
    { key: 'total', title: '科室总人次', icon: <TeamOutlined />, color: '#2c5ea8', showYoY: true, value: current?.total, prevValue: previous?.total, format: formatCount },
    { key: 'outpatient', title: '门诊人次', icon: <HomeOutlined />, color: '#6366f1', showYoY: false, value: current?.outpatient, format: formatCount },
    { key: 'emergency', title: '急诊人次', icon: <AlertOutlined />, color: '#f59e0b', showYoY: false, value: current?.emergency, format: formatCount },
    { key: 'inpatient', title: '住院人次', icon: <BankOutlined />, color: '#0ea5e9', showYoY: true, value: current?.inpatient, prevValue: previous?.total, format: formatCount },
    { key: 'ops', title: '手术例数', icon: <ExperimentOutlined />, color: '#be123c', showYoY: true, value: current?.ops, prevValue: previous?.ops, format: formatCount },
    { key: 'mz_visits', title: '门急诊人次', icon: <TeamOutlined />, color: '#0891b2', showYoY: false, value: mzVisits, format: formatCount },
    { key: 'avg_op_cost', title: '门诊次均费用', icon: <DollarOutlined />, color: '#d97706', showYoY: false, value: avgOpCost, format: toYuan },
    { key: 'avg_ip_cost', title: '住院次均费用', icon: <DollarOutlined />, color: '#7c3aed', showYoY: false, value: avgIpCost, format: toWan },
    { key: 'drug_ratio', title: '药品收入占比', icon: <MedicineBoxOutlined />, color: '#059669', showYoY: false, value: drugRatio, format: (v) => v != null ? `${v.toFixed(1)}%` : '-' },
    { key: 'valid_ratio', title: '有效收入率', icon: <PercentageOutlined />, color: '#0d9488', showYoY: false, value: validRatio, format: (v) => v != null ? `${v.toFixed(1)}%` : '-' },
  ];

  return (
    <div className="kpi-grid animate-in stagger-1">
      {KPI.map((cfg, idx) => {
        const val = cfg.value;
        const prevVal = cfg.prevValue;
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
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>同期 {previous ? formatCount(prevVal) : '-'}</span>
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
