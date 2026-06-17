import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// ====== 收入看板 ======
export async function fetchSummary(params) {
  const { data } = await api.get('/income/summary', { params });
  return { current: data.data, previous: data.previous };
}

export async function fetchDeptRanking(params) {
  const { data } = await api.get('/income/dept-ranking', { params });
  return data.data;
}

export async function fetchIncomeTrend(params) {
  const { data } = await api.get('/income/trend', { params });
  return data.data;
}

export async function fetchIncomeComposition(params) {
  const { data } = await api.get('/income/composition', { params });
  return { items: data.data, total: data.total };
}

// 门诊/急诊/住院 环形图（替代原来的 outpatient-inpatient + outpatient-emergency-inpatient）
export async function fetchOutpatientEmergencyInpatient(params) {
  const { data } = await api.get('/income/oei', { params });
  return data.data;
}

// 科室明细（分页）
export async function fetchDeptDetail(params) {
  const { data } = await api.get('/income/dept-detail', { params });
  return data.data;
}

// 科室列表（扁平）
export async function fetchDeptTree() {
  const { data } = await api.get('/dept-list');
  return data.data;
}

export async function fetchLatestDate() {
  const { data } = await api.get('/latest-date');
  return data.data;
}

// ====== 人次看板 ======
export async function fetchVisitSummary(params) {
  const { data } = await api.get('/visit/summary', { params });
  return { current: data.data, previous: data.previous };
}

export async function fetchVisitDeptRanking(params) {
  const { data } = await api.get('/visit/dept-ranking', { params });
  return data.data;
}

export async function fetchVisitTrend(params) {
  const { data } = await api.get('/visit/trend', { params });
  return data.data;
}

export async function fetchVisitOEI(params) {
  const { data } = await api.get('/visit/oei', { params });
  return data.data;
}

export async function fetchVisitOpsLevel(params) {
  const { data } = await api.get('/visit/ops-level', { params });
  return data.data;
}

export async function fetchVisitZyStay(params) {
  const { data } = await api.get('/visit/zy-stay', { params });
  return data.data;
}

export async function fetchVisitDeptDetail(params) {
  const { data } = await api.get('/visit/dept-detail', { params });
  return data.data;
}

// ====== 共享 ======
export async function fetchFilterOptions() {
  const { data } = await api.get('/filter-options');
  return data.data;
}
