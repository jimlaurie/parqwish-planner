"use client";

// ==================== COLLECTION GALLERY ====================
// The Collection page's Gallery view: every photo of the items in the
// category's current tab, image only, with the List view's filters above
// (CollectionFilterBar). A photo opens the viewer (PhotoViewer, arrows to
// step through them all); its corner button opens the item. Items with no
// photo are left out and counted.

import { useMemo, useState } from "react";
import PhotoViewer from "@/components/PhotoViewer";
import { ACCENT } from "./CollectionFormParts";
import { CollectionFilterBar, CollectionFilterCount, useCollectionFilters } from "./CollectionFilterBar";
import type { CollectionItem } from "@/lib/db";
import type { CollectionFieldDef } from "@shared/types/collection";

interface Props {
  /** The items in the tab, in the tab's own order. */
  items: CollectionItem[];
  fields: CollectionFieldDef[];
  onOpen: (item: CollectionItem) => void;
}

interface GalleryPhoto {
  key: string;
  src: string;
  full: string;
  item: CollectionItem;
}

/** One entry per photo, in item order then photo order. */
function galleryPhotos(items: CollectionItem[]): GalleryPhoto[] {
  return items.flatMap((item) =>
    (item.photoSets ?? [])
      .map((set, i) => ({ key: `${item.id}-${i}`, src: set.display || set.thumbnail, full: set.full || set.display || set.thumbnail, item }))
      .filter((p) => p.src),
  );
}

export default function CollectionGallery({ items, fields, onOpen }: Props) {
  const filtering = useCollectionFilters(items);
  const photos = useMemo(() => galleryPhotos(filtering.kept), [filtering.kept]);
  const totalPhotos = useMemo(() => galleryPhotos(items).length, [items]);
  const withoutPhotos = filtering.kept.filter((i) => !i.photoSets?.length).length;
  const [viewing, setViewing] = useState<number | null>(null);

  return (
    <div>
      <CollectionFilterBar fields={fields} filtering={filtering} />
      <CollectionFilterCount filtering={filtering} total={totalPhotos} shown={photos.length} noun={["photo", "photos"]} />
      {photos.length === 0 ? (
        <p className="mt-6 text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
          {filtering.active ? "No photos match these filters." : "No photos here yet. Add one from an item's editor."}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5" data-testid="collection-gallery">
          {photos.map((photo, index) => (
            <GalleryTile key={photo.key} photo={photo} onView={() => setViewing(index)} onOpen={() => onOpen(photo.item)} />
          ))}
        </div>
      )}
      {withoutPhotos > 0 && (
        <p className="mt-3 text-xs" style={{ color: "var(--color-text-dim)" }}>
          {withoutPhotos} {withoutPhotos === 1 ? "item has" : "items have"} no photo, so {withoutPhotos === 1 ? "it isn't" : "they aren't"} shown. List shows every item.
        </p>
      )}
      {viewing !== null && photos[viewing] && (
        <PhotoViewer photos={photos.map((p) => p.full)} currentIndex={viewing} onClose={() => setViewing(null)} onChangeIndex={setViewing} />
      )}
    </div>
  );
}

function GalleryTile({ photo, onView, onOpen }: { photo: GalleryPhoto; onView: () => void; onOpen: () => void }) {
  const name = photo.item.name || "Unnamed";
  return (
    <div className="group relative aspect-square rounded-md overflow-hidden" style={{ backgroundColor: "var(--color-surface-sunken)" }}>
      <button type="button" onClick={onView} className="block w-full h-full cursor-zoom-in" aria-label={`View photo of ${name}`} title={name}>
        {/* Photos are the user's own data URLs, so next/image adds nothing here */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt="" className="w-full h-full object-cover" loading="lazy" />
      </button>
      <button type="button" onClick={onOpen} aria-label={`Open ${name}`} title={`Open ${name}`}
        className="absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-xs cursor-pointer
                   opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity"
        style={{ backgroundColor: "var(--color-bg-card)", color: ACCENT, border: `1px solid ${ACCENT}` }}>
        <span aria-hidden="true">✎</span>
      </button>
    </div>
  );
}
