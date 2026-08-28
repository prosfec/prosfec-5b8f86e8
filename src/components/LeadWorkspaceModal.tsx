*** Begin Patch
*** Update File: src/components/LeadWorkspaceModal.tsx
@@
   const handleSaveCredenciais = async (e: React.FormEvent) => {
@@
       const leadRef = doc(db, "leads", lead.id);
       await updateDoc(leadRef, {
+        // Preserve existing fields and add linkDocumentos when present
+        linkDocumentos: editLinkDocumentos || (lead.linkDocumentos || ""),
         govbrLogin: govbrLogin || "",
         govbrSenha: govbrSenha || "",
         serasaLogin: serasaLogin || "",
         serasaSenha: serasaSenha || "",
*** End Patch
