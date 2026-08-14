import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ShieldCheck, Lock, Mail, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Login() {
  const { user, login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== 'VALORIZA2626') {
      setError('Senha incorreta. Entre em contato com a administração.');
      return;
    }

    setLoading(true);
    try {
      const success = await login('Robson Matheus', 'robson.rm99@gmail.com');
      if (!success) {
        setError('Ocorreu um erro ao realizar o login. Tente novamente.');
      }
    } catch (err) {
      setError('Erro de conexão com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-zinc-200 shadow-xl overflow-hidden">
          <CardHeader className="text-center space-y-4 pb-6 bg-zinc-900 text-white relative">
            <div className="mx-auto bg-zinc-800 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-zinc-700">
              <ShieldCheck className="w-8 h-8 text-amber-400" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold tracking-tight">
                Gerador Estratégico
              </CardTitle>
              <CardDescription className="text-zinc-400">
                Propostas de Crédito Premium
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm font-medium text-center">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="login-password" className="text-zinc-700 font-semibold flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-zinc-400" />
                  Senha de Acesso Geral
                </Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Digite a senha geral"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900 font-mono"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-medium mt-6 transition-all"
                variant="premium"
              >
                {loading ? 'Autenticando...' : 'Acessar Sistema'}
              </Button>
            </form>
            <p className="text-center text-xs text-zinc-400 mt-6">
              Acesso restrito a consultores autorizados.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
