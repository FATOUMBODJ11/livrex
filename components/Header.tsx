'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

const PUBLIC: [string, string][] = [['/voyager', 'Voyager'], ['/envoyer', 'Envoyer'], ['/suivre', 'Suivre']];
const PRO: [string, string][] = [['/agent', 'Agent'], ['/chauffeur', 'Chauffeur'], ['/livreur', 'Livreur'], ['/admin', 'Admin']];

export default function Header() {
  const path = usePathname();
  const [theme, setTheme] = useState<'auto' | 'light' | 'dark'>('auto');

  useEffect(() => {
    try { const t = localStorage.getItem('aes-theme'); if (t === 'light' || t === 'dark') setTheme(t); } catch { /* */ }
  }, []);
  useEffect(() => {
    const r = document.documentElement;
    if (theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', theme);
    try { localStorage.setItem('aes-theme', theme); } catch { /* */ }
  }, [theme]);

  const next = () => setTheme(t => (t === 'auto' ? 'dark' : t === 'dark' ? 'light' : 'auto'));
  const link = ([href, label]: [string, string]) => (
    <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>
  );

  return (
    <header className="bar">
      <div className="bar-in">
        <Link className="brand" href="/" aria-label="Afrique Express Services, accueil">
          <img src="/logo.png" alt="Afrique Express Services" width={134} height={40} />
          <img className="d" src="/logo-dark.png" alt="Afrique Express Services" width={134} height={40} />
        </Link>
        <nav className="nav" aria-label="Navigation principale">
          <div className="nav-grp">{PUBLIC.map(link)}</div>
          <div className="nav-grp pro"><span className="nav-lab">Espaces</span>{PRO.map(link)}</div>
        </nav>
        <button className="theme-btn" onClick={next} title={`Thème : ${theme === 'auto' ? 'automatique' : theme === 'dark' ? 'sombre' : 'clair'}`} aria-label="Changer de thème">
          {theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '◐'}
        </button>
        <span className="demo-badge">Prototype · données d&apos;exemple</span>
      </div>
    </header>
  );
}
