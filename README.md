# Easy Mix Modeling (MMM) 📊

Plataforma Enterprise de **Marketing Mix Modeling (MMM)** e otimização bayesiana de orçamentos de mídia baseada no **Google Meridian**. A IA generativa é opcional e nunca participa dos cálculos.

---

## 🚀 Principais Recursos

- **Econometria Bayesiana Avançada**: Calibração com transformações de Adstock Geométrico e Curvas de Saturação de Hill.
- **Decomposição de Vendas**: Separação precisa entre baseline orgânico, fatores macroeconômicos e contribuição incremental de canais pagos.
- **Otimizador de Orçamento**: Alocação ótima de verba baseada no Teorema da Equimarginalidade e ROI Marginal (mROI).
- **Simulador de Cenários What-If**: Previsão de receita e impacto em tempo real ao redistribuir orçamentos entre canais.
- **Diagnóstico de Prontidão (Data Readiness)**: Análise de qualidade de dados (0 a 100), detecção de outliers e autocorreção.
- **Insights determinísticos**: Diagnósticos e recomendações auditáveis por regras versionadas.
- **Narrativa opcional com Gemini**: Melhoria textual apenas sob solicitação explícita, sem recalcular métricas.
- **Biblioteca de Benchmarks**: Priors e intervalos para mais de 70 canais de mídia online e offline.
- **Exportação de Relatórios**: Relatórios executivos formatados e exportáveis.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons, Recharts
- **Backend / API**: Express 4, Node.js, tsx, esbuild
- **Modelagem & Estatística**: Google Meridian em serviço Python, com posterior e Analyzer oficiais
- **IA Generativa**: Google Gen AI SDK (`@google/genai`)

---

## 📦 Como Instalar e Rodar Localmente

### 1. Clonar o repositório
```bash
git clone https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
cd easy-mix-modeling
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` a partir do modelo:
```bash
cp .env.example .env
```
O produto funciona integralmente com `AI_MODE=off`. Para habilitar apenas o botão explícito de melhoria narrativa:
```env
AI_MODE=on_demand
GEMINI_API_KEY=sua_chave_gemini_aqui
```

### 4. Executar em modo de desenvolvimento
```bash
npm run dev
```
Acesse a aplicação em `http://localhost:3000`.

### 5. Executar os testes
```bash
npm test
```

### 6. Gerar build de produção
```bash
npm run build
npm start
```

---

## 📄 Licença

Distribuído sob licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.
