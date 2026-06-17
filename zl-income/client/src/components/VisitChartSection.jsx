import { useEffect, useState } from 'react';
import { Spin, Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import {
  fetchVisitDeptRanking, fetchVisitTrend, fetchVisitOEI,
  fetchVisitOpsLevel, fetchVisitZyStay,
} from '../api';

function ChartCard({ title, children }) {
  return (
    <div className="card animate-in">
      <div className="card-header"><span className="card-title">{title}</span></div>
      <div className="card-body" style={{ padding: '8px 12px' }}>{children}</div>
    </div>
  );
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max) + '…' : str;
}

const axisLabelStyle = { color: '#94a3b8', fontSize: 10 };
const textStyle = { color: '#5e6f82', fontSize: 11 };
const splitLine = { lineStyle: { color: '#f0f2f5', type: 'dashed' } };
const C1 = '#2c5ea8';
const C2 = '#bcc6d2';
const C3 = '#be123c';

// ====== 科室人次排名 ======
function VisitDeptRankingChart({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVisitDeptRanking({ ...filters, limit: 15 })
      .then((d) => setData(d.map((r) => ({
        name: truncate(r.DEPT_NAME, 5),
        fullName: r.DEPT_NAME,
        visits: Number(r.total_visits),
      })).reverse()))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  const fmt = (v) => (v >= 10000 ? `${(v / 10000).toFixed(2)}万` : v);

  const option = {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      formatter: (p) => `${p[0].data.fullName}<br/>人次：<b>${p[0].value.toLocaleString()}</b>`,
    },
    grid: { left: 8, right: 80, top: 5, bottom: 5, containLabel: true },
    xAxis: { type: 'value', axisLabel: { ...axisLabelStyle, formatter: fmt }, splitLine },
    yAxis: {
      type: 'category', data: data.map((d) => d.name),
      axisLabel: { ...textStyle, fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: data.map((d) => ({ value: d.visits, name: d.name, fullName: d.fullName })),
      itemStyle: { color: C1, borderRadius: [0, 4, 4, 0] }, barMaxWidth: 18,
      label: { show: true, position: 'right', color: '#5e6f82', fontSize: 10, formatter: (p) => fmt(p.value) },
    }],
  };

  return <ReactECharts option={option} style={{ height: 280 }} notMerge />;
}

// ====== 月度人次趋势 ======
function VisitTrendChart({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVisitTrend({ ...filters })
      .then((d) => setData(d || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  const months = data.map((r) => `${r.month || r.BIZ_MONTH || ''}月`);
  const cur = data.map((r) => Number(r.current || r.visits || 0));
  const prev = data.map((r) => Number(r.previous || 0));
  const yoyVals = data.map((r) => (r.yoy != null ? r.yoy : null));
  const hasCompare = data[0] && data[0].previous !== undefined;

  const series = hasCompare
    ? [
        { name: '本期', type: 'bar', data: cur, itemStyle: { color: C1, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 20 },
        { name: '同期', type: 'bar', data: prev, itemStyle: { color: C2, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 20 },
        { name: '同比', type: 'line', yAxisIndex: 1, data: yoyVals, smooth: true, lineStyle: { color: C3, width: 2.5 }, itemStyle: { color: C3 }, symbol: 'circle', symbolSize: 6, label: { show: true, color: C3, fontSize: 9, fontWeight: 600, formatter: (p) => (p.value != null ? `${p.value.toFixed(2)}%` : '') } },
      ]
    : [
        { name: '人次', type: 'bar', data: cur, itemStyle: { color: C1, borderRadius: [4, 4, 0, 0] }, barMaxWidth: 24, label: { show: true, position: 'top', color: '#5e6f82', fontSize: 10, formatter: (p) => (p.value >= 10000 ? `${(p.value / 10000).toFixed(2)}万` : p.value) } },
      ];

  const yAxis = hasCompare
    ? [
        { type: 'value', name: '人次', nameTextStyle: { color: '#94a3b8', fontSize: 10 }, axisLabel: { ...axisLabelStyle, formatter: (v) => (v >= 10000 ? `${(v / 10000).toFixed(2)}万` : v) }, splitLine },
        { type: 'value', name: '同比%', nameTextStyle: { color: '#94a3b8', fontSize: 10 }, axisLabel: { ...axisLabelStyle, formatter: (v) => `${v.toFixed(2)}%` } },
      ]
    : [
        { type: 'value', axisLabel: { ...axisLabelStyle, formatter: (v) => (v >= 10000 ? `${(v / 10000).toFixed(2)}万` : v) }, splitLine },
      ];

  const option = {
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'cross' },
      formatter: hasCompare
        ? (ps) => {
            let h = `<b>${ps[0].axisValue}</b><br/>`;
            ps.forEach((p) => {
              if (p.seriesName === '同比') h += `${p.marker} ${p.seriesName}：<b>${p.value != null ? `${p.value.toFixed(2)}%` : '-'}</b><br/>`;
              else h += `${p.marker} ${p.seriesName}：<b>${p.value.toLocaleString()} 人次</b><br/>`;
            });
            return h;
          }
        : (p) => `<b>${p[0].axisValue}</b><br/>${p[0].marker} 人次：<b>${p[0].value.toLocaleString()}</b>`,
    },
    legend: { top: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: '#5e6f82' } },
    grid: { left: 8, right: hasCompare ? 60 : 8, top: 35, bottom: 5, containLabel: true },
    xAxis: { type: 'category', data: months, axisLabel: { ...axisLabelStyle, fontSize: 9 } },
    yAxis, series,
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

// ====== 门诊/急诊/住院人次环形图 ======
function VisitOEIChart({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVisitOEI(filters)
      .then((d) => setData(d.map((r) => ({ name: r.type, value: Number(r.visits) }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  const total = data.reduce((s, r) => s + r.value, 0);
  const colors = ['#6366f1', '#f59e0b', '#0ea5e9'];
  const fmt = (v) => (v >= 10000 ? `${(v / 10000).toFixed(2)}万` : v);

  const option = {
    tooltip: { trigger: 'item', formatter: (p) => `${p.name}<br/>人次：<b>${p.value.toLocaleString()}</b>（${p.percent}%）` },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 10, color: '#5e6f82' } },
    series: [{
      type: 'pie', radius: ['55%', '78%'], center: ['50%', '45%'],
      avoidLabelOverlap: false, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      color: colors, label: { show: true, position: 'outside', fontSize: 10, color: '#5e6f82', formatter: (p) => `${p.name}\n${p.percent}%` },
      data,
    }],
    graphic: [{
      type: 'text', left: 'center', top: '38%',
      style: { text: `门诊·急诊·住院\n${fmt(total)}`, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#1a2332', lineHeight: 18 },
    }],
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

// ====== 手术级别分布 ======
function VisitOpsLevelChart({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVisitOpsLevel(filters)
      .then((d) => setData(d.map((r) => ({ name: r.name, value: Number(r.visits) }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  const colors = ['#d97706', '#be123c', '#7c3aed', '#2c5ea8'];

  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p) => `${p[0].name}<br/>例数：<b>${p[0].value}</b>` },
    grid: { left: 8, right: 30, top: 10, bottom: 5, containLabel: true },
    xAxis: { type: 'category', data: data.map((d) => d.name), axisLabel: { ...textStyle, fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { ...axisLabelStyle }, splitLine },
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({ name: d.name, value: d.value, itemStyle: { color: colors[i], borderRadius: [6, 6, 0, 0] } })),
      barMaxWidth: 50,
      label: { show: true, position: 'top', color: '#5e6f82', fontSize: 11, fontWeight: 500, formatter: (p) => String(p.value) },
    }],
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

// ====== 住院天数分布 ======
function VisitZyStayChart({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchVisitZyStay(filters)
      .then((d) => setData(d.map((r) => ({ name: r.name, value: Number(r.visits) }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  const total = data.reduce((s, r) => s + r.value, 0);
  const colors = ['#2c5ea8', '#0d9488', '#d97706', '#be123c'];

  const option = {
    tooltip: { trigger: 'item', formatter: (p) => `${p.name}<br/>人次：<b>${p.value.toLocaleString()}</b>（${p.percent}%）` },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 10, color: '#5e6f82' } },
    series: [{
      type: 'pie', radius: ['55%', '78%'], center: ['50%', '45%'],
      avoidLabelOverlap: false, itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      color: colors, label: { show: true, position: 'outside', fontSize: 10, color: '#5e6f82', formatter: (p) => `${p.name}\n${p.percent}%` },
      data,
    }],
    graphic: [{
      type: 'text', left: 'center', top: '38%',
      style: { text: `住院天数\n${total.toLocaleString()}人次`, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#1a2332', lineHeight: 18 },
    }],
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

export default function VisitChartSection({ filters }) {
  return (
    <div className="charts-grid animate-in stagger-2">
      <ChartCard title="📊 科室人次排名 TOP15"><VisitDeptRankingChart filters={filters} /></ChartCard>
      <ChartCard title="📈 月度人次趋势"><VisitTrendChart filters={filters} /></ChartCard>
      <ChartCard title="🍩 门诊·急诊·住院人次构成"><VisitOEIChart filters={filters} /></ChartCard>
      <ChartCard title="🔪 手术级别分布"><VisitOpsLevelChart filters={filters} /></ChartCard>
      <ChartCard title="🏥 住院天数分布"><VisitZyStayChart filters={filters} /></ChartCard>
    </div>
  );
}
