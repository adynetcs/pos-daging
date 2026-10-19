import { useState, type ReactNode } from 'react';
import { Sidebar, DrawerMenu } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

export function AppLayout({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="min-h-full">
      <Sidebar />
      <DrawerMenu buka={drawer} onTutup={() => setDrawer(false)} />
      <div className="lg:pl-64">
        <Header onMenu={() => setDrawer(true)} />
        <main className="mx-auto w-full max-w-[1500px] px-4 pb-28 pt-5 lg:px-8 lg:pb-10 lg:pt-7">{children}</main>
      </div>
      <MobileNav onLainnya={() => setDrawer(true)} />
    </div>
  );
}
