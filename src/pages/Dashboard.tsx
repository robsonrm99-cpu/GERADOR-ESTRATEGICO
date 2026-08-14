import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ProposalData, formatCurrency } from '../lib/calculations';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Plus, FileText, Settings, LogOut, Copy, Trash2, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth();
  const [proposals, setProposals] = useState<ProposalData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProposals();
  }, [user]);

  const fetchProposals = async () => {
    if (!user) return;
    try {
      const proposalsRaw = localStorage.getItem('valoriza_proposals');
      const allProposals: ProposalData[] = proposalsRaw ? JSON.parse(proposalsRaw) : [];
      
      const userProposals = allProposals
        .filter(p => p.uid === user.uid)
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });

      setProposals(userProposals);
    } catch (error) {
      console.error("Error fetching proposals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta proposta?')) {
      try {
        const proposalsRaw = localStorage.getItem('valoriza_proposals');
        const allProposals: ProposalData[] = proposalsRaw ? JSON.parse(proposalsRaw) : [];
        const updated = allProposals.filter(p => p.id !== id);
        localStorage.setItem('valoriza_proposals', JSON.stringify(updated));
        setProposals(proposals.filter(p => p.id !== id));
      } catch (error) {
        console.error("Error deleting proposal:", error);
      }
    }
  };

  const handleDuplicate = (proposal: ProposalData) => {
    navigate('/proposal/new', { state: { duplicateFrom: proposal } });
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-zinc-900 p-1.5 rounded-lg">
              <FileText className="w-5 h-5 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Gerador Estratégico</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAdmin && (
              <Link to="/admin">
                <Button variant="ghost" size="sm" className="text-zinc-500">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}
            <div className="text-sm text-zinc-600 hidden sm:block">
              {user?.displayName}
            </div>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900">Suas Propostas</h2>
            <p className="text-zinc-500 text-sm mt-1">Gerencie e crie novas propostas comerciais.</p>
          </div>
          <Link to="/proposal/new">
            <Button variant="premium" className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Nova Proposta
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse h-48 bg-zinc-100 border-none" />
            ))}
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-zinc-200 border-dashed">
            <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900">Nenhuma proposta encontrada</h3>
            <p className="text-zinc-500 mt-1 mb-6">Crie sua primeira proposta para começar.</p>
            <Link to="/proposal/new">
              <Button>Criar Proposta</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {proposals.map((proposal) => (
              <Card key={proposal.id} className="group hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg text-zinc-900 line-clamp-1">{proposal.clientName}</CardTitle>
                      <p className="text-xs text-zinc-500 mt-1">
                        {format(new Date(proposal.createdAt), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                      {proposal.creditCategory}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-zinc-900">
                      {formatCurrency(proposal.requestedValue)}
                    </p>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mt-1">Crédito Pretendido</p>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-zinc-100">
                    <Link to={`/proposal/edit/${proposal.id}`} className="flex-1">
                      <Button variant="outline" className="w-full h-8 text-xs">
                        <Edit className="w-3 h-3 mr-2" /> Editar
                      </Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-zinc-900" onClick={() => handleDuplicate(proposal)} title="Duplicar">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(proposal.id!)} title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
