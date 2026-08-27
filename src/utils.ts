// @ts-nocheck
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Format CNPJ: 99.999.999/9999-99
export function formatCNPJ(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 2) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 2)}.${clean.slice(2)}`;
  if (clean.length <= 8) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5)}`;
  if (clean.length <= 12) return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8)}`;
  return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12, 14)}`;
}

// Validate Brazilian CNPJ
export function validateCNPJ(cnpj: string): boolean {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return false;
  
  // Eliminate known invalid ones
  if (/^(\d)\1{13}$/.test(clean)) return false;

  const b = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let n1 = 0;
  for (let i = 0; i < 12; i++) {
    n1 += parseInt(clean[i]) * b[i + 1];
  }
  const digit12 = (n1 % 11) < 2 ? 0 : 11 - (n1 % 11);
  if (parseInt(clean[12]) !== digit12) return false;

  let n2 = 0;
  for (let i = 0; i < 13; i++) {
    n2 += parseInt(clean[i]) * b[i];
  }
  const digit13 = (n2 % 11) < 2 ? 0 : 11 - (n2 % 11);
  if (parseInt(clean[13]) !== digit13) return false;

  return true;
}

// Validate Brazilian CPF (Mathematical Check Digits)
export function validateCPF(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return false;
  
  // Eliminate known invalid ones
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  let remainder;

  for (let i = 1; i <= 9; i++) {
    sum += parseInt(clean[i - 1]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean[9])) return false;

  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(clean[i - 1]) * (12 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(clean[10])) return false;

  return true;
}

// Validate Brazilian Phone
export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/\D/g, "");
  // Brazilian numbers with DDD have 10 or 11 digits
  if (clean.length !== 10 && clean.length !== 11) return false;
  
  // DDD cannot start with 0
  if (clean[0] === "0") return false;
  
  // If 11 digits (mobile), the first digit of local number must be 9
  if (clean.length === 11 && clean[2] !== "9") return false;
  
  // Avoid obvious repetitions of identical digits
  if (/^(\d)\1{9,10}$/.test(clean)) return false;
  
  return true;
}

// Mask BRL Currency
export function formatCurrencyBRL(value: number | string): string {
  const num = typeof value === "number" ? value : parseFloat(value.replace(/\D/g, "")) / 100;
  if (isNaN(num)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(num);
}

// Mask phone to (99) 99999-9999
export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 2) return clean;
  if (clean.length <= 7) return `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
  return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7, 11)}`;
}

// Format CPF: 999.999.999-99
export function formatCPF(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 3) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 3)}.${clean.slice(3)}`;
  if (clean.length <= 9) return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6)}`;
  return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9, 11)}`;
}

// Format CEP: 99999-999
export function formatCEP(value: string): string {
  const clean = value.replace(/\D/g, "");
  if (clean.length <= 5) return clean;
  return `${clean.slice(0, 5)}-${clean.slice(5, 8)}`;
}

// Webhook Simulation & Logs
export interface WebhookLog {
  timestamp: string;
  url: string;
  payload: any;
  status: "success" | "pending" | "error";
  eventType: string;
}

export function triggerWebhookSimulation(eventType: string, payload: any): WebhookLog {
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  const webhookUrl = "https://crm.grpolca.com.br/hooks/pronampe2026-lead";
  
  // Log message in development console for pixel/analytics events
  console.log(`[Pixel Meta / GA4 Tracking] Event: ${eventType}`, payload);
  
  // Store the simulation log in local storage for demonstration
  let logsArr: WebhookLog[] = [];
  try {
    const storedLogs = localStorage.getItem("pronampe_webhook_logs");
    logsArr = storedLogs ? JSON.parse(storedLogs) : [];
    if (!Array.isArray(logsArr)) {
      logsArr = [];
    }
  } catch (e) {
    logsArr = [];
  }
  
  const newLog: WebhookLog = {
    timestamp,
    url: webhookUrl,
    payload,
    status: "success",
    eventType
  };
  
  logsArr.unshift(newLog);
  // Keep only the last 20 logs
  try {
    localStorage.setItem("pronampe_webhook_logs", JSON.stringify(logsArr.slice(0, 20)));
  } catch (e) {
    console.error(e);
  }
  
  return newLog;
}

// State/UFs list of Brazil
export const brazilianUFs = [
  { value: "AC", label: "Acre (AC)" },
  { value: "AL", label: "Alagoas (AL)" },
  { value: "AP", label: "Amapá (AP)" },
  { value: "AM", label: "Amazonas (AM)" },
  { value: "BA", label: "Bahia (BA)" },
  { value: "CE", label: "Ceará (CE)" },
  { value: "DF", label: "Distrito Federal (DF)" },
  { value: "ES", label: "Espírito Santo (ES)" },
  { value: "GO", label: "Goiás (GO)" },
  { value: "MA", label: "Maranhão (MA)" },
  { value: "MT", label: "Mato Grosso (MT)" },
  { value: "MS", label: "Mato Grosso do Sul (MS)" },
  { value: "MG", label: "Minas Gerais (MG)" },
  { value: "PA", label: "Pará (PA)" },
  { value: "PB", label: "Paraíba (PB)" },
  { value: "PR", label: "Paraná (PR)" },
  { value: "PE", label: "Pernambuco (PE)" },
  { value: "PI", label: "Piauí (PI)" },
  { value: "RJ", label: "Rio de Janeiro (RJ)" },
  { value: "RN", label: "Rio Grande do Norte (RN)" },
  { value: "RS", label: "Rio Grande do Sul (RS)" },
  { value: "RO", label: "Rondônia (RO)" },
  { value: "RR", label: "Roraima (RR)" },
  { value: "SC", label: "Santa Catarina (SC)" },
  { value: "SP", label: "São Paulo (SP)" },
  { value: "SE", label: "Sergipe (SE)" },
  { value: "TO", label: "Tocantins (TO)" }
];

// Local Storage Backup & Management Utilities for Leads
export function saveLocalLead(lead: any) {
  try {
    const existing = localStorage.getItem("pronampe_leads");
    const leads = existing ? JSON.parse(existing) : [];
    if (Array.isArray(leads)) {
      const leadId = lead.id || `local_${Math.random().toString(36).substring(2, 11)}`;
      const leadWithId = { ...lead, id: leadId };
      const exists = leads.some((l: any) => {
        if (l.id === leadId) return true;
        const sameInteresse = l.interesse === lead.interesse;
        const sameEmail = lead.email && l.email && lead.email.toLowerCase().trim() === l.email.toLowerCase().trim();
        const sameCnpj = lead.cnpj && l.cnpj && lead.cnpj.replace(/\D/g, "") === l.cnpj.replace(/\D/g, "");
        const samePhone = lead.whatsapp && l.whatsapp && lead.whatsapp.replace(/\D/g, "") === l.whatsapp.replace(/\D/g, "");
        return sameInteresse && (sameEmail || sameCnpj || (lead.nome === l.nome && samePhone));
      });
      if (!exists) {
        leads.unshift(leadWithId);
        localStorage.setItem("pronampe_leads", JSON.stringify(leads));
      }
    }
  } catch (e) {
    console.error("Error saving local lead:", e);
  }
}

export function getLocalLeads(): any[] {
  try {
    const existing = localStorage.getItem("pronampe_leads");
    return existing ? JSON.parse(existing) : [];
  } catch (e) {
    console.error("Error getting local leads:", e);
    return [];
  }
}

export function updateLocalLeadStatus(leadId: string, status: string) {
  try {
    const existing = localStorage.getItem("pronampe_leads");
    if (existing) {
      const leads = JSON.parse(existing);
      if (Array.isArray(leads)) {
        const index = leads.findIndex((l: any) => l.id === leadId);
        if (index !== -1) {
          leads[index].status = status;
          localStorage.setItem("pronampe_leads", JSON.stringify(leads));
        }
      }
    }
  } catch (e) {
    console.error("Error updating local lead:", e);
  }
}

export function deleteLocalLead(leadId: string) {
  try {
    const existing = localStorage.getItem("pronampe_leads");
    if (existing) {
      const leads = JSON.parse(existing);
      if (Array.isArray(leads)) {
        const filtered = leads.filter((l: any) => l.id !== leadId);
        localStorage.setItem("pronampe_leads", JSON.stringify(filtered));
      }
    }
  } catch (e) {
    console.error("Error deleting local lead:", e);
  }
}

// Fetch CNPJ details via BrasilAPI client-side with grace fallback
export async function fetchCNPJ(cnpj: string): Promise<any> {
  const cleanCnpj = cnpj.replace(/\D/g, "");
  if (cleanCnpj.length !== 14) {
    throw new Error("CNPJ deve conter 14 dígitos.");
  }

  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
  
  if (response.status === 429) {
    throw new Error("Limite de consultas automáticas atingido. Por favor, preencha os dados manualmente.");
  }
  
  if (!response.ok) {
    throw new Error("Não foi possível consultar o CNPJ automaticamente. Por favor, preencha os dados manualmente.");
  }

  const data = await response.json();
  return data;
}

// Helper to get standard app domain (defaults to https://prosfec.com.br if not on official domain)
export function getAppDomain(): string {
  if (typeof window !== "undefined" && window.location.hostname.includes("prosfec.com.br")) {
    return window.location.origin;
  }
  return "https://prosfec.com.br";
}

// Deep sanitize object removing any undefined values before writing to Firestore
export function sanitizeFirestoreData<T = any>(obj: T): T {
  if (obj === undefined || obj === null) {
    return null as unknown as T;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestoreData(item)) as unknown as T;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj as Record<string, any>)) {
    if (val !== undefined) {
      cleanObj[key] = sanitizeFirestoreData(val);
    }
  }
  return cleanObj as T;
}

// Security: Validate uploaded files for MIME types, magic bytes and size constraints
export async function validateUploadedFile(
  file: File, 
  allowedTypes: ("pdf" | "image")[] = ["pdf", "image"], 
  maxSizeMB: number = 15
): Promise<{ valid: boolean; error?: string }> {
  if (!file) {
    return { valid: false, error: "Nenhum arquivo selecionado." };
  }

  // 1. Size constraint check
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { 
      valid: false, 
      error: `Arquivo excede o limite máximo permitido de ${maxSizeMB}MB (tamanho atual: ${(file.size / (1024 * 1024)).toFixed(1)}MB).` 
    };
  }

  // 2. Extension check
  const fileName = file.name.toLowerCase();
  const isPdfExt = fileName.endsWith(".pdf");
  const isImgExt = fileName.endsWith(".png") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".webp");

  if (!isPdfExt && !isImgExt) {
    return { valid: false, error: "Formato de arquivo não permitido. Apenas PDF, JPG, PNG e WebP são aceitos." };
  }

  if (isPdfExt && !allowedTypes.includes("pdf")) {
    return { valid: false, error: "Formato PDF não aceito para este campo." };
  }

  if (isImgExt && !allowedTypes.includes("image")) {
    return { valid: false, error: "Imagens não são aceitas para este campo. Envie um arquivo PDF." };
  }

  // 3. Magic bytes / header inspection
  try {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (isPdfExt) {
      // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
      const isPdfHeader = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
      if (!isPdfHeader) {
        return { valid: false, error: "Arquivo corrompido ou cabeçalho PDF inválido." };
      }
    } else if (isImgExt) {
      // PNG: 89 50 4E 47 | JPEG: FF D8 FF | WebP: 52 49 46 46 (RIFF)
      const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
      const isJpg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
      const isWebp = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;

      if (!isPng && !isJpg && !isWebp) {
        return { valid: false, error: "Arquivo de imagem com estrutura corrompida ou formato inválido." };
      }
    }
  } catch (err) {
    console.warn("Header inspection fallback warning:", err);
  }

  return { valid: true };
}

// Re-export Multilevel Commission System and Service Utils
export * from "./utils/commissionUtils";
export * from "./utils/serviceUtils";




