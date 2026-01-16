
import React from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  FileText,
  Settings,
  HelpCircle,
  ExternalLink,
  Laptop,
  UserPlus,
  Box,
  Bot
} from 'lucide-react';

export const SYSTEMS = [
  { name: 'SIGA', desc: 'Sistema Integrado de Gestão', icon: <Box className="w-8 h-8 text-blue-500" />, color: 'bg-blue-50' },
  { name: 'PRODOC', desc: 'Protocolo de Documentos', icon: <FileText className="w-8 h-8 text-purple-500" />, color: 'bg-purple-50' },
  { name: 'SIGRH', desc: 'Gestão de Pessoas', icon: <Users className="w-8 h-8 text-orange-500" />, color: 'bg-orange-50' },
  { name: 'SIPLAG', desc: 'Sistema de Planejamento', icon: <ExternalLink className="w-8 h-8 text-emerald-500" />, color: 'bg-emerald-50' },
  { name: 'Webmail', desc: 'E-mail Institucional', icon: <MessageSquare className="w-8 h-8 text-sky-500" />, color: 'bg-sky-50' },
  { name: 'Contracheque', desc: 'Serviços Financeiros', icon: <FileText className="w-8 h-8 text-green-500" />, color: 'bg-green-50' },
];

export const WORKFLOWS = [
  { id: 'ti', title: 'Suporte TI', icon: <Laptop />, desc: 'Abertura de chamados técnicos' },
  { id: 'urh', title: 'URH', icon: <UserPlus />, desc: 'Diárias e Férias' },
  { id: 'patrimonio', title: 'Patrimônio', icon: <Box />, desc: 'Materiais e Veículos' },
];

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Início', icon: <LayoutDashboard size={20} /> },
  { id: 'mural', label: 'Mural', icon: <MessageSquare size={20} /> },
  { id: 'calendario', label: 'Calendário', icon: <Calendar size={20} /> },
  { id: 'diretorio', label: 'Diretório', icon: <Users size={20} /> },
  { id: 'documentos', label: 'Solicitação', icon: <FileText size={20} /> },
  { id: 'ai', label: 'Assistente IA', icon: <Bot size={20} /> },
];
