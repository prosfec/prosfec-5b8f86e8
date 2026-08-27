// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Menu, X, Landmark, Calculator, HelpCircle, Users, Bell, ArrowRight } from "lucide-react";

interface NavbarProps {
  onSimulateClick: () => void;
  onPartnerPortalClick: () => void;
}

export default function Navbar({ onSimulateClick, onPartnerPortalClick }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setIsOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // height of navbar
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-gray-100 py-3"
          : "bg-white/80 backdrop-blur-sm py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-2 group"
          >
            <div className="bg-brand-primary p-2 rounded-lg text-white group-hover:scale-105 transition-transform">
              <Landmark className="w-5 h-5 text-brand-accent" strokeWidth={2} />
            </div>
            <div>
              <span className="font-display font-bold text-lg md:text-xl text-brand-primary leading-none block">
                PROSFEC
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-7">
            <a
              href="#novidades"
              onClick={(e) => handleLinkClick(e, "novidades")}
              className="text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors"
            >
              Novidades
            </a>
            <a
              href="#como-funciona"
              onClick={(e) => handleLinkClick(e, "como-funciona")}
              className="text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors"
            >
              Como Funciona
            </a>
            <a
              href="#elegibilidade"
              onClick={(e) => handleLinkClick(e, "elegibilidade")}
              className="text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors"
            >
              Requisitos
            </a>
            <a
              href="#consultoria"
              onClick={(e) => handleLinkClick(e, "consultoria")}
              className="text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors"
            >
              Consultoria
            </a>
            <a
              href="#parceiros"
              onClick={(e) => handleLinkClick(e, "parceiros")}
              className="text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors"
            >
              Parceiros
            </a>
            <a
              href="#faq"
              onClick={(e) => handleLinkClick(e, "faq")}
              className="text-sm font-medium text-gray-600 hover:text-brand-primary transition-colors"
            >
              Dúvidas
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onPartnerPortalClick}
              className="border border-brand-primary/10 hover:border-brand-primary/30 text-brand-primary font-bold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100"
            >
              <Users className="w-4 h-4 text-brand-primary/70" strokeWidth={2} />
              Área do Parceiro
            </button>
            <button
              onClick={onSimulateClick}
              className="bg-[#00A86B] hover:bg-[#008f5a] text-white font-extrabold text-sm px-5 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calculator className="w-4 h-4" strokeWidth={2} />
              Simular agora
            </button>
          </div>

          {/* Hamburger trigger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md hover:bg-gray-100/80 text-brand-primary transition-colors"
            >
              {isOpen ? <X className="w-6 h-6" strokeWidth={2} /> : <Menu className="w-6 h-6" strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden absolute bg-white left-0 right-0 top-full border-b border-gray-200 shadow-xl py-4 h-[100vh] sm:h-auto overflow-y-auto">
          <div className="px-4 space-y-3 pb-8">
            <a
              href="#novidades"
              onClick={(e) => handleLinkClick(e, "novidades")}
              className="block px-4 py-3 text-base font-semibold text-gray-800 hover:bg-brand-bg-light rounded-lg transition-all"
            >
              Novidades do Pronampe
            </a>
            <a
              href="#como-funciona"
              onClick={(e) => handleLinkClick(e, "como-funciona")}
              className="block px-4 py-3 text-base font-semibold text-gray-800 hover:bg-brand-bg-light rounded-lg transition-all"
            >
              Como Funciona
            </a>
            <a
              href="#simulador"
              onClick={(e) => handleLinkClick(e, "simulador")}
              className="block px-4 py-3 text-base font-semibold text-brand-primary bg-green-50 rounded-lg border-l-4 border-brand-accent transition-all"
            >
              Simulador Gratuito
            </a>
            <a
              href="#elegibilidade"
              onClick={(e) => handleLinkClick(e, "elegibilidade")}
              className="block px-4 py-3 text-base font-semibold text-gray-800 hover:bg-brand-bg-light rounded-lg transition-all"
            >
              Quem tem Direito?
            </a>
            <a
              href="#consultoria"
              onClick={(e) => handleLinkClick(e, "consultoria")}
              className="block px-4 py-3 text-base font-semibold text-gray-800 hover:bg-brand-bg-light rounded-lg transition-all"
            >
              Nossa Consultoria
            </a>
            <a
              href="#parceiros"
              onClick={(e) => handleLinkClick(e, "parceiros")}
              className="block px-4 py-3 text-base font-semibold text-gray-800 hover:bg-brand-bg-light rounded-lg transition-all"
            >
              Indique e Ganhe (Parceiros)
            </a>
            <a
              href="#faq"
              onClick={(e) => handleLinkClick(e, "faq")}
              className="block px-4 py-3 text-base font-semibold text-gray-800 hover:bg-brand-bg-light rounded-lg transition-all"
            >
              Perguntas Frequentes
            </a>

            <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
              <button
                onClick={() => {
                  setIsOpen(false);
                  onPartnerPortalClick();
                }}
                className="w-full border border-gray-200 hover:bg-slate-50 text-gray-700 text-center font-bold py-3.5 rounded-xl shadow-sm flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5 text-gray-500" strokeWidth={2} />
                Acessar Área do Parceiro
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSimulateClick();
                }}
                className="w-full bg-[#00A86B] hover:bg-[#008f5a] text-white text-center font-bold py-3.5 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                <Calculator className="w-5 h-5" strokeWidth={2} />
                Simular Limite Potencial
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
