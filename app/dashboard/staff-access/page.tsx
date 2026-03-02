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
  ChevronDown,
  Mail,
  Lock,
  KeyRound,
} from "lucide-react";

type AuthMethod = "pin" | "email";

interface StaffFormData {
  auth_method: AuthMethod;
  operator_number: string;
  pin: string;
  nfc_tag_id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: UserCreate["role"];
  is_active: boolean;
}

const INITIAL_FORM: StaffFormData = {
  auth_method: "email",
  operator_number: "",
  pin: "",
  nfc_tag_id: "",
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role: "staff",
  is_active: true,
};

export default function StaffAccessPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<StaffFormData>(INITIAL_FORM);
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

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await authApi.listOperators();
      setUsers(data);
    } catch (err) {
      console.error("Fehler beim Laden der Benutzer:", err);
      if (err instanceof ApiError && err.status === 403) {
        router.push("/dashboard");
        addToast("Zugriff verweigert", "error");
      } else {
        addToast("Fehler beim Laden der Benutzer", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  // Close dropdown menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
      if (formRoleMenuRef.current && !formRoleMenuRef.current.contains(event.target as Node)) {
        setFormRoleMenuOpen(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setStatusMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validierung
    if (formData.first_name.length < 2) {
      setError("Vorname muss mindestens 2 Zeichen lang sein");
      return;
    }
    if (formData.last_name.length < 2) {
      setError("Nachname muss mindestens 2 Zeichen lang sein");
      return;
    }

    if (editingUser) {
      // Update
      if (formData.auth_method === "pin") {
        if (formData.operator_number && formData.operator_number.length !== 4) {
          setError("Bedienernummer muss 4 Ziffern lang sein");
          return;
        }
        if (formData.pin && formData.pin.length < 4) {
          setError("PIN muss mindestens 4 Ziffern lang sein");
          return;
        }
      } else {
        if (formData.email && !formData.email.includes("@")) {
          setError("Bitte eine gueltige E-Mail-Adresse eingeben");
          return;
        }
        if (formData.password && formData.password.length < 8) {
          setError("Passwort muss mindestens 8 Zeichen lang sein");
          return;
        }
      }

      setSubmitting(true);
      try {
        const updateData: UserUpdate = {
          first_name: formData.first_name || undefined,
          last_name: formData.last_name || undefined,
          role: formData.role || undefined,
          is_active: formData.is_active,
          nfc_tag_id: formData.nfc_tag_id?.trim() || null,
        };

        if (formData.auth_method === "pin") {
          updateData.operator_number = formData.operator_number || undefined;
          updateData.pin = formData.pin || undefined;
        } else {
          updateData.email = formData.email || undefined;
          updateData.password = formData.password || undefined;
        }

        await authApi.updateOperator(editingUser.id, updateData);
        setEditingUser(null);
        setShowCreateForm(false);
        setFormData(INITIAL_FORM);
        addToast("Zugang erfolgreich aktualisiert", "success");
        await loadUsers();
      } catch (err) {
        console.error("Fehler beim Aktualisieren:", err);
        const msg = err instanceof ApiError ? (err.message || "Fehler beim Aktualisieren") : "Ein unerwarteter Fehler ist aufgetreten";
        setError(msg);
        addToast(msg, "error");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Create
      if (formData.auth_method === "pin") {
        if (!formData.operator_number || formData.operator_number.length !== 4) {
          setError("Bedienernummer muss 4 Ziffern lang sein");
          return;
        }
        if (!formData.pin || formData.pin.length < 4) {
          setError("PIN muss mindestens 4 Ziffern lang sein");
          return;
        }
        if (formData.operator_number === "0000" || formData.operator_number === "0001") {
          setError("Bedienernummer ist reserviert!");
          return;
        }
      } else {
        if (!formData.email || !formData.email.includes("@")) {
          setError("Bitte eine gueltige E-Mail-Adresse eingeben");
          return;
        }
        if (!formData.password || formData.password.length < 8) {
          setError("Passwort muss mindestens 8 Zeichen lang sein");
          return;
        }
      }

      setSubmitting(true);
      try {
        const createData: UserCreate = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          role: formData.role,
          nfc_tag_id: formData.nfc_tag_id?.trim() || null,
        };

        if (formData.auth_method === "pin") {
          createData.operator_number = formData.operator_number;
          createData.pin = formData.pin;
        } else {
          createData.email = formData.email;
          createData.password = formData.password;
        }

        await authApi.createOperator(createData);
        setShowCreateForm(false);
        setFormData(INITIAL_FORM);
        addToast("Zugang erfolgreich angelegt", "success");
        await loadUsers();
      } catch (err) {
        console.error("Fehler beim Erstellen:", err);
        const msg = err instanceof ApiError ? (err.message || "Fehler beim Erstellen") : "Ein unerwarteter Fehler ist aufgetreten";
        setError(msg);
        addToast(msg, "error");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleEdit = (user: User) => {
    const hasEmail = !!user.email;
    setEditingUser(user);
    setFormData({
      auth_method: hasEmail ? "email" : "pin",
      operator_number: user.operator_number ?? "",
      pin: "",
      nfc_tag_id: user.nfc_tag_id || "",
      email: user.email || "",
      password: "",
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role as UserCreate["role"],
      is_active: user.is_active,
    });
    setShowCreateForm(true);
    setError("");
  };

  const handleDelete = async (user: User) => {
    const label = user.email || user.operator_number || `${user.first_name} ${user.last_name}`;
    if (!confirmAction(`Moechtest du den Zugang von ${user.first_name} ${user.last_name} (${label}) wirklich loeschen?`)) {
      return;
    }

    try {
      await authApi.deleteOperator(user.id);
      addToast(`Zugang von ${user.first_name} ${user.last_name} wurde geloescht`, "success");
      await loadUsers();
    } catch (err) {
      console.error("Fehler beim Loeschen:", err);
      if (err instanceof ApiError) {
        addToast(err.message || "Fehler beim Loeschen", "error");
      } else {
        addToast("Ein Fehler ist aufgetreten", "error");
      }
    }
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingUser(null);
    setError("");
    setFormData(INITIAL_FORM);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "platform_admin": return "Platform Admin";
      case "owner": return "Restaurantinhaber";
      case "manager": return "Schichtleiter";
      case "staff": return "Mitarbeiter";
      case "kitchen": return "Kueche";
      case "guest": return "Gast";
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "platform_admin": return Shield;
      case "owner": return UserCheck;
      case "manager": return UserIcon;
      default: return UserIcon;
    }
  };

  const getAuthMethodLabel = (user: User) => {
    if (user.email) return "E-Mail";
    if (user.operator_number) return "PIN";
    if (user.nfc_tag_id) return "NFC";
    return "—";
  };

  const formatLastLogin = (value?: string | null) => {
    if (!value) return "—";
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(date);
    } catch {
      return "—";
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Nur Platform-Benutzer anzeigen (ohne Tenant-Zuordnung)
      if (user.tenant_id) return false;

      const matchesSearch =
        (user.operator_number ?? "").includes(searchQuery) ||
        `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.nfc_tag_id && user.nfc_tag_id.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === "all" || user.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

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
                <KeyRound className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Zugangsverwaltung
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {users.length} {users.length === 1 ? "Zugang" : "Zugaenge"} insgesamt
                </p>
              </div>
            </div>
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="gap-2 touch-manipulation min-h-[36px] md:min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Neuen Zugang anlegen</span>
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
                    {editingUser ? "Zugang bearbeiten" : "Neuen Zugang anlegen"}
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

                  {/* Auth Method Toggle */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Lock className="w-4 h-4 text-primary" />
                      Anmeldemethode
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, auth_method: "email" })}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                          formData.auth_method === "email"
                            ? "bg-primary/10 border-primary text-foreground"
                            : "border-input bg-card/50 text-muted-foreground hover:bg-accent/70"
                        }`}
                      >
                        <Mail className="w-4 h-4" />
                        E-Mail & Passwort
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, auth_method: "pin" })}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition-colors ${
                          formData.auth_method === "pin"
                            ? "bg-primary/10 border-primary text-foreground"
                            : "border-input bg-card/50 text-muted-foreground hover:bg-accent/70"
                        }`}
                      >
                        <Key className="w-4 h-4" />
                        Bedienernummer & PIN
                      </button>
                    </div>
                  </div>

                  {/* Auth Fields based on method */}
                  {formData.auth_method === "email" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Mail className="w-4 h-4 text-primary" />
                          E-Mail-Adresse
                        </label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="admin@example.com"
                          required={!editingUser}
                          className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="password" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Lock className="w-4 h-4 text-primary" />
                          Passwort (min. 8 Zeichen)
                        </label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          placeholder={editingUser ? "Leer lassen, um nicht zu aendern" : "Passwort eingeben"}
                          required={!editingUser}
                          minLength={8}
                          className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                        />
                        {editingUser && (
                          <p className="text-xs text-muted-foreground">
                            Leer lassen, um Passwort nicht zu aendern
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="operator_number" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Key className="w-4 h-4 text-primary" />
                          Bedienernummer (4 Ziffern)
                        </label>
                        <Input
                          id="operator_number"
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]{4}"
                          value={formData.operator_number}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                            setFormData({ ...formData, operator_number: value });
                          }}
                          placeholder="0000"
                          maxLength={4}
                          required={!editingUser}
                          disabled={editingUser !== null}
                          className="text-center text-2xl tracking-widest font-mono bg-card/50 border-input text-foreground focus:border-primary"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="pin" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Key className="w-4 h-4 text-primary" />
                          PIN (4-6 Ziffern)
                        </label>
                        <Input
                          id="pin"
                          type="password"
                          inputMode="numeric"
                          value={formData.pin}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                            setFormData({ ...formData, pin: value });
                          }}
                          placeholder={editingUser ? "Leer lassen, um nicht zu aendern" : "PIN eingeben"}
                          maxLength={6}
                          required={!editingUser}
                          className="text-center text-xl tracking-widest font-mono bg-card/50 border-input text-foreground focus:border-primary"
                        />
                        {editingUser && (
                          <p className="text-xs text-muted-foreground">
                            Leer lassen, um PIN nicht zu aendern
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Name Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="first_name" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <UserIcon className="w-4 h-4 text-primary" />
                        Vorname
                      </label>
                      <Input
                        id="first_name"
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="Max"
                        required
                        minLength={2}
                        maxLength={120}
                        className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="last_name" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <UserIcon className="w-4 h-4 text-primary" />
                        Nachname
                      </label>
                      <Input
                        id="last_name"
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Mustermann"
                        required
                        minLength={2}
                        maxLength={120}
                        className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* NFC Tag */}
                  <div className="space-y-2">
                    <label htmlFor="nfc_tag_id" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <CreditCard className="w-4 h-4 text-primary" />
                      NFC Tag-ID (optional)
                    </label>
                    <Input
                      id="nfc_tag_id"
                      type="text"
                      value={formData.nfc_tag_id || ""}
                      onChange={(e) => setFormData({ ...formData, nfc_tag_id: e.target.value.trim().toUpperCase() })}
                      placeholder="04A1B2C3D4E5F6"
                      maxLength={64}
                      className="font-mono bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Die Tag-ID des NFC-Transponders fuer Login ohne PIN.
                    </p>
                  </div>

                  {/* Role Selection */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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
                            {currentUser?.role === "platform_admin" && (
                              <button
                                type="button"
                                onClick={() => { setFormData({ ...formData, role: "platform_admin" }); setFormRoleMenuOpen(false); }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${formData.role === "platform_admin" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
                              >
                                <span className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-purple-300" />
                                  Platform Admin
                                </span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => { setFormData({ ...formData, role: "owner" }); setFormRoleMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${formData.role === "owner" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
                            >
                              <span className="flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-blue-300" />
                                Restaurantinhaber
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setFormData({ ...formData, role: "manager" }); setFormRoleMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${formData.role === "manager" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
                            >
                              <span className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-yellow-300" />
                                Schichtleiter
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setFormData({ ...formData, role: "staff" }); setFormRoleMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${formData.role === "staff" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
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
                      {formData.role === "platform_admin" && (
                        <p className="text-red-400 font-semibold">
                          Warnung: Platform Admin hat volle Plattformrechte!
                        </p>
                      )}
                      {formData.role === "owner" && (
                        <p>Restaurantinhaber kann Bediener verwalten und alle Restaurant-Einstellungen aendern</p>
                      )}
                      {formData.role === "manager" && (
                        <p>Schichtleiter kann Reservierungen bearbeiten und Tische verwalten</p>
                      )}
                      {formData.role === "staff" && (
                        <p>Mitarbeiter kann Reservierungen annehmen, zuweisen, platzieren und abschliessen</p>
                      )}
                    </div>
                  </div>

                  {/* Status (only when editing) */}
                  {editingUser && (
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
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
                                onClick={() => { setFormData({ ...formData, is_active: true }); setStatusMenuOpen(false); }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${formData.is_active ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
                              >
                                <span className="flex items-center gap-2">
                                  <UserCheck className="w-4 h-4 text-green-300" />
                                  Aktiv
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setFormData({ ...formData, is_active: false }); setStatusMenuOpen(false); }}
                                className={`w-full px-3 py-2 text-left text-sm transition-colors ${formData.is_active === false ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
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
                        Inaktive Zugaenge koennen sich nicht anmelden.
                      </p>
                    </div>
                  )}

                  {/* Submit/Cancel Buttons */}
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
                          <span>{editingUser ? "Aenderungen speichern" : "Zugang anlegen"}</span>
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

          {/* User List */}
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Users className="w-5 h-5 text-primary" />
                  Zugangsliste ({filteredUsers.length})
                </CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Name, E-Mail, Nr. ..."
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
                        {roleFilter === "all" ? "Alle Rollen" : getRoleLabel(roleFilter)}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${roleMenuOpen ? "rotate-180" : ""}`} />
                    </button>
                    {roleMenuOpen && (
                      <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-40 overflow-hidden">
                        <div className="divide-y divide-border/80">
                          <button
                            type="button"
                            onClick={() => { setRoleFilter("all"); setRoleMenuOpen(false); }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${roleFilter === "all" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
                          >
                            <span className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              Alle Rollen
                            </span>
                          </button>
                          {currentUser?.role === "platform_admin" && (
                            <button
                              type="button"
                              onClick={() => { setRoleFilter("platform_admin"); setRoleMenuOpen(false); }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${roleFilter === "platform_admin" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
                            >
                              <span className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-purple-300" />
                                Platform Admin
                              </span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => { setRoleFilter("owner"); setRoleMenuOpen(false); }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${roleFilter === "owner" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
                          >
                            <span className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-blue-300" />
                              Restaurantinhaber
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRoleFilter("manager"); setRoleMenuOpen(false); }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${roleFilter === "manager" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
                          >
                            <span className="flex items-center gap-2">
                              <UserIcon className="w-4 h-4 text-yellow-300" />
                              Schichtleiter
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => { setRoleFilter("staff"); setRoleMenuOpen(false); }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${roleFilter === "staff" ? "bg-card text-foreground font-semibold" : "text-foreground hover:bg-accent/70"}`}
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
              {filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {users.length === 0
                      ? "Noch keine Zugaenge vorhanden"
                      : "Keine Zugaenge gefunden"}
                  </p>
                  {users.length === 0 && (
                    <p className="text-sm mt-2">
                      Klicke auf &quot;Neuen Zugang anlegen&quot;, um den ersten Zugang zu erstellen.
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Anmeldung</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden md:table-cell">Login-ID</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Rolle</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground hidden lg:table-cell">Letzter Login</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => {
                        const RoleIcon = getRoleIcon(user.role);
                        return (
                          <tr
                            key={user.id}
                            className="border-b border-border hover:bg-accent/30 transition-colors"
                          >
                            <td className="py-3 px-4 text-foreground">
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-muted-foreground" />
                                <span>{user.first_name} {user.last_name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                                user.email
                                  ? "bg-blue-200 text-black border border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/50"
                                  : "bg-muted/70 text-black border border-input/70 dark:bg-muted/50 dark:text-muted-foreground dark:border-input/50"
                              }`}>
                                {user.email ? <Mail className="w-3 h-3" /> : <Key className="w-3 h-3" />}
                                {getAuthMethodLabel(user)}
                              </span>
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              {user.email ? (
                                <span className="text-sm text-muted-foreground">{user.email}</span>
                              ) : user.operator_number ? (
                                <span className="font-mono font-semibold text-foreground">#{user.operator_number}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                                  user.role === "platform_admin"
                                    ? "bg-purple-200 text-black border border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700/50"
                                    : user.role === "owner"
                                    ? "bg-blue-200 text-black border border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700/50"
                                    : user.role === "manager"
                                    ? "bg-yellow-200 text-black border border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/50"
                                    : "bg-muted/70 text-black border border-input/70 dark:bg-muted/50 dark:text-muted-foreground dark:border-input/50"
                                }`}
                              >
                                <RoleIcon className="w-3.5 h-3.5" />
                                {getRoleLabel(user.role)}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground hidden lg:table-cell">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                {formatLastLogin(user.last_login_at)}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {user.is_active ? (
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
                                  onClick={() => handleEdit(user)}
                                  className="touch-manipulation min-h-[36px] gap-1.5"
                                >
                                  <Edit className="w-4 h-4" />
                                  <span className="hidden sm:inline">Bearbeiten</span>
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDelete(user)}
                                  className="touch-manipulation min-h-[36px] gap-1.5 shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.45)]"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  <span className="hidden sm:inline">Loeschen</span>
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
