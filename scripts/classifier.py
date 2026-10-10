# -*- coding: utf-8 -*-
"""
瑞金肿瘤内科科研雷达 — 规则分类器

纯规则匹配，不依赖外部 API，零成本、可离线运行。
医生后续可直接在本文件增删 DISEASE_RULES / STUDY_TYPE_RULES 中的关键词。

分类策略简述：
- 疾病：优先 MeSH 词（专业标引，准确度最高），其次标题+摘要关键词；
  均未命中则归入 other_gi（其他消化道肿瘤）。
- 研究类型：PublicationType + 关键词均可命中，多标签；均未命中则 other。
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# 疾病分类规则（英文键；中文显示名在前端 types.ts 映射）
# ---------------------------------------------------------------------------
DISEASE_RULES: dict[str, dict[str, Any]] = {
    "gastric": {
        "mesh": ["Stomach Neoplasms"],
        "keywords": [
            "gastric cancer",
            "gastric carcinoma",
            "stomach cancer",
            "gastric adenocarcinoma",
        ],
        "label": "胃癌",
    },
    "colorectal": {
        "mesh": [
            "Colorectal Neoplasms",
            "Colonic Neoplasms",
            "Rectal Neoplasms",
        ],
        "keywords": [
            "colorectal cancer",
            "colon cancer",
            "rectal cancer",
            "crc",
            "colorectal carcinoma",
        ],
        "label": "结直肠癌",
    },
    "esophageal": {
        "mesh": ["Esophageal Neoplasms"],
        "keywords": [
            "esophageal cancer",
            "esophageal carcinoma",
            "oesophageal cancer",
            "esophagus cancer",
        ],
        "label": "食管癌",
    },
    "pancreatic": {
        "mesh": ["Pancreatic Neoplasms"],
        "keywords": [
            "pancreatic cancer",
            "pancreatic ductal adenocarcinoma",
            "pdac",
            "pancreatic carcinoma",
        ],
        "label": "胰腺癌",
    },
    "hepatic": {
        "mesh": ["Liver Neoplasms", "Carcinoma, Hepatocellular"],
        "keywords": [
            "hepatocellular carcinoma",
            "hcc",
            "liver cancer",
            "hepatic cancer",
        ],
        "label": "肝癌",
    },
    "gist": {
        "mesh": ["Gastrointestinal Stromal Tumors"],
        "keywords": [
            "gist",
            "gastrointestinal stromal tumor",
            "gastrointestinal stromal tumour",
        ],
        "label": "胃肠间质瘤",
    },
}

# ---------------------------------------------------------------------------
# 研究类型分类规则（多标签）
# ---------------------------------------------------------------------------
STUDY_TYPE_RULES: dict[str, dict[str, Any]] = {
    "clinical_trial": {
        "pubTypes": ["Clinical Trial", "Randomized Controlled Trial"],
        "keywords": [
            "phase i",
            "phase ii",
            "phase iii",
            "phase 1",
            "phase 2",
            "phase 3",
            "randomized",
            "double-blind",
            "double blind",
        ],
        "label": "临床试验",
    },
    "drug_therapy": {
        "keywords": [
            "chemotherapy",
            "targeted therapy",
            "adc",
            "antibody-drug conjugate",
            "tyrosine kinase inhibitor",
            "tki",
            "monoclonal antibody",
        ],
        "label": "药物治疗",
    },
    "immunotherapy": {
        "keywords": [
            "immunotherapy",
            "immune checkpoint",
            "pd-1",
            "pd-l1",
            "ctla-4",
            "car-t",
            "pembrolizumab",
            "nivolumab",
        ],
        "label": "免疫治疗",
    },
    "biomarker": {
        "keywords": [
            "biomarker",
            "msi",
            "dmmr",
            "her2",
            "kras",
            "ctdna",
            "mutation",
        ],
        "label": "生物标志物",
    },
    "diagnosis": {
        "keywords": [
            "diagnosis",
            "imaging",
            "endoscopy",
            " ct ",
            "mri",
            "pet",
            "computed tomography",
        ],
        "label": "诊断/影像",
    },
    "surgery": {
        "keywords": [
            "surgery",
            "resection",
            "laparoscopic",
            "gastrectomy",
            "colectomy",
            "neoadjuvant",
        ],
        "label": "手术",
    },
    "basic_research": {
        "keywords": [
            "in vitro",
            "in vivo",
            "mice",
            "cell line",
            "pathway",
            "mechanism",
            "organoid",
        ],
        "label": "基础研究",
    },
    "review": {
        "pubTypes": ["Review", "Systematic Review", "Meta-Analysis"],
        "keywords": ["meta-analysis", "systematic review"],
        "label": "综述/Meta",
    },
    "guideline": {
        "pubTypes": ["Guideline", "Practice Guideline"],
        "keywords": ["guideline", "consensus", "recommendation"],
        "label": "指南/共识",
    },
}

# 临床试验按疾病部位粗分（用于 ClinicalTrials.gov 条目）
TRIAL_DISEASE_KEYWORDS: dict[str, list[str]] = {
    "gastric": ["gastric", "stomach"],
    "colorectal": ["colorectal", "colon", "rectal", "crc"],
    "esophageal": ["esophageal", "oesophageal", "esophagus"],
    "pancreatic": ["pancreatic", "pancreas", "pdac"],
    "hepatic": ["hepatocellular", "hcc", "liver cancer", "hepatic"],
    "gist": ["gist", "gastrointestinal stromal"],
}


def _norm(text: str) -> str:
    """统一小写，便于关键词匹配。"""
    return (text or "").lower()


def _mesh_hit(mesh_terms: list[str], targets: list[str]) -> bool:
    """MeSH 精确匹配（不区分大小写）。"""
    mesh_lower = {_norm(m) for m in mesh_terms}
    return any(_norm(t) in mesh_lower for t in targets)


def _keyword_hit(haystack: str, keywords: list[str]) -> bool:
    """关键词子串匹配（haystack 已小写）。"""
    return any(kw.lower() in haystack for kw in keywords)


def _pubtype_hit(pub_types: list[str], targets: list[str]) -> bool:
    """PublicationType 子串/精确匹配（不区分大小写）。"""
    pubs_lower = [_norm(p) for p in pub_types]
    for t in targets:
        tl = t.lower()
        if any(tl == p or tl in p for p in pubs_lower):
            return True
    return False


def classify_paper(paper: dict) -> dict:
    """
    对单篇论文做规则分类。

    返回 {"disease": [...], "studyType": [...]}
    - 疾病：可多标签；均未命中 → ["other_gi"]
    - 研究类型：可多标签；均未命中 → ["other"]
    """
    mesh_terms = list(paper.get("meshTerms") or [])
    pub_types = list(paper.get("pubTypes") or [])
    title = paper.get("title") or ""
    abstract = paper.get("abstract") or ""
    text = _norm(f"{title} {abstract}")

    # ---- 疾病维度：MeSH 优先，关键词兜底 ----
    diseases: list[str] = []
    for key, rule in DISEASE_RULES.items():
        mesh_ok = _mesh_hit(mesh_terms, rule.get("mesh") or [])
        kw_ok = _keyword_hit(text, rule.get("keywords") or [])
        if mesh_ok or kw_ok:
            diseases.append(key)
    if not diseases:
        diseases = ["other_gi"]

    # ---- 研究类型维度：pubType + 关键词，全部命中都保留 ----
    study_types: list[str] = []
    for key, rule in STUDY_TYPE_RULES.items():
        pt_ok = _pubtype_hit(pub_types, rule.get("pubTypes") or [])
        kw_ok = _keyword_hit(text, rule.get("keywords") or [])
        if pt_ok or kw_ok:
            study_types.append(key)
    if not study_types:
        study_types = ["other"]

    return {"disease": diseases, "studyType": study_types}


def classify_trial_category(title: str) -> str:
    """根据试验标题推断疾病部位类别。"""
    t = _norm(title)
    for key, kws in TRIAL_DISEASE_KEYWORDS.items():
        if any(kw in t for kw in kws):
            return key
    return "other_gi"


# 便于本地快速自测：python scripts/classifier.py
if __name__ == "__main__":
    demo = {
        "title": "Pembrolizumab for advanced gastric cancer with MSI-H",
        "abstract": "Phase III randomized trial of immunotherapy in gastric carcinoma.",
        "meshTerms": ["Stomach Neoplasms", "Immunotherapy"],
        "pubTypes": ["Randomized Controlled Trial"],
    }
    print(classify_paper(demo))
