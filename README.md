# 瑞金肿瘤内科科研雷达

**Ruijin Oncology Research Radar（RJ-Onc Radar）**

面向瑞金医院肿瘤内科医生的移动端 PWA：自动收集胃肠癌症最新科研文献与临床试验，按疾病部位与研究类型分类组织，每日更新，零服务器成本（GitHub Pages + GitHub Actions）。

在线地址（部署后）：`https://<你的用户名>.github.io/ruijin-onc-radar/`

---

## 功能概览

- PubMed 文献抓取（近 7 天，最多 40 篇）+ MeSH / PublicationType 提取
- ClinicalTrials.gov 试验抓取，并标记疾病部位 `category`
- 纯规则分类器（`scripts/classifier.py`）：疾病 + 研究类型多标签
- 移动端优先筛选栏：疾病部位 × 研究类型实时过滤
- PWA：可添加到 iPhone / Android 主屏幕，离线可浏览上次缓存

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vite + React + TypeScript + TailwindCSS |
| PWA | vite-plugin-pwa（NetworkFirst 缓存 `data.json`） |
| 抓取 | Python 3.12 + requests |
| 定时 | GitHub Actions `schedule`（UTC 22:00） |
| 部署 | GitHub Pages |
| 数据 | 静态 `public/data.json` |

---

## 本地开发

```bash
# 1. 安装前端依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 生产构建预览
npm run build
npm run preview
```

开发时访问控制台给出的本地地址（base 为 `/ruijin-onc-radar/`）。

---

## 手动运行数据抓取

```bash
# 安装 Python 依赖
pip install -r requirements.txt

# 抓取 PubMed + ClinicalTrials，并写入 public/data.json
python scripts/fetch.py

# 可选：单独测试分类器
python scripts/classifier.py

# 可选：重新生成 PWA 图标
python scripts/generate_icons.py
```

> 抓取脚本在网络失败时会尽量保留已有 `data.json`，避免把线上数据清空。

---

## GitHub Pages 部署步骤

1. 在 GitHub 新建仓库，建议命名为 **`ruijin-onc-radar`**（与 `vite.config.ts` 中 `base: '/ruijin-onc-radar/'` 一致）。
2. 推送本项目到该仓库的 `main`（或 `master`）分支。
3. 仓库 **Settings → Pages**：
   - Source 选择 **GitHub Actions**
4. 推送后会自动运行 `.github/workflows/deploy.yml` 构建并部署。
5. 打开 `https://<用户名>.github.io/ruijin-onc-radar/` 验证。

定时抓取工作流 `.github/workflows/fetch-data.yml`：

- 每天 **UTC 22:00**（约北京时间次日 06:00）运行
- 也可在 Actions 页手动 **Run workflow**
- 更新 `public/data.json` 并 commit；若默认分支有变更，会再触发 deploy

---

## iPhone / Android 安装指南

### iPhone（Safari）

1. 用 Safari 打开站点
2. 点底部分享按钮 → **添加到主屏幕**
3. 名称可保留「瑞金肿瘤内科科研雷达」或「RJ-Onc Radar」
4. 主屏幕图标即可全屏打开（standalone）

### Android（Chrome）

1. 用 Chrome 打开站点
2. 菜单 → **安装应用** / **添加到主屏幕**
3. 确认安装后从桌面启动

数据采用 NetworkFirst：有网时优先拉最新 `data.json`，弱网/离线时回退缓存。

---

## 分类体系说明

分类在 `scripts/classifier.py` 中完成，**完全基于规则**，不调用外部 LLM，保证零成本与稳定性。

### 疾病部位（可多标签）

| 键 | 中文 | 主要依据 |
|----|------|----------|
| `gastric` | 胃癌 | MeSH `Stomach Neoplasms` / 关键词 |
| `colorectal` | 结直肠癌 | Colorectal / Colonic / Rectal Neoplasms |
| `esophageal` | 食管癌 | Esophageal Neoplasms |
| `pancreatic` | 胰腺癌 | Pancreatic Neoplasms / PDAC |
| `hepatic` | 肝癌 | Liver Neoplasms / HCC |
| `gist` | 胃肠间质瘤 | Gastrointestinal Stromal Tumors |
| `other_gi` | 其他消化道肿瘤 | 均未命中时的兜底 |

**优先级：MeSH 词 > 标题+摘要关键词。**  
例如「结直肠癌肝转移」可同时命中 `colorectal` 与 `hepatic`，前端任一筛选都能找到——这是预期行为。

### 研究类型（可多标签）

临床试验、药物治疗、免疫治疗、生物标志物、诊断/影像、手术、基础研究、综述/Meta、指南/共识；均未命中则为 `other`（其他研究）。

免疫治疗与药物治疗可能同时命中（免疫治疗常是药物治疗子集）。若希望互斥，可在分类器中于命中 `immunotherapy` 后跳过 `drug_therapy`。

### 如何自定义规则

编辑 `scripts/classifier.py` 中的字典即可，无需改前端逻辑（前端标签映射在 `src/types.ts`）：

```python
# 新增疾病示例
DISEASE_RULES["biliary"] = {
    "mesh": ["Biliary Tract Neoplasms"],
    "keywords": ["cholangiocarcinoma", "biliary tract cancer"],
    "label": "胆道肿瘤",
}
```

同步在 `src/types.ts` 的 `DISEASE_OPTIONS` / `DISEASE_LABELS` 增加显示名，筛选栏才会出现新选项。

研究类型同理修改 `STUDY_TYPE_RULES` 与 `STUDY_TYPE_OPTIONS`。

---

## 项目结构

```text
ruijin-onc-radar/
├── .github/workflows/
│   ├── fetch-data.yml      # 每日抓取并提交 data.json
│   └── deploy.yml          # 构建并部署 GitHub Pages
├── public/
│   ├── data.json
│   └── icons/{icon-192.png, icon-512.png}
├── scripts/
│   ├── fetch.py            # PubMed + ClinicalTrials 抓取
│   ├── classifier.py       # 规则分类器（集中维护）
│   └── generate_icons.py
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── types.ts
│   └── components/
│       ├── FilterBar.tsx
│       └── PaperCard.tsx
├── index.html
├── package.json
├── vite.config.ts
└── requirements.txt
```

---

## 许可证与声明

本工具仅供科研文献追踪参考，不构成诊疗建议。数据来自 PubMed 与 ClinicalTrials.gov 公开接口，请遵守各数据源使用条款。
