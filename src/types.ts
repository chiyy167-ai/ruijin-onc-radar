/** 疾病分类键（与 classifier.py 保持一致） */
export type DiseaseKey =
  | 'gastric'
  | 'colorectal'
  | 'esophageal'
  | 'pancreatic'
  | 'hepatic'
  | 'gist'
  | 'other_gi'

/** 研究类型键 */
export type StudyTypeKey =
  | 'clinical_trial'
  | 'drug_therapy'
  | 'immunotherapy'
  | 'biomarker'
  | 'diagnosis'
  | 'surgery'
  | 'basic_research'
  | 'review'
  | 'guideline'
  | 'other'

export interface Categories {
  disease: string[]
  studyType: string[]
}

export interface Paper {
  pmid: string
  title: string
  journal: string
  abstract: string
  date: string
  pubmedUrl: string
  meshTerms?: string[]
  pubTypes?: string[]
  categories: Categories
}

export interface Trial {
  nctId: string
  title: string
  status: string
  phase: string
  url: string
  category: string
}

export interface RadarData {
  updatedAt: string
  papers: Paper[]
  trials: Trial[]
}

/** 疾病筛选选项（前端显示） */
export const DISEASE_OPTIONS: { key: string | null; label: string }[] = [
  { key: null, label: '全部' },
  { key: 'gastric', label: '胃癌' },
  { key: 'colorectal', label: '结直肠癌' },
  { key: 'esophageal', label: '食管癌' },
  { key: 'pancreatic', label: '胰腺癌' },
  { key: 'hepatic', label: '肝癌' },
  { key: 'gist', label: 'GIST' },
  { key: 'other_gi', label: '其他' },
]

/** 研究类型筛选选项 */
export const STUDY_TYPE_OPTIONS: { key: string | null; label: string }[] = [
  { key: null, label: '全部' },
  { key: 'clinical_trial', label: '临床试验' },
  { key: 'drug_therapy', label: '药物治疗' },
  { key: 'immunotherapy', label: '免疫治疗' },
  { key: 'biomarker', label: '生物标志物' },
  { key: 'diagnosis', label: '诊断/影像' },
  { key: 'surgery', label: '手术' },
  { key: 'basic_research', label: '基础研究' },
  { key: 'review', label: '综述/Meta' },
  { key: 'guideline', label: '指南/共识' },
]

/** 分类键 → 中文标签 */
export const DISEASE_LABELS: Record<string, string> = {
  gastric: '胃癌',
  colorectal: '结直肠癌',
  esophageal: '食管癌',
  pancreatic: '胰腺癌',
  hepatic: '肝癌',
  gist: '胃肠间质瘤',
  other_gi: '其他消化道肿瘤',
}

export const STUDY_TYPE_LABELS: Record<string, string> = {
  clinical_trial: '临床试验',
  drug_therapy: '药物治疗',
  immunotherapy: '免疫治疗',
  biomarker: '生物标志物',
  diagnosis: '诊断/影像',
  surgery: '手术',
  basic_research: '基础研究',
  review: '综述/Meta',
  guideline: '指南/共识',
  other: '其他研究',
}
