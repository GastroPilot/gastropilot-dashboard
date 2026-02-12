"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { menuApi, MenuItem, MenuCategory } from "@/lib/api/menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/loading-overlay";
import {
  Plus,
  Edit,
  Trash2,
  ShoppingCart,
  Tag,
  X,
  Save,
  Search,
  ChevronDown,
  Check,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { confirmAction } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MenuPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  
  // Dialog States
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  
  // Form States
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categorySortOrder, setCategorySortOrder] = useState(0);
  const [categoryIsActive, setCategoryIsActive] = useState(true);
  
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemTaxRate, setItemTaxRate] = useState<number>(0.19);  // Default 19%
  const [itemCategoryId, setItemCategoryId] = useState<number | null>(null);
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [itemSortOrder, setItemSortOrder] = useState(0);
  const [taxMenuOpen, setTaxMenuOpen] = useState(false);
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const taxMenuRef = useRef<HTMLDivElement | null>(null);
  const categoryMenuRef = useRef<HTMLDivElement | null>(null);
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: "info" | "error" | "success" }[]
  >([]);

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

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const restaurantsData = await restaurantsApi.list();
      
      if (restaurantsData.length === 0) {
        addToast("Kein Restaurant gefunden", "error");
        return;
      }

      const selectedRestaurant = restaurantsData[0];
      setRestaurant(selectedRestaurant);

      const [categoriesData, itemsData] = await Promise.all([
        menuApi.listCategories(selectedRestaurant.id),
        menuApi.listItems(selectedRestaurant.id),
      ]);

      setCategories(categoriesData);
      setItems(itemsData);
    } catch (error) {
      console.error("Fehler beim Laden der Daten:", error);
      addToast("Fehler beim Laden der Daten", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (taxMenuRef.current && !taxMenuRef.current.contains(target)) {
        setTaxMenuOpen(false);
      }
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(target)) {
        setCategoryMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = items.filter((item) => {
    if (selectedCategoryId !== null && item.category_id !== selectedCategoryId) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const openCategoryDialog = (category: MenuCategory | null = null) => {
    setEditingCategory(category);
    if (category) {
      setCategoryName(category.name);
      setCategoryDescription(category.description || "");
      setCategorySortOrder(category.sort_order || 0);
      setCategoryIsActive(category.is_active);
    } else {
      setCategoryName("");
      setCategoryDescription("");
      setCategorySortOrder(categories.length);
      setCategoryIsActive(true);
    }
    setError("");
    setCategoryDialogOpen(true);
  };

  const openItemDialog = (item: MenuItem | null = null) => {
    setEditingItem(item);
    if (item) {
      setItemName(item.name);
      setItemDescription(item.description || "");
      setItemPrice(item.price);
      setItemTaxRate(item.tax_rate || 0.19);
      setItemCategoryId(item.category_id);
      setItemIsAvailable(item.is_available);
      setItemSortOrder(item.sort_order || 0);
    } else {
      setItemName("");
      setItemDescription("");
      setItemPrice(0);
      setItemTaxRate(0.19);  // Default 19%
      setItemCategoryId(selectedCategoryId);
      setItemIsAvailable(true);
      setItemSortOrder(items.length);
    }
    setError("");
    setItemDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!restaurant || !categoryName.trim()) {
      setError("Bitte geben Sie einen Kategorienamen ein");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (editingCategory) {
        await menuApi.updateCategory(restaurant.id, editingCategory.id, {
          name: categoryName,
          description: categoryDescription || undefined,
          sort_order: categorySortOrder,
          is_active: categoryIsActive,
        });
        addToast("Kategorie erfolgreich aktualisiert", "success");
      } else {
        await menuApi.createCategory(restaurant.id, {
          name: categoryName,
          description: categoryDescription || undefined,
          sort_order: categorySortOrder,
          is_active: categoryIsActive,
        });
        addToast("Kategorie erfolgreich erstellt", "success");
      }
      setCategoryDialogOpen(false);
      loadData();
    } catch (err) {
      console.error("Fehler beim Speichern der Kategorie:", err);
      setError("Fehler beim Speichern der Kategorie");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = async () => {
    if (!restaurant || !itemName.trim() || itemPrice <= 0) {
      setError("Bitte füllen Sie alle Pflichtfelder aus");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (editingItem) {
        await menuApi.updateItem(restaurant.id, editingItem.id, {
          name: itemName,
          description: itemDescription || undefined,
          price: itemPrice,
          tax_rate: itemTaxRate,
          category_id: itemCategoryId,
          is_available: itemIsAvailable,
          sort_order: itemSortOrder,
        });
        addToast("Artikel erfolgreich aktualisiert", "success");
      } else {
        await menuApi.createItem(restaurant.id, {
          name: itemName,
          description: itemDescription || undefined,
          price: itemPrice,
          tax_rate: itemTaxRate,
          category_id: itemCategoryId,
          is_available: itemIsAvailable,
          sort_order: itemSortOrder,
        });
        addToast("Artikel erfolgreich erstellt", "success");
      }
      setItemDialogOpen(false);
      loadData();
    } catch (err) {
      console.error("Fehler beim Speichern des Artikels:", err);
      setError("Fehler beim Speichern des Artikels");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (category: MenuCategory) => {
    if (!restaurant) return;
    
    const hasItems = items.some((item) => item.category_id === category.id);
    if (hasItems) {
      addToast("Kategorie kann nicht gelöscht werden, da sie Artikel enthält", "error");
      return;
    }

    const confirmed = confirmAction(
      `Möchten Sie die Kategorie "${category.name}" wirklich löschen?`
    );
    if (!confirmed) return;

    try {
      await menuApi.deleteCategory(restaurant.id, category.id);
      addToast("Kategorie erfolgreich gelöscht", "success");
      loadData();
    } catch (err) {
      console.error("Fehler beim Löschen der Kategorie:", err);
      addToast("Fehler beim Löschen der Kategorie", "error");
    }
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!restaurant) return;

    const confirmed = confirmAction(`Möchten Sie den Artikel "${item.name}" wirklich löschen?`);
    if (!confirmed) return;

    try {
      await menuApi.deleteItem(restaurant.id, item.id);
      addToast("Artikel erfolgreich gelöscht", "success");
      setItemDialogOpen(false);
      setEditingItem(null);
      loadData();
    } catch (err) {
      console.error("Fehler beim Löschen des Artikels:", err);
      addToast("Fehler beim Löschen des Artikels", "error");
    }
  };

  if (isLoading && !restaurant) {
    return <LoadingOverlay />;
  }

  const activeCategories = categories.filter((c) => c.is_active);

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <Tag className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Menü-Verwaltung</h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Verwalten Sie Kategorien und Artikel
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openCategoryDialog(null)}
                className="touch-manipulation min-h-[36px] gap-2"
              >
                <Tag className="w-4 h-4 mr-2" />
                Kategorie hinzufügen
              </Button>
              <Button
                size="sm"
                className="bg-primary text-foreground shadow-none hover:bg-primary hover:shadow-[0_12px_32px_rgba(37,99,235,0.35)]"
                onClick={() => openItemDialog(null)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Artikel hinzufügen
              </Button>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-4 flex flex-col md:flex-row gap-3 px-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Artikel suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-input text-foreground placeholder-gray-400"
            />
          </div>
        </div>

        {/* Kategorie-Filter */}
        <div className="mt-3 flex gap-2 flex-wrap px-4 pb-3">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              selectedCategoryId === null
                ? "bg-primary text-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            Alle Kategorien
          </button>
          {activeCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                selectedCategoryId === category.id
                  ? "bg-primary text-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ShoppingCart className="w-16 h-16 text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              {searchQuery || selectedCategoryId
                ? "Keine Artikel gefunden"
                : "Noch keine Artikel vorhanden"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedCategoryId
                ? "Versuchen Sie andere Suchkriterien"
                : "Erstellen Sie Ihre ersten Artikel"}
            </p>
            {!searchQuery && !selectedCategoryId && (
              <Button
                className="bg-primary hover:bg-primary/90 text-foreground"
                onClick={() => openItemDialog(null)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Artikel erstellen
              </Button>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Artikel</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const category = categories.find((c) => c.id === item.category_id);
                return (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => openItemDialog(item)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          {item.is_available ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="min-h-[36px]">
                          {category ? (
                            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {category.name}
                            </div>
                          ) : (
                            <div className="h-4 mb-1" aria-hidden="true" />
                          )}
                          {item.description ? (
                            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                          ) : (
                            <div className="h-4 mt-1" aria-hidden="true" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-lg font-bold text-foreground">{formatCurrency(item.price)}</span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          item.is_available
                            ? "bg-green-900/30 text-green-300"
                            : "bg-red-900/30 text-red-300"
                        }`}
                      >
                        {item.is_available ? "Verfügbar" : "Nicht verfügbar"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Kategorien-Bereich */}
        {categories.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Kategorien</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {categories.map((category) => {
                const categoryItems = items.filter((item) => item.category_id === category.id);
                return (
                  <div
                    key={category.id}
                    className="bg-card border border-border rounded-lg p-3 hover:border-primary transition-colors cursor-pointer"
                    onClick={() => openCategoryDialog(category)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-foreground">{category.name}</h3>
                          {category.is_active ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                        </div>
                        <div className="min-h-[20px]">
                          {category.description ? (
                            <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                          ) : (
                            <div className="h-4 mt-1" aria-hidden="true" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {categoryItems.length} Artikel
                        </p>
                      </div>
                      <div className="flex gap-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Kategorie bearbeiten" : "Neue Kategorie"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? "Bearbeiten Sie die Kategoriedetails"
                : "Erstellen Sie eine neue Kategorie für Ihr Menü"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 md:px-6 pb-2">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Name *
              </label>
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                disabled={loading}
                placeholder="z.B. Getränke, Vorspeisen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Beschreibung
              </label>
              <textarea
                value={categoryDescription}
                onChange={(e) => setCategoryDescription(e.target.value)}
                className="w-full px-3 py-2 bg-card/50 border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                rows={2}
                disabled={loading}
                placeholder="Kurze Beschreibung der Kategorie"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Sortierreihenfolge
                </label>
                <Input
                  type="number"
                  value={categorySortOrder}
                  onChange={(e) => setCategorySortOrder(parseInt(e.target.value) || 0)}
                  className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                  disabled={loading}
                  placeholder="z.B. 10"
                />
              </div>
            </div>
            <div className="flex items-center">
              <label className="inline-flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm text-foreground cursor-pointer hover:border-primary">
                <input
                  type="checkbox"
                  checked={categoryIsActive}
                  onChange={(e) => setCategoryIsActive(e.target.checked)}
                  disabled={loading}
                  className="w-5 h-5 accent-[#F95100]"
                />
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${categoryIsActive ? "bg-green-400" : "bg-gray-500"}`}
                  />
                  {categoryIsActive ? "Kategorie aktiv" : "Kategorie inaktiv"}
                </span>
              </label>
            </div>
          </div>

          <DialogFooter className="w-full">
            {editingCategory && (
              <Button
                variant="destructive"
                onClick={() => handleDeleteCategory(editingCategory)}
                disabled={loading}
                className="mr-auto shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.4)]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setCategoryDialogOpen(false)}
                disabled={loading}
                className="touch-manipulation min-h-[36px] gap-2"
              >
                <X className="w-4 h-4" />
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveCategory}
                disabled={loading || !categoryName.trim()}
                className="bg-primary hover:bg-primary/90 text-foreground"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Artikel bearbeiten" : "Neuer Artikel"}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? "Bearbeiten Sie die Artikeldetails"
                : "Erstellen Sie einen neuen Artikel für Ihr Menü"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-4 md:px-6 pb-2">
            {error && (
              <div className="p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-md">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Name *
              </label>
              <Input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                disabled={loading}
                placeholder="z.B. Pizza Margherita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Beschreibung
              </label>
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                className="w-full px-3 py-2 bg-card/50 border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
                rows={3}
                disabled={loading}
                placeholder="Beschreibung des Artikels"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Preis (inkl. MwSt.) *
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemPrice || ""}
                  onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                  className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                  disabled={loading}
                  placeholder="z.B. 12.50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  MwSt-Satz *
                </label>
                <div ref={taxMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setTaxMenuOpen((prev) => !prev)}
                    className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm shadow-inner flex items-center justify-between gap-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] touch-manipulation"
                    disabled={loading}
                  >
                    <span className="truncate">
                      {itemTaxRate === 0.07 ? "7% MwSt." : "19% MwSt."}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${taxMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {taxMenuOpen && (
                    <div className="absolute left-0 right-0 mt-1 rounded-lg border border-border bg-background shadow-xl z-[60] overflow-hidden">
                      {[0.07, 0.19].map((rate) => {
                        const isSelected = itemTaxRate === rate;
                        return (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => {
                              setItemTaxRate(rate);
                              setTaxMenuOpen(false);
                            }}
                            className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                              isSelected
                                ? "font-semibold text-foreground border-l-2 border-primary bg-accent"
                                : "text-foreground hover:bg-card"
                            }`}
                          >
                            {rate === 0.07 ? "7% MwSt." : "19% MwSt."}
                            {isSelected && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Kategorie
                </label>
                <div ref={categoryMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setCategoryMenuOpen((prev) => !prev)}
                    className="w-full rounded-lg border border-border bg-card text-foreground px-3 py-2 text-sm shadow-inner flex items-center justify-between gap-2 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px] touch-manipulation"
                    disabled={loading}
                  >
                    <span className="truncate">
                      {itemCategoryId
                        ? categories.find((c) => c.id === itemCategoryId)?.name || "Kategorie auswählen"
                        : "Keine Kategorie"}
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${categoryMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  {categoryMenuOpen && (
                    <div className="absolute left-0 right-0 mt-1 rounded-lg border border-border bg-background shadow-xl z-[60] max-h-[60vh] overflow-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setItemCategoryId(null);
                          setCategoryMenuOpen(false);
                        }}
                        className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                          !itemCategoryId
                            ? "font-semibold text-foreground border-l-2 border-primary bg-accent"
                            : "text-foreground hover:bg-card"
                        }`}
                      >
                        Keine Kategorie
                        {!itemCategoryId && <Check className="w-4 h-4 text-primary" />}
                      </button>
                      {categories
                        .filter((c) => c.is_active)
                        .map((category) => {
                          const isSelected = itemCategoryId === category.id;
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => {
                                setItemCategoryId(category.id);
                                setCategoryMenuOpen(false);
                              }}
                              className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                                isSelected
                                  ? "font-semibold text-foreground border-l-2 border-primary bg-accent"
                                  : "text-foreground hover:bg-card"
                              }`}
                            >
                              {category.name}
                              {isSelected && <Check className="w-4 h-4 text-primary" />}
                            </button>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Sortierreihenfolge
                </label>
                <Input
                  type="number"
                  value={itemSortOrder}
                  onChange={(e) => setItemSortOrder(parseInt(e.target.value) || 0)}
                  className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                  disabled={loading}
                  placeholder="z.B. 20"
                />
              </div>
            </div>
            <div className="flex items-center">
              <label className="inline-flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm text-foreground cursor-pointer hover:border-primary">
                <input
                  type="checkbox"
                  checked={itemIsAvailable}
                  onChange={(e) => setItemIsAvailable(e.target.checked)}
                  disabled={loading}
                  className="w-5 h-5 accent-[#F95100]"
                />
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${itemIsAvailable ? "bg-green-400" : "bg-gray-500"}`}
                  />
                  {itemIsAvailable ? "Artikel verfügbar" : "Artikel nicht verfügbar"}
                </span>
              </label>
            </div>
          </div>

          <DialogFooter className="w-full">
            {editingItem ? (
              <Button
                variant="destructive"
                onClick={() => handleDeleteItem(editingItem)}
                disabled={loading}
                className="mr-auto shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.4)]"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Löschen
              </Button>
            ) : null}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                onClick={() => setItemDialogOpen(false)}
                disabled={loading}
                className="touch-manipulation min-h-[36px] gap-2"
              >
                <X className="w-4 h-4" />
                Abbrechen
              </Button>
              <Button
                onClick={handleSaveItem}
                disabled={loading || !itemName.trim() || itemPrice <= 0}
                className="bg-primary hover:bg-primary/90 text-foreground"
              >
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Speichern..." : "Speichern"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg border ${
                toast.variant === "error"
                  ? "bg-red-900/90 border-red-600 text-red-100"
                  : toast.variant === "success"
                  ? "bg-green-900/90 border-green-600 text-green-100"
                  : "bg-blue-900/90 border-blue-600 text-blue-100"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

