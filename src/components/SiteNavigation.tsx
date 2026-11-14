'use client';
import { useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { ui } from '@/lib/copy';
const links = [
  { id: 'how-it-works', label: ui.howItWorks },
  { id: 'our-approach', label: ui.ourApproach },
  { id: 'image-credits', label: ui.photoCreditShort },
];
export default function SiteNavigation() {
  const [open, setOpen] = useState(false);
  const destination = useRef<string | null>(null);
  return (
    <div className="site-navigation">
      <nav className="editorial-nav desktop-navigation" aria-label={ui.navigation}>
        {links.slice(0, 2).map((link) => (
          <a key={link.id} href={`#${link.id}`}>
            {link.label}
          </a>
        ))}
      </nav>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button className="menu-toggle" aria-label={ui.openNavigation}>
            <Menu size={22} strokeWidth={1.5} />
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="navigation-overlay" />
          <Dialog.Content
            className="mobile-nav-panel"
            onCloseAutoFocus={(event) => {
              if (destination.current) {
                event.preventDefault();
                const section = document.getElementById(destination.current);
                const target = section?.querySelector<HTMLElement>('h2') ?? section;
                target?.setAttribute('tabindex', '-1');
                target?.focus({ preventScroll: true });
                destination.current = null;
              }
            }}
          >
            <div className="mobile-nav-top">
              <Dialog.Title>{ui.navigationTitle}</Dialog.Title>
              <Dialog.Close asChild>
                <button className="icon-button" aria-label={ui.closeNavigation}>
                  <X size={21} strokeWidth={1.5} />
                </button>
              </Dialog.Close>
            </div>
            <Dialog.Description className="sr-only">{ui.navigationDescription}</Dialog.Description>
            <nav aria-label={ui.navigation}>
              {links.map((link) => (
                <Dialog.Close asChild key={link.id}>
                  <a
                    href={`#${link.id}`}
                    onClick={() => {
                      destination.current = link.id;
                    }}
                  >
                    {link.label}
                    <ArrowUpRight size={21} strokeWidth={1.4} />
                  </a>
                </Dialog.Close>
              ))}
            </nav>
            <p>{ui.tagline}</p>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
