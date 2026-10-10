# -*- coding: utf-8 -*-
"""
瑞金肿瘤内科科研雷达 — 数据抓取脚本

数据源：
1. PubMed（NCBI E-utilities：esearch + efetch）
2. ClinicalTrials.gov API v2

输出：public/data.json（供前端静态读取）
运行：python scripts/fetch.py
依赖：pip install -r requirements.txt
"""

from __future__ import annotations

import json
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

# 保证可从 scripts/ 目录导入 classifier
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from classifier import classify_paper, classify_trial_category  # noqa: E402

ROOT = SCRIPT_DIR.parent
OUTPUT_PATH = ROOT / "public" / "data.json"

# NCBI 建议带上工具标识；无 API Key 时请控制请求频率
NCBI_TOOL = "ruijin-onc-radar"
NCBI_EMAIL = "ruijin-onc-radar@example.com"
HEADERS = {
    "User-Agent": f"{NCBI_TOOL}/1.0 ({NCBI_EMAIL})",
    "Accept": "*/*",
}
SESSION = requests.Session()
SESSION.headers.update(HEADERS)

# 胃肠癌症 + 高质量文章类型；过去 30 天；最多 100 篇（供前端默认近 30 天筛选）
PUBMED_QUERY = (
    "("
    '"Stomach Neoplasms"[Mesh] OR "Colorectal Neoplasms"[Mesh] OR '
    '"Esophageal Neoplasms"[Mesh] OR "Pancreatic Neoplasms"[Mesh] OR '
    '"Liver Neoplasms"[Mesh] OR "Gastrointestinal Stromal Tumors"[Mesh] OR '
    "gastric cancer[Title/Abstract] OR colorectal cancer[Title/Abstract] OR "
    "esophageal cancer[Title/Abstract] OR pancreatic cancer[Title/Abstract] OR "
    "hepatocellular carcinoma[Title/Abstract] OR GIST[Title/Abstract]"
    ") AND ("
    '"Clinical Trial"[Publication Type] OR "Randomized Controlled Trial"[Publication Type] OR '
    '"Meta-Analysis"[Publication Type] OR "Systematic Review"[Publication Type] OR '
    '"Guideline"[Publication Type] OR "Practice Guideline"[Publication Type] OR '
    '"Review"[Publication Type] OR '
    "immunotherapy[Title/Abstract] OR chemotherapy[Title/Abstract] OR "
    "targeted therapy[Title/Abstract] OR biomarker[Title/Abstract]"
    ")"
)

PUBMED_MAX = 100
PUBMED_DAYS = 30

# ClinicalTrials.gov 检索条件
TRIAL_QUERIES = [
    {"term": "gastric cancer", "category": "gastric"},
    {"term": "colorectal cancer", "category": "colorectal"},
    {"term": "esophageal cancer", "category": "esophageal"},
    {"term": "pancreatic cancer", "category": "pancreatic"},
    {"term": "hepatocellular carcinoma", "category": "hepatic"},
    {"term": "gastrointestinal stromal tumor", "category": "gist"},
]
TRIAL_MAX_PER_QUERY = 5


def http_get(url: str, params: dict | None = None, timeout: int = 45) -> requests.Response:
    """带重试的 GET。"""
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            resp = SESSION.get(url, params=params, timeout=timeout)
            resp.raise_for_status()
            return resp
        except requests.RequestException as e:
            last_err = e
            time.sleep(1.2 * (attempt + 1))
    raise RuntimeError(f"请求失败: {url} ({last_err})")


def pubmed_esearch(query: str, mindate: str, maxdate: str, retmax: int) -> list[str]:
    """ESearch：按日期范围检索 PMID 列表。"""
    params = {
        "db": "pubmed",
        "term": query,
        "retmax": str(retmax),
        "retmode": "json",
        "datetype": "edat",
        "mindate": mindate,
        "maxdate": maxdate,
        "sort": "date",
        "tool": NCBI_TOOL,
        "email": NCBI_EMAIL,
    }
    data = http_get(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi",
        params=params,
    ).json()
    return list(data.get("esearchresult", {}).get("idlist", []))


def pubmed_efetch(pmids: list[str]) -> str:
    """EFetch：批量拉取 XML（含 MeSH / PublicationType）。"""
    params = {
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "xml",
        "tool": NCBI_TOOL,
        "email": NCBI_EMAIL,
    }
    return http_get(
        "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
        params=params,
    ).text


def _text(el: ET.Element | None) -> str:
    if el is None:
        return ""
    return "".join(el.itertext()).strip()


def _parse_pub_date(article: ET.Element) -> str:
    """尽量解析为 YYYY-MM-DD；缺日则补 01。"""
    for path in (
        "./MedlineCitation/Article/Journal/JournalIssue/PubDate",
        "./MedlineCitation/Article/ArticleDate",
    ):
        node = article.find(path)
        if node is None:
            continue
        year = _text(node.find("Year"))
        month = _text(node.find("Month")) or "01"
        day = _text(node.find("Day")) or "01"
        if year:
            month_map = {
                "jan": "01",
                "feb": "02",
                "mar": "03",
                "apr": "04",
                "may": "05",
                "jun": "06",
                "jul": "07",
                "aug": "08",
                "sep": "09",
                "oct": "10",
                "nov": "11",
                "dec": "12",
            }
            m = month_map.get(month.lower()[:3], month.zfill(2) if month.isdigit() else "01")
            d = day.zfill(2) if day.isdigit() else "01"
            return f"{year}-{m}-{d}"
        medline = _text(node.find("MedlineDate"))
        if medline:
            m = re.search(r"(\d{4})", medline)
            if m:
                return f"{m.group(1)}-01-01"
    return ""


def parse_pubmed_xml(xml_text: str) -> list[dict]:
    """从 PubMed XML 提取论文字段，并调用分类器写入 categories。"""
    root = ET.fromstring(xml_text)
    papers: list[dict] = []

    for article in root.findall(".//PubmedArticle"):
        pmid = _text(article.find("./MedlineCitation/PMID"))
        title = _text(article.find("./MedlineCitation/Article/ArticleTitle"))
        journal = _text(
            article.find("./MedlineCitation/Article/Journal/Title")
        ) or _text(
            article.find("./MedlineCitation/Article/Journal/ISOAbbreviation")
        )

        abstract_parts = [
            _text(n)
            for n in article.findall("./MedlineCitation/Article/Abstract/AbstractText")
        ]
        abstract = " ".join(p for p in abstract_parts if p)

        mesh_terms = [
            _text(n)
            for n in article.findall(
                "./MedlineCitation/MeshHeadingList/MeshHeading/DescriptorName"
            )
            if _text(n)
        ]

        pub_types = [
            _text(n)
            for n in article.findall(
                "./MedlineCitation/Article/PublicationTypeList/PublicationType"
            )
            if _text(n)
        ]

        date = _parse_pub_date(article)
        paper: dict[str, Any] = {
            "pmid": pmid,
            "title": title,
            "journal": journal,
            "abstract": abstract,
            "date": date,
            "pubmedUrl": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/" if pmid else "",
            "meshTerms": mesh_terms,
            "pubTypes": pub_types,
        }
        # 集成分类器：写入 disease / studyType 标签
        paper["categories"] = classify_paper(paper)
        papers.append(paper)

    return papers


def fetch_pubmed_papers() -> list[dict]:
    """抓取过去 N 天、最多 PUBMED_MAX 篇文献并分类。"""
    today = datetime.now(timezone.utc).date()
    mindate = (today - timedelta(days=PUBMED_DAYS)).strftime("%Y/%m/%d")
    maxdate = today.strftime("%Y/%m/%d")

    print(f"[PubMed] 检索 {mindate} ~ {maxdate}，最多 {PUBMED_MAX} 篇…")
    try:
        pmids = pubmed_esearch(PUBMED_QUERY, mindate, maxdate, PUBMED_MAX)
    except Exception as e:
        print(f"[PubMed] esearch 失败: {e}")
        return []

    if not pmids:
        print("[PubMed] 未检索到结果")
        return []

    print(f"[PubMed] 命中 {len(pmids)} 篇，拉取详情…")
    time.sleep(0.4)  # 礼貌限速
    try:
        xml_text = pubmed_efetch(pmids)
        papers = parse_pubmed_xml(xml_text)
        print(f"[PubMed] 解析完成 {len(papers)} 篇")
        return papers
    except Exception as e:
        print(f"[PubMed] efetch/解析失败: {e}")
        return []


def fetch_trials() -> list[dict]:
    """从 ClinicalTrials.gov 抓取近期相关试验，并标记疾病部位 category。"""
    trials: list[dict] = []
    seen: set[str] = set()

    for q in TRIAL_QUERIES:
        term = q["term"]
        category = q["category"]
        params = {
            "query.term": term,
            "filter.overallStatus": "RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING",
            "pageSize": str(TRIAL_MAX_PER_QUERY),
            "countTotal": "false",
            "sort": "@relevance",
        }
        print(f"[CT.gov] {term} …")
        try:
            data = http_get(
                "https://clinicaltrials.gov/api/v2/studies",
                params=params,
            ).json()
        except Exception as e:
            print(f"[CT.gov] 失败 ({term}): {e}")
            continue

        for study in data.get("studies") or []:
            proto = study.get("protocolSection") or {}
            ident = proto.get("identificationModule") or {}
            status_mod = proto.get("statusModule") or {}
            design = proto.get("designModule") or {}

            nct = ident.get("nctId") or ""
            if not nct or nct in seen:
                continue
            seen.add(nct)

            title = ident.get("officialTitle") or ident.get("briefTitle") or ""
            status = status_mod.get("overallStatus") or ""
            phases = design.get("phases") or []
            phase = ", ".join(phases) if phases else "NA"

            inferred = classify_trial_category(title)
            final_cat = inferred if inferred != "other_gi" else category

            trials.append(
                {
                    "nctId": nct,
                    "title": title,
                    "status": status,
                    "phase": phase,
                    "url": f"https://clinicaltrials.gov/study/{nct}",
                    "category": final_cat,
                }
            )
        time.sleep(0.35)

    print(f"[CT.gov] 合计 {len(trials)} 条")
    return trials


def load_fallback() -> dict:
    """网络失败时尽量保留已有 data.json，避免覆盖为空。"""
    if OUTPUT_PATH.exists():
        try:
            return json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return {"updatedAt": "", "papers": [], "trials": []}


def main() -> int:
    print("=== RJ-Onc Radar 数据抓取 ===")
    papers = fetch_pubmed_papers()
    trials = fetch_trials()

    fallback = load_fallback()
    if not papers and fallback.get("papers"):
        print("[警告] PubMed 无新数据，沿用旧 papers")
        papers = fallback["papers"]
    if not trials and fallback.get("trials"):
        print("[警告] ClinicalTrials 无新数据，沿用旧 trials")
        trials = fallback["trials"]

    for p in papers:
        if "categories" not in p:
            p["categories"] = classify_paper(p)

    updated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    payload = {
        "updatedAt": updated_at,
        "papers": papers,
        "trials": trials,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"[完成] 写入 {OUTPUT_PATH}")
    print(f"  papers={len(papers)}  trials={len(trials)}  updatedAt={updated_at}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
