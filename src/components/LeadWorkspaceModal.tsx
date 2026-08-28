*** Begin Patch
*** Update File: src/components/LeadWorkspaceModal.tsx
@@
   const [copiedTrackingLink, setCopiedTrackingLink] = useState(false);
   const [showContractPdfModal, setShowContractPdfModal] = useState(false);
+  // Document link state for partner input
+  const [editLinkDocumentos, setEditLinkDocumentos] = useState<string>(lead.linkDocumentos || "");
@@
   const handleSaveCredenciais = async (e: React.FormEvent) => {
@@
-      const leadRef = doc(db, "leads", lead.id);
-      await updateDoc(leadRef, {
-        govbrLogin: govbrLogin || "",
-        govbrSenha: govbrSenha || "",
-        serasaLogin: serasaLogin || "",
-        serasaSenha: serasaSenha || "",
-        certificadoSenha: certificadoSenha || "",
-        certificadoFileName: certificadoFileName || "",
-        certificadoFileBase64: certificadoFileBase64 || "",
-        etapa: nextEtapa,
-        historicoEtapas: updatedHistory
-      });
+      const leadRef = doc(db, "leads", lead.id);
+      await updateDoc(leadRef, {
+        // Add or update the document folder link entered by the partner
+        linkDocumentos: editLinkDocumentos || (lead.linkDocumentos || ""),
+        govbrLogin: govbrLogin || "",
+        govbrSenha: govbrSenha || "",
+        serasaLogin: serasaLogin || "",
+        serasaSenha: serasaSenha || "",
+        certificadoSenha: certificadoSenha || "",
+        certificadoFileName: certificadoFileName || "",
+        certificadoFileBase64: certificadoFileBase64 || "",
+        etapa: nextEtapa,
+        historicoEtapas: updatedHistory
+      });
*** End Patch
