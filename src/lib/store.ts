"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PackingType } from "@/lib/db";

// ==================== TYPES ====================

interface WishFilters {
  selectedTags: string[];
  showCompleted: boolean;
  searchQuery: string;
  sortBy: "priority" | "newest" | "title";
}

interface AppState {
  // Hydration flag — true once persisted state has been restored
  _hasHydrated: boolean;

  // Trip state (persisted to localStorage)
  currentTripId: string | null;
  setCurrentTripId: (id: string | null) => void;

  // Theme preference (persisted to localStorage)
  themePreference: "system" | "light" | "dark";
  setThemePreference: (pref: "system" | "light" | "dark") => void;

  // Phase navigation
  activePhase: "plan" | "prepare" | "preview" | "play" | "publish" | null;
  setActivePhase: (phase: AppState["activePhase"]) => void;

  // Trip creation modal
  showTripModal: boolean;
  setShowTripModal: (show: boolean) => void;

  // Wish add modal
  showAddWishModal: boolean;
  setShowAddWishModal: (show: boolean) => void;

  // Wish editing
  editingWishId: string | null;
  setEditingWishId: (id: string | null) => void;

  // Wish filters
  wishFilters: WishFilters;
  toggleFilterTag: (tagId: string) => void;
  clearFilterTags: () => void;
  setShowCompleted: (show: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: WishFilters["sortBy"]) => void;
  resetFilters: () => void;

  // Wish catalog picker (Plan phase)
  showWishCatalogPicker: boolean;
  setShowWishCatalogPicker: (show: boolean) => void;

  // Prepare phase
  activePackingTabs: PackingType[];
  togglePackingTab: (tab: PackingType) => void;
  setActivePackingTabs: (tabs: PackingType[]) => void;
  showAddPackingModal: boolean;
  setShowAddPackingModal: (show: boolean) => void;
  editingPackingItemId: string | null;
  setEditingPackingItemId: (id: string | null) => void;
  packingShowCompleted: boolean;
  setPackingShowCompleted: (show: boolean) => void;
  showCatalogPicker: boolean;
  setShowCatalogPicker: (show: boolean) => void;

  // Portal states (persisted) — keyed by tripId then phase
  portalOpened: Record<string, Record<string, boolean>>;
  markPortalOpened: (tripId: string, phase: string) => void;

  // Photo exclusions for PDF (persisted) — keyed by tripId, value is set of excluded photo ids
  excludedPhotoIds: Record<string, string[]>;
  togglePhotoExclusion: (tripId: string, photoId: string) => void;

  // User identity (persisted to localStorage)
  currentUserId: string;
  setCurrentUserId: (id: string) => void;

  // User filter (not persisted — resets each session)
  activeUserFilter: string[] | null; // null = show all users
  setActiveUserFilter: (filter: string[] | null) => void;
  toggleUserFilter: (userId: string) => void;

  // Cloud sync opt-in (persisted) — false by default; user must explicitly enable
  cloudSyncEnabled: boolean;
  setCloudSyncEnabled: (enabled: boolean) => void;

  // Play phase
  selectedPlayDate: string | null;
  setSelectedPlayDate: (date: string | null) => void;
  activeParkTab: string;
  setActiveParkTab: (tab: string) => void;
  highlightedLand: string | string[] | null;
  setHighlightedLand: (land: string | string[] | null) => void;
  hoveredTimelineItemId: string | null;
  setHoveredTimelineItemId: (id: string | null) => void;
  playItemPoolFilter: string;
  setPlayItemPoolFilter: (q: string) => void;
  editingTimelineItemId: string | null;
  setEditingTimelineItemId: (id: string | null) => void;
}

// ==================== DEFAULT VALUES ====================

const DEFAULT_FILTERS: WishFilters = {
  selectedTags: [],
  showCompleted: true,
  searchQuery: "",
  sortBy: "priority",
};

// ==================== STORE ====================

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Hydration flag
      _hasHydrated: false,

      // Trip state
      currentTripId: null,
      setCurrentTripId: (id) => set({ currentTripId: id }),

      // Theme preference
      themePreference: "system",
      setThemePreference: (pref) => set({ themePreference: pref }),

      // Phase navigation
      activePhase: null,
      setActivePhase: (phase) => set({ activePhase: phase }),

      // Trip creation modal
      showTripModal: false,
      setShowTripModal: (show) => set({ showTripModal: show }),

      // Wish add modal
      showAddWishModal: false,
      setShowAddWishModal: (show) => set({ showAddWishModal: show }),

      // Wish editing
      editingWishId: null,
      setEditingWishId: (id) => set({ editingWishId: id }),

      // Wish filters
      wishFilters: { ...DEFAULT_FILTERS },

      toggleFilterTag: (tagId) =>
        set((state) => ({
          wishFilters: {
            ...state.wishFilters,
            selectedTags: state.wishFilters.selectedTags.includes(tagId)
              ? state.wishFilters.selectedTags.filter((t) => t !== tagId)
              : [...state.wishFilters.selectedTags, tagId],
          },
        })),

      clearFilterTags: () =>
        set((state) => ({
          wishFilters: { ...state.wishFilters, selectedTags: [] },
        })),

      setShowCompleted: (show) =>
        set((state) => ({
          wishFilters: { ...state.wishFilters, showCompleted: show },
        })),

      setSearchQuery: (query) =>
        set((state) => ({
          wishFilters: { ...state.wishFilters, searchQuery: query },
        })),

      setSortBy: (sort) =>
        set((state) => ({
          wishFilters: { ...state.wishFilters, sortBy: sort },
        })),

      resetFilters: () =>
        set({ wishFilters: { ...DEFAULT_FILTERS } }),

      // Wish catalog picker (Plan phase)
      showWishCatalogPicker: false,
      setShowWishCatalogPicker: (show) => set({ showWishCatalogPicker: show }),

      // Prepare phase
      activePackingTabs: ["outfit"] as PackingType[],
      togglePackingTab: (tab) =>
        set((state) => {
          const current = state.activePackingTabs;
          if (current.includes(tab)) {
            // Don't allow deselecting the last tab
            if (current.length <= 1) return state;
            return { activePackingTabs: current.filter((t) => t !== tab) };
          }
          return { activePackingTabs: [...current, tab] };
        }),
      setActivePackingTabs: (tabs) => set({ activePackingTabs: tabs }),
      showAddPackingModal: false,
      setShowAddPackingModal: (show) => set({ showAddPackingModal: show }),
      editingPackingItemId: null,
      setEditingPackingItemId: (id) => set({ editingPackingItemId: id }),
      packingShowCompleted: true,
      setPackingShowCompleted: (show) => set({ packingShowCompleted: show }),
      showCatalogPicker: false,
      setShowCatalogPicker: (show) => set({ showCatalogPicker: show }),

      // Portal states
      portalOpened: {},
      markPortalOpened: (tripId, phase) =>
        set((state) => ({
          portalOpened: {
            ...state.portalOpened,
            [tripId]: {
              ...(state.portalOpened[tripId] ?? {}),
              [phase]: true,
            },
          },
        })),

      // Photo exclusions
      excludedPhotoIds: {},
      togglePhotoExclusion: (tripId, photoId) =>
        set((state) => {
          const current = state.excludedPhotoIds[tripId] ?? [];
          const next = current.includes(photoId)
            ? current.filter((id) => id !== photoId)
            : [...current, photoId];
          return { excludedPhotoIds: { ...state.excludedPhotoIds, [tripId]: next } };
        }),

      // User identity
      currentUserId: "user_primary",
      setCurrentUserId: (id) => set({ currentUserId: id }),

      // User filter
      activeUserFilter: null,
      setActiveUserFilter: (filter) => set({ activeUserFilter: filter }),
      toggleUserFilter: (userId) =>
        set((state) => {
          const current = state.activeUserFilter;
          if (!current) {
            // No filter active — start filtering to just this user
            return { activeUserFilter: [userId] };
          }
          if (current.includes(userId)) {
            const next = current.filter((id) => id !== userId);
            // If empty after removal, show all
            return { activeUserFilter: next.length > 0 ? next : null };
          }
          return { activeUserFilter: [...current, userId] };
        }),

      // Cloud sync — off by default; user opts in explicitly
      cloudSyncEnabled: false,
      setCloudSyncEnabled: (enabled) => set({ cloudSyncEnabled: enabled }),

      // Play phase
      selectedPlayDate: null,
      setSelectedPlayDate: (date) => set({ selectedPlayDate: date }),
      activeParkTab: "disneyland",
      setActiveParkTab: (tab) => set({ activeParkTab: tab }),
      highlightedLand: null,
      setHighlightedLand: (land) => set({ highlightedLand: land }),
      hoveredTimelineItemId: null,
      setHoveredTimelineItemId: (id) => set({ hoveredTimelineItemId: id }),
      playItemPoolFilter: "",
      setPlayItemPoolFilter: (q) => set({ playItemPoolFilter: q }),
      editingTimelineItemId: null,
      setEditingTimelineItemId: (id) => set({ editingTimelineItemId: id }),
    }),
    {
      name: "parqwish-store",
      // Only persist trip selection — filters reset each session
      partialize: (state) => ({
        currentTripId: state.currentTripId,
        currentUserId: state.currentUserId,
        themePreference: state.themePreference,
        portalOpened: state.portalOpened,
        excludedPhotoIds: state.excludedPhotoIds,
        cloudSyncEnabled: state.cloudSyncEnabled,
      }),
      onRehydrateStorage: () => () => {
        // Called after state is rehydrated from localStorage
        useAppStore.setState({ _hasHydrated: true });
      },
    }
  )
);
