import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ProposalData, calculateProposal, formatCurrency } from '../lib/calculations';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { CurrencyInput } from '../components/ui/currency-input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { ArrowLeft, Save, Download, FileText, Building2, Car, Home, TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle, PiggyBank, Target, Zap, ShieldCheck, Landmark, AlertTriangle, Eye } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = [
  { id: 'imovel', label: 'Imóvel', icon: Home },
  { id: 'veiculo', label: 'Veículo', icon: Car },
  { id: 'construcao', label: 'Construção', icon: Building2 },
  { id: 'investimento', label: 'Investimento', icon: TrendingUp },
];

export default function ProposalEditor() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ProposalData>>({
    clientName: '',
    creditType: 'Aquisição',
    creditCategory: 'imovel',
    requestedValue: 200000,
    consultantName: '',
    emissionDate: new Date().toISOString().split('T')[0],
    adhesionValue: 4000,
    adminFeePercentage: 20,
    financingFactor: 0, // 0 means auto-calculate
    financingTerm: 0, // 0 means auto-calculate
    isManualFinancing: false,
    manualFinancingEntry: 0,
    manualFinancingInstallment: 0,
    manualFinancingTotal: 0,
    letterTerm: 180,
    letterInstallment: 0,
    observations: '',
    validity: 'Hoje',
    templateStyle: 'simulador',
    clientCpf: '',
    proposalCode: '',
    consultantPhone: '',
    urgencyBannerText: '*PRAZO DO PLANO 30 MINUTOS*',
  });

  useEffect(() => {
    if (id) {
      loadProposal(id);
    } else if (location.state?.duplicateFrom) {
      const { id: _, createdAt: __, ...rest } = location.state.duplicateFrom;
      setFormData({ ...rest, emissionDate: new Date().toISOString().split('T')[0] });
    } else {
      // Load local settings for default values when creating a new proposal
      try {
        const savedSettings = localStorage.getItem('valoriza_settings_global');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          const defaultAdhesionPct = typeof parsed.defaultAdhesion === 'number' ? parsed.defaultAdhesion : 2;
          const defaultTerm = typeof parsed.defaultLetterTerm === 'number' ? parsed.defaultLetterTerm : 180;
          setFormData(prev => ({
            ...prev,
            adhesionValue: (prev.requestedValue || 200000) * defaultAdhesionPct / 100,
            letterTerm: defaultTerm,
          }));
        }
      } catch (e) {
        console.error("Error loading default settings:", e);
      }
    }
  }, [id, location.state]);

  const loadProposal = async (proposalId: string) => {
    try {
      const proposalsRaw = localStorage.getItem('valoriza_proposals');
      const allProposals: ProposalData[] = proposalsRaw ? JSON.parse(proposalsRaw) : [];
      const found = allProposals.find(p => p.id === proposalId);
      if (found && found.uid === user?.uid) {
        setFormData(prev => ({
          ...prev,
          ...found
        }) as ProposalData);
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Error loading proposal:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const proposalsRaw = localStorage.getItem('valoriza_proposals');
      const allProposals: ProposalData[] = proposalsRaw ? JSON.parse(proposalsRaw) : [];

      const proposalData = {
        ...formData,
        uid: user.uid,
        updatedAt: new Date().toISOString(),
      } as ProposalData;

      if (id) {
        const updated = allProposals.map(p => {
          if (p.id === id) {
            return { ...p, ...proposalData };
          }
          return p;
        });
        localStorage.setItem('valoriza_proposals', JSON.stringify(updated));
      } else {
        const newId = Date.now().toString();
        const newProposal: ProposalData = {
          ...proposalData,
          id: newId,
          createdAt: new Date().toISOString(),
        };
        allProposals.push(newProposal);
        localStorage.setItem('valoriza_proposals', JSON.stringify(allProposals));
        navigate(`/proposal/edit/${newId}`, { replace: true });
      }
      alert('Proposta salva com sucesso!');
    } catch (error) {
      console.error("Error saving proposal:", error);
      alert('Erro ao salvar proposta.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleManualFinancing = () => {
    const currentResults = calculateProposal(formData);
    setFormData(prev => {
      if (!prev.isManualFinancing) {
        return {
          ...prev,
          isManualFinancing: true,
          manualFinancingEntry: currentResults.financingEntry,
          manualFinancingInstallment: currentResults.financingInstallment,
          manualFinancingTotal: currentResults.financingTotal,
        };
      } else {
        return {
          ...prev,
          isManualFinancing: false,
        };
      }
    });
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setGeneratingPdf(true);
    
    try {
      // Get the HTML content of the preview
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Proposta</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: 0 !important;
            }
            body { 
              font-family: 'Inter', sans-serif; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact; 
              margin: 0 !important;
              padding: 0 !important;
              background-color: #ffffff;
            }
            .premium-gradient { background: linear-gradient(135deg, #18181b 0%, #27272a 100%); }
            .gold-text { color: #fbbf24; }
          </style>
        </head>
        <body class="bg-white">
          <div style="width: 794px; height: 1123px; position: relative; overflow: hidden; box-sizing: border-box;">
            ${previewRef.current.innerHTML}
          </div>
        </body>
        </html>
      `;

      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlContent })
      });

      if (!response.ok) throw new Error('Failed to generate PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposta_${formData.clientName?.replace(/\s+/g, '_') || 'Credito'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert('Erro ao gerar PDF. Verifique se o servidor está rodando.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const results = calculateProposal(formData);

  const formatValueOnly = (val: number) => {
    return formatCurrency(val).replace('R$', '').trim();
  };

  const getCategoryLabel = (category?: string) => {
    switch (category) {
      case 'imovel': return 'IMOBILIÁRIO';
      case 'veiculo': return 'VEICULAR';
      case 'construcao': return 'DE CONSTRUÇÃO';
      case 'investimento': return 'DE INVESTIMENTO';
      default: return 'COMERCIAL';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold text-zinc-900 hidden sm:block">
              {id ? 'Editar Proposta' : 'Nova Proposta'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
            <Button variant="premium" onClick={handleDownloadPdf} disabled={generatingPdf}>
              <Download className="w-4 h-4 mr-2" />
              {generatingPdf ? 'Gerando...' : 'Baixar PDF'}
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Formulário */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-10">
          <Card>
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl select-none">
              <h2 className="font-semibold text-zinc-900 text-sm uppercase tracking-wider">Modelo do Estudo / PDF</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, templateStyle: 'estudo' }))}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${formData.templateStyle === 'estudo' ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
                >
                  Estudo Estratégico
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, templateStyle: 'simulador' }))}
                  className={`p-2.5 rounded-lg border text-xs font-bold transition-all ${formData.templateStyle === 'simulador' || !formData.templateStyle ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
                >
                  Tabela Simulador
                </button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl">
              <h2 className="font-semibold text-zinc-900 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-zinc-500" />
                Dados do Cliente
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientName">Nome do Cliente</Label>
                  <Input id="clientName" name="clientName" value={formData.clientName} onChange={handleChange} placeholder="Ex: João da Silva" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creditType">Tipo de Crédito</Label>
                  <Input id="creditType" name="creditType" value={formData.creditType} onChange={handleChange} placeholder="Ex: Aquisição" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientCpf">CPF / RG do Cliente</Label>
                  <Input 
                    id="clientCpf" 
                    name="clientCpf" 
                    value={formData.clientCpf || ''} 
                    onChange={(e) => {
                      const val = e.target.value;
                      const digits = val.replace(/\D/g, '');
                      let formatted = val;
                      if (digits.length <= 11) {
                        formatted = digits
                          .replace(/(\d{3})(\d)/, '$1.$2')
                          .replace(/(\d{3})(\d)/, '$1.$2')
                          .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                      } else {
                        formatted = digits
                          .slice(0, 14)
                          .replace(/^(\d{2})(\d)/, '$1.$2')
                          .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                          .replace(/\.(\d{3})(\d)/, '.$1/$2')
                          .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
                      }
                      setFormData(prev => ({
                        ...prev,
                        clientCpf: digits.length > 0 ? formatted : val
                      }));
                    }} 
                    placeholder="Ex: 000.000.000-00" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proposalCode">Código da Proposta / COD</Label>
                  <Input id="proposalCode" name="proposalCode" value={formData.proposalCode || ''} onChange={handleChange} placeholder="Ex: LN45673K" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requestedValue">Valor Pretendido (R$)</Label>
                  <CurrencyInput id="requestedValue" name="requestedValue" value={formData.requestedValue} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emissionDate">Data de Emissão</Label>
                  <Input id="emissionDate" name="emissionDate" type="date" value={formData.emissionDate} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    const isSelected = formData.creditCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setFormData(p => ({ ...p, creditCategory: cat.id }))}
                        className={`flex items-center justify-center gap-2 p-2 rounded-md border text-sm transition-colors ${isSelected ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'}`}
                      >
                        <Icon className="w-4 h-4" />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl">
              <h2 className="font-semibold text-zinc-900">Carta de Crédito</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adhesionValue">Adesão (R$)</Label>
                  <CurrencyInput id="adhesionValue" name="adhesionValue" value={formData.adhesionValue} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="letterInstallment">Parcela Planejada (R$)</Label>
                  <CurrencyInput 
                    id="letterInstallment" 
                    name="letterInstallment" 
                    value={formData.letterInstallment || 0} 
                    onChange={handleChange} 
                    placeholder={`Ex: ${results.letterInstallment.toFixed(2)}`}
                  />
                  <p className="text-[10px] text-zinc-500">O prazo será ajustado para {results.letterTerm} meses.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminFeePercentage">Taxa Administrativa Total (%)</Label>
                <Input id="adminFeePercentage" name="adminFeePercentage" type="number" step="0.1" value={formData.adminFeePercentage} onChange={handleChange} onWheel={(e) => (e.target as HTMLElement).blur()} />
                <p className="text-[10px] text-zinc-500">Ex: 20% significa que o custo final será Crédito + 20%</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center">
              <h2 className="font-semibold text-zinc-900">Financiamento</h2>
              <label className="flex items-center gap-2 text-sm text-zinc-600 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={formData.isManualFinancing} 
                  onChange={handleToggleManualFinancing}
                  className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                />
                Edição Manual
              </label>
            </div>
            <div className="p-4 space-y-4">
              {!formData.isManualFinancing ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="financingFactor">Fator Multiplicador</Label>
                    <Input id="financingFactor" name="financingFactor" type="number" step="0.01" value={formData.financingFactor} onChange={handleChange} placeholder="Auto" onWheel={(e) => (e.target as HTMLElement).blur()} />
                    <p className="text-[10px] text-zinc-500">0 = Automático</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="financingTerm">Prazo (meses)</Label>
                    <Input id="financingTerm" name="financingTerm" type="number" value={formData.financingTerm} onChange={handleChange} placeholder="Auto" onWheel={(e) => (e.target as HTMLElement).blur()} />
                    <p className="text-[10px] text-zinc-500">0 = Automático</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualFinancingEntry">Entrada (R$)</Label>
                      <CurrencyInput id="manualFinancingEntry" name="manualFinancingEntry" value={formData.manualFinancingEntry} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="financingTerm">Prazo (meses)</Label>
                      <Input id="financingTerm" name="financingTerm" type="number" value={formData.financingTerm} onChange={handleChange} onWheel={(e) => (e.target as HTMLElement).blur()} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualFinancingInstallment">Parcela (R$)</Label>
                      <CurrencyInput id="manualFinancingInstallment" name="manualFinancingInstallment" value={formData.manualFinancingInstallment} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualFinancingTotal">Custo Total (R$)</Label>
                      <CurrencyInput id="manualFinancingTotal" name="manualFinancingTotal" value={formData.manualFinancingTotal} onChange={handleChange} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          <Card>
            <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl">
              <h2 className="font-semibold text-zinc-900">Informações Comerciais</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consultantName">Consultor Responsável</Label>
                  <Input id="consultantName" name="consultantName" value={formData.consultantName} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="consultantPhone">Contato/WhatsApp</Label>
                  <Input id="consultantPhone" name="consultantPhone" value={formData.consultantPhone || ''} onChange={handleChange} placeholder="Ex: (87) 99922-1318" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="validity">Validade da Proposta</Label>
                  <Input id="validity" name="validity" value={formData.validity} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgencyBannerText">Banner de Urgência</Label>
                  <Input id="urgencyBannerText" name="urgencyBannerText" value={formData.urgencyBannerText || ''} onChange={handleChange} placeholder="Ex: *PRAZO DO PLANO 30 MINUTOS*" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations">Observações (Opcional)</Label>
                <textarea 
                  id="observations" 
                  name="observations" 
                  value={formData.observations} 
                  onChange={handleChange} 
                  className="flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden min-h-[800px]">
          <div className="bg-zinc-100 p-2 border-b border-zinc-200 flex justify-center text-xs text-zinc-500 font-medium uppercase tracking-wider">
            Preview do Documento (A4)
          </div>
          <div className="p-8 sm:p-12 overflow-x-auto">
            <div 
              ref={previewRef} 
              className="w-[794px] min-h-[1123px] mx-auto bg-white shadow-2xl border border-zinc-100 relative"
              style={{ transformOrigin: 'top center', transform: 'scale(1)' }}
            >
              {/* PDF Content Starts Here */}
              {formData.templateStyle === 'simulador' ? (
                /* MODELO SIMULADOR DE TABELA DE CUSTOS */
                <div className="p-8 flex flex-col h-full min-h-[1105px] relative bg-white justify-between select-none">
                  
                  {/* Decorative background watermarks (partner banks) */}
                  <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.03] flex flex-col justify-around py-16 px-12 select-none">
                    <div className="grid grid-cols-2 gap-x-12 gap-y-16 w-full max-w-[620px] mx-auto text-zinc-950 font-bold uppercase text-center select-none">
                      <div className="text-xl border-4 border-zinc-950 p-3 font-black tracking-widest leading-none">CAIXA</div>
                      <div className="text-lg border-4 border-zinc-950 p-2.5 rounded-full font-serif font-black tracking-tight leading-none font-sans">Banco do Brasil</div>
                      <div className="text-2xl font-serif tracking-tighter leading-none">ITAÚ</div>
                      <div className="text-2xl border-2 border-zinc-950 px-5 py-2 rounded-lg font-black tracking-widest leading-none">BRADESCO</div>
                      <div className="text-xl font-sans tracking-tight font-black leading-none">SANTANDER</div>
                      <div className="text-xl border border-zinc-950 px-4 py-2 bg-zinc-950 text-white font-black tracking-widest leading-none">PROMOVE</div>
                      <div className="text-lg tracking-tight border-b-4 border-zinc-950 font-black leading-none">PORTO SEGURO</div>
                      <div className="text-2xl font-mono tracking-widest leading-none">SICOOB</div>
                    </div>
                  </div>

                  {/* Full Background Image */}
                  <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                    <img 
                      src="https://res.cloudinary.com/dsevqnhts/image/upload/v1781112929/image.png_202606101433_ald31t.jpg" 
                      alt="Planilha de Simulação" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  <div>
                    {/* Simulator Header */}
                    <div className="border-4 border-zinc-950 bg-zinc-200 py-3.5 text-center mb-5 z-10 relative">
                      <h2 className="text-3xl font-black tracking-[0.25em] text-zinc-900 leading-none">SIMULADOR</h2>
                    </div>

                    {/* Metadata Upper Grid */}
                    <div className="w-full border-2 border-zinc-950 text-xs font-bold mb-5 z-10 relative bg-white/95">
                      <div className="grid grid-cols-[120px_1fr_210px] border-b-2 border-zinc-950">
                        <div className="bg-zinc-200 px-4 py-2.5 border-r-2 border-zinc-950 flex items-center tracking-wider">CRÉDITO</div>
                        <div className="px-4 py-2.5 border-r-2 border-zinc-950 font-black text-sm text-zinc-900 flex items-center">{formatCurrency(results.requestedValue)}</div>
                        <div className="bg-zinc-200 px-4 py-2.5 text-center flex items-center justify-center font-black text-zinc-800">
                          COD: {formData.proposalCode || `LN${results.requestedValue > 0 ? results.requestedValue.toString().slice(0, 3) + '457' : '4567'}K`}
                        </div>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] border-b-2 border-zinc-950">
                        <div className="bg-zinc-200 px-4 py-2.5 border-r-2 border-zinc-950 flex items-center tracking-wider">CLIENTE</div>
                        <div className="px-4 py-2.5 font-semibold text-sm text-zinc-800 flex items-center">{formData.clientName || 'Nome do Cliente'}</div>
                      </div>
                      <div className="grid grid-cols-[120px_1fr]">
                        <div className="bg-zinc-200 px-4 py-2.5 border-r-2 border-zinc-950 flex items-center tracking-wider">CPF/RG</div>
                        <div className="px-4 py-2.5 font-mono tracking-wider text-sm flex items-center text-zinc-800">{formData.clientCpf || '000.000.000-00'}</div>
                      </div>
                    </div>

                    {/* Section 1: Financiamento */}
                    <div className="w-full border-2 border-zinc-950 text-xs font-bold mb-5 z-10 relative bg-white/95">
                      <div className="bg-zinc-200 py-2.5 border-b-2 border-zinc-950 text-center font-black tracking-widest text-zinc-900 text-xs uppercase shadow-sm">
                        Financiamento {getCategoryLabel(formData.creditCategory)}
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] border-b-2 border-zinc-950">
                        <div className="px-4 py-2 border-r-2 border-zinc-950 bg-zinc-50 tracking-wider">VALOR</div>
                        <div className="px-4 py-2 border-r-2 border-zinc-950 text-center font-mono">R$</div>
                        <div className="px-4 py-2 text-right font-mono text-sm tracking-wide text-zinc-800">{formatValueOnly(results.requestedValue)}</div>
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] border-b-2 border-zinc-950">
                        <div className="px-4 py-2 border-r-2 border-zinc-950 bg-zinc-50 tracking-wider">ENTRADA</div>
                        <div className="px-4 py-2 border-r-2 border-zinc-950 text-center font-mono">R$</div>
                        <div className="px-4 py-2 text-right font-mono text-sm tracking-wide text-zinc-800">{formatValueOnly(results.financingEntry)}</div>
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] border-b-2 border-zinc-950">
                        <div className="px-4 py-2 border-r-2 border-zinc-950 bg-zinc-50 tracking-wider">PARCELAS</div>
                        <div className="px-4 py-2 border-r-2 border-zinc-950 text-center font-mono">R$</div>
                        <div className="px-4 py-2 text-right font-mono text-sm tracking-wide text-zinc-800">{formatValueOnly(results.financingInstallment)}</div>
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] border-b-2 border-zinc-950">
                        <div className="px-4 py-2 border-r-2 border-zinc-950 bg-zinc-50 tracking-wider flex items-center">MESES</div>
                        <div className="px-4 py-2 border-r-2 border-zinc-950 text-center bg-zinc-50 flex items-center justify-center"></div>
                        <div className="px-4 py-2.5 text-center bg-zinc-50/50 flex flex-col justify-center items-center">
                          <span className="font-extrabold text-base text-zinc-950 tracking-wider">{results.financingTerm} MESES</span>
                          <span className="text-[11px] font-bold text-zinc-500 uppercase mt-0.5">
                            {(results.financingTerm / 12) % 1 === 0 ? (results.financingTerm / 12) : (results.financingTerm / 12).toFixed(1)} ANOS
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] bg-red-50 text-red-950">
                        <div className="px-4 py-2.5 border-r-2 border-zinc-950 bg-red-100/60 font-black tracking-wider text-xs">TOTAL</div>
                        <div className="px-4 py-2.5 border-r-2 border-zinc-950 text-center font-black font-mono">R$</div>
                        <div className="px-4 py-2.5 text-right font-black font-mono text-base text-red-600 tracking-wide">{formatValueOnly(results.financingTotal)}</div>
                      </div>
                    </div>

                    {/* Section 2: Consorcio / Credito planejado */}
                    <div className="w-full border-2 border-zinc-950 text-xs font-bold mb-5 z-10 relative bg-white/95 shadow-sm">
                      <div className="bg-zinc-200 py-2.5 border-b-2 border-zinc-950 text-center font-black tracking-widest text-zinc-900 text-xs uppercase shadow-sm">
                        Crédito {getCategoryLabel(formData.creditCategory)}
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] border-b-2 border-zinc-950">
                        <div className="px-4 py-2 border-r-2 border-zinc-950 bg-zinc-50 tracking-wider">VALOR</div>
                        <div className="px-4 py-2 border-r-2 border-zinc-950 text-center font-mono">R$</div>
                        <div className="px-4 py-2 text-right font-mono text-sm tracking-wide text-zinc-800">{formatValueOnly(results.requestedValue)}</div>
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] border-b-2 border-zinc-950">
                        <div className="px-4 py-2 border-r-2 border-zinc-950 bg-zinc-50 tracking-wider">ENTRADA</div>
                        <div className="px-4 py-2 border-r-2 border-zinc-950 text-center font-mono">R$</div>
                        <div className="px-4 py-2 text-right font-mono text-sm tracking-wide text-zinc-800">{formatValueOnly(results.letterAdhesion)}</div>
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] border-b-2 border-zinc-950">
                        <div className="px-4 py-2 border-r-2 border-zinc-950 bg-zinc-50 tracking-wider">PARCELAS</div>
                        <div className="px-4 py-2 border-r-2 border-zinc-950 text-center font-mono">R$</div>
                        <div className="px-4 py-2 text-right font-mono text-sm tracking-wide font-black text-zinc-900">{formatValueOnly(results.letterInstallment)}</div>
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] border-b-2 border-zinc-950">
                        <div className="px-4 py-2 border-r-2 border-zinc-950 bg-zinc-50 tracking-wider flex items-center">MESES</div>
                        <div className="px-4 py-2 border-r-2 border-zinc-950 text-center bg-zinc-50 flex items-center justify-center"></div>
                        <div className="px-4 py-2.5 text-center bg-zinc-50/50 flex flex-col justify-center items-center">
                          <span className="font-extrabold text-base text-zinc-950 tracking-wider">{results.letterTerm} MESES</span>
                          <span className="text-[11px] font-bold text-zinc-500 uppercase mt-0.5">
                            {(results.letterTerm / 12) % 1 === 0 ? (results.letterTerm / 12) : (results.letterTerm / 12).toFixed(1)} ANOS
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-[160px_60px_1fr] bg-emerald-50 text-emerald-950">
                        <div className="px-4 py-2.5 border-r-2 border-zinc-950 bg-emerald-100/60 font-black tracking-wider text-xs">TOTAL</div>
                        <div className="px-4 py-2.5 border-r-2 border-zinc-950 text-center font-black font-mono">R$</div>
                        <div className="px-4 py-2.5 text-right font-black font-mono text-base text-emerald-600 tracking-wide">{formatValueOnly(results.letterTotalCost)}</div>
                      </div>
                    </div>

                    {/* Capital Preserved / Economia banner */}
                    <div className="bg-emerald-500 text-white font-black text-center py-2 px-4 rounded shadow-sm text-sm tracking-widest uppercase mb-5 border border-zinc-950 z-10 relative flex justify-between items-center">
                      <span>ECONOMIA REAL DE PROPOSTA:</span>
                      <span className="text-base tracking-normal">{formatCurrency(results.economyValue)} ({results.economyPercentage.toFixed(1)}%)</span>
                    </div>

                    {/* Urgency Text Area Block */}
                    <div className="bg-zinc-800 text-zinc-100 font-extrabold text-center py-2 px-4 rounded shadow-md text-xs tracking-widest uppercase mb-5 border border-zinc-950 z-10 relative">
                      {formData.urgencyBannerText || '*PRAZO DO PLANO 30 MINUTOS*'}
                    </div>
                  </div>

                  {/* Disclaimer / Info Notes / Bottom metadata info */}
                  <div className="border-t border-zinc-300 pt-3 text-[10px] text-zinc-500 z-10 relative mt-auto col-span-full">
                    {formData.observations && (
                      <div className="mb-2 pb-2 border-b border-zinc-100">
                        <strong className="text-zinc-700">Observações:</strong> <span className="uppercase">{formData.observations}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-end gap-4">
                      <div className="max-w-[480px] leading-relaxed">
                        <p className="font-bold text-zinc-700 mb-0.5">Aviso Legal:</p>
                        <p>Os valores acima tratam-se de simulações baseadas nas taxas vigentes de mercado. Financiamento sujeito a análise de crédito bancário tradicional com juros compostos. Solução consorcial planejada referindo prazos médios de contribuição e taxas de administração diluídas. Validade desta proposta comercial: {formData.validity || 'Hoje'}.</p>
                      </div>
                      <div className="text-right shrink-0 leading-normal">
                        <p className="font-black text-zinc-800 uppercase tracking-widest text-[11px]">{formData.consultantName || ''}</p>
                        {formData.consultantName && <p className="text-[9px] uppercase tracking-wider text-zinc-400 mt-0.5">ESTRATEGISTA DE NEGÓCIOS</p>}
                        <p className="text-[9px] text-zinc-400">Emissão: {formData.emissionDate ? formData.emissionDate.split('-').reverse().join('/') : '--/--/----'}</p>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                /* MODELO PREMIUM ORIGINAL ESTUDO ESTRATÉGICO */
                <div className="p-10 flex flex-col h-full bg-white relative pb-12">
                  
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-zinc-900 pb-4 mb-6">
                    <div>
                      <h1 className="text-3xl font-bold text-zinc-900 tracking-tight uppercase">Estudo Estratégico</h1>
                      <p className="text-zinc-500 mt-1 uppercase tracking-widest text-sm">{formData.creditType} de {CATEGORIES.find(c => c.id === formData.creditCategory)?.label}</p>
                    </div>
                    <div className="text-right">
                      <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 rounded-lg flex items-center justify-center ml-auto mb-2">
                        <ShieldCheck className="w-6 h-6 text-zinc-900" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900">{formData.consultantName || ''}</p>
                      {formData.consultantName && <p className="text-xs text-zinc-500">Consultor Financeiro</p>}
                    </div>
                  </div>

                  {/* Client Info & Target */}
                  <div className="flex justify-between items-end mb-8">
                    <div>
                      <p className="text-sm text-zinc-500 uppercase tracking-wider mb-1">Preparado para</p>
                      <h2 className="text-2xl font-bold text-zinc-900">{formData.clientName || 'Nome do Cliente'}</h2>
                      {formData.clientCpf && (
                        <p className="text-sm font-bold text-zinc-700 tracking-wide mt-1">
                          CPF/CNPJ: <span className="font-mono tracking-normal font-medium">{formData.clientCpf}</span>
                        </p>
                      )}
                      <p className="text-xs text-zinc-500 mt-1.5 font-medium">
                        Data: {formData.emissionDate ? formData.emissionDate.split('-').reverse().join('/') : '--/--/----'}
                      </p>
                    </div>
                    <div className="text-right bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                      <p className="text-sm text-zinc-500 uppercase tracking-wider mb-1">Crédito Pretendido</p>
                      <p className="text-3xl font-black text-zinc-900">{formatCurrency(results.requestedValue)}</p>
                    </div>
                  </div>

                  {/* Comparison Cards */}
                  <div className="flex flex-col gap-4 mb-5">
                    {/* Financing Card */}
                    <div className="border border-zinc-200 rounded-xl overflow-hidden flex flex-row bg-white">
                      <div className="bg-zinc-50 p-4 text-center border-r border-zinc-200 flex flex-col items-center justify-center w-1/3">
                        <Landmark className="w-6 h-6 text-zinc-400 mb-2" />
                        <h3 className="font-bold text-zinc-600 uppercase tracking-wider text-sm">Cenário 1</h3>
                        <p className="text-lg font-bold text-zinc-900 mt-1">Financiamento</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Cálculo estimado via Taxa SELIC e CET</p>
                      </div>
                      <div className="p-4 flex-1 flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-xs text-zinc-500 mb-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Entrada Estimada</p>
                          <p className="text-lg font-bold text-zinc-900">{formatCurrency(results.financingEntry)}</p>
                        </div>
                        <div className="flex-1 border-l border-zinc-100 pl-4">
                          <p className="text-xs text-zinc-500 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1" /> Parcela Mensal</p>
                          <p className="text-xl font-bold text-zinc-900">{formatCurrency(results.financingInstallment)}</p>
                          <div className="mt-1 flex flex-col">
                            <span className="text-[13px] font-extrabold text-zinc-950 tracking-wide">{results.financingTerm} meses</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase leading-none">
                              {(results.financingTerm / 12) % 1 === 0 ? (results.financingTerm / 12) : (results.financingTerm / 12).toFixed(1)} anos
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 border-l border-zinc-100 pl-4">
                          <p className="text-xs text-zinc-500 mb-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1 text-red-500" /> Custo Total</p>
                          <p className="text-lg font-bold text-red-600">{formatCurrency(results.financingTotal)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Letter Card */}
                    <div className="border-2 border-amber-500 rounded-xl overflow-hidden flex flex-row relative shadow-md bg-white">
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 uppercase tracking-wider rounded-bl-lg flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" /> Recomendado
                      </div>
                      <div className="bg-amber-50 p-4 text-center border-r border-amber-200 flex flex-col items-center justify-center w-1/3">
                        <Target className="w-6 h-6 text-amber-600 mb-2" />
                        <h3 className="font-bold text-amber-700 uppercase tracking-wider text-sm">Cenário 2</h3>
                        <p className="text-lg font-bold text-amber-900 mt-1">Carta de Crédito</p>
                        <p className="text-[10px] text-amber-700/80 mt-1">Cálculo via Crédito + Taxa Adm.</p>
                      </div>
                      <div className="p-4 flex-1 flex justify-between items-center">
                        <div className="flex-1">
                          <p className="text-xs text-zinc-500 mb-1 flex items-center"><Zap className="w-3 h-3 mr-1 text-amber-500" /> Adesão Inicial</p>
                          <p className="text-lg font-bold text-zinc-900">{formatCurrency(results.letterAdhesion)}</p>
                          <p className="text-[10px] text-zinc-400 mt-0.5">{results.requestedValue > 0 ? ((results.letterAdhesion / results.requestedValue) * 100).toFixed(1) : 0}% do crédito</p>
                        </div>
                        <div className="flex-1 border-l border-zinc-100 pl-4">
                          <p className="text-xs text-zinc-500 mb-1 flex items-center"><Clock className="w-3 h-3 mr-1" /> Parcela Planejada</p>
                          <p className="text-2xl font-black text-zinc-900">{formatCurrency(results.letterInstallment)}</p>
                          <div className="mt-1 flex flex-col">
                            <span className="text-[14px] font-extrabold text-zinc-950 tracking-wide">{results.letterTerm} meses</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase leading-none">
                              {(results.letterTerm / 12) % 1 === 0 ? (results.letterTerm / 12) : (results.letterTerm / 12).toFixed(1)} anos
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 border-l border-zinc-100 pl-4">
                          <p className="text-xs text-zinc-500 mb-1 flex items-center"><CheckCircle className="w-3 h-3 mr-1 text-green-600" /> Custo Final</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(results.letterTotalCost)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Economy Highlight */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between text-emerald-900 mb-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-400 via-emerald-500 to-emerald-400"></div>
                    <div className="flex items-center gap-4 pl-4">
                      <div className="bg-white p-3 rounded-full shadow-sm border border-emerald-100">
                        <PiggyBank className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-emerald-800 mb-0.5">Capital Preservado (Economia)</h3>
                        <p className="text-3xl font-black text-emerald-700 tracking-tight">
                          {formatCurrency(results.economyValue)}
                        </p>
                      </div>
                    </div>
                    <div className="bg-white rounded-full px-4 py-2 text-sm font-bold text-emerald-700 border border-emerald-200 shadow-sm">
                      Economia de {results.economyPercentage.toFixed(1)}%
                    </div>
                  </div>

                  {/* Urgency Triggers */}
                  <div className="grid grid-cols-2 gap-4 mb-auto">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-red-800 uppercase tracking-wider text-xs mb-1">Condição por Tempo Limitado</h4>
                        <p className="text-xs text-red-700">
                          Condições sujeitas à disponibilidade de cotas. <strong>Válido apenas até {formData.validity}.</strong>
                        </p>
                      </div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                      <Eye className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-orange-800 uppercase tracking-wider text-xs mb-1">Alta Demanda no Grupo</h4>
                        <p className="text-xs text-orange-700">
                          Neste exato momento, <strong>3 pessoas</strong> estão visualizando propostas para este mesmo grupo.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-4 border-t border-zinc-200 text-xs text-zinc-400 col-span-full">
                    {formData.observations && (
                      <div className="mb-4 pb-4 border-b border-zinc-100">
                        <strong className="text-zinc-600">Observações:</strong> {formData.observations}
                      </div>
                    )}
                    <div className="flex justify-between items-end">
                      <div className="max-w-md">
                        <p className="mb-1 text-zinc-500 font-medium">Aviso Legal:</p>
                        <p>Os valores apresentados são simulações baseadas nas condições atuais de mercado e não configuram promessa de contemplação ou aprovação de crédito. Sujeito a análise. Validade comercial desta proposta: {formData.validity}.</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-zinc-900">Gerador Estratégico</p>
                        <p>Documento gerado eletronicamente</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {/* PDF Content Ends Here */}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
