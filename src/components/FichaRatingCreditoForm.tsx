*** Begin Patch
*** Update File: src/components/FichaRatingCreditoForm.tsx
@@
-const DocLinkInput = ({
+const DocLinkInput = ({
   label,
   value,
   onChange,
   required = false,
   hint
 }: {
   label: string;
   value?: string;
   onChange: (url: string) => void;
   required?: boolean;
   hint?: string;
 }) => {
@@
-  return (
-    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
-      <div className="flex items-center justify-between gap-2">
-        <div className="flex items-center gap-1.5 min-w-0">
-          <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
-          <span className="text-xs font-bold text-slate-800 truncate">
-            {label}{required ? " *" : ""}
-          </span>
-        </div>
-        {current ? (
-          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
-            Link salvo
-          </span>
-        ) : (
-          <span className="text-[10px] text-slate-400 font-medium shrink-0">Pendente</span>
-        )}
-      </div>
-
-      {isLegacyBase64 ? (
-        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 font-medium">
-          Arquivo antigo anexado. Limpe e cole o link do documento na nuvem.
-        </p>
-      ) : (
-        <input
-          type="url"
-          inputMode="url"
-          value={current}
-          onChange={(e) => onChange(e.target.value)}
-          placeholder="Cole aqui o link do Google Drive"
-          aria-label={`Link do documento: ${label}`}
-          className={`w-full bg-white border text-slate-800 text-[11px] rounded-xl px-2.5 py-2 focus:outline-hidden font-medium ${
-            isInvalid || isEmptyRequired ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-emerald-600"
-          }`}
-        />
-      )}
-
-      {isEmptyRequired && (
-        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
-          <AlertTriangle className="w-3 h-3 shrink-0" />
-          Este campo é obrigatório
-        </p>
-      )}
-
-      {isInvalid && (
-        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
-          <AlertTriangle className="w-3 h-3 shrink-0" />
-          O link deve começar com http:// ou https://
-        </p>
-      )}
-
-      {hint && !isInvalid && (
-        <p className="text-[10px] text-slate-500 leading-snug">{hint}</p>
-      )}
-
-      {current && (
-        <div className="flex items-center gap-1.5">
-          {!isInvalid && !isLegacyBase64 && (
-            <a
-              href={current}
-              target="_blank"
-              rel="noopener noreferrer"
-              className="flex-1 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 rounded-xl text-[11px] font-bold flex it[...]
-            >
-              <ExternalLink className="w-3.5 h-3.5" />
-              Testar link
-            </a>
-          )}
-          <button
-            type="button"
-            onClick={() => onChange("")}
-            className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
-            title="Remover link"
-          >
-            Limpar
-          </button>
-        </div>
-      )}
-    </div>
-  );
+  return (
+    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
+      <div className="flex items-center justify-between gap-2">
+        <div className="flex items-center gap-1.5 min-w-0">
+          <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
+          <span className="text-xs font-bold text-slate-800 truncate">
+            {label}{required ? " *" : ""}
+          </span>
+        </div>
+        {current ? (
+          <div className="flex items-center gap-2">
+            <a href={current} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">Abrir</a>
+            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">Link salvo</span>
+          </div>
+        ) : (
+          <span className="text-[10px] text-slate-400 font-medium shrink-0">Pendente</span>
+        )}
+      </div>
+
+      {isLegacyBase64 ? (
+        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 font-medium">
+          Arquivo antigo anexado. Limpe e cole o link do documento na nuvem.
+        </p>
+      ) : (
+        <div className="flex gap-2">
+          <input
+            type="url"
+            inputMode="url"
+            value={current}
+            onChange={(e) => onChange(e.target.value)}
+            placeholder="Cole aqui o link do Google Drive"
+            aria-label={`Link do documento: ${label}`}
+            className={`flex-1 bg-white border text-slate-800 text-[11px] rounded-xl px-2.5 py-2 focus:outline-hidden font-medium ${
+              isInvalid || isEmptyRequired ? "border-rose-300 focus:border-rose-500" : "border-slate-200 focus:border-emerald-600"
+            }`}
+          />
+          <button type="button" onClick={() => onChange("")} className="text-xs px-3 py-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-600">Limpar</button>
+        </div>
+      )}
+
+      {isEmptyRequired && (
+        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
+          <AlertTriangle className="w-3 h-3 shrink-0" />
+          Este campo é obrigatório
+        </p>
+      )}
+
+      {isInvalid && (
+        <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
+          <AlertTriangle className="w-3 h-3 shrink-0" />
+          O link deve começar com http:// ou https://
+        </p>
+      )}
+
+      {hint && !isInvalid && (
+        <p className="text-[10px] text-slate-500 leading-snug">{hint}</p>
+      )}
+
+      {current && (
+        <div className="flex items-center gap-1.5">
+          {!isInvalid && !isLegacyBase64 && (
+            <a
+              href={current}
+              target="_blank"
+              rel="noopener noreferrer"
+              className="flex-1 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-slate-700 hover:text-emerald-700 rounded-xl text-[11px] font-bold flex items-center gap-2 justify-center"
+            >
+              <ExternalLink className="w-3.5 h-3.5" />
+              Testar link
+            </a>
+          )}
+          <button
+            type="button"
+            onClick={() => onChange("")}
+            className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
+            title="Remover link"
+          >
+            Limpar
+          </button>
+        </div>
+      )}
+    </div>
+  );
 };
*** End Patch
