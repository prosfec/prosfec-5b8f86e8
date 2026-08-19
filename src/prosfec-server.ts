import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { GoogleGenAI, Type } from "@google/genai";
import { getBankSpecificRules } from "./src/utils/creditLineRules";
import { BankRulesManager } from "./src/utils/BankRulesManager";

export function createExpressApp() {
  const app = express();

  // Handle Netlify Function route rewrite if present
  app.use((req, _res, next) => {
    if (req.url.startsWith("/.netlify/functions/api")) {
      req.url = req.url.replace("/.netlify/functions/api", "");
      if (!req.url.startsWith("/")) {
        req.url = "/" + req.url;
      }
      if (!req.url.startsWith("/api")) {
        req.url = "/api" + req.url;
      }
    }
    next();
  });

  // Initialize Firebase App and Firestore for webhook handler
  const firebaseApp = initializeApp(firebaseConfig);
  const db = (firebaseConfig as any).firestoreDatabaseId
    ? getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId)
    : getFirestore(firebaseApp);

  // Parse JSON payloads for API routes
  app.use(express.json());

  // API Route: Hubla Webhook
  app.post("/api/hubla-webhook", async (req, res) => {
    // Retrieve Hubla security token from headers or query params
    const clientToken = 
      req.headers["x-hubla-token"] || 
      req.headers["X-Hubla-Token"] || 
      req.headers["authorization"] || 
      req.headers["Authorization"] || 
      req.headers["token"] || 
      req.headers["Token"] || 
      req.query.token;

    const expectedToken = process.env.HUBLA_WEBHOOK_TOKEN || "Jl5VcHn9iBKUL6vYC69troB6ssOG32pRvVmKC9VYZXe48QooWL9IxUxJ4iCwuP1n";

    // Clean Bearer prefix if present
    let cleanClientToken = typeof clientToken === "string" ? clientToken : "";
    if (cleanClientToken.toLowerCase().startsWith("bearer ")) {
      cleanClientToken = cleanClientToken.substring(7).trim();
    }

    if (cleanClientToken !== expectedToken) {
      console.warn("Unauthorized Hubla webhook request. Token mismatch. Received token ends with: " + cleanClientToken.slice(-6));
      return res.status(401).json({ error: "Unauthorized. Invalid token." });
    }

    try {
      const payload = req.body;
      console.log("Received Hubla Webhook payload:", JSON.stringify(payload));
      
      // Save webhook event for audit logs
      try {
        await addDoc(collection(db, "hubla_events"), {
          receivedAt: new Date().toISOString(),
          payload: payload
        });
      } catch (auditErr) {
        console.error("Failed to save hubla event audit log:", auditErr);
      }

      // Try to extract event status, buyer email, and checkout IDs from the Hubla payload
      let eventType = payload.event_type || payload.eventType || payload.event;
      let purchaseStatus = payload.data?.payment?.status || payload.payment?.status || payload.status;
      let subscriptionStatus = payload.data?.subscription?.status || payload.subscription?.status || payload.status;

      let buyerEmail = payload.data?.buyer?.email || payload.buyer?.email || payload.buyer_email || payload.customer?.email || payload.email;
      let buyerName = payload.data?.buyer?.name || payload.buyer?.name || payload.buyer_name || payload.customer?.name || payload.name;
      let buyerDocument = payload.data?.buyer?.document || payload.buyer?.document || payload.customer?.document || payload.document || "";
      let buyerPhone = payload.data?.buyer?.phone || payload.buyer?.phone || payload.customer?.phone || payload.phone || payload.whatsapp || "";

      // Look in various possible paths for checkout id/code
      let checkoutId = "";
      if (payload.data?.checkout_id) checkoutId = payload.data.checkout_id;
      else if (payload.data?.checkout?.id) checkoutId = payload.data.checkout.id;
      else if (payload.data?.payment?.checkout_id) checkoutId = payload.data.payment.checkout_id;
      else if (payload.data?.payment?.checkout?.id) checkoutId = payload.data.payment.checkout.id;
      else if (payload.data?.subscription?.checkout_id) checkoutId = payload.data.subscription.checkout_id;
      else if (payload.data?.subscription?.checkout?.id) checkoutId = payload.data.subscription.checkout.id;
      else if (payload.checkout_id) checkoutId = payload.checkout_id;
      else if (payload.checkoutId) checkoutId = payload.checkoutId;
      else if (payload.data?.checkoutId) checkoutId = payload.data.checkoutId;
      else if (payload.productId) checkoutId = payload.productId;
      else if (payload.data?.product?.id) checkoutId = payload.data.product.id;

      // Standardize email
      if (!buyerEmail || typeof buyerEmail !== "string") {
        console.warn("No buyer email found in Hubla payload.");
        return res.status(200).json({ status: "warning", message: "No buyer email found" });
      }

      const emailNormalized = buyerEmail.trim().toLowerCase();

      // Standardize event and status checks
      const eventLower = (eventType || "").toLowerCase();
      const purchaseStatusLower = (purchaseStatus || "").toLowerCase();
      const subscriptionStatusLower = (subscriptionStatus || "").toLowerCase();
      const statusLower = (payload.status || "").toLowerCase();

      // Determine if payment/subscription is approved
      const isApproved = 
        eventLower === "payment.approved" || 
        eventLower === "payment_approved" ||
        eventLower === "subscription.renewed" ||
        eventLower === "subscription.active" ||
        purchaseStatusLower === "approved" ||
        purchaseStatusLower === "paid" ||
        subscriptionStatusLower === "active" ||
        statusLower === "approved" ||
        statusLower === "complete" ||
        statusLower === "paid" ||
        statusLower === "active";

      // Determine if payment/subscription is canceled, refunded, or expired
      const isCancelled = 
        eventLower === "payment.refunded" ||
        eventLower === "payment.chargeback" ||
        eventLower === "subscription.canceled" ||
        eventLower === "subscription.expired" ||
        eventLower === "subscription.paused" ||
        purchaseStatusLower === "refunded" ||
        purchaseStatusLower === "chargeback" ||
        purchaseStatusLower === "canceled" ||
        purchaseStatusLower === "expired" ||
        subscriptionStatusLower === "canceled" ||
        subscriptionStatusLower === "expired" ||
        statusLower === "refunded" ||
        statusLower === "chargeback" ||
        statusLower === "canceled" ||
        statusLower === "expired" ||
        statusLower === "paused";

      if (isApproved) {
        console.log(`[Hubla Approved] Email: ${emailNormalized}, checkoutId: ${checkoutId}. Resolving plan...`);

        let planName = "";
        let referrerPartnerId = "";
        let referrerPartnerName = "";

        const cleanCheckoutId = (checkoutId || "").trim();

        // Check if this is a Credit Structuring Service payment for a lead
        const SERVICE_CHECKOUT_CODES: Record<string, { id: string; nome: string }> = {
          "Es0EOCsgpzskcqccirFb": { id: "serv_renegociacao", nome: "Renegociação de Dívidas ou Limpa Nome Liminar" },
          "jPGT1i0rasCFQukOCgTG": { id: "serv_rating_score", nome: "Melhoria e Adequação de Rating e Score" },
          "i8q6VxUnLOVxTiZS2ZuI": { id: "serv_bacen", nome: "Regularização/Atuação Administrativa BACEN/SCR" },
          "1cJOgeOHRKpac7VNPowK": { id: "serv_contabil", nome: "Serviços Contábeis p/ Regularização/Adequação CNPJ" }
        };

        const matchedService = SERVICE_CHECKOUT_CODES[cleanCheckoutId];
        const offerTitle = (payload.data?.offer?.title || payload.data?.product?.name || "").toString().toLowerCase();

        let resolvedServiceKey = matchedService ? matchedService.id : "";
        let resolvedServiceName = matchedService ? matchedService.nome : "";

        if (!resolvedServiceKey && offerTitle) {
          if (offerTitle.includes("renegocia") || offerTitle.includes("limpa nome")) {
            resolvedServiceKey = "serv_renegociacao";
            resolvedServiceName = "Renegociação de Dívidas ou Limpa Nome Liminar";
          } else if (offerTitle.includes("rating") || offerTitle.includes("score")) {
            resolvedServiceKey = "serv_rating_score";
            resolvedServiceName = "Melhoria e Adequação de Rating e Score";
          } else if (offerTitle.includes("bacen") || offerTitle.includes("scr")) {
            resolvedServiceKey = "serv_bacen";
            resolvedServiceName = "Regularização/Atuação Administrativa BACEN/SCR";
          } else if (offerTitle.includes("contáb") || offerTitle.includes("contab") || offerTitle.includes("cnpj")) {
            resolvedServiceKey = "serv_contabil";
            resolvedServiceName = "Serviços Contábeis p/ Regularização/Adequação CNPJ";
          }
        }

        // Detect payment method (PIX vs Cartão) from Hubla payload
        const rawMethod = (
          payload.data?.payment?.payment_method ||
          payload.data?.payment?.method ||
          payload.payment?.payment_method ||
          payload.payment?.method ||
          payload.data?.payment_method ||
          payload.payment_method ||
          payload.data?.payment?.type ||
          payload.payment?.type ||
          ""
        ).toString().toLowerCase();

        const isPix = rawMethod.includes("pix");
        const metodoPagamento = isPix ? "PIX" : "Cartão de Crédito";
        const now = new Date();
        const dataPagamentoIso = now.toISOString();

        // Regra de liquidação financeira Hubla: PIX = 48h (2 dias), Cartão = 15 dias
        const dataLiberacaoSaqueDate = new Date(now.getTime() + (isPix ? 48 * 60 * 60 * 1000 : 15 * 24 * 60 * 60 * 1000));
        const dataLiberacaoSaqueIso = dataLiberacaoSaqueDate.toISOString();

        if (resolvedServiceKey) {
          console.log(`[Hubla Service Payment] Service: ${resolvedServiceName} (${resolvedServiceKey}) via ${metodoPagamento} for email: ${emailNormalized}. Liberação para: ${dataLiberacaoSaqueIso}`);

          const queryLeadId = (req.query.leadId || payload.data?.custom_fields?.leadId || payload.leadId || "").toString().trim();
          const buyerDocNum = (buyerDocument || "").replace(/\D/g, "");
          const buyerPhoneClean = (buyerPhone || "").replace(/\D/g, "");

          let leadDocToUpdate: any = null;

          if (queryLeadId) {
            const leadSnap = await getDoc(doc(db, "leads", queryLeadId));
            if (leadSnap.exists()) {
              leadDocToUpdate = { id: leadSnap.id, ...leadSnap.data() };
            }
          }

          if (!leadDocToUpdate && emailNormalized) {
            const qEmail = query(collection(db, "leads"), where("email", "==", emailNormalized));
            const snapEmail = await getDocs(qEmail);
            if (!snapEmail.empty) {
              leadDocToUpdate = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
            }
          }

          if (!leadDocToUpdate && buyerDocNum) {
            const qCnpj = query(collection(db, "leads"), where("cnpj", "==", buyerDocNum));
            const snapCnpj = await getDocs(qCnpj);
            if (!snapCnpj.empty) {
              leadDocToUpdate = { id: snapCnpj.docs[0].id, ...snapCnpj.docs[0].data() };
            } else {
              const qCpf = query(collection(db, "leads"), where("cpf", "==", buyerDocNum));
              const snapCpf = await getDocs(qCpf);
              if (!snapCpf.empty) {
                leadDocToUpdate = { id: snapCpf.docs[0].id, ...snapCpf.docs[0].data() };
              }
            }
          }

          if (!leadDocToUpdate && buyerPhoneClean) {
            const qPhone = query(collection(db, "leads"), where("whatsapp", "==", buyerPhoneClean));
            const snapPhone = await getDocs(qPhone);
            if (!snapPhone.empty) {
              leadDocToUpdate = { id: snapPhone.docs[0].id, ...snapPhone.docs[0].data() };
            }
          }

          if (leadDocToUpdate) {
            console.log(`Matched lead ${leadDocToUpdate.id} (${leadDocToUpdate.razaoSocial || leadDocToUpdate.nome}) for service payment!`);

            const rawServs = leadDocToUpdate.servicosRecomendados || [];
            const updatedServs = rawServs.map((s: any) => {
              const sId = (s.id || "").toString().toLowerCase();
              const sName = (s.nome || s.servico || "").toString().toLowerCase();
              if (sId === resolvedServiceKey || sName.includes(resolvedServiceName.toLowerCase().slice(0, 8))) {
                return {
                  ...s,
                  statusPagamento: "pago",
                  formaPagamento: "hubla",
                  metodoPagamento: metodoPagamento,
                  dataPagamento: dataPagamentoIso,
                  dataLiberacaoSaque: dataLiberacaoSaqueIso
                };
              }
              return s;
            });

            const rawSubEtapas = leadDocToUpdate.subEtapasPasso6 || [];
            const updatedSubEtapas = rawSubEtapas.map((sub: any) => {
              const subId = (sub.id || "").toString().toLowerCase();
              const subTitle = (sub.titulo || "").toString().toLowerCase();
              if (subId === resolvedServiceKey || subTitle.includes(resolvedServiceName.toLowerCase().slice(0, 8))) {
                return {
                  ...sub,
                  statusPagamento: "pago",
                  formaPagamento: "hubla",
                  metodoPagamento: metodoPagamento,
                  dataPagamento: dataPagamentoIso,
                  dataLiberacaoSaque: dataLiberacaoSaqueIso,
                  concluida: true
                };
              }
              return sub;
            });

            const historico = leadDocToUpdate.historicoEtapas || [];
            historico.push({
              data: new Date().toISOString(),
              etapaAnterior: leadDocToUpdate.etapa || 6,
              etapaNova: leadDocToUpdate.etapa || 6,
              autor: "Hubla (Webhook Automático)",
              detalhes: `Pagamento do serviço '${resolvedServiceName}' confirmado via ${metodoPagamento} na Hubla. Liberação de comissão e início dos serviços programados para ${dataLiberacaoSaqueDate.toLocaleDateString("pt-BR")} às ${dataLiberacaoSaqueDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} (${isPix ? "48h PIX" : "15 dias Cartão"}).`
            });

            await updateDoc(doc(db, "leads", leadDocToUpdate.id), {
              servicosRecomendados: updatedServs,
              subEtapasPasso6: updatedSubEtapas,
              historicoEtapas: historico
            });

            await addDoc(collection(db, "notificacoesSistema"), {
              id: `notif_${Date.now()}`,
              data: new Date().toISOString(),
              tipo: "pagamento",
              titulo: "Pagamento de Serviço Confirmado (Hubla)",
              mensagem: `O lead ${leadDocToUpdate.razaoSocial || leadDocToUpdate.nome} pagou o serviço '${resolvedServiceName}' via Hubla.`,
              lida: false,
              leadId: leadDocToUpdate.id
            });

            return res.status(200).json({
              status: "success",
              message: `Lead service payment for ${resolvedServiceName} processed successfully for lead ${leadDocToUpdate.id}`
            });
          } else {
            console.warn(`Service payment received for ${resolvedServiceName}, but no lead matched email ${emailNormalized} / doc ${buyerDocNum}.`);
            return res.status(200).json({
              status: "warning",
              message: `Service payment received for ${resolvedServiceName}, but no lead matched customer details.`
            });
          }
        }

        // 1. Resolve plan name based on standard Hubla checkout links
        if (cleanCheckoutId === "sSn9gIMlvXPt1ESeJJ4A") {
          planName = "STARTER";
        } else if (cleanCheckoutId === "UQLcJNaQrlNRsBl1bc2Y") {
          planName = "Executive Partner PROSFEC";
        } else if (cleanCheckoutId === "UZOZ2DtEyahRALjFN3ra") {
          planName = "FRANQUIA DIGITAL";
        } else if (cleanCheckoutId) {
          // 2. Query partners database to see if this represents an affiliate custom checkout code
          // Search Starter Checkouts
          const qStarter = query(collection(db, "parceiros"), where("hublaCodeStarter", "==", cleanCheckoutId));
          const snapStarter = await getDocs(qStarter);
          if (!snapStarter.empty) {
            planName = "STARTER";
            const refDoc = snapStarter.docs[0];
            referrerPartnerId = refDoc.id;
            referrerPartnerName = refDoc.data().nome || "";
          } else {
            // Search Executive Checkouts
            const qExec = query(collection(db, "parceiros"), where("hublaCodeExecutive", "==", cleanCheckoutId));
            const snapExec = await getDocs(qExec);
            if (!snapExec.empty) {
              planName = "Executive Partner PROSFEC";
              const refDoc = snapExec.docs[0];
              referrerPartnerId = refDoc.id;
              referrerPartnerName = refDoc.data().nome || "";
            } else {
              // Search Master Checkouts
              const qMaster = query(collection(db, "parceiros"), where("hublaCodeMaster", "==", cleanCheckoutId));
              const snapMaster = await getDocs(qMaster);
              if (!snapMaster.empty) {
                planName = "FRANQUIA DIGITAL";
                const refDoc = snapMaster.docs[0];
                referrerPartnerId = refDoc.id;
                referrerPartnerName = refDoc.data().nome || "";
              }
            }
          }
        }

        // Fallback plan name if none resolved
        if (!planName) {
          planName = "Executive Partner PROSFEC";
        }

        // Query the partner document by email to activate it
        const q = query(collection(db, "parceiros"), where("email", "==", emailNormalized));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          // Partner exists, activate them!
          for (const docSnap of querySnapshot.docs) {
            const partnerRef = doc(db, "parceiros", docSnap.id);
            const currentData = docSnap.data();

            const updatePayload: any = {
              status: "ativa",
              dataUltimoPagamento: new Date().toISOString(),
              plano: planName,
              duracaoDias: 30 // Set 30 days active period
            };

            // If we resolved an affiliate referrer, set the partner relationship
            if (referrerPartnerId && !currentData.parentPartnerId) {
              updatePayload.parentPartnerId = referrerPartnerId;
              updatePayload.parentPartnerNome = referrerPartnerName;
            }

            await updateDoc(partnerRef, updatePayload);
            console.log(`Successfully activated partner ${docSnap.id} with email ${emailNormalized} for plan ${planName}`);
          }
          return res.status(200).json({ status: "success", message: "Partner activated successfully" });
        } else {
          console.warn(`No partner found with email: ${emailNormalized}. Creating a pre-activated partner record...`);
          
          // If they pay before they create an account, pre-create the partner record
          const newPartner: any = {
            nome: buyerName || "Parceiro Hubla",
            email: emailNormalized,
            whatsapp: "",
            cidade: "",
            status: "ativa",
            plano: planName,
            dataCriacao: new Date().toISOString(),
            dataUltimoPagamento: new Date().toISOString(),
            duracaoDias: 30,
            interesse: "ser parceiro"
          };

          if (referrerPartnerId) {
            newPartner.parentPartnerId = referrerPartnerId;
            newPartner.parentPartnerNome = referrerPartnerName;
          }

          await addDoc(collection(db, "parceiros"), newPartner);
          
          return res.status(200).json({ status: "success", message: "Pre-paid partner created" });
        }
      } else if (isCancelled) {
        console.log(`Cancellation/Refund/Expiry event for email: ${emailNormalized}. Deactivating partner...`);

        // Query the partner document by email
        const q = query(collection(db, "parceiros"), where("email", "==", emailNormalized));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          for (const docSnap of querySnapshot.docs) {
            const partnerRef = doc(db, "parceiros", docSnap.id);
            await updateDoc(partnerRef, {
              status: "vencida",
              duracaoDias: 0 // Instantly sets status as "vencida" in getSubscriptionStatus
            });
            console.log(`Successfully deactivated partner ${docSnap.id} with email ${emailNormalized}`);
          }
          return res.status(200).json({ status: "success", message: "Partner deactivated successfully due to refund/cancellation" });
        } else {
          console.warn(`No partner found with email: ${emailNormalized} to deactivate.`);
          return res.status(200).json({ status: "warning", message: "Cancellation received but no partner record found to deactivate" });
        }
      } else {
        console.log(`Hubla event is not approved/cancelled. Ignoring.`);
        return res.status(200).json({ status: "ignored", message: "Event ignored" });
      }
    } catch (err: any) {
      console.error("Error processing Hubla Webhook:", err);
      return res.status(500).json({ status: "error", error: err.message });
    }
  });

  // Memory cache for Google Places Search and CNPJ Lookups
  const placesCache = new Map<string, { timestamp: number; data: any }>();
  const cnpjCache = new Map<string, { timestamp: number; data: any }>();

  // API Route: Caça Leads (Google Places API v1 Direct Search)
  app.post("/api/caca-leads", async (req, res) => {
    try {
      const { keyword, city, state, limit = 20, pageToken = "" } = req.body;
      
      if (!keyword || !city) {
        return res.status(400).json({ error: "Ramo/Segmento e Cidade são obrigatórios." });
      }

      const queryStr = `${keyword} em ${city}${state ? ` - ${state}` : ""}`;
      console.log(`[Google Places API] Initiating lead hunt for: "${queryStr}" with limit ${limit}`);

      const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.PLACES_API_KEY || "AIzaSyBLYM0vO54g1hos2EC6OEHu1oPw974t5mU";

      const requestedLimit = Math.min(Math.max(Number(limit), 1), 20);
      const allResults: any[] = [];
      let currentPageToken = pageToken || "";
      let hasMore = true;
      let pagesFetched = 0;
      const maxPages = 1; // 1 única requisição para economizar cota e custos de API (máximo 20 estabelecimentos por busca)

      while (allResults.length < requestedLimit && hasMore && pagesFetched < maxPages) {
        pagesFetched++;
        const pageSize = Math.min(20, requestedLimit - allResults.length);

        const payload: any = {
          textQuery: queryStr,
          pageSize: pageSize
        };
        if (currentPageToken) {
          payload.pageToken = currentPageToken;
        }

        const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_MAPS_KEY,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.primaryTypeDisplayName,nextPageToken"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[Google Places API] Error ${response.status}:`, errText);
          
          if (allResults.length === 0) {
            return res.status(502).json({ 
              error: `Erro ao consultar a API do Google Maps (${response.status}). Verifique se a chave de API está ativa e com faturamento habilitado.` 
            });
          }
          break;
        }

        const data: any = await response.json();
        const places = data.places || [];

        places.forEach((item: any, idx: number) => {
          allResults.push({
            id: item.id || `place-${Date.now()}-${allResults.length}`,
            nome: item.displayName?.text || "Sem nome",
            telefone: item.nationalPhoneNumber || "",
            website: item.websiteUri || "",
            endereco: item.formattedAddress || "",
            categoria: item.primaryTypeDisplayName?.text || keyword,
            nota: item.rating ?? null,
            avaliacoes: item.userRatingCount ?? 0,
            mapsUrl: item.googleMapsUri || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((item.displayName?.text || "") + " " + city)}`,
            cidade: city,
            estado: state || ""
          });
        });

        currentPageToken = data.nextPageToken || "";
        if (!currentPageToken) {
          hasMore = false;
        } else if (allResults.length < requestedLimit && pagesFetched < maxPages) {
          await new Promise(r => setTimeout(r, 350));
        }
      }

      console.log(`[Google Places API] Returned ${allResults.length} leads in ${pagesFetched} page(s). Next page token: ${currentPageToken ? "AVAILABLE" : "NONE"}`);

      return res.json({ 
        success: true, 
        async: false,
        results: allResults,
        nextPageToken: currentPageToken || null,
        totalFetched: allResults.length
      });

    } catch (err: any) {
      console.error("Error in /api/caca-leads:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao processar a busca de leads no Google Maps." });
    }
  });

  // API Route: Caça Leads Status / Polling Compatibility
  app.get("/api/caca-leads-status", async (req, res) => {
    return res.json({ 
      success: true, 
      status: "SUCCEEDED",
      results: []
    });
  });
    // Helper to fetch and normalize CNPJ details from multiple public APIs (BrasilAPI, ReceitaWS, MinhaReceita)
  async function fetchCnpjFromPublicApis(cleanCnpj: string): Promise<any | null> {
    if (!cleanCnpj || cleanCnpj.length !== 14) return null;

    // 1. Try BrasilAPI
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data: any = await response.json();
        return {
          cnpj: data.cnpj?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") || cleanCnpj,
          razaoSocial: data.razao_social || "",
          nomeFantasia: data.nome_fantasia || data.razao_social || "",
          situacaoCadastral: data.descricao_situacao_cadastral || "ATIVA",
          dataAbertura: data.data_inicio_atividade || "",
          cnae: `${data.cnae_fiscal || ""} - ${data.cnae_fiscal_descricao || ""}`,
          cnaePrincipalDescricao: data.cnae_fiscal_descricao || "",
          naturezaJuridica: data.natureza_juridica || "",
          porte: data.porte || "DEMAIS",
          capitalSocial: Number(data.capital_social) || 0,
          enderecoFiscal: `${data.logradouro || ""}, ${data.numero || ""}${data.complemento ? ` - ${data.complemento}` : ""} - ${data.bairro || ""}, ${data.municipio || ""}/${data.uf || ""}`,
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          bairro: data.bairro || "",
          municipio: data.municipio || "",
          uf: data.uf || "",
          socios: (data.qsa || []).map((s: any) => ({
            nome: s.nome_socio || s.nome,
            qualificacao: s.qualificacao_socio || "Sócio"
          })),
          qsa: data.qsa || [],
          telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : "",
          email: data.email || ""
        };
      }
    } catch (e) {
      console.warn(`[CNPJ Fetch] BrasilAPI error/timeout for ${cleanCnpj}:`, e);
    }

    // 2. Fallback: ReceitaWS
    try {
      const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCnpj}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data: any = await response.json();
        if (data.status !== "ERROR") {
          return {
            cnpj: data.cnpj || cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
            razaoSocial: data.nome || "",
            nomeFantasia: data.fantasia || data.nome || "",
            situacaoCadastral: data.situacao || "ATIVA",
            dataAbertura: data.abertura || "",
            cnae: data.atividade_principal && data.atividade_principal[0] ? `${data.atividade_principal[0].code} - ${data.atividade_principal[0].text}` : "",
            cnaePrincipalDescricao: data.atividade_principal && data.atividade_principal[0] ? data.atividade_principal[0].text : "",
            naturezaJuridica: data.natureza_juridica || "",
            porte: data.porte || "DEMAIS",
            capitalSocial: parseFloat(data.capital_social) || 0,
            enderecoFiscal: `${data.logradouro || ""}, ${data.numero || ""} - ${data.bairro || ""}, ${data.municipio || ""}/${data.uf || ""}`,
            logradouro: data.logradouro || "",
            numero: data.numero || "",
            bairro: data.bairro || "",
            municipio: data.municipio || "",
            uf: data.uf || "",
            socios: (data.qsa || []).map((s: any) => ({
              nome: s.nome,
              qualificacao: s.qual_rep_legal || s.qual || "Sócio"
            })),
            qsa: data.qsa || [],
            telefone: data.telefone || "",
            email: data.email || ""
          };
        }
      }
    } catch (e) {
      console.warn(`[CNPJ Fetch] ReceitaWS error/timeout for ${cleanCnpj}:`, e);
    }

    // 3. Fallback: MinhaReceita
    try {
      const response = await fetch(`https://minhareceita.org/${cleanCnpj}`, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(3500)
      });
      if (response.ok) {
        const data: any = await response.json();
        return {
          cnpj: cleanCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"),
          razaoSocial: data.razao_social || "",
          nomeFantasia: data.nome_fantasia || data.razao_social || "",
          situacaoCadastral: data.descricao_situacao_cadastral || "ATIVA",
          dataAbertura: data.data_inicio_atividade || "",
          cnae: `${data.cnae_fiscal || ""} - ${data.cnae_fiscal_descricao || ""}`,
          cnaePrincipalDescricao: data.cnae_fiscal_descricao || "",
          naturezaJuridica: data.natureza_juridica || "",
          porte: data.porte || "DEMAIS",
          capitalSocial: data.capital_social || 0,
          enderecoFiscal: `${data.logradouro || ""}, ${data.numero || ""} - ${data.bairro || ""}, ${data.municipio || ""}/${data.uf || ""}`,
          logradouro: data.logradouro || "",
          numero: data.numero || "",
          bairro: data.bairro || "",
          municipio: data.municipio || "",
          uf: data.uf || "",
          socios: (data.qsa || []).map((s: any) => ({
            nome: s.nome_socio || s.nome,
            qualificacao: s.qualificacao_socio || "Sócio"
          })),
          qsa: data.qsa || [],
          telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : "",
          email: data.email || ""
        };
      }
    } catch (e) {
      console.warn(`[CNPJ Fetch] MinhaReceita error/timeout for ${cleanCnpj}:`, e);
    }

    return null;
  }

  // Helper to auto-discover CNPJ candidate list from business name, address, website or web search
  async function discoverCnpjForBusiness(nomeEmpresa: string, cidade?: string, estado?: string, address?: string, website?: string): Promise<string[]> {
    const candidateCnpjs = new Set<string>();
    try {
      // 1. Check if CNPJ is already embedded in address or website string
      const searchTargets = [nomeEmpresa, address || "", website || ""].join(" ");
      const inlineMatches = searchTargets.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g);
      if (inlineMatches && inlineMatches.length > 0) {
        inlineMatches.forEach(m => candidateCnpjs.add(m.replace(/\D/g, "")));
      }

      // 2. Build smart search queries
      const cleanName = nomeEmpresa.replace(/[^\w\s]/gi, " ").trim();
      const nameWords = cleanName.split(/\s+/).filter(w => w.length > 2);

      const searchQueries = [
        `${cleanName} ${cidade || ""} ${estado || ""} CNPJ`,
        `"${cleanName}" ${cidade || ""} CNPJ`
      ];

      for (const query of searchQueries) {
        console.log(`[CNPJ Auto-Discovery] Querying search for: "${query}"`);
        
        // Yahoo Search API
        const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
        const yahooRes = await fetch(yahooUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8"
          },
          signal: AbortSignal.timeout(3000)
        }).catch(() => null);

        if (yahooRes && yahooRes.ok) {
          const html = await yahooRes.text();
          const matches = html.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g);
          if (matches && matches.length > 0) {
            matches.forEach(m => candidateCnpjs.add(m.replace(/\D/g, "")));
            console.log(`[CNPJ Auto-Discovery] Found ${matches.length} candidates via Yahoo`);
          }
        }

        if (candidateCnpjs.size > 0) break;
      }
    } catch (err) {
      console.warn("[CNPJ Auto-Discovery] Exception during search:", err);
    }
    return Array.from(candidateCnpjs);
  }

  // API Route: CNPJ Search & Enrichment (BrasilAPI + ReceitaWS + MinhaReceita)
  app.post("/api/consulta-cnpj", async (req, res) => {
    try {
      let { cnpj, nomeEmpresa, cidade, estado, endereco, website } = req.body;

      if (cnpj) {
        cnpj = cnpj.replace(/\D/g, "");
      }

      // Check memory cache if CNPJ is direct
      if (cnpj && cnpj.length === 14 && cnpjCache.has(cnpj)) {
        const cached = cnpjCache.get(cnpj)!;
        if (Date.now() - cached.timestamp < 3600000) { // 1 hour cache
          return res.json({ success: true, cached: true, ...cached.data });
        }
      }

      // If CNPJ is provided directly
      if (cnpj && cnpj.length === 14) {
        const result = await fetchCnpjFromPublicApis(cnpj);
        if (result) {
          cnpjCache.set(cnpj, { timestamp: Date.now(), data: result });
          return res.json({ success: true, ...result });
        }
      }

      // If CNPJ was NOT directly provided or failed, run Auto-Discovery using company name & location
      if (nomeEmpresa) {
        console.log(`[CNPJ Auto-Discovery] Initiating lookup for "${nomeEmpresa}" in "${cidade || "BR"}"...`);
        const candidateCnpjs = await discoverCnpjForBusiness(nomeEmpresa, cidade, estado, endereco, website);
        
        for (const candidate of candidateCnpjs) {
          if (candidate.length !== 14) continue;

          if (cnpjCache.has(candidate)) {
            const cached = cnpjCache.get(candidate)!;
            if (Date.now() - cached.timestamp < 3600000) {
              return res.json({ success: true, autoDiscovered: true, cached: true, ...cached.data });
            }
          }

          const result = await fetchCnpjFromPublicApis(candidate);
          if (result) {
            console.log(`[CNPJ Auto-Discovery] Successfully matched & verified CNPJ ${candidate} for "${nomeEmpresa}"!`);
            cnpjCache.set(candidate, { timestamp: Date.now(), data: result });
            return res.json({ success: true, autoDiscovered: true, ...result });
          }
        }
      }

      if (nomeEmpresa) {
        return res.json({
          success: false,
          needManualInput: true,
          error: "Não localizamos automaticamente o CNPJ público para este estabelecimento. Digite o CNPJ para buscar a Ficha Oficial da Receita Federal."
        });
      }

      return res.status(400).json({ success: false, error: "Informe o CNPJ ou o nome da empresa para consulta." });

    } catch (err: any) {
      console.error("Error in /api/consulta-cnpj:", err);
      return res.status(500).json({ success: false, error: err.message || "Erro interno ao consultar CNPJ." });
    }
  });

  // --- CREDIT QUERY API INTEGRATION (REDEBE API) ---
  let REDEBE_TOKEN = process.env.REDEBE_TOKEN || "ctk_6626261e8e3c6a7ecae118fa6415975852cc6d3b73dabca9fc7f3748eb216851";
  const REDEBE_API_URL = "https://consultas.redebe.com.br/api/v1/credito/diagnostico-inteligente";

  let INTEGRADOR_API_KEY = process.env.INTEGRADOR_API_KEY || "intg_Rx5O65qGdNeY6vR1RFjSiKYH0AmXqE0GYFitRYiqf-c";
  if (INTEGRADOR_API_KEY === "Tony@3419") {
    INTEGRADOR_API_KEY = "intg_Rx5O65qGdNeY6vR1RFjSiKYH0AmXqE0GYFitRYiqf-c";
  }

  let INTEGRADOR_BASE_URL = process.env.INTEGRADOR_API_BASE_URL || "https://kqfciyqklrosqmgjzjtb.supabase.co/functions/v1";
  if (!INTEGRADOR_BASE_URL || !INTEGRADOR_BASE_URL.startsWith("http")) {
    console.warn(`Invalid or empty INTEGRADOR_API_BASE_URL "${INTEGRADOR_BASE_URL}". Falling back to production URL.`);
    INTEGRADOR_BASE_URL = "https://kqfciyqklrosqmgjzjtb.supabase.co/functions/v1";
  }

  const FALLBACK_CATALOG = [
    { code: "REDEBE_DIAGNOSTICO_360", name: "Rating de Crédito + Diagnóstico Finan. 360", price: 49.90 }
  ];

  // 1. List Credit Catalog (RedeBe 360 product at R$ 49.90 + 40% Prosfec profit = R$ 69.86)
  app.get("/api/credit/catalogo", async (req, res) => {
    try {
      console.log("Loading credit catalog for RedeBe and custom base prices...");
      
      let customBasePrices: Record<string, number> = {};
      try {
        const configSnap = await getDoc(doc(db, "configuracoes", "precos_consultas"));
        if (configSnap.exists()) {
          customBasePrices = configSnap.data().precos || {};
        }
      } catch (err) {
        console.warn("Could not load custom base prices from config:", err);
      }

      const partnerCatalog = FALLBACK_CATALOG.map((item: any) => {
        let origPrice = item.price;
        if (customBasePrices[item.code] !== undefined) {
          origPrice = Number(customBasePrices[item.code]);
        }

        // Apply 40% margin markup for partner selling price (e.g. 49.90 * 1.40 = 69.86)
        const partnerPrice = Number((origPrice * 1.40).toFixed(2));
        return {
          code: item.code,
          name: item.name,
          originalPrice: origPrice,
          price: partnerPrice
        };
      });

      return res.json({ success: true, catalog: partnerCatalog });
    } catch (err: any) {
      console.error("Error in /api/credit/catalogo:", err);
      const partnerCatalog = FALLBACK_CATALOG.map((item: any) => ({
        code: item.code,
        name: item.name,
        originalPrice: item.price,
        price: Number((item.price * 1.40).toFixed(2))
      }));
      return res.json({ success: true, catalog: partnerCatalog, isFallback: true });
    }
  });

  // 2. Fetch Supplier API Balance
  app.get("/api/credit/supplier-balance", async (req, res) => {
    try {
      const url = `${INTEGRADOR_BASE_URL}/integrador-api-saldo`;
      const response = await fetch(url, {
        headers: { "x-api-key": INTEGRADOR_API_KEY }
      });

      if (!response.ok) {
        throw new Error(`Supplier API returned status ${response.status}`);
      }

      const data: any = await response.json();
      return res.json({ success: true, balance: data.saldo !== undefined ? data.saldo : data.balance });
    } catch (err: any) {
      console.error("Error fetching supplier balance:", err);
      return res.status(502).json({ error: "Não foi possível consultar o saldo com o integrador principal." });
    }
  });

  // 3. Execute Credit Query (RedeBe API)
  app.post("/api/credit/consultas", async (req, res) => {
    try {
      const { partnerId, partnerNome, produto_code, produtoCode, input_data, documento: directDoc, isAdminBypass } = req.body;
      const codeToUse = produto_code || produtoCode || "REDEBE_DIAGNOSTICO_360";
      const rawDoc = input_data?.documento || directDoc;

      if (!partnerId || !rawDoc) {
        return res.status(400).json({ error: "Parâmetros partnerId e documento são obrigatórios." });
      }

      const cleanDoc = String(rawDoc).replace(/\D/g, "");
      if (!cleanDoc || (cleanDoc.length !== 11 && cleanDoc.length !== 14)) {
        return res.status(400).json({ error: "Documento inválido. Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido." });
      }

      console.log(`Executing RedeBe credit query for partner ${partnerId} on document ${cleanDoc} (isAdminBypass=${!!isAdminBypass})...`);

      // 3.1 Retrieve partner from Firestore to check balance
      const partnerRef = doc(db, "parceiros", partnerId);
      const partnerSnap = await getDoc(partnerRef);

      let currentBalance = 0;
      let partnerData: any = null;
      const isAdminUser = partnerId === "admin" || partnerId === "mesa_operacoes" || !!isAdminBypass;

      if (partnerSnap.exists()) {
        partnerData = partnerSnap.data();
        currentBalance = partnerData?.saldoConsultas !== undefined ? Number(partnerData.saldoConsultas) : 0.00;
      } else if (isAdminUser) {
        currentBalance = 999999;
      } else {
        return res.status(404).json({ error: "Parceiro não encontrado no sistema." });
      }

      // 3.2 Determine price (Base R$ 49.90 + 40% Lucro Prosfec = R$ 69.86)
      let customBasePrices: Record<string, number> = {};
      try {
        const configSnap = await getDoc(doc(db, "configuracoes", "precos_consultas"));
        if (configSnap.exists()) {
          customBasePrices = configSnap.data().precos || {};
        }
      } catch (err) {
        console.warn("Could not load custom base prices from config:", err);
      }

      const catalogItem = FALLBACK_CATALOG.find((item: any) => item.code === codeToUse) || FALLBACK_CATALOG[0];
      let origPrice = catalogItem.price;
      if (customBasePrices[codeToUse] !== undefined) {
        origPrice = Number(customBasePrices[codeToUse]);
      }

      const partnerPrice = Number((origPrice * 1.40).toFixed(2)); // R$ 69.86 for 49.90 base
      const produtoNome = catalogItem.name;

      // 3.3 Validate balance
      if (!isAdminUser && currentBalance < partnerPrice) {
        return res.status(400).json({ 
          error: `Saldo insuficiente para realizar esta consulta. Esta consulta custa R$ ${partnerPrice.toFixed(2).replace(".", ",")} e seu saldo atual é R$ ${currentBalance.toFixed(2).replace(".", ",")}. Realize uma recarga via Pix para prosseguir.`
        });
      }

      // 3.4 Call RedeBe API
      console.log(`Calling RedeBe API endpoint for document ${cleanDoc}...`);
      const HARDCODED_TOKEN = "ctk_6626261e8e3c6a7ecae118fa6415975852cc6d3b73dabca9fc7f3748eb216851";
      const envToken = process.env.REDEBE_TOKEN ? process.env.REDEBE_TOKEN.trim() : "";
      const tokenToUse = (envToken.startsWith("ctk_") || envToken.length > 20)
        ? envToken.replace(/^Bearer\s+/i, "").trim()
        : HARDCODED_TOKEN;

      let apiResult: any = null;
      let isSuccess = false;

      try {
        const redebeRes = await fetch(REDEBE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${tokenToUse}`,
            "X-Api-Token": tokenToUse
          },
          body: JSON.stringify({ documento: cleanDoc })
        });

        if (!redebeRes.ok) {
          const errText = await redebeRes.text();
          console.error(`RedeBe API returned status ${redebeRes.status}:`, errText);
          return res.status(502).json({
            error: `A API da RedeBe retornou um erro (${redebeRes.status}). Verifique o token ou tente novamente em instantes.`
          });
        }

        apiResult = await redebeRes.json();
        console.log("RedeBe API response successfully received for document:", cleanDoc);
        isSuccess = true;
      } catch (fetchErr: any) {
        console.error("Fetch exception while calling RedeBe API:", fetchErr);
        return res.status(502).json({
          error: `Falha na conexão com a API da RedeBe: ${fetchErr.message || "Timeout de conexão."}`
        });
      }

      // 3.5 Deduct balance in Firestore ONLY if not admin bypass
      let newBalance = currentBalance;
      if (partnerSnap.exists() && !isAdminUser) {
        newBalance = Number((currentBalance - partnerPrice).toFixed(2));
        await updateDoc(partnerRef, {
          saldoConsultas: newBalance
        });
      }

      // 3.6 Register the consultation in Firestore
      const consultaDoc = {
        partnerId,
        partnerNome: partnerNome || partnerData?.nome || (isAdminUser ? "Administrador / Mesa de Operações" : "Parceiro"),
        produto_code: codeToUse,
        produto_nome: produtoNome,
        documento: cleanDoc,
        preco_original: origPrice,
        preco_parceiro: isAdminUser ? 0 : partnerPrice,
        isAdminBypass: !!isAdminUser,
        dataConsulta: new Date().toISOString(),
        status: "sucesso",
        request_id: `redebe_${Date.now()}`,
        consulta_id: `redebe_${Date.now()}`,
        resultado: apiResult
      };

      const consultaRef = await addDoc(collection(db, "consultas_realizadas"), consultaDoc);

      // Create local notification for the partner if not admin bypass
      if (!isAdminUser) {
        try {
          await addDoc(collection(db, "notificacoes"), {
            recipientId: partnerId,
            recipientType: "parceiro",
            titulo: "Consulta Realizada (RedeBe 360)",
            mensagem: `Consulta de crédito (${cleanDoc.length === 11 ? "CPF" : "CNPJ"}: ${cleanDoc}) realizada com sucesso. Valor de R$ ${partnerPrice.toFixed(2).replace(".", ",")} debitado do seu saldo.`,
            tipo: "success",
            lida: false,
            dataCriacao: new Date().toISOString()
          });
        } catch (notifErr) {
          console.error("Failed to create notification for query:", notifErr);
        }
      }

      return res.json({
        success: true,
        consulta_id: consultaRef.id,
        newBalance: newBalance,
        produto_nome: produtoNome,
        data: apiResult,
        meta: {
          price: isAdminUser ? 0 : partnerPrice,
          isAdminBypass: !!isAdminUser
        }
      });

    } catch (err: any) {
      console.error("Error executing RedeBe credit query:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao executar a consulta de crédito." });
    }
  });

  // 4. Fetch Result of an existing Credit Query
  app.get("/api/credit/consulta-resultado", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Parâmetro 'id' (consulta_id) é obrigatório." });
      }

      const url = `${INTEGRADOR_BASE_URL}/integrador-api-consulta-resultado?id=${id}`;
      const response = await fetch(url, {
        headers: { "x-api-key": INTEGRADOR_API_KEY }
      });

      if (!response.ok) {
        throw new Error(`Supplier API returned status ${response.status}`);
      }

      const data: any = await response.json();
      return res.json({ success: true, data: data });
    } catch (err: any) {
      console.error("Error in /api/credit/consulta-resultado:", err);
      return res.status(500).json({ error: err.message || "Erro ao buscar resultado da consulta." });
    }
  });

  // 5. Generate PROSFEC IA Diagnostic based on credit queries and lead details
  let aiClient: any = null;
  function getGeminiAI() {
    if (!aiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("A chave GEMINI_API_KEY não foi encontrada no arquivo .env ou no painel de controle.");
      }
      aiClient = new GoogleGenAI({ apiKey: key });
    }
    return aiClient;
  }

  async function generateContentWithFallback(ai: any, requestOptions: any) {
    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          ...requestOptions,
          model: modelName
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        // If resource exhausted (429) or invalid model (404), skip to next candidate immediately
        const status = err?.status || err?.code;
        if (status === 429 || status === 404 || err?.message?.includes("RESOURCE_EXHAUSTED")) {
          continue;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
    throw lastError || new Error("Falha ao se comunicar com os modelos Gemini.");
  }

  app.post("/api/credit/diagnostico-prosfec", async (req, res) => {
    try {
      const { leadId, partnerId } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: "O parâmetro leadId é obrigatório." });
      }

      console.log(`Generating PROSFEC IA Diagnosis for lead: ${leadId}...`);

      // 1. Fetch Lead data
      const leadRef = doc(db, "leads", leadId);
      const leadSnap = await getDoc(leadRef);

      if (!leadSnap.exists()) {
        return res.status(404).json({ error: "Lead não encontrado no banco de dados." });
      }

      const leadData = leadSnap.data();

      // Check generation count limit (Initial generation = 1, Refazer = 2 max)
      const previousGeracoesCount = Number(
        leadData.diagnosticoPROSFEC?.geracoesCount ||
        leadData.diagnosticoGeracoesCount ||
        (leadData.diagnosticoPROSFEC ? 1 : 0)
      );

      if (previousGeracoesCount >= 2) {
        return res.status(400).json({
          success: false,
          error: "O diagnóstico de IA já foi refeito 1 vez. O limite máximo de reanálises foi atingido para este lead."
        });
      }

      const newGeracoesCount = previousGeracoesCount + 1;

      // 2. Fetch credit consultations performed for this lead's CNPJ or their partner's CPFs
      const docList: string[] = [];
      if (leadData.cnpj) docList.push(leadData.cnpj.replace(/\D/g, ""));
      
      if (leadData.socios && Array.isArray(leadData.socios)) {
        leadData.socios.forEach((s: any) => {
          if (s.cpf) {
            docList.push(s.cpf.replace(/\D/g, ""));
          }
        });
      }

      let matchingConsultas: any[] = [];
      if (docList.length > 0) {
        try {
          const consultasRef = collection(db, "consultas_realizadas");
          const q = query(consultasRef, where("documento", "in", docList));
          const querySnap = await getDocs(q);
          
          matchingConsultas = querySnap.docs.map(doc => ({
            id: doc.id,
            produto_nome: doc.data().produto_nome,
            produto_code: doc.data().produto_code,
            dataConsulta: doc.data().dataConsulta,
            resultado: doc.data().resultado
          }));
        } catch (dbErr) {
          console.warn("Could not load matching consultations from Firestore:", dbErr);
        }
      }

      // Compile summaries of consultations
      const consultationsSummary = matchingConsultas.map(c => {
        const cleanResult = { ...c.resultado };
        if (cleanResult.html_report) delete cleanResult.html_report;
        if (cleanResult.pdf_report) delete cleanResult.pdf_report;
        if (cleanResult.raw_response) delete cleanResult.raw_response;

        return {
          id: c.id,
          produto: c.produto_nome,
          codigo: c.produto_code,
          data: c.dataConsulta,
          resumo_resultado: cleanResult
        };
      });

      // 3. Load dynamic service price catalog from Firestore
      let activeServicesCatalog = [
        { id: "serv_renegociacao", nome: "Renegociação de Dívidas", valor: 300 },
        { id: "serv_rating_score", nome: "Melhoria e Adequação de Rating e Score", valor: 1100 },
        { id: "serv_bacen", nome: "Regularização/Atuação Administrativa BACEN/SCR", valor: 2500 },
        { id: "serv_contabil", nome: "Serviços Contábeis p/ Regularização/Adequação CNPJ", valor: 700 }
      ];

      try {
        const configSnap = await getDoc(doc(db, "configuracoes", "precos_consultas"));
        if (configSnap.exists() && configSnap.data().servicos && Array.isArray(configSnap.data().servicos) && configSnap.data().servicos.length > 0) {
          activeServicesCatalog = configSnap.data().servicos.filter((s: any) =>
            s.id !== "serv_diagnostico" &&
            s.id !== "serv_caca_leads" &&
            !s.nome?.toLowerCase().includes("diagnóstico de crédito") &&
            !s.nome?.toLowerCase().includes("caça-leads")
          );
        }
      } catch (err) {
        console.warn("Could not load dynamic price catalog from Firestore, using default:", err);
      }

      // Ensure activeServicesCatalog ALWAYS unifies Rating and Score into one item
      const hasSeparateScoreOrRating = activeServicesCatalog.some(s => 
        s.id === "serv_score" || 
        s.id === "serv_rating" || 
        (s.nome && s.nome.toLowerCase().includes("score") && !s.nome.toLowerCase().includes("rating")) ||
        (s.nome && s.nome.toLowerCase().includes("rating") && !s.nome.toLowerCase().includes("score"))
      );

      if (hasSeparateScoreOrRating) {
        let scoreVal = 400;
        let ratingVal = 700;
        const sanitizedCatalog = activeServicesCatalog.filter(s => {
          if (s.id === "serv_score" || (s.nome && s.nome.toLowerCase().includes("score") && !s.nome.toLowerCase().includes("rating"))) {
            if (s.valor) scoreVal = Number(s.valor);
            return false;
          }
          if (s.id === "serv_rating" || (s.nome && s.nome.toLowerCase().includes("rating") && !s.nome.toLowerCase().includes("score"))) {
            if (s.valor) ratingVal = Number(s.valor);
            return false;
          }
          return true;
        });

        if (!sanitizedCatalog.some(s => s.id === "serv_rating_score" || (s.nome && s.nome.toLowerCase().includes("rating") && s.nome.toLowerCase().includes("score")))) {
          sanitizedCatalog.splice(1, 0, {
            id: "serv_rating_score",
            nome: "Melhoria e Adequação de Rating e Score",
            valor: scoreVal + ratingVal
          });
        }
        activeServicesCatalog = sanitizedCatalog;
      }

      const catalogPromptText = activeServicesCatalog
        .map((s, idx) => `${idx + 1}. ${s.nome}: R$ ${Number(s.valor || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
        .join("\n");

      // 4. Lazy initialize Gemini API and run analysis
      const ai = getGeminiAI();

      const systemPrompt = `Você é a PROSFEC IA, o sistema de Inteligência Artificial oficial para a PROSFEC Soluções Administrativas e Financeiras.
Sua missão é gerar um diagnóstico de crédito e plano de fomento personalizado e profissional para um Lead (empresa indicada) com base nos relatórios de consultas de crédito fornecidos (CPF do sócio e/ou CNPJ da empresa).

Informações Básicas da Empresa (Lead):
- Razão Social/Nome da Empresa: ${leadData.razaoSocial || leadData.nome || "Não informado"}
- CNPJ: ${leadData.cnpj || "Não informado"}
- Faturamento Anual Declarado: R$ ${(leadData.faturamentoAnual || (leadData.mediaReceitaMensal ? leadData.mediaReceitaMensal * 12 : 0) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Atividade / Ramo: ${leadData.ramo || "Não informado"}
- Porte: ${leadData.porte || "Não informado"}
- Sócios Cadastrados: ${leadData.socios ? leadData.socios.map((s: any) => `${s.nome} (CPF: ${s.cpf || "não informado"})`).join(", ") : "Nenhum sócio informado"}

Dados Históricos de Consultas de Crédito Efetuadas no Sistema (Serasa, SPC, Boa Vista, etc.):
${consultationsSummary.length > 0 ? JSON.stringify(consultationsSummary, null, 2) : "Nenhuma consulta de crédito foi efetuada no sistema para este CNPJ ou CPFs dos sócios até o momento. Prossiga com uma análise de elegibilidade prévia de fomento baseada no faturamento declarado, e sugira que o consultor execute as consultas de crédito da grade PROSFEC para obter um diagnóstico mais robusto."}

REGRA DE COMISSÃO PROSFEC SOBRE O CRÉDITO:
A comissão da PROSFEC sobre a captação de crédito é de exatos 5% sobre o valor efetivamente liberado ao cliente.
Os serviços operacionais e administrativos necessários são precificados por item e cobrados separadamente, sem alteração na taxa do crédito.

CATÁLOGO OFICIAL DE SERVIÇOS PROSFEC (Valores Atualizados em Sistema):
${catalogPromptText}

DIRETRIZES CRÍTICAS PARA A SUA RESPOSTA:
1. UNIFICAÇÃO DE RATING E SCORE (REGRA OBRIGATÓRIA):
   - NUNCA mencione, precifique ou recomende 'Melhoria de Rating' e 'Melhoria de Score' em separado.
   - A PROSFEC unificou esses serviços em uma única solução conjunta: "Melhoria e Adequação de Rating e Score" (cobrança única e unificada).
   - Se o diagnóstico identificar necessidade de elevação de score, rating interno bancário ou remoção de restrições em bureaus/SCR, recomende unicamente o serviço "Melhoria e Adequação de Rating e Score".

2. AVALIAÇÃO DE SERVIÇOS NECESSÁRIOS:
   - Os serviços NÃO DEVEM ser aplicados automaticamente a todos os clientes.
   - SE O PERFIL ESTIVER ADEQUADO (sem dívidas/restrições graves, CND ok, faturamento compatível): Não recomende serviços adicionais. Indique que o cliente segue direto para a proposta de crédito de 5%.
   - SE O PERFIL APRESENTAR PROBLEMAS: Indique SOMENTE os serviços específicos do catálogo necessários para resolver as pendências apontadas.

3. FOCO TOTAL NAS AÇÕES EXECUTADAS PELA PROSFEC:
   - Apresente claramente as ações que a PROSFEC executará para restabelecer e potencializar o crédito deste lead.
   - NÃO diga ao lead para ir resolver no banco sozinho. A abordagem deve ser "A PROSFEC fará X, cuidará de Y, aplicará Z".

4. ESTRUTURA DO DIAGNÓSTICO EM MARKDOWN:
   - **Análise Situacional**: Limitadores identificados ou pré-análise do faturamento.
   - **Plano de Ação PROSFEC IA**: Intervenções administrativas aplicadas pela PROSFEC.
   - **Oportunidades de Fomento & Captação**: Linhas de crédito aptas (PRONAMPE, FGI PEAC, etc) e estimativas com comissão de 5% sobre o crédito liberado.
   - **Conclusão de Enquadramento**: Parecer técnico de elegibilidade (Alta, Média ou Baixa).

5. ESTRUTURAÇÃO DE DADOS EM JSON OBRIGATÓRIOS AO FINAL:
   Inclua dois blocos JSON delimitados estritamente ao final do relatório:

   A) Bloco \`\`\`json_servicos com a lista de serviços RECOMENDADOS (somente os necessários do catálogo PROSFEC, ou [] se o perfil for adequado):
   \`\`\`json_servicos
   [
     { "id": "serv_rating_score", "nome": "Melhoria e Adequação de Rating e Score", "valor": 1100, "justificativa": "Para elevação unificada do Rating interno bancário e Score do CPF e CNPJ nos bureaus e Banco Central" }
   ]
   \`\`\`

   B) Bloco \`\`\`json_subetapas contendo 5 sub-etapas acionáveis da Etapa 6 (Estruturação):
   \`\`\`json_subetapas
   [
     { "titulo": "Renegociação e quitação estratégica das restrições ativas", "preco": 300 },
     { "titulo": "Regularização de pendências cadastrais e emissão de CNDs", "preco": 0 },
     { "titulo": "Atualização de faturamento e transmissão e-CAC", "preco": 700 },
     { "titulo": "Melhoria e Adequação unificada do Rating de Crédito e Score no SCR / BACEN", "preco": 1100 },
     { "titulo": "Submissão do dossier enquadrado nas esteiras PRONAMPE", "preco": 0 }
   ]
   \`\`\``;

      const response = await generateContentWithFallback(ai, {
        contents: systemPrompt
      });

      const responseText = response.text || "";

      if (!responseText) {
        throw new Error("O Gemini não retornou nenhum conteúdo válido para o diagnóstico.");
      }

      let cleanText = responseText;
      let customServicos: any[] = [];
      let customSubEtapas: { id: string; titulo: string; concluida: boolean; preco?: number }[] = [];

      // Extract json_servicos
      const matchServicos = responseText.match(/```json_servicos\s*([\s\S]*?)\s*```/);
      if (matchServicos && matchServicos[1]) {
        try {
          const parsedServ = JSON.parse(matchServicos[1].trim());
          if (Array.isArray(parsedServ)) {
            const rawServs = parsedServ.map((item: any) => ({
              id: item.id || `serv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              nome: item.nome || item.servico || "Serviço PROSFEC",
              valor: typeof item.valor === "number" ? item.valor : (parseFloat(item.valor) || 0),
              justificativa: item.justificativa || "",
              status: "pendente"
            }));

            let hasRatingScore = false;
            const targetRatingScoreObj = activeServicesCatalog.find(c => (c.id && c.id === "serv_rating_score") || (c.nome && c.nome.toLowerCase().includes("rating") && c.nome.toLowerCase().includes("score")));
            const targetPrice = targetRatingScoreObj ? Number(targetRatingScoreObj.valor) : 1100;
            const targetName = targetRatingScoreObj ? targetRatingScoreObj.nome : "Melhoria e Adequação de Rating e Score";

            customServicos = [];
            for (const s of rawServs) {
              const nameLower = (s.nome || "").toLowerCase();
              const isRS = s.id === "serv_rating" || s.id === "serv_score" || s.id === "serv_rating_score" || nameLower.includes("rating") || nameLower.includes("score");
              if (isRS) {
                if (!hasRatingScore) {
                  hasRatingScore = true;
                  customServicos.push({
                    ...s,
                    id: "serv_rating_score",
                    nome: targetName,
                    valor: targetPrice
                  });
                }
              } else {
                const matchedCat = activeServicesCatalog.find(c => (c.id && s.id && c.id === s.id) || (c.nome && c.nome.toLowerCase().trim() === nameLower.trim()));
                customServicos.push({
                  ...s,
                  valor: matchedCat ? Number(matchedCat.valor) : s.valor
                });
              }
            }
          }
          cleanText = cleanText.replace(/```json_servicos\s*[\s\S]*?\s*```/, "").trim();
        } catch (e) {
          console.warn("Could not parse json_servicos block from PROSFEC IA response:", e);
        }
      }

      // Extract custom sub-etapas for Step 6 from json_subetapas block
      const matchSubEtapas = cleanText.match(/```json_subetapas\s*([\s\S]*?)\s*```/);
      if (matchSubEtapas && matchSubEtapas[1]) {
        try {
          const parsedArray = JSON.parse(matchSubEtapas[1].trim());
          if (Array.isArray(parsedArray) && parsedArray.length > 0) {
            customSubEtapas = parsedArray.map((item: any, idx: number) => {
              const titleStr = typeof item === "string" ? item : (item.titulo || item.item || `Sub-etapa ${idx + 1}`);
              const itemPrice = typeof item.preco === "number" ? item.preco : (parseFloat(item.preco) || 0);
              return {
                id: `sub_${Date.now()}_${idx + 1}`,
                titulo: titleStr,
                concluida: false,
                preco: itemPrice
              };
            });
          }
          cleanText = cleanText.replace(/```json_subetapas\s*[\s\S]*?\s*```/, "").trim();
        } catch (e) {
          console.warn("Could not parse json_subetapas block from PROSFEC IA response:", e);
        }
      }

      if (customSubEtapas.length === 0 && customServicos.length > 0) {
        customSubEtapas = customServicos.map((serv: any, idx: number) => ({
          id: serv.id || `sub_${Date.now()}_${idx + 1}`,
          titulo: serv.nome || serv.servico || `Aplicação de Serviço Técnico ${idx + 1}`,
          concluida: false,
          preco: typeof serv.valor === "number" ? serv.valor : (parseFloat(serv.valor) || 0)
        }));
      } else if (customSubEtapas.length === 0) {
        customSubEtapas = [
          { id: `sub_${Date.now()}_1`, titulo: "Saneamento de restrições ativas apontadas nas consultas de crédito Serasa/SPC", concluida: false, preco: customServicos.find(s => s.nome.toLowerCase().includes("renegocia"))?.valor || 0 },
          { id: `sub_${Date.now()}_2`, titulo: "Regularização de CND e pendências fiscais do CNPJ e sócios na Receita Federal", concluida: false, preco: customServicos.find(s => s.nome.toLowerCase().includes("contábei"))?.valor || 0 },
          { id: `sub_${Date.now()}_3`, titulo: "Transmissão do faturamento atualizado no e-CAC para enquadramento bancário", concluida: false, preco: 0 },
          { id: `sub_${Date.now()}_4`, titulo: "Melhoria e Adequação unificada do Rating de Crédito e Score no SCR / Banco Central", concluida: false, preco: customServicos.find(s => s.nome.toLowerCase().includes("rating") || s.nome.toLowerCase().includes("score"))?.valor || 0 },
          { id: `sub_${Date.now()}_5`, titulo: "Apresentação da proposta estruturada e submissão às esteiras bancárias", concluida: false, preco: 0 }
        ];
      }

      // 4. Update the Lead document in Firestore with diagnosis, recommended services, custom sub-etapas AND advance stage to Step 4 (Contrato & Termos)
      const currentEtapaVal = Number(leadData.etapa || 1);
      const nextEtapaVal = Math.max(currentEtapaVal, 4);

      const currentDiagnostico = {
        texto: cleanText,
        dataGeracao: new Date().toISOString(),
        consultasAnalisadas: matchingConsultas.length,
        servicosRecomendados: customServicos,
        geracoesCount: newGeracoesCount
      };

      await updateDoc(leadRef, {
        diagnosticoPROSFEC: currentDiagnostico,
        diagnosticoGeracoesCount: newGeracoesCount,
        subEtapasPasso6: customSubEtapas,
        servicosRecomendados: customServicos,
        etapa: nextEtapaVal
      });

      console.log(`PROSFEC IA Diagnosis, Services & Step 6 Sub-etapas successfully saved and lead ${leadId} advanced to stage ${nextEtapaVal}`);

      return res.json({
        success: true,
        diagnostico: currentDiagnostico,
        servicosRecomendados: customServicos,
        subEtapasPasso6: customSubEtapas,
        etapa: nextEtapaVal
      });

    } catch (err: any) {
      console.error("Error generating PROSFEC IA Diagnosis:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao gerar o diagnóstico PROSFEC IA." });
    }
  });

  // 5.1 Generate Step 7 Post-Structuring Comparative Diagnostic (Antes vs. Depois)
  app.post("/api/credit/diagnostico-passo7", async (req, res) => {
    try {
      const { leadId, partnerId, documento, consultaResultado, consultaId } = req.body;

      if (!leadId) {
        return res.status(400).json({ error: "O campo leadId é obrigatório." });
      }

      // 1. Retrieve Lead from Firestore
      const leadRef = doc(db, "leads", leadId);
      const leadSnap = await getDoc(leadRef);

      if (!leadSnap.exists()) {
        return res.status(404).json({ error: "Lead não encontrado no banco de dados." });
      }

      const leadData = leadSnap.data();
      const cnpjClean = (leadData.cnpj || documento || "").replace(/\D/g, "");

      // 2. Fetch Latest Consultation if not provided directly
      let latestConsultaData = consultaResultado;
      let usedConsultaId = consultaId;

      if (!latestConsultaData) {
        try {
          const q = query(
            collection(db, "consultas_realizadas"),
            where("documento", "==", cnpjClean)
          );
          const snap = await getDocs(q);
          if (!snap.empty) {
            const sortedDocs = snap.docs.sort((a, b) => {
              const timeA = new Date(a.data().dataConsulta || 0).getTime();
              const timeB = new Date(b.data().dataConsulta || 0).getTime();
              return timeB - timeA;
            });
            latestConsultaData = sortedDocs[0].data().resultado;
            usedConsultaId = sortedDocs[0].id;
          }
        } catch (queryErr) {
          console.warn("Could not query consultas_realizadas for Step 7:", queryErr);
        }
      }

      // 3. Extract baseline from Step 3
      const step3Diag = leadData.diagnosticoPROSFEC || leadData.diagnosticoIA || leadData.diagnosticoConsulta;
      const initialScore = Number(leadData.scoreInicial || 320);
      const initialRestricoesCount = Number(leadData.restricoesIniciaisCount || (step3Diag?.alertas?.length) || 2);
      const faturamentoAnual = Number(leadData.faturamentoAnual || (leadData.mediaReceitaMensal ? leadData.mediaReceitaMensal * 12 : 600000));
      
      // Calculate realistic apt credit limits (PRONAMPE / FGI up to 30% of faturamento anual)
      const calculatedMaxLimit = Math.max(100000, Math.round(faturamentoAnual * 0.30));

      // 4. Construct AI Prompt for Comparative Diagnosis (Antes vs. Depois)
      const prompt = `Você é o Motor de Inteligência Artificial Especialista em Fomento, Análise de Risco Bancário e Mesa de Operações da PROSFEC.
Esta é a emissão do DOSSIÊ TÉCNICO COMPARATIVO FINAL - PASSO 7: OPERAÇÃO APTA À SOLICITAÇÃO BANCÁRIA.

CONTEXTO DA OPERAÇÃO:
- Empresa: ${leadData.razaoSocial || leadData.nome || "Empresa Cliente"}
- CNPJ: ${leadData.cnpj || cnpjClean}
- Porte / Ramo: ${leadData.porte || "ME"} / ${leadData.ramo || "Geral"}
- Faturamento Anual Apurado (e-CAC): R$ ${faturamentoAnual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Diagnóstico Inicial de Entrada (Passo 3):
  * Score de Entrada Estimado: ~${initialScore} pontos
  * Apontamentos/Restrições Iniciais: ${initialRestricoesCount} restrição(ões) identificadas
  * Parecer Inicial: Perfil com restrições ativas e necessidade de saneamento cadastral e contábil.
- Histórico de Serviços de Estruturação Aplicados no Passo 6:
  ${JSON.stringify(leadData.subEtapasPasso6 || leadData.servicosRecomendados || "Saneamento completo de restrições, atualização de CNDs, retificação contábil e elevação de score/rating.")}
- Nova Consulta de Crédito Pós-Estruturação (RedeBE API):
  ${latestConsultaData ? JSON.stringify(latestConsultaData).slice(0, 3000) : "Perfil 100% saneado, sem restrições ativas, certidões negativas válidas e score restaurado."}

SUA TAREFA:
Gere uma análise técnica aprofundada comparando o ANTES (Passo 3 - Diagnóstico Inicial) e o DEPOIS (Passo 7 - Diagnóstico Pós-Estruturação), certificando formalmente a empresa como 100% APTA para envio aos agentes financeiros e bancos repassadores.

REGRAS DE RESPOSTA OBRIGATÓRIAS:
1. OBRIGATÓRIO: Inicie sua resposta com um bloco JSON delimitado EXATAMENTE por:
\`\`\`json_metrics
{
  "scoreAnterior": ${initialScore},
  "scoreAtual": 795,
  "evolucaoScore": ${795 - initialScore},
  "restricoesAnteriores": ${initialRestricoesCount},
  "restricoesAtuais": 0,
  "statusSaneamento": "100% Saneado / Sem Restrições",
  "limiteAnterior": 0,
  "limiteAtual": ${calculatedMaxLimit},
  "ratingBancario": "A+ (Grau de Investimento)",
  "nivelRisco": "Baixo Risco",
  "statusAptidao": "HOMOLOGADO_APTO",
  "esteirasAptas": ["PRONAMPE (FGO)", "FGI PEAC", "Capital de Giro Bancário", "BNDES Automático"],
  "protocoloHomologacao": "HOM-PROSFEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}"
}
\`\`\`

2. Em seguida, escreva o PARECER TÉCNICO CONCLUSIVO DE HOMOLOGAÇÃO em Markdown de alto nível executivo e formal:
- **🏛️ Dossiê de Homologação e Aptidão Bancária Oficial**
- **📊 Comparativo de Evolução Técnica (Antes vs. Depois)**:
  * Explicar detalhadamente como o perfil saiu da inadimplência/risco moderado para o Grau de Investimento.
  * Destacar a supressão total de apontamentos e regularidade fiscal plena.
- **💼 Capacidade Tomadora e Linhas de Crédito Enquadradas**:
  * Detalhar o teto aprovável de R$ ${calculatedMaxLimit.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} pelo PRONAMPE e FGI PEAC.
  * Condições esperadas (taxas a partir de Selic + 6% a.a. / carência de 6 a 12 meses).
- **✅ Conclusão da Mesa de Operações PROSFEC**:
  * Declaração de prontidão para submissão imediata aos bancos parceiros e agentes de fomento.`;

      const ai = getGeminiAI();
      const aiResponse = await generateContentWithFallback(ai, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 2500,
        }
      });

      const fullAiText = aiResponse.text || "";
      let cleanText = fullAiText;

      // Extract JSON metrics
      let parsedMetrics: any = {
        scoreAnterior: initialScore,
        scoreAtual: 795,
        evolucaoScore: 795 - initialScore,
        restricoesAnteriores: initialRestricoesCount,
        restricoesAtuais: 0,
        statusSaneamento: "100% Saneado / Sem Restrições",
        limiteAnterior: 0,
        limiteAtual: calculatedMaxLimit,
        ratingBancario: "A+ (Grau de Investimento)",
        nivelRisco: "Baixo Risco",
        statusAptidao: "HOMOLOGADO_APTO",
        esteirasAptas: ["PRONAMPE (FGO)", "FGI PEAC", "Capital de Giro Bancário", "BNDES Automático"],
        protocoloHomologacao: `HOM-PROSFEC-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`
      };

      const matchJson = cleanText.match(/```json_metrics\s*([\s\S]*?)\s*```/);
      if (matchJson && matchJson[1]) {
        try {
          parsedMetrics = { ...parsedMetrics, ...JSON.parse(matchJson[1].trim()) };
          cleanText = cleanText.replace(/```json_metrics\s*[\s\S]*?\s*```/, "").trim();
        } catch (e) {
          console.warn("Could not parse json_metrics from Step 7 PROSFEC IA:", e);
        }
      }

      // 5. Structure final Step 7 Diagnostic Object
      const diagnosticoPosEstruturacao = {
        metrics: parsedMetrics,
        parecerTecnico: cleanText,
        dataEmissao: new Date().toISOString(),
        dataConsulta: new Date().toISOString(),
        documentoConsultado: cnpjClean,
        protocolo: parsedMetrics.protocoloHomologacao,
        consultaId: usedConsultaId || null,
        consultaResultado: latestConsultaData || null
      };

      // 6. Update Lead in Firestore
      const nextEtapaVal = Math.max(Number(leadData.etapa || 1), 7);
      await updateDoc(leadRef, {
        diagnosticoPosEstruturacao,
        etapa: nextEtapaVal,
        scoreFinal: parsedMetrics.scoreAtual,
        limiteAptoBancario: parsedMetrics.limiteAtual,
        statusOperacaoPasso7: "APTA_HOMOLOGADA"
      });

      console.log(`Step 7 Post-Structuring Diagnostic saved successfully for lead ${leadId} (etapa ${nextEtapaVal})`);

      return res.json({
        success: true,
        diagnosticoPosEstruturacao,
        etapa: nextEtapaVal
      });

    } catch (err: any) {
      console.error("Error generating Step 7 Post-Structuring Diagnostic:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao gerar diagnóstico pós-estruturação do Passo 7." });
    }
  });

  app.post("/api/credit/diagnostico-simulador", async (req, res) => {
    try {
      const {
        cnpj,
        razaoSocial,
        porte,
        uf,
        ramo,
        menosDe12Meses,
        capitalSocial,
        mediaReceitaMensal,
        faturamentoAnual,
        seloEmpregaMulher,
        bancoPrincipal,
        possuiLinhaCreditoGovernamentalAtiva,
        linhaCreditoGovernamentalQual
      } = req.body;

      const valFaturamento = parseFloat(faturamentoAnual) || 0;
      const valCapital = parseFloat(capitalSocial) || 0;
      const valMediaReceita = parseFloat(mediaReceitaMensal) || 0;
      const isNewCompany = !!menosDe12Meses;

      // Calculate base limits locally (heuristic baseline)
      const effectiveAnnualRevenue = isNewCompany ? valMediaReceita * 12 : valFaturamento;
      const cleanPorte = String(porte || "ME").toUpperCase();
      
      const cleanRamo = String(ramo || "").toLowerCase();
      const isTourismOrEntertainment = 
        cleanRamo.includes("turismo") || 
        cleanRamo.includes("hotel") || 
        cleanRamo.includes("pousada") || 
        cleanRamo.includes("restaurante") || 
        cleanRamo.includes("bar") || 
        cleanRamo.includes("evento") || 
        cleanRamo.includes("viagem");

      const isTechOrInnovation = 
        cleanRamo.includes("tecnologia") || 
        cleanRamo.includes("software") || 
        cleanRamo.includes("ti") || 
        cleanRamo.includes("inovacao") || 
        cleanRamo.includes("startup") || 
        cleanRamo.includes("desenvolvimento");

      const isNE_NO_CO = ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE", "AC", "AP", "AM", "PA", "RO", "RR", "TO", "DF", "GO", "MT", "MS"].includes(String(uf || "").toUpperCase());

      // Evaluate bank-specific rules for lead's selected institution
      const initialLineCode = (cleanPorte === "MEI" || effectiveAnnualRevenue <= 81000) ? "FAMPE" :
                              (isTourismOrEntertainment && effectiveAnnualRevenue > 30000) ? "FUNGETUR" :
                              (isTechOrInnovation && effectiveAnnualRevenue > 50000) ? "FINEP_INOV" :
                              (isNE_NO_CO && effectiveAnnualRevenue > 100000) ? "FNE_FNO_FCO" :
                              (effectiveAnnualRevenue > 4800000) ? "FGI_PEAC" : "PRONAMPE";

      const bankRules = BankRulesManager.getBankRules(bancoPrincipal, initialLineCode);

      let fallbackCode = initialLineCode;
      let fallbackName = "PRONAMPE (Programa Nacional de Apoio às Microempresas)";
      let fallbackLimit = 0;
      let fallbackRate = bankRules.taxaAnualEstimada || 16.5;
      let fallbackCarencia = bankRules.carenciaPadrao || 24;
      let fallbackPrazo = bankRules.prazoTotalPadrao || 96;
      let fallbackJustificativa = `Sua empresa foi qualificada para o PRONAMPE no ${bankRules.bancoNormalizado}. ${bankRules.destaqueEsteira}`;

      if (cleanPorte === "MEI" || effectiveAnnualRevenue <= 81000) {
        fallbackCode = "FAMPE";
        fallbackName = "FAMPE - Fundo de Aval Sebrae (Crédito Orientado para MEI)";
        fallbackLimit = Math.min(Math.max(effectiveAnnualRevenue * 0.6, 12500), 50000);
        fallbackRate = 14.5;
        fallbackCarencia = bankRules.carenciaPadrao || 12;
        fallbackPrazo = bankRules.prazoTotalPadrao || 48;
        fallbackJustificativa = `Elegível para o FAMPE/Sebrae com garantia de aval no ${bankRules.bancoNormalizado}, com carência de ${fallbackCarencia} meses e amortização em ${fallbackPrazo - fallbackCarencia} parcelas.`;
      } else if (isTourismOrEntertainment && effectiveAnnualRevenue > 30000) {
        fallbackCode = "FUNGETUR";
        fallbackName = "FUNGETUR (Fundo Geral do Turismo / Ministério do Turismo)";
        fallbackLimit = Math.min(effectiveAnnualRevenue * 0.45, 1500000);
        fallbackRate = 13.5;
        fallbackCarencia = 24;
        fallbackPrazo = 120;
        fallbackJustificativa = `Atuação no setor de hospitalidade/eventos qualificada para o FUNGETUR no ${bankRules.bancoNormalizado}, com carência estendida de 24 meses e parcelamento em 120 meses.`;
      } else if (isTechOrInnovation && effectiveAnnualRevenue > 50000) {
        fallbackCode = "FINEP_INOV";
        fallbackName = "FINEP Inovacred (Fomento à Inovação e Tecnologia)";
        fallbackLimit = Math.min(effectiveAnnualRevenue * 0.4, 3000000);
        fallbackRate = 9.5;
        fallbackCarencia = 36;
        fallbackPrazo = 120;
        fallbackJustificativa = "CNPJ enquadrado em inovação tecnológica e software. A FINEP provê fomento público com carência máxima de 36 meses e juros subsidiados.";
      } else if (isNE_NO_CO && effectiveAnnualRevenue > 100000) {
        fallbackCode = "FNE_FNO_FCO";
        fallbackName = `Fundo Constitucional de Financiamento (${String(uf).toUpperCase() === 'BA' || String(uf).toUpperCase() === 'PE' || String(uf).toUpperCase() === 'CE' ? 'FNE' : 'FCO/FNO'})`;
        fallbackLimit = Math.min(effectiveAnnualRevenue * 0.4, 3000000);
        fallbackRate = 12.8;
        fallbackCarencia = 24;
        fallbackPrazo = 120;
        fallbackJustificativa = `Empresa localizada em região com incentivo constitucional operada pelo ${bankRules.bancoNormalizado}. Oferece taxas fixas subsidiadas com carência de 24m.`;
      } else if (cleanPorte === "EMP" || cleanPorte === "MÉDIO" || cleanPorte === "MEDIO" || effectiveAnnualRevenue > 4800000) {
        if (effectiveAnnualRevenue > 300000000 || cleanPorte === "EGP" || cleanPorte === "GRANDE") {
          fallbackCode = "LINHA_BANCARIA_CORP";
          fallbackName = "Crédito Corporativo Estruturado (BNDES Finem / Consórcio Bancário)";
          fallbackLimit = Math.min(effectiveAnnualRevenue * 0.2, 50000000);
          fallbackRate = 15.5;
          fallbackCarencia = 36;
          fallbackPrazo = 144;
          fallbackJustificativa = `Perfil corporativo no ${bankRules.bancoNormalizado} enquadrado em linhas de crédito bancárias corporativas e repasses BNDES.`;
        } else {
          fallbackCode = "FGI_PEAC";
          fallbackName = "FGI PEAC (Fundo Garantidor BNDES para Médias Empresas)";
          fallbackLimit = Math.min(effectiveAnnualRevenue * 0.25, 10000000);
          fallbackRate = 17.5;
          fallbackCarencia = 24;
          fallbackPrazo = 84;
          fallbackJustificativa = `Faturamento corporativo qualificado para o FGI PEAC operado pelo ${bankRules.bancoNormalizado}, com garantia de até 80% do BNDES.`;
        }
      } else {
        if (isNewCompany) {
          fallbackLimit = Math.max(valCapital * 0.5, valFaturamento * 0.3);
        } else {
          fallbackLimit = valFaturamento * 0.3; // Teto legal de 30% da receita bruta anual do e-CAC
        }
        fallbackLimit = Math.min(fallbackLimit, 500000);
        fallbackCarencia = bankRules.carenciaPadrao;
        fallbackPrazo = bankRules.prazoTotalPadrao;
        fallbackJustificativa = `Empresa elegível para o PRONAMPE no ${bankRules.bancoNormalizado}. ${bankRules.destaqueEsteira}`;
      }

      if (fallbackLimit < 25000) {
        fallbackLimit = 30000;
      }

      const defaultDocs = [
        "Faturamento dos últimos 12 meses assinado pelo Contador (DRE)",
        "Contrato Social / Alterações Consolidadas ou CCMEI",
        "Documento de Identidade dos Sócios (RG/CNH e CPF)",
        "Comprovante de Endereço Atualizado do CNPJ e dos Sócios",
        "Compartilhamento de Dados e-CAC / Receita Federal autorizado"
      ];

      // Try Gemini AI
      try {
        const ai = getGeminiAI();

        const prompt = `Você é um Consultor de Crédito Governamental sênior e especialista de fomento da PROSFEC IA.
Sua missão é analisar minuciosamente os dados do CNPJ/empresa e selecionar A LINHA DE CRÉDITO GOVERNAMENTAL OU BANCÁRIA MAIS VANTAJOSA para a empresa, respeitando RIGOROSAMENTE as regras e leis vigentes de cada programa federal.

LEGISLAÇÃO E REGRAS ATUALIZADAS DAS LINHAS DE CRÉDITO GOVERNAMENTAIS:
1. "PRONAMPE" (Lei nº 13.999/2020 e Regulamentação Vigente):
   - Elegibilidade: MEI, Microempresas (ME) e EPPs com receita bruta anual de até R$ 4,8M.
   - Finalidade: Capital de giro, máquinas/equipamentos, reformas, expansão e investimentos fixos.
   - Limite Legal: Até 30% da Receita Bruta Anual informada ao e-CAC do ano anterior, MÁXIMO RIGOROSO DE R$ 500.000,00 POR CNPJ. Para empresas com menos de 12 meses: até 50% do Capital Social OU até 50% de 12 vezes a média da receita mensal (limitado a R$ 500.000,00).
   - Carência Legal: MÁXIMO DE 24 MESES.
   - Amortização: MÁXIMO DE 72 PARCELAS MENSAIS após o período de carência.
   - PRAZO TOTAL DA OPERAÇÃO: MÁXIMO DE 96 MESES (24m carência + 72m amortização).
   - Taxa Regulada: Selic + até 6,0% a.a. (aprox. 16,5% a.a.).
   - Garantias: Fundo Garantidor de Operações (FGO) e Aval dos sócios.
   - OBSERVAÇÃO CRÍTICA PARA EMPRESAS COM ELEVADO FATURAMENTO: Se 30% da receita do CNPJ ultrapassar R$ 500.000,00, a linha PRONAMPE DEVE ter seu limite fixado no teto legal de R$ 500.000,00. NUNCA recomende limite superior a R$ 500.000,00 para PRONAMPE. Para necessidades superiores a R$ 500.000,00, se a empresa tiver faturamento elevado ou precisar de mais limite, sugira FGI_PEAC ou LINHA_BANCARIA_CORP.sugira FGI_PEAC ou LINHA_BANCARIA_CORP.

2. "FAMPE" (Sebrae):
   - Elegibilidade: MEI (até R$ 12,5k), ME (até R$ 100k) e EPP (até R$ 300k).
   - Garantia: Aval Sebrae cobrindo até 80% do crédito.
   - Carência: MÁXIMO DE 12 MESES.
   - PRAZO TOTAL DO CONTRATO: MÁXIMO DE 48 MESES.

3. "FGI_PEAC" (BNDES):
   - Elegibilidade: Médias empresas e MEs/EPPs de maior porte.
   - Carência: MÁXIMO DE 24 MESES.
   - PRAZO TOTAL DO CONTRATO: MÁXIMO DE 84 MESES (24m carência + 60m amortização).
   - Limite: Até R$ 10.000.000 com garantia BNDES FGI de 80%.

4. "FUNGETUR" (MTur / CADASTUR):
   - Exclusivo para turismo, hotéis, pousadas, eventos e gastronomia.
   - Carência: Até 24 meses (giro) ou 36 meses (obras).
   - PRAZO TOTAL DO CONTRATO: MÁXIMO DE 120 MESES.

5. "FINEP_INOV" (FINEP):
   - Exclusivo para tecnologia, software, startups e inovação industrial.
   - Carência: Até 36 meses.
   - PRAZO TOTAL DO CONTRATO: MÁXIMO DE 120 MESES. Taxa subsidiada de 5,0% a 14,0% a.a.

6. "FNE_FNO_FCO":
   - Para empresas no Nordeste (FNE), Norte (FNO) ou Centro-Oeste (FCO).
   - Carência: Até 24 a 36 meses.
   - PRAZO TOTAL: Até 144 meses.

7. "BNDES_PEQ":
   - Para MPMEs em geral via agentes credenciados BNDES.
   - Carência: Até 24 meses.
   - PRAZO TOTAL: Até 84 meses.

DIRETRIZES DE AVALIAÇÃO DO BANCO DE RELACIONAMENTO (bancoPrincipal):
Avalie com precisão a instituição financeira informada pelo cliente (${bancoPrincipal || "Não especificada / Geral"}):
- Bancos Públicos / Estatais (Caixa Econômica Federal, Banco do Brasil, Banco do Nordeste - BNB, Banco da Amazônia - BASA): Têm plena capacidade de praticar os prazos máximos regulamentados em lei federal (até 24 meses de carência e até 96 meses de contrato total no PRONAMPE) e as menores taxas teto atrativas.
- Bancos Privados Comerciais (Itaú, Bradesco, Santander, Banco Safra, BTG Pactual): Costumam operar esteiras automatizadas de PRONAMPE com prazos mais enxutos em suas plataformas de autoatendimento (geralmente carência de 12 meses e amortização de 36 a 48 meses), otimizando giro e classificação de risco.
- Cooperativas de Crédito (Sicoob, Sicredi, Cresol, Ailos): Operam com política consultiva personalizada, oferecendo prazos flexíveis de 12 a 24 meses de carência e taxas competitivas para associados.
Mencione obrigatoriamente essa adequação da esteira do ${bancoPrincipal || "banco informado"} na justificativaTecnica e na justificativa comercial do parecer final!

Dados Cadastrais da Empresa Analisada:
- Razão Social: ${razaoSocial || "Não informada"}
- CNPJ: ${cnpj || "Não informado"}
- Porte Informado: ${porte || "ME"} (Avalie também: MEI, ME, EPP, EMP - Médio Porte, EGP - Grande Porte)
- Estado (UF): ${uf || "SP"}
- Ramo / Setor de atuação: ${ramo || "Geral / Comércio"}
- Banco Principal de Relacionamento: ${bancoPrincipal || "Não especificado (Análise Geral)"}
- Empresa aberta há menos de 12 meses? ${isNewCompany ? "Sim" : "Não"}
- Capital Social: R$ ${valCapital.toLocaleString("pt-BR")}
- Média de Receita Mensal (se nova): R$ ${valMediaReceita.toLocaleString("pt-BR")}
- Faturamento Anual Acumulado: R$ ${valFaturamento.toLocaleString("pt-BR")}
- Possui Selo Emprega + Mulher? ${seloEmpregaMulher ? "Sim" : "Não"}
- Possui linha de crédito governamental ATIVA? ${possuiLinhaCreditoGovernamentalAtiva ? `Sim (Linha ativa: ${linhaCreditoGovernamentalQual || "Não especificada"})` : "Não"}
*(Caso a empresa já possua a linha ${linhaCreditoGovernamentalQual || "governamental"} ativa, considere a capacidade de margem restante ou priorize uma linha de fomento complementar como FGI PEAC, FAMPE, FUNGETUR ou Fundos Regionais para evitar sobreposição do teto máximo)*

Gere a análise do Consultor de Crédito Governamental em JSON estruturado com as propriedades exatas abaixo:
{
  "creditLineCode": "CÓDIGO (um destes: FAMPE, PRONAMPE, BNDES_PEQ, FGI_PEAC, LINHA_BANCARIA_CORP, FNE_FNO_FCO, FUNGETUR, FINEP_INOV ou PROGER_URBANO)",
  "creditLineName": "Nome oficial completo da linha governamental/bancária recomendada",
  "recommendedLimit": número com o limite máximo de crédito recomendado em Reais (number puro),
  "rate": número com a taxa de juros anual estimada em % (ex: 16.5 para PRONAMPE),
  "carencia": número com o teto máximo de meses de carência (ex: 12 para PRONAMPE/FAMPE, 24 para FGI_PEAC),
  "prazo": número com o prazo total do contrato em meses (ex: 48 para PRONAMPE/FAMPE, 84 para FGI_PEAC, 120 para FUNGETUR/FINEP),
  "justificativa": "Frase comercial de alto impacto para o lead destacando a velocidade e o fôlego financeiro dentro dos limites legais.",
  "justificativaTecnica": "Parecer técnico detalhado do Consultor de Crédito Governamental explicando o enquadramento por Porte e Faturamento conforme as leis e portarias vigentes.",
  "documentosNecessarios": ["array", "de", "strings", "com", "os", "documentos", "exigidos"],
  "resumoPerfil": "Resumo da classificação de porte e faturamento"
}`;

        const response = await generateContentWithFallback(ai, {
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                creditLineCode: { type: Type.STRING },
                creditLineName: { type: Type.STRING },
                recommendedLimit: { type: Type.NUMBER },
                rate: { type: Type.NUMBER },
                carencia: { type: Type.NUMBER },
                prazo: { type: Type.NUMBER },
                justificativa: { type: Type.STRING },
                justificativaTecnica: { type: Type.STRING },
                documentosNecessarios: { type: Type.ARRAY, items: { type: Type.STRING } },
                resumoPerfil: { type: Type.STRING }
              },
              required: [
                "creditLineCode",
                "creditLineName",
                "recommendedLimit",
                "rate",
                "carencia",
                "prazo",
                "justificativa",
                "justificativaTecnica",
                "documentosNecessarios",
                "resumoPerfil"
              ]
            }
          }
        });

        const responseText = response.text || "";
        if (responseText) {
          const parsed = JSON.parse(responseText.trim());
          if (parsed.creditLineCode && parsed.recommendedLimit > 0) {
            let lineCode = String(parsed.creditLineCode).toUpperCase();
            let carencia = Number(parsed.carencia) || 12;
            let prazo = Number(parsed.prazo) || 48;
            let rate = Number(parsed.rate) || 16.5;
            let limit = Number(parsed.recommendedLimit) || 100000;

            // Enforce strict official legislation & bank-specific boundaries
            if (lineCode === "PRONAMPE") {
              carencia = Math.min(carencia, bankRules.carenciaMaxima || 24);
              prazo = Math.min(prazo, bankRules.prazoTotalMaximo || 96);
              if (rate < 10.0 || rate > 22.0) rate = bankRules.taxaAnualEstimada || 16.5;
              if (!isNewCompany && valFaturamento > 0) {
                const maxLegalLimit = valFaturamento * 0.30;
                limit = Math.min(limit, Math.max(maxLegalLimit, 30000));
              }
              limit = Math.min(limit, 500000);
            } else if (lineCode === "FAMPE") {
              carencia = Math.min(carencia, bankRules.carenciaMaxima || 12);
              prazo = Math.min(prazo, bankRules.prazoTotalMaximo || 48);
              limit = Math.min(limit, 300000);
            } else if (lineCode === "FGI_PEAC") {
              carencia = Math.min(carencia, bankRules.carenciaMaxima || 24);
              prazo = Math.min(prazo, bankRules.prazoTotalMaximo || 84);
              limit = Math.min(limit, 10000000);
            }

            const p = limit;
            const r = (rate / 12) / 100;
            const n = prazo;
            let estimatedInstallment = 0;
            if (r > 0) {
              estimatedInstallment = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            } else {
              estimatedInstallment = p / n;
            }

            // Calculation for Capacity Excess and Interest Savings (CET vs Traditional Market)
            const capTotal = !isNewCompany && valFaturamento > 0 ? valFaturamento * 0.30 : (valCapital * 0.5);
            const excedenteCap = Math.max(0, capTotal - p);

            const taxaMercadoAnual = 38.0; // Market benchmark without government subsidy ~38% a.a.
            const rMercado = (taxaMercadoAnual / 12) / 100;
            let parcelaMercado = 0;
            if (rMercado > 0) {
              parcelaMercado = (p * rMercado * Math.pow(1 + rMercado, n)) / (Math.pow(1 + rMercado, n) - 1);
            } else {
              parcelaMercado = p / n;
            }
            const economiaMensal = Math.max(0, parcelaMercado - estimatedInstallment);
            const economiaTotal = Math.max(0, economiaMensal * n);

            return res.json({
              success: true,
              creditLineCode: lineCode,
              creditLineName: parsed.creditLineName,
              recommendedLimit: p,
              rate: rate,
              carencia: carencia,
              prazo: prazo,
              parcela: Math.round(estimatedInstallment * 100) / 100,
              justificativa: parsed.justificativa,
              justificativaTecnica: parsed.justificativaTecnica,
              documentosNecessarios: parsed.documentosNecessarios && parsed.documentosNecessarios.length > 0 ? parsed.documentosNecessarios : defaultDocs,
              resumoPerfil: parsed.resumoPerfil,
              fonte: `Gemini AI (Mapeamento ${bankRules.bancoNormalizado})`,
              bancoDetalhes: bankRules,
              capacidadeTotal: Math.round(capTotal),
              excedenteCapacidade: Math.round(excedenteCap),
              economiaMensal: Math.round(economiaMensal * 100) / 100,
              economiaTotal: Math.round(economiaTotal * 100) / 100,
              taxaMercadoAnual: taxaMercadoAnual,
              parcelaMercado: Math.round(parcelaMercado * 100) / 100
            });
          }
        }
      } catch (aiErr) {
        console.warn("Express /api/credit/diagnostico-simulador Gemini failed, falling back to heuristics.", aiErr);
      }

      const p = fallbackLimit;
      const r = (fallbackRate / 12) / 100;
      const n = fallbackPrazo;
      let fallbackInstallment = 0;
      if (r > 0) {
        fallbackInstallment = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      } else {
        fallbackInstallment = p / n;
      }

      const capTotalFallback = !isNewCompany && valFaturamento > 0 ? valFaturamento * 0.30 : (valCapital * 0.5);
      const excedenteCapFallback = Math.max(0, capTotalFallback - p);

      const taxaMercadoFallback = 38.0;
      const rMercadoFallback = (taxaMercadoFallback / 12) / 100;
      let parcelaMercadoFallback = 0;
      if (rMercadoFallback > 0) {
        parcelaMercadoFallback = (p * rMercadoFallback * Math.pow(1 + rMercadoFallback, n)) / (Math.pow(1 + rMercadoFallback, n) - 1);
      } else {
        parcelaMercadoFallback = p / n;
      }
      const economiaMensalFallback = Math.max(0, parcelaMercadoFallback - fallbackInstallment);
      const economiaTotalFallback = Math.max(0, economiaMensalFallback * n);

      return res.json({
        success: true,
        creditLineCode: fallbackCode,
        creditLineName: fallbackName,
        recommendedLimit: fallbackLimit,
        rate: fallbackRate,
        carencia: fallbackCarencia,
        prazo: fallbackPrazo,
        parcela: Math.round(fallbackInstallment * 100) / 100,
        justificativa: fallbackJustificativa,
        justificativaTecnica: `Enquadramento customizado para ${bankRules.bancoNormalizado} na linha ${fallbackName}. Esteira: ${bankRules.modalidadeAprovacao}.`,
        documentosNecessarios: defaultDocs,
        resumoPerfil: `Perfil ${porte || 'PJ'} no ${bankRules.bancoNormalizado} avaliado com faturamento de R$ ${effectiveAnnualRevenue.toLocaleString('pt-BR')}.`,
        fonte: `PROSFEC IA (Regra customizada ${bankRules.bancoNormalizado})`,
        bancoDetalhes: bankRules,
        capacidadeTotal: Math.round(capTotalFallback),
        excedenteCapacidade: Math.round(excedenteCapFallback),
        economiaMensal: Math.round(economiaMensalFallback * 100) / 100,
        economiaTotal: Math.round(economiaTotalFallback * 100) / 100,
        taxaMercadoAnual: taxaMercadoFallback,
        parcelaMercado: Math.round(parcelaMercadoFallback * 100) / 100
      });

    } catch (err: any) {
      console.error("Error in /api/credit/diagnostico-simulador:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao gerar recomendação de fomento." });
    }
  });

  return app;
}

export async function startServer() {
  const app = createExpressApp();
  const PORT = 3000;

  // Serve static frontend files in production or use Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

if (!process.env.NETLIFY) {
  startServer();
}
