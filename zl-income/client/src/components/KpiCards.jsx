import { useEffect, useState } from 'react';
import { Card, Skeleton } from 'antd';
import { CaretUpOutlined, CaretDownOutlined, MinusOutlined } from '@ant-design/icons';
import {
  DollarOutlined, CheckCircleOutlined, MedicineBoxOutlined,
  ExperimentOutlined, ToolOutlined, CustomerServiceOutlined,
  TeamOutlined, HomeOutlined, AlertOutlined, BankOutlined,
} from '@ant-design/icons';
import { fetchSummary } from '../api';

const toWan = (v) => {
  if (v == null) return '-';
  const n = Number(v) / 10000;
  if (Math.abs(n) >= 10000) return `${(n / 10000).toFixed(2)} 亿`;
  return `${n.toFixed(2)} 万`;
};

const toCount = (v) => {
  if (v == null) return '-';
  const n = Number(v);
  if (n >= 10000) return `${(n / 10000).toFixed(2)} 万`;
  return n.toLocaleString('zh-CN');
};

function calcYoY(current, previous) {
  if (!previous || previous === 0 || current == null) return null;
  const p = Number(previous);
  if (p === 0) return null;
  return ((Number(current) - p) / Math.abs(p)) * 100;
}

function YoYBadge({ yoy }) {
  if (yoy == null) return <MinusOutlined style={{ color: '#94a3b8', fontSize: 12 }} />;
  const isUp = yoy > 0;
  const color = isUp ? '#e03131' : '#059669';
  const Icon = isUp ? CaretUpOutlined : CaretDownOutlined;
  return (
    <span style={{ color, fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <Icon style={{ fontSize: 10 }} /> {Math.abs(yoy).toFixed(2)}%
    </span>
  );
}

const KPI_CONFIG = [
  { key: 'total_income', title: '科室总收入', icon: <DollarOutlined />, color: '#2c5ea8', format: toWan },
  { key: 'valid_income', title: '有效收入', icon: <CheckCircleOutlined />, color: '#0d9488', format: toWan },
  { key: 'outpatient_income', title: '门诊收入', icon: <HomeOutlined />, color: '#6366f1', format: toWan },
  { key: 'inpatient_income', title: '住院收入', icon: <BankOutlined />, color: '#0ea5e9', format: toWan },
  { key: 'emergency_income', title: '急诊收入', icon: <AlertOutlined />, color: '#f59e0b', format: toWan },
  { key: 'drug_income', title: '药品收入', icon: <MedicineBoxOutlined />, color: '#7c3aed', format: toWan },
  { key: 'exam_test_income', title: '检查检验收入', icon: <ExperimentOutlined />, color: '#d97706', format: toWan },
  { key: 'material_income', title: '材料收入', icon: <ToolOutlined />, color: '#be123c', format: toWan },
  { key: 'service_income', title: '服务收入', icon: <CustomerServiceOutlined />, color: '#059669', format: toWan },
  { key: 'visit_count', title: '门诊量', icon: <TeamOutlined />, color: '#0891b2', format: toCount },
];

export default function KpiCards({ filters }) {
  const [result, setResult] = useState({ current: null, previous: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSummary(filters)
      .then(setResult)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  const { current, previous } = result;

  return (
    <div className="kpi-grid animate-in stagger-1">
      {KPI_CONFIG.map((cfg, idx) => {
        const val = current ? current[cfg.key] : null;
        const prevVal = previous ? previous[cfg.key] : null;
        const yoy = calcYoY(val, prevVal);

        return (
          <Card
            key={cfg.key}
            bordered={false}
            className={`kpi-card animate-in stagger-${Math.min(idx + 1, 7)}`}
            style={{
              borderRadius: 10,
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border)',
              transition: 'box-shadow 0.2s, transform 0.2s',
              cursor: 'default',
            }}
            bodyStyle={{ padding: '14px 18px' }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {loading ? (
              <Skeleton active paragraph={{ rows: 1 }} title={{ width: '60%' }} />
            ) : (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6 }}>
                  <span style={{ color: cfg.color, marginRight: 4 }}>{cfg.icon}</span>
                  {cfg.title}
                </div>
                <div style={{
                  fontSize: 20, fontWeight: 700, color: cfg.color,
                  fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
                  marginBottom: 4, lineHeight: 1.3,
                }}>
                  {cfg.format(val)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    同期 {previous ? cfg.format(prevVal) : '-'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>同比</span>
                  <YoYBadge yoy={yoy} />
                </div>
              </>
            )}
          </Card>
        );
      })}
    </div>
  );
}
