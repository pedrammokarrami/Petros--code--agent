import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bot,
  BrainCircuit,
  Building2,
  Factory,
  GraduationCap,
  HeartPulse,
  Leaf,
  Microscope,
  Palette,
  ShoppingCart,
  SunMedium,
  WalletCards,
} from 'lucide-react';

export type EnvironmentId =
  | 'software'
  | 'medical'
  | 'industrial'
  | 'media'
  | 'biotech'
  | 'agriculture'
  | 'energy'
  | 'finance'
  | 'construction'
  | 'commerce'
  | 'education'
  | 'robotics';

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  workstation: string;
  accent: string;
}

export interface EnvironmentDefinition {
  id: EnvironmentId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent: string;
  roomType: string;
  leadRole: string;
  packageUrl?: string;
  packageVersion: string;
  agents: AgentDefinition[];
  features: string[];
}

const baseAgents = (leadRole: string, specialists: string[]): AgentDefinition[] => [
  { id: 'lead', name: 'Lead Agent', role: leadRole, workstation: 'arrival', accent: '#67b7ff' },
  ...specialists.map((role, index) => ({
    id: `specialist-${index + 1}`,
    name: `Specialist ${index + 1}`,
    role,
    workstation: `station-${index + 1}`,
    accent: index % 2 ? '#9b8cff' : '#53d7b0',
  })),
];

export const ENVIRONMENTS: EnvironmentDefinition[] = [
  { id: 'software', title: 'Software & Technology', subtitle: 'Research and development laboratory', icon: BrainCircuit, accent: '#5aa9ff', roomType: 'rd-lab', leadRole: 'Technology Lead', packageVersion: '1.0.0', agents: baseAgents('Technology Lead', ['Software Engineer', 'Product Designer', 'QA Engineer', 'Security Researcher']), features: ['Architecture wall', 'Development stations', 'QA bay', 'Research desk'] },
  { id: 'medical', title: 'Medical & Healthcare', subtitle: 'Clinical research environment', icon: HeartPulse, accent: '#65d6c2', roomType: 'clinical-lab', leadRole: 'Healthcare Lead', packageVersion: '1.0.0', agents: baseAgents('Healthcare Lead', ['Medical Researcher', 'Clinical Analyst', 'Lab Specialist']), features: ['Clinical stations', 'Research bench', 'Care planning display'] },
  { id: 'industrial', title: 'Industrial & Manufacturing', subtitle: 'Production engineering facility', icon: Factory, accent: '#ffbd72', roomType: 'factory', leadRole: 'Production Lead', packageVersion: '1.0.0', agents: baseAgents('Production Lead', ['Industrial Engineer', 'Robotics Specialist', 'Quality Controller']), features: ['Production floor', 'Engineering desks', 'Robot cell'] },
  { id: 'media', title: 'Entertainment & Media', subtitle: 'Creative production studio', icon: Palette, accent: '#d39bff', roomType: 'creative-studio', leadRole: 'Creative Lead', packageVersion: '1.0.0', agents: baseAgents('Creative Lead', ['Content Producer', 'Visual Designer', 'Game Developer']), features: ['Edit bays', 'Creative wall', 'Recording area'] },
  { id: 'biotech', title: 'Science & Biotechnology', subtitle: 'Advanced research laboratory', icon: Microscope, accent: '#73d7a5', roomType: 'research-lab', leadRole: 'Research Lead', packageVersion: '1.0.0', agents: baseAgents('Research Lead', ['Biotech Researcher', 'Lab Scientist', 'Data Analyst']), features: ['Research benches', 'Analysis station', 'Sample display'] },
  { id: 'agriculture', title: 'Agriculture & Food', subtitle: 'Smart agriculture center', icon: Leaf, accent: '#9ed36a', roomType: 'agri-center', leadRole: 'AgriTech Lead', packageVersion: '1.0.0', agents: baseAgents('AgriTech Lead', ['Crop Scientist', 'Food Developer', 'Operations Planner']), features: ['Greenhouse zone', 'Food lab', 'Planning table'] },
  { id: 'energy', title: 'Energy & Environment', subtitle: 'Sustainable systems center', icon: SunMedium, accent: '#f2ca68', roomType: 'energy-center', leadRole: 'Energy Lead', packageVersion: '1.0.0', agents: baseAgents('Energy Lead', ['Energy Engineer', 'Climate Analyst', 'Systems Planner']), features: ['Monitoring wall', 'Renewable models', 'Engineering bay'] },
  { id: 'finance', title: 'Finance & Blockchain', subtitle: 'Financial technology office', icon: WalletCards, accent: '#80b7ff', roomType: 'fintech-office', leadRole: 'Finance Lead', packageVersion: '1.0.0', agents: baseAgents('Finance Lead', ['Financial Analyst', 'Blockchain Researcher', 'Risk Specialist']), features: ['Market wall', 'Ledger display', 'Research stations'] },
  { id: 'construction', title: 'Construction & Engineering', subtitle: 'Architectural engineering studio', icon: Building2, accent: '#ffad7a', roomType: 'engineering-studio', leadRole: 'Engineering Lead', packageVersion: '1.0.0', agents: baseAgents('Engineering Lead', ['Architect', 'Civil Engineer', 'Project Planner']), features: ['Scale models', 'CAD stations', 'Planning wall'] },
  { id: 'commerce', title: 'Commerce & Logistics', subtitle: 'Commerce operations center', icon: ShoppingCart, accent: '#72c9ff', roomType: 'logistics-center', leadRole: 'Commerce Lead', packageVersion: '1.0.0', agents: baseAgents('Commerce Lead', ['Operations Analyst', 'Inventory Planner', 'Logistics Engineer']), features: ['Inventory wall', 'Planning desks', 'Warehouse view'] },
  { id: 'education', title: 'Education & Training', subtitle: 'Learning and research center', icon: GraduationCap, accent: '#c29bff', roomType: 'learning-center', leadRole: 'Learning Lead', packageVersion: '1.0.0', agents: baseAgents('Learning Lead', ['Curriculum Designer', 'Learning Researcher', 'Training Assistant']), features: ['Learning studio', 'Content desks', 'Teaching area'] },
  { id: 'robotics', title: 'AI & Robotics', subtitle: 'Robotics research laboratory', icon: Bot, accent: '#7bd6ff', roomType: 'robotics-lab', leadRole: 'Robotics Lead', packageVersion: '1.0.0', agents: baseAgents('Robotics Lead', ['AI Engineer', 'Robotics Researcher', 'Automation Specialist']), features: ['Robot test cell', 'AI stations', 'Automation wall'] },
];

export const getEnvironment = (id: EnvironmentId) => ENVIRONMENTS.find((environment) => environment.id === id);
