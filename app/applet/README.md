# Easy Mix Modeling (MMM) 📊

Plataforma Enterprise de **Marketing Mix Modeling (MMM)** orientada a decisão utilizando **Google Meridian** como motor econométrico e integrada com **Gemini AI**.

---

## 🚀 Arquitetura e Modelagem

- **Motor Econométrico Real (Google Meridian)**: Todo o processamento estatístico foi migrado do antigo motor TS baseado em heurísticas para um serviço Python dedicado rodando Google Meridian (com fallback OLS dinâmico quando a biblioteca não está instalada no container). 
- **Econometria Bayesiana Avançada**: Calibração com transformações de Adstock Geométrico e Curvas de Saturação de Hill utilizando amostragem verdadeira. Sem estatísticas falsas ou heurísticas hardcoded.
- **Integração Front-to-Back (React ↔ Node ↔ Python)**: A API Node/Express consome dados unificados do frontend e spawna um processo IPC para rodar o modelo no serviço Python, retornando resultados bayesianos reais.
- **Decomposição de Vendas Reconciliável**: Separação matematicamente exata entre baseline orgânico, fatores macroeconômicos e contribuição incremental (KPI observado = Baseline + Controles + Mídia + Residual).
- **Otimizador de Orçamento com Restrições**: Alocação de verba otimizada matematicamente via gradiente ascendente pelo ROI Marginal (mROI) derivado das curvas de saturação reais estimadas pelo modelo.
- **Simulador de Cenários What-If**: Previsão de receita avaliando a função de resposta empírica para qualquer arranjo orçamentário.
- **Diagnóstico de Prontidão (Data Readiness)**: Análise rigorosa de qualidade de dados (frequência, variância, outliers, missing data, colinearidade) capaz de bloquear o fitting do modelo preventivamente.
- **Consultor Estratégico com Gemini AI**: Geração de diagnósticos baseados nos intervalos estatísticos _reais_. O Gemini não inventa dados; ele consome o report validado e devolve contexto de negócios.
- **Conectores via API**: Interface base de extração e carregamento nativa via OAuth2 (ex: GA4, Google Ads, Meta).

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons, Recharts
- **Backend / API**: Express 4, Node.js, tsx, esbuild
- **Modelagem & Estatística (Python)**: `mmm-service` rodando `google-meridian` (com fallbacks para OLS)
- **IA Generativa**: Google Gen AI SDK (`@google/genai`)

---

## 📦 Como Instalar e Rodar Localmente

### 1. Requisitos do Sistema
- Node.js (v20+)
- Python 3.10+ com venv (`apt install python3-venv`)

### 2. Configurar Python Backend (Meridian Service)
```bash
python3 -m venv venv
source venv/bin/activate
pip install numpy pandas google-meridian
```

### 3. Instalar dependências Node
```bash
npm install
```

### 4. Configurar variáveis de ambiente
Crie um arquivo `.env` a partir do modelo:
```bash
cp .env.example .env
```
Adicione sua chave de API do Gemini para os insights:
```env
GEMINI_API_KEY=sua_chave_gemini_aqui
```

### 5. Executar em modo de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:3000`.

### 6. Executar build de produção
```bash
npm run build
npm start
```

---

## 📄 Licença
Distribuído sob licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.
