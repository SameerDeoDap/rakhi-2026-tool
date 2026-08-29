import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '@/store/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, User } from 'lucide-react';

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (login(password)) navigate('/', { replace: true });
    else setError('Incorrect password. Try again.');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800 text-slate-100">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">Rakhi 2026 Project</CardTitle>
          <CardDescription className="text-slate-400">
            DeoDap internal P&amp;L tracking tool — sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              className="border-slate-600 bg-slate-900 text-white placeholder:text-slate-500"
              autoFocus
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full bg-amber-500 font-semibold text-slate-900 hover:bg-amber-400">
              Sign in
            </Button>
          </form>
          <div className="mt-6 space-y-2 rounded-lg bg-slate-900/60 p-4 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
              <span><b className="text-slate-300">Admin</b> — full access incl. duplicates, categories, settings</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-sky-400" />
              <span><b className="text-slate-300">Team</b> — data entry, Excel import &amp; dashboards</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
