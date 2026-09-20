"use client";

import grapesjs, { type Component, type Editor } from "grapesjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { invoiceTemplateApi } from "@/lib/api/invoice-template";
import { useNotice } from "@/components/ui/notice-provider";
import type {
  InvoiceTemplate,
  TemplateSaveMode,
  InvoiceRegionRegistry,
} from "@/types/invoice-template";
import {
  getInvoicePage,
  invoiceEditorConfig,
  PAGE_CSS,
} from "./configs/grapesjs.config";
import { safeHtml, safeProject } from "./configs/project-safety";
import { lockRegionContents } from "./configs/regions.config";

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Không thể kết nối. Vui lòng thử lại.";
}

export function sortTemplates(templates: InvoiceTemplate[]) {
  return [...templates].sort((a, b) => {
    if (a.type !== b.type) return a.type === "CUSTOM" ? -1 : 1;
    return (
      (b.createdAt ?? "").localeCompare(a.createdAt ?? "") ||
      b.version - a.version ||
      b.id.localeCompare(a.id)
    );
  });
}

type PendingAction =
  { type: "version"; id: string } | { type: "navigate"; href: string };

export function useInvoiceDesigner() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const revisionRef = useRef(0);
  const savingRef = useRef(false);
  const mountedRef = useRef(false);
  const loadingProjectRef = useRef(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [template, setTemplate] = useState<InvoiceTemplate | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const registryRef = useRef<InvoiceRegionRegistry>({ regions: [], css: "" });
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [selected, setSelected] = useState<Component | null>(null);
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { setNotice } = useNotice();
  const dirty = revision !== savedRevision || name !== savedName;

  useEffect(() => {
    const controller = new AbortController();
    let instance: Editor | null = null;
    let changeTimer: ReturnType<typeof setTimeout> | undefined;
    mountedRef.current = true;

    async function load() {
      try {
        const versions = sortTemplates(
          await invoiceTemplateApi.list(controller.signal),
        );
        const registry = await invoiceTemplateApi.regions(controller.signal);
        registryRef.current = registry;
        const loaded = versions[0];
        if (!loaded) throw new Error("Không tìm thấy mẫu hóa đơn.");
        if (controller.signal.aborted || !canvasRef.current) return;
        const project = safeProject(loaded.editorData);
        instance = grapesjs.init(
          invoiceEditorConfig(canvasRef.current, registry),
        );
        const activeEditor = instance;
        activeEditor.on("load", () => {
          if (controller.signal.aborted) return;
          activeEditor.loadProjectData(project);
          if (!getInvoicePage(activeEditor)) {
            setError("Mẫu hóa đơn thiếu trang A4. Không thể mở thiết kế.");
            setLoading(false);
            return;
          }
          activeEditor.addStyle(PAGE_CSS);
          activeEditor.addStyle(registry.css);
          lockRegionContents(activeEditor);
          activeEditor.UndoManager.clear();
          activeEditor.clearDirtyCount();
          editorRef.current = activeEditor;
          setEditor(activeEditor);
          setTemplate(loaded);
          setTemplates(versions);
          const initialName =
            loaded.type === "SYSTEM" ? "Mẫu hóa đơn của tôi" : loaded.name;
          setName(initialName);
          setSavedName(initialName);
          revisionRef.current = 0;
          setRevision(0);
          setSavedRevision(0);
          setLoading(false);
          activeEditor.on("component:selected component:deselected", () =>
            setSelected(activeEditor.getSelected() ?? null),
          );
          activeEditor.on("update", () => {
            if (loadingProjectRef.current) return;
            revisionRef.current += 1;
            clearTimeout(changeTimer);
            // Batch React updates while dragging; saving always captures the current project.
            changeTimer = setTimeout(
              () => setRevision(revisionRef.current),
              120,
            );
          });
        });
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(errorMessage(cause));
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      mountedRef.current = false;
      controller.abort();
      clearTimeout(changeTimer);
      editorRef.current = null;
      instance?.destroy();
    };
  }, [attempt]);

  useEffect(() => {
    if (!dirty) return;
    const beforeNavigate = (event: MouseEvent) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest("a[href]")
          : null;
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0 ||
        anchor.hasAttribute("download") ||
        anchor.target === "_blank" ||
        anchor.href === window.location.href
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      setPendingAction({ type: "navigate", href: anchor.href });
    };
    document.addEventListener("click", beforeNavigate, true);
    return () => {
      document.removeEventListener("click", beforeNavigate, true);
    };
  }, [dirty]);

  const save = useCallback(
    async (mode: TemplateSaveMode, nextName: string) => {
      const activeEditor = editorRef.current;
      if (!activeEditor || !template || savingRef.current) return false;
      const trimmedName = nextName.trim();
      if (!trimmedName) {
        setNotice({
          type: "error",
          text: "Tên mẫu hóa đơn không được để trống.",
        });
        return false;
      }
      savingRef.current = true;
      setSaving(true);
      const savingRevision = revisionRef.current;
      try {
        const result = await invoiceTemplateApi.save(
          template,
          {
            name: trimmedName,
            basedOnVersion:
              mode === "new" ? template.id : template.basedOnVersion,
            editorData: structuredClone(activeEditor.getProjectData()),
            html: safeHtml(activeEditor.getHtml()),
            css: activeEditor.getCss() ?? "",
            isDefault: true,
          },
          mode,
        );
        if (!mountedRef.current) return false;
        setTemplate(result);
        setTemplates((previous) =>
          sortTemplates([
            result,
            ...previous
              .filter((item) => item.id !== result.id)
              .map((item) => ({ ...item, isDefault: false })),
          ]),
        );
        setSavedRevision(savingRevision);
        setName(result.name);
        setSavedName(result.name);
        setNotice({ type: "success", text: "Đã lưu mẫu hóa đơn." });
        return true;
      } catch (cause) {
        if (mountedRef.current)
          setNotice({
            type: "error",
            text: `Không thể lưu mẫu. ${errorMessage(cause)}`,
          });
        return false;
      } finally {
        savingRef.current = false;
        if (mountedRef.current) setSaving(false);
      }
    },
    [template, setNotice],
  );

  function openVersion(id: string) {
    const activeEditor = editorRef.current;
    const next = templates.find((item) => item.id === id);
    if (!next || !activeEditor || savingRef.current) return;
    try {
      const project = safeProject(next.editorData);
      loadingProjectRef.current = true;
      activeEditor.select();
      activeEditor.loadProjectData(project);
      activeEditor.addStyle(PAGE_CSS);
      activeEditor.addStyle(registryRef.current.css);
      lockRegionContents(activeEditor);
      activeEditor.UndoManager.clear();
      activeEditor.clearDirtyCount();
      revisionRef.current = 0;
      setRevision(0);
      setSavedRevision(0);
      setSelected(null);
      setTemplate(next);
      const nextName =
        next.type === "SYSTEM" ? "Mẫu hóa đơn của tôi" : next.name;
      setName(nextName);
      setSavedName(nextName);
      activeEditor.trigger("invoice:version-loaded");
    } catch (cause) {
      setNotice({ type: "error", text: errorMessage(cause) });
    } finally {
      loadingProjectRef.current = false;
    }
  }

  function selectVersion(id: string) {
    if (id === template?.id || saving) return;
    if (dirty) setPendingAction({ type: "version", id });
    else openVersion(id);
  }

  async function deleteTemplate() {
    if (
      !template ||
      template.type === "SYSTEM" ||
      template.readonly ||
      savingRef.current ||
      deleting
    )
      return false;

    setDeleting(true);
    try {
      await invoiceTemplateApi.remove(template.id);
      if (!mountedRef.current) return false;
      const remaining = templates.filter((item) => item.id !== template.id);
      const next = remaining[0];
      setTemplates(remaining);
      if (next) openVersion(next.id);
      setNotice({ type: "success", text: "Đã xóa mẫu hóa đơn." });
      return true;
    } catch (cause) {
      if (mountedRef.current)
        setNotice({
          type: "error",
          text: `Không thể xóa mẫu. ${errorMessage(cause)}`,
        });
      return false;
    } finally {
      if (mountedRef.current) setDeleting(false);
    }
  }

  function confirmDiscard() {
    if (!pendingAction || saving) return;
    if (pendingAction.type === "version") openVersion(pendingAction.id);
    else {
      const url = new URL(pendingAction.href, window.location.origin);
      if (url.origin === window.location.origin)
        router.push(url.pathname + url.search + url.hash);
      else window.location.assign(url.href);
    }
    setPendingAction(null);
  }

  function retry() {
    setError("");
    setLoading(true);
    setEditor(null);
    setSelected(null);
    setAttempt((value) => value + 1);
  }

  return {
    canvasRef,
    editor,
    template,
    templates,
    selectVersion,
    pendingAction,
    confirmDiscard,
    cancelDiscard: () => setPendingAction(null),
    selected,
    revision,
    dirty,
    loading,
    saving,
    deleting,
    error,
    name,
    setName,
    save,
    deleteTemplate,
    retry,
  };
}
