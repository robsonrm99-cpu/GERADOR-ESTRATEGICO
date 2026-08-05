import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { ArrowLeft, Save, Settings as SettingsIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Admin() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultAdhesion: 2,
    defaultLetterTerm: 180,
    defaultLetterInstallmentFactor: 1.2,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'settings', 'global');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as any);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: Number(value)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), settings);
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error("Error saving settings:", error);
      alert('Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-zinc-500" />
              <h1 className="text-xl font-bold text-zinc-900 tracking-tight">Administração</h1>
            </div>
          </div>
          <Button variant="premium" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Configurações Globais de Cálculo</CardTitle>
            <CardDescription>
              Ajuste os parâmetros padrão utilizados na geração de novas propostas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="defaultAdhesion">Adesão Padrão (%)</Label>
                <Input 
                  id="defaultAdhesion" 
                  name="defaultAdhesion" 
                  type="number" 
                  step="0.1" 
                  value={settings.defaultAdhesion} 
                  onChange={handleChange} 
                />
                <p className="text-xs text-zinc-500">Percentual padrão de adesão da carta de crédito.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLetterTerm">Prazo Padrão da Carta (meses)</Label>
                <Input 
                  id="defaultLetterTerm" 
                  name="defaultLetterTerm" 
                  type="number" 
                  value={settings.defaultLetterTerm} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLetterInstallmentFactor">Fator de Custo da Carta</Label>
                <Input 
                  id="defaultLetterInstallmentFactor" 
                  name="defaultLetterInstallmentFactor" 
                  type="number" 
                  step="0.01" 
                  value={settings.defaultLetterInstallmentFactor} 
                  onChange={handleChange} 
                />
                <p className="text-xs text-zinc-500">Ex: 1.2 significa que o custo total da carta será 20% maior que o crédito (taxa de administração).</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
