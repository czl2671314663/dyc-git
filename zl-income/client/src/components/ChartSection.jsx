import { useEffect, useState } from 'react';
import { Spin, Empty } from 'antd';
import ReactECharts from 'echarts-for-react';
import {
  fetchDeptRanking, fetchIncomeTrend, fetchIncomeComposition,
  fetchOutpatientEmergencyInpatient,
} from '../api';

function ChartCard({ title, children }) {
  return (
    <div className="card animate-in">
      <div className="card-header"><span className="card-title">{title}</span></div>
      <div className="card-body" style={{ padding: '8px 12px' }}>{children}</div>
    </div>
  );
}

const textStyle = { fontSize: 11, color: '#5e6f82' };
const axisLabelStyle = { fontSize: 10, color: '#8392a5' };
const splitLine = { lineStyle: { color: '#e8ecf1', type: 'dashed' } };
const splitLineStyle = { lineStyle: { color: '#e8ecf1', type: 'dashed' } };

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

// ====== 科室收入排名（横向柱状图） ======
function DeptRankingChart({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchDeptRanking({ ...filters, limit: 15 })
      .then(d => setData(d.map(r => ({
        name: truncate(r.DEPT_NAME, 8),
        fullName: r.DEPT_NAME,
        income: Number(r.total_income) / 10000,
      })).reverse()))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: p => `${p[0].data.fullName || p[0].name}<br/>收入：<b>${p[0].value.toFixed(2)} 万元</b>`,
    },
    grid: { left: 8, right: 70, top: 5, bottom: 5, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { ...axisLabelStyle, formatter: v => `${v.toFixed(2)}万` },
      splitLine: splitLineStyle,
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name),
      axisLabel: { ...textStyle, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: data.map(d => ({ value: d.income, name: d.name, fullName: d.fullName })),
      itemStyle: { color: '#2c5ea8', borderRadius: [0, 4, 4, 0] },
      barMaxWidth: 16,
      label: { show: true, position: 'right', color: '#5e6f82', fontSize: 10, formatter: p => `${p.value.toFixed(2)}万` },
    }],
  };

  return <ReactECharts option={option} style={{ height: 280 }} notMerge />;
}

// ====== 月度收入趋势（支持收入类别联动） ======
function IncomeTrendChart({ filters, category }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const categoryMap = {
      '药品收入': 'INCOME_DRUG',
      '检查检验收入': 'INCOME_EXAM_TEST',
      '材料收入': 'INCOME_MATERIAL',
      '服务收入': 'INCOME_SERVICE',
      '床位收入': 'INCOME_BED',
      '护理收入': 'INCOME_NURSE',
      '其他收入': 'INCOME_OTHER',
    };
    const field = categoryMap[category] || 'INCOME_DEPT';
    fetchIncomeTrend({ year: filters.year, dept_code: filters.dept_code, catgroy: filters.catgroy, field })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters), category]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  // 只展示到筛选月份
  let filteredData = data;
  if (filters.year && filters.month) {
    filteredData = data.filter(r => parseInt(r.month || r.BIZ_MONTH || '13') <= parseInt(filters.month));
    if (!filteredData.length) return <Empty description="暂无该月份数据" />;
  }

  // 区分所有年份 vs 单年+同比
  const hasYoy = filteredData.length > 0 && filteredData[0].yoy !== undefined;

  const months = filteredData.map(r => `${r.month || r.BIZ_MONTH}月`);
  const currentData = filteredData.map(r => (r.current || r.income || 0) / 10000);
  const previousData = hasYoy ? filteredData.map(r => (r.previous || 0) / 10000) : [];
  const yoyData = hasYoy ? filteredData.map(r => r.yoy) : [];

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: hasYoy
        ? p => {
            const [cur, prev, yoy] = p;
            const y = yoy?.value != null ? (yoy.value > 0 ? `+${yoy.value}%` : `${yoy.value}%`) : '—';
            return `${cur.axisValue}<br/>当年：<b>${cur.value.toFixed(2)} 万元</b><br/>上年：<b>${prev?.value.toFixed(2) || 0} 万元</b><br/>同比：<b>${y}</b>`;
          }
        : p => `${p[0].axisValue}<br/>收入：<b>${p[0].value.toFixed(2)} 万元</b>`,
    },
    legend: hasYoy ? { data: ['当年', '上年', '同比'], bottom: 0, itemWidth: 12, itemHeight: 8, textStyle } : undefined,
    grid: { left: 8, right: hasYoy ? 50 : 8, top: 10, bottom: hasYoy ? 30 : 5 },
    xAxis: { type: 'category', data: months, axisLabel: { ...textStyle }, axisTick: { alignWithLabel: true } },
    yAxis: [
      { type: 'value', axisLabel: { ...axisLabelStyle, formatter: v => `${v.toFixed(0)}万` }, splitLine },
      hasYoy ? { type: 'value', axisLabel: { ...axisLabelStyle, formatter: v => `${v}%` }, splitLine: { show: false } } : undefined,
    ].filter(Boolean),
    series: [
      {
        name: '当年', type: 'bar', data: currentData,
        itemStyle: { color: '#2c5ea8', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28,
        label: { show: true, position: 'top', fontSize: 9, color: '#2c5ea8', formatter: p => p.value > 10 ? p.value.toFixed(0) : '' },
      },
      hasYoy ? {
        name: '上年', type: 'bar', data: previousData,
        itemStyle: { color: '#cbd5e1', borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28,
      } : undefined,
      hasYoy ? {
        name: '同比', type: 'line', yAxisIndex: 1, data: yoyData,
        lineStyle: { color: '#ef4444', width: 2 }, symbol: 'circle', symbolSize: 6,
        itemStyle: { color: '#ef4444' },
        label: { show: true, position: 'top', fontSize: 9, color: '#ef4444', formatter: p => p.value != null ? `${p.value > 0 ? '+' : ''}${p.value}%` : '' },
      } : undefined,
    ].filter(Boolean),
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

// ====== 收入构成（可点击联动的饼图） ======
function IncomeCompositionChart({ filters, selectedCategory, onCategoryClick }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchIncomeComposition(filters)
      .then(d => {
        setData(d.items.map(r => ({ name: r.category, value: Number(r.amount) / 10000 })));
        setTotal(d.total / 10000);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;
  const colors = ['#2c5ea8', '#0ea5e9', '#7c3aed', '#f59e0b', '#059669', '#be123c', '#6366f1', '#d97706'];

  const option = {
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>收入：<b>${p.value.toFixed(2)} 万元</b>（${p.percent}%）` },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 10, color: '#5e6f82' } },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 4, borderColor: '#fff', borderWidth: 2,
        emphasis: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.2)' },
      },
      color: colors,
      label: { show: true, position: 'outside', fontSize: 10, color: '#5e6f82', formatter: p => `${p.name}\n${p.percent}%` },
      data: data.map(d => ({
        ...d,
        selected: selectedCategory === d.name,
        itemStyle: selectedCategory === d.name ? { shadowBlur: 10, shadowColor: 'rgba(44,94,168,0.4)' } : undefined,
      })),
      selectedMode: 'single',
      selectedOffset: 8,
    }],
    graphic: [{
      type: 'text', left: 'center', top: '38%',
      style: { text: `总收入\n${total.toFixed(0)}万`, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#1a2332', lineHeight: 18 },
    }],
  };

  return (
    <ReactECharts
      option={option}
      style={{ height: 260 }}
      notMerge
      onEvents={{
        click: (params) => {
          if (selectedCategory === params.name) {
            onCategoryClick(null);
          } else {
            onCategoryClick(params.name);
          }
        },
      }}
    />
  );
}

// ====== 门诊·急诊·住院 环形图 ======
function OEIChart({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOutpatientEmergencyInpatient(filters)
      .then(d => setData(d.map(r => ({ name: r.type || r.name, value: Number(r.total_income) / 10000, visits: Number(r.visit_count || 0) }))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  const total = data.reduce((s, r) => s + r.value, 0);
  const colors = ['#0ea5e9', '#f59e0b', '#7c3aed'];

  const option = {
    tooltip: { trigger: 'item', formatter: p => `${p.name}<br/>收入：<b>${p.value.toFixed(2)} 万元</b>（${p.percent}%）<br/>人次：<b>${p.data.visits?.toLocaleString() || 0}</b>` },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 10, color: '#5e6f82' } },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      color: colors,
      label: { show: true, position: 'outside', fontSize: 10, color: '#5e6f82', formatter: p => `${p.name}\n${p.percent}%` },
      data,
    }],
    graphic: [{
      type: 'text', left: 'center', top: '38%',
      style: { text: `门诊·急诊·住院\n${total.toFixed(2)}万`, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#1a2332', lineHeight: 18 },
    }],
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

// ====== 月度收入同比增长率 ======
function YoYGrowthChart({ filters }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchIncomeTrend({ ...filters, field: 'INCOME_DEPT' })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  // 仅在有同比数据时展示
  const hasYoy = data.length > 0 && data[0].yoy !== undefined;
  if (!hasYoy) return <Empty description="请选择具体年份查看同比增长率" />;

  const months = data.map(r => `${r.month}月`);
  const yoyValues = data.map(r => r.yoy);

  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: p => `${p[0].axisValue}<br/>同比增长率：<b>${p[0].value != null ? (p[0].value > 0 ? '+' : '') + p[0].value + '%' : '—'}</b>`,
    },
    grid: { left: 8, right: 40, top: 10, bottom: 5, containLabel: true },
    xAxis: {
      type: 'category', data: months,
      axisLabel: { ...textStyle },
    },
    yAxis: {
      type: 'value',
      axisLabel: { ...axisLabelStyle, formatter: v => `${v}%` },
      splitLine: splitLineStyle,
    },
    series: [{
      type: 'bar',
      data: yoyValues.map(v => ({
        value: v,
        itemStyle: {
          color: v >= 0 ? '#22c55e' : '#ef4444',
          borderRadius: [4, 4, 0, 0],
        },
      })),
      barMaxWidth: 32,
      label: {
        show: true,
        position: 'top',
        fontSize: 10,
        formatter: p => p.value != null ? `${p.value > 0 ? '+' : ''}${p.value}%` : '',
      },
    }],
    visualMap: false,
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

// ====== 收入类别金额排行 ======
function CategoryBarChart({ filters }) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchIncomeComposition(filters)
      .then(d => {
        const items = d.items
          .map(r => ({ name: r.category, value: Number(r.amount) / 10000 }))
          .sort((a, b) => b.value - a.value);
        setData(items);
        setTotal(d.total / 10000);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [JSON.stringify(filters)]);

  if (loading) return <Spin style={{ width: '100%', textAlign: 'center', padding: 30 }} />;
  if (!data.length) return <Empty description="暂无数据" />;

  const colors = ['#2c5ea8', '#0ea5e9', '#7c3aed', '#f59e0b', '#059669', '#be123c', '#6366f1', '#d97706'];

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: p => `${p[0].name}<br/>金额：<b>${p[0].value.toFixed(2)} 万元</b><br/>占比：<b>${((p[0].value / total) * 100).toFixed(1)}%</b>`,
    },
    grid: { left: 8, right: 70, top: 5, bottom: 5, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { ...axisLabelStyle, formatter: v => `${v.toFixed(0)}万` },
      splitLine: splitLineStyle,
    },
    yAxis: {
      type: 'category',
      data: data.map(d => d.name),
      inverse: true,
      axisLabel: { ...textStyle, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: data.map((d, i) => ({
        value: d.value,
        itemStyle: { color: colors[i % colors.length], borderRadius: [0, 4, 4, 0] },
      })),
      barMaxWidth: 18,
      label: {
        show: true, position: 'right', color: '#5e6f82', fontSize: 10,
        formatter: p => `${p.value.toFixed(1)}万`,
      },
    }],
  };

  return <ReactECharts option={option} style={{ height: 260 }} notMerge />;
}

// ====== 主图表区 ======
export default function ChartSection({ filters }) {
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="charts-grid animate-in stagger-2">
      <ChartCard title="🍩 收入构成分析（点击联动趋势）">
        <IncomeCompositionChart
          filters={filters}
          selectedCategory={selectedCategory}
          onCategoryClick={setSelectedCategory}
        />
      </ChartCard>

      <ChartCard title={selectedCategory ? `📈 ${selectedCategory}月度趋势（点击饼图取消）` : '📈 月度收入趋势'}>
        <IncomeTrendChart filters={filters} category={selectedCategory} />
      </ChartCard>

      <ChartCard title="📊 科室收入排名 TOP15">
        <DeptRankingChart filters={filters} />
      </ChartCard>

      <ChartCard title="🏥 门诊·急诊·住院 构成">
        <OEIChart filters={filters} />
      </ChartCard>

      <ChartCard title="📉 月度收入同比增长率">
        <YoYGrowthChart filters={filters} />
      </ChartCard>

      <ChartCard title="💰 各收入类别金额排行">
        <CategoryBarChart filters={filters} />
      </ChartCard>
    </div>
  );
}
