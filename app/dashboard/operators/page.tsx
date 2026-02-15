"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { authApi, User, UserCreate, UserUpdate } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/loading-overlay";
import { confirmAction } from "@/lib/utils";
import { 
  Plus, 
  X, 
  Edit, 
  Trash2, 
  Users, 
  Search,
  Shield,
  UserCheck,
  UserX,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  Key,
  CreditCard,
  User as UserIcon,
  ChevronDown
} from "lucide-react";

export default function OperatorsPage() {
  const router = useRouter();
  type OperatorFormData = UserCreate & { is_active?: boolean };
  const [operators, setOperators] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingOperator, setEditingOperator] = useState<User | null>(null);
  const [formData, setFormData] = useState<OperatorFormData>({
    operator_number: "",
    pin: "",
    nfc_tag_id: "",
    first_name: "",
    last_name: "",
    role: "mitarbeiter",
    is_active: true,
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);
  const [formRoleMenuOpen, setFormRoleMenuOpen] = useState(false);
  const formRoleMenuRef = useRef<HTMLDivElement | null>(null);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; variant?: "info" | "error" | "success" }[]>([]);

  const addToast = useCallback(
    (message: string, variant: "info" | "error" | "success" = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const loadCurrentUser = async () => {
    try {
      const user = await authApi.getCurrentUser();
      setCurrentUser(user);
    } catch (err) {
      console.error("Fehler beim Laden des aktuellen Users:", err);
    }
  };

  const loadOperators = async () => {
    try {
      setLoading(true);
      const data = await authApi.listOperators();
      setOperators(data);
    } catch (err) {
      console.error("Fehler beim Laden der Bediener:", err);
      if (err instanceof ApiError && err.status === 403) {
        router.push("/dashboard");
        addToast("Zugriff verweigert", "error");
      } else {
        addToast("Fehler beim Laden der Bediener", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load - lädt Bediener und aktuellen User beim Mount
  useEffect(() => {
    loadCurrentUser();
    loadOperators();
  }, []);

  const handleOperatorNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setFormData({ ...formData, operator_number: value });
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 8);
    setFormData({ ...formData, pin: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (editingOperator) {
      // Update existing operator
      if (formData.operator_number && formData.operator_number.length !== 4) {
        setError("Bedienernummer muss 4 Ziffern lang sein");
        return;
      }

      if (formData.pin && (formData.pin.length < 6 || formData.pin.length > 8)) {
        setError("PIN muss 6-8 Ziffern lang sein");
        return;
      }

      if (formData.first_name && formData.first_name.length < 2) {
        setError("Vorname muss mindestens 2 Zeichen lang sein");
        return;
      }

      if (formData.last_name && formData.last_name.length < 2) {
        setError("Nachname muss mindestens 2 Zeichen lang sein");
        return;
      }

      setSubmitting(true);

      try {
        const updateData: UserUpdate = {
          operator_number: formData.operator_number || undefined,
          pin: formData.pin || undefined,
          nfc_tag_id: formData.nfc_tag_id?.trim() || null,
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          role: formData.role || undefined,
          is_active: formData.is_active ?? editingOperator.is_active,
        };
        await authApi.updateOperator(editingOperator.id, updateData);
        setEditingOperator(null);
        setShowCreateForm(false);
        setFormData({
          operator_number: "",
          pin: "",
          nfc_tag_id: "",
          first_name: "",
          last_name: "",
          role: "mitarbeiter",
          is_active: true,
        });
        addToast("Bediener erfolgreich aktualisiert", "success");
        await loadOperators();
      } catch (err) {
        console.error("Fehler beim Aktualisieren des Bedieners:", err);
        if (err instanceof ApiError) {
          const errorMessage = err.message || "Fehler beim Aktualisieren des Bedieners";
          setError(errorMessage);
          addToast(errorMessage, "error");
        } else {
          const errorMessage = "Ein unerwarteter Fehler ist aufgetreten";
          setError(errorMessage);
          addToast(errorMessage, "error");
        }
      } finally {
        setSubmitting(false);
      }
    } else {
      // Create new operator
      if (formData.operator_number.length !== 4) {
        setError("Bedienernummer muss 4 Ziffern lang sein");
        return;
      }

      if (formData.pin.length < 6 || formData.pin.length > 8) {
        setError("PIN muss 6-8 Ziffern lang sein");
        return;
      }

      if (formData.first_name.length < 2) {
        setError("Vorname muss mindestens 2 Zeichen lang sein");
        return;
      }

      if (formData.last_name.length < 2) {
        setError("Nachname muss mindestens 2 Zeichen lang sein");
        return;
      }

      // Prüfe reservierte Bedienernummern nur beim Erstellen, nicht beim Bearbeiten
      // if (!editingOperator && (formData.operator_number === "0000" || formData.operator_number === "0001")) {
      //   setError("Bedienernummer ist für Servecta reserviert");
      //   return;
      // }

      if (formData.operator_number === '0000' || formData.operator_number === '0001') {
        setError("Bedienernummer ist reserviert!");
        return;
      }

      setSubmitting(true);

      try {
        const { is_active: _formIsActive, ...createPayload } = formData;
        const createData: UserCreate = {
          ...createPayload,
          nfc_tag_id: formData.nfc_tag_id?.trim() || null,
        };
        await authApi.createOperator(createData);
        setShowCreateForm(false);
        setFormData({
          operator_number: "",
          pin: "",
          nfc_tag_id: "",
          first_name: "",
          last_name: "",
          role: "mitarbeiter",
          is_active: true,
        });
        addToast("Bediener erfolgreich angelegt", "success");
        await loadOperators();
      } catch (err) {
        console.error("Fehler beim Erstellen des Bedieners:", err);
        if (err instanceof ApiError) {
          const errorMessage = err.message || "Fehler beim Erstellen des Bedieners";
          setError(errorMessage);
          addToast(errorMessage, "error");
        } else {
          const errorMessage = "Ein unerwarteter Fehler ist aufgetreten";
          setError(errorMessage);
          addToast(errorMessage, "error");
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleEdit = (operator: User) => {
    setEditingOperator(operator);
    setFormData({
      operator_number: operator.operator_number,
      pin: "", // PIN wird nicht angezeigt
      nfc_tag_id: operator.nfc_tag_id || "",
      first_name: operator.first_name,
      last_name: operator.last_name,
      role: operator.role as "servecta" | "restaurantinhaber" | "schichtleiter" | "mitarbeiter",
      is_active: operator.is_active,
    });
    setShowCreateForm(true);
    setError("");
  };

  const handleDelete = async (operator: User) => {
    if (!confirmAction(`Möchtest du den Bediener ${operator.first_name} ${operator.last_name} (${operator.operator_number}) wirklich löschen?`)) {
      return;
    }

    try {
      await authApi.deleteOperator(operator.id);
      addToast(`Bediener ${operator.first_name} ${operator.last_name} wurde gelöscht`, "success");
      await loadOperators();
    } catch (err) {
      console.error("Fehler beim Löschen des Bedieners:", err);
      if (err instanceof ApiError) {
        addToast(err.message || "Fehler beim Löschen des Bedieners", "error");
      } else {
        addToast("Ein Fehler ist aufgetreten", "error");
      }
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingOperator(null);
    setError("");
    setFormData({
      operator_number: "",
      pin: "",
      nfc_tag_id: "",
      first_name: "",
      last_name: "",
      role: "mitarbeiter",
      is_active: true,
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "servecta":
        return "Servecta";
      case "restaurantinhaber":
        return "Restaurantinhaber";
      case "schichtleiter":
        return "Schichtleiter";
      case "mitarbeiter":
        return "Mitarbeiter";
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "servecta":
        return Shield;
      case "restaurantinhaber":
        return UserCheck;
      case "schichtleiter":
        return UserIcon;
      default:
        return UserIcon;
    }
  };

  const formatLastLogin = (value?: string | null) => {
    if (!value) return "—";
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
    } catch (error) {
      console.warn("Konnte last_login_at_utc nicht formatieren:", error);
      return "—";
    }
  };

  const filteredOperators = useMemo(() => {
    return operators.filter((operator) => {
      const matchesSearch = 
        operator.operator_number.includes(searchQuery) ||
        `${operator.first_name} ${operator.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (operator.nfc_tag_id && operator.nfc_tag_id.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = roleFilter === "all" || operator.role === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  }, [operators, searchQuery, roleFilter]);
  const FormRoleIcon = getRoleIcon(formData.role);

  if (loading) {
    return <LoadingOverlay />;
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-sm ${
                toast.variant === "error"
                  ? "bg-red-900/80 border-red-500 text-red-50"
                  : toast.variant === "success"
                  ? "bg-green-900/80 border-green-500 text-green-50"
                  : "bg-slate-800/90 border-slate-600 text-slate-100"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] via-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-[#F95100]/25">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Bedienerverwaltung
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {operators.length} {operators.length === 1 ? "Bediener" : "Bediener"} insgesamt
                </p>
              </div>
            </div>
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="gap-2 touch-manipulation min-h-[36px] md:min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Neuen Bediener anlegen</span>
                <span className="sm:hidden">Neu</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {showCreateForm && (
            <Card className="mb-6 border-border bg-card/50 backdrop-blur-sm">
              <CardHeader className="border-b border-border">
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <UserIcon className="w-5 h-5 text-primary" />
                    {editingOperator ? "Bediener bearbeiten" : "Neuen Bediener anlegen"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-900/30 border border-red-600/50 text-red-300 rounded-lg flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Fehler</p>
                        <p className="text-sm mt-1">{error}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label 
                        htmlFor="operator_number" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <Key className="w-4 h-4 text-primary" />
                        Bedienernummer (4 Ziffern)
                      </label>
                      <Input
                        id="operator_number"
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{4}"
                        value={formData.operator_number}
                        onChange={handleOperatorNumberChange}
                        placeholder="0000"
                        maxLength={4}
                        required={!editingOperator}
                        disabled={editingOperator !== null}
                        className="text-center text-2xl tracking-widest font-mono bg-card/50 border-input text-foreground focus:border-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <label 
                        htmlFor="pin" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <Key className="w-4 h-4 text-primary" />
                        PIN (6-8 Ziffern)
                      </label>
                      <Input
                        id="pin"
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]{6,8}"
                        value={formData.pin}
                        onChange={handlePinChange}
                        placeholder={editingOperator ? "Leer lassen, um nicht zu ändern" : "••••••"}
                        maxLength={8}
                        required={!editingOperator}
                        className="text-center text-xl tracking-widest font-mono bg-card/50 border-input text-foreground focus:border-primary"
                      />
                      {editingOperator && (
                        <p className="text-xs text-muted-foreground">
                          Leer lassen, um PIN nicht zu ändern
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label 
                        htmlFor="first_name" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <UserIcon className="w-4 h-4 text-primary" />
                        Vorname
                      </label>
                      <Input
                        id="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={(e) =>
                          setFormData({ ...formData, first_name: e.target.value })
                        }
                        placeholder="Max"
                        required
                        minLength={2}
                        maxLength={120}
                        className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                      />
                    </div>

                    <div className="space-y-2">
                      <label 
                        htmlFor="last_name" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <UserIcon className="w-4 h-4 text-primary" />
                        Nachname
                      </label>
                      <Input
                        id="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={(e) =>
                          setFormData({ ...formData, last_name: e.target.value })
                        }
                        placeholder="Mustermann"
                        required
                        minLength={2}
                        maxLength={120}
                        className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label 
                      htmlFor="nfc_tag_id" 
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                      <CreditCard className="w-4 h-4 text-primary" />
                      NFC Tag-ID (optional)
                    </label>
                    <Input
                      id="nfc_tag_id"
                      type="text"
                      value={formData.nfc_tag_id || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, nfc_tag_id: e.target.value.trim().toUpperCase() })
                      }
                      placeholder="04A1B2C3D4E5F6"
                      maxLength={64}
                      className="font-mono bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Die Tag-ID des NFC-Transponders für Login ohne PIN. Wird automatisch in Großbuchstaben konvertiert.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label 
                      htmlFor="role" 
                      className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                    >
                      <Shield className="w-4 h-4 text-primary" />
                      Rolle
                    </label>
                    <div className="relative" ref={formRoleMenuRef}>
                      <button
                        type="button"
                        onClick={() => setFormRoleMenuOpen((prev) => !prev)}
                        className="inline-flex items-center justify-between w-full gap-2 rounded-md border border-input bg-accent/70 px-3 py-2 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                      >
                        <span className="flex items-center gap-2">
                          <FormRoleIcon className="w-4 h-4 text-foreground" />
                          {getRoleLabel(formData.role)}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${formRoleMenuOpen ? "rotate-180" : ""}`} />
                      </button>
                      {formRoleMenuOpen && (
                        <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-40 overflow-hidden">
                          <div className="divide-y divide-border/80">
                            {currentUser?.role === "servecta" && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, role: "servecta" });
                                  setFormRoleMenuOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                  formData.role === "servecta"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                              >
                                <span className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-purple-300" />
                                  Servecta
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, role: "restaurantinhaber" });
                                setFormRoleMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                formData.role === "restaurantinhaber"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                              >
                                <span className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4 text-blue-300" />
                                  Restaurantinhaber
                                </span>
                              </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, role: "schichtleiter" });
                                setFormRoleMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                formData.role === "schichtleiter"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                              >
                                <span className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4 text-yellow-300" />
                                  Schichtleiter
                                </span>
                              </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, role: "mitarbeiter" });
                                setFormRoleMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                formData.role === "mitarbeiter"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                              >
                                <span className="flex items-center gap-2">
                                  <UserIcon className="w-4 h-4 text-foreground" />
                                  Mitarbeiter
                                </span>
                              </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {formData.role === "servecta" && (
                        <p className="text-red-400 font-semibold">
                          ⚠️ Warnung: Servecta-Rolle gibt alle Berechtigungen!
                        </p>
                      )}
                      {formData.role === "restaurantinhaber" && (
                        <p>Restaurantinhaber kann Bediener verwalten (außer Servecta)</p>
                      )}
                      {formData.role === "schichtleiter" && (
                        <p>Schichtleiter kann Reservierungen bearbeiten und Tische verwalten</p>
                      )}
                      {formData.role === "mitarbeiter" && (
                        <p>Mitarbeiter kann Reservierungen annehmen, zuweisen, platzieren und abschließen</p>
                      )}
                    </div>
                  </div>

                  {editingOperator && (
                    <div className="space-y-2">
                      <label 
                        htmlFor="is_active" 
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
                      >
                        <UserCheck className="w-4 h-4 text-primary" />
                        Status
                      </label>
                      <div className="relative" ref={statusMenuRef}>
                        <button
                          type="button"
                          onClick={() => setStatusMenuOpen((prev) => !prev)}
                          className="inline-flex items-center justify-between w-full gap-2 rounded-md border border-input bg-accent/70 px-3 py-2 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                        >
                          <span className="flex items-center gap-2">
                            {formData.is_active ? (
                              <UserCheck className="w-4 h-4 text-green-300" />
                            ) : (
                              <UserX className="w-4 h-4 text-red-300" />
                            )}
                            {formData.is_active ? "Aktiv" : "Inaktiv"}
                          </span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />
                        </button>
                        {statusMenuOpen && (
                          <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-40 overflow-hidden">
                            <div className="divide-y divide-border/80">
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, is_active: true });
                                  setStatusMenuOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                  formData.is_active
                                    ? "bg-card text-foreground font-semibold"
                                    : "text-foreground hover:bg-accent/70"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4 text-green-300" />
                                  Aktiv
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, is_active: false });
                                  setStatusMenuOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                  formData.is_active === false
                                    ? "bg-card text-foreground font-semibold"
                                    : "text-foreground hover:bg-accent/70"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <UserX className="w-4 h-4 text-red-300" />
                                  Inaktiv
                                </span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Inaktive Bediener können sich nicht anmelden, bleiben aber in der Historie erhalten.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                    <Button 
                      type="submit" 
                      className="flex-1 gap-2 touch-manipulation min-h-[44px]" 
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Wird gespeichert...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>
                            {editingOperator ? "Änderungen speichern" : "Bediener anlegen"}
                          </span>
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={submitting}
                      className="gap-2 touch-manipulation min-h-[44px]"
                    >
                      <X className="w-4 h-4" />
                      <span>Abbrechen</span>
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Bedienerliste ({filteredOperators.length})
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Suchen..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary w-full sm:w-64"
                    />
                  </div>
                  <div className="relative" ref={roleMenuRef}>
                    <button
                      type="button"
                      onClick={() => setRoleMenuOpen((prev) => !prev)}
                      className="inline-flex items-center justify-between w-full sm:w-56 gap-2 rounded-md border border-input bg-accent/70 px-3 py-2 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {roleFilter === "all"
                          ? "Alle Rollen"
                          : roleFilter === "servecta"
                          ? "Servecta"
                          : roleFilter === "restaurantinhaber"
                          ? "Restaurantinhaber"
                          : roleFilter === "schichtleiter"
                          ? "Schichtleiter"
                          : "Mitarbeiter"}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`} />
                    </button>
                    {roleMenuOpen && (
                      <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-40 overflow-hidden">
                        <div className="divide-y divide-border/80">
                          <button
                            type="button"
                            onClick={() => {
                              setRoleFilter("all");
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              roleFilter === "all"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              Alle Rollen
                            </span>
                          </button>
                          {currentUser?.role === "servecta" && (
                            <button
                              type="button"
                              onClick={() => {
                                setRoleFilter("servecta");
                                setRoleMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                roleFilter === "servecta"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-purple-300" />
                              Servecta
                            </span>
                          </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRoleFilter("restaurantinhaber");
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              roleFilter === "restaurantinhaber"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-blue-300" />
                              Restaurantinhaber
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRoleFilter("schichtleiter");
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              roleFilter === "schichtleiter"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-yellow-300" />
                              Schichtleiter
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRoleFilter("mitarbeiter");
                              setRoleMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              roleFilter === "mitarbeiter"
                                ? "bg-card text-foreground font-semibold"
                                : "text-foreground hover:bg-accent/70"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-foreground" />
                              Mitarbeiter
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {filteredOperators.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {operators.length === 0 
                      ? "Noch keine Bediener vorhanden"
                      : "Keine Bediener gefunden"}
                  </p>
                  {operators.length === 0 && (
                    <p className="text-sm mt-2">
                      Klicken Sie auf "Neuen Bediener anlegen", um den ersten Bediener zu erstellen.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Bedienernummer</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">NFC Tag-ID</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rolle</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Letzter Login</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOperators.map((operator) => {
                        const RoleIcon = getRoleIcon(operator.role);
                        return (
                          <tr 
                            key={operator.id} 
                            className="border-b border-border hover:bg-accent/30 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono font-semibold text-foreground">
                              {operator.operator_number}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-muted-foreground" />
                                <span>
                                  {operator.first_name} {operator.last_name}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {operator.nfc_tag_id ? (
                                <span className="font-mono text-sm text-primary flex items-center gap-1">
                                  <CreditCard className="w-3.5 h-3.5" />
                                  {operator.nfc_tag_id}
                                </span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                                  operator.role === "servecta"
                                    ? "bg-purple-200 text-black border border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/50"
                                    : operator.role === "restaurantinhaber"
                                    ? "bg-blue-200 text-black border border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/50"
                                    : operator.role === "schichtleiter"
                                    ? "bg-yellow-200 text-black border border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/50"
                                    : "bg-muted/70 text-black border border-input/70 dark:bg-muted/50 dark:text-muted-foreground dark:border-input/50"
                                }`}
                              >
                                <RoleIcon className="w-3.5 h-3.5" />
                                {getRoleLabel(operator.role)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                {formatLastLogin(operator.last_login_at_utc)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {operator.is_active ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-200 text-black border border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/50">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Aktiv
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-200 text-black border border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/50">
                                  <UserX className="w-3.5 h-3.5" />
                                  Inaktiv
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(operator)}
                                  className="touch-manipulation min-h-[36px] gap-1.5"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span className="hidden sm:inline">Bearbeiten</span>
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(operator)}
                                  className="touch-manipulation min-h-[36px] gap-1.5 shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.45)]"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="hidden sm:inline">Löschen</span>
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
