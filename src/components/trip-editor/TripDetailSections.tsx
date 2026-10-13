"use client";

// ==================== TRIP DETAIL SECTIONS ====================
// General, Flights, Hotels, Transport, and Notes for the Edit Trip page. Each
// edits the shared form (use-trip-form.ts); nothing is saved until the page's
// Save. An empty Flights, Hotels, or Transport section is just its
// "+ Add …" line, so the page stays short.

import type { Ref } from "react";
import type { FlightLeg, HotelStay, TransportLeg } from "@/lib/db";
import type { TripForm } from "./use-trip-form";
import { Section, Field, TextArea, ItemCard, AddButton, Switch, inputClass, inputStyle, labelClass } from "./fields";

const TRANSPORT_TYPES = ["Rental Car", "Uber/Lyft", "Hotel Shuttle", "Personal Vehicle", "Public Transit", "Other"];

// ==================== GENERAL ====================

interface GeneralProps {
  f: TripForm;
  highlightDates: boolean;
  startDateRef: Ref<HTMLInputElement>;
  /** Set for a saved trip; the archive switch acts on the trip straight away. */
  archive?: { isArchived: boolean; busy: boolean; onToggle: () => void };
}

export function GeneralSection({ f, highlightDates, startDateRef, archive }: GeneralProps) {
  const { form, setField } = f;
  return (
    <Section id="general" icon={"\u{1F3F0}"} title="General">
      <div className="flex flex-col gap-4">
        <Field label="Trip Name" value={form.name} onChange={(v) => setField("name", v)} placeholder="e.g., Summer 2026 Disneyland" />
        {!form.isTemplate && (
          <>
            {highlightDates && (
              <p className="text-xs -mb-2" style={{ color: "var(--color-gold)" }}>
                This trip starts today for now. Set its real dates here.
              </p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Start Date" type="date" value={form.startDate} onChange={(v) => setField("startDate", v)}
                     inputRef={startDateRef} highlight={highlightDates} />
              <Field label="End Date" type="date" value={form.endDate} onChange={(v) => setField("endDate", v)}
                     min={form.startDate || undefined} highlight={highlightDates} />
            </div>
          </>
        )}
        <Switch on={!!form.isTemplate} onToggle={() => setField("isTemplate", !form.isTemplate)} label="Template (no dates)" />
        {/* Hides the trip from the main list, fully reversible; unrelated to
            the Danger Zone's backup-file download (docs/sync-architecture.md §6.6). */}
        {archive && !form.isTemplate && (
          <Switch
            on={archive.isArchived}
            onToggle={archive.onToggle}
            disabled={archive.busy}
            label={archive.isArchived ? "Archived — hidden from your main trip list" : "Archive this trip (hide from main list, keeps all data)"}
          />
        )}
      </div>
    </Section>
  );
}

// ==================== FLIGHTS ====================

export function FlightsSection({ f }: { f: TripForm }) {
  const flights = (f.form.flights as FlightLeg[]) || [];
  const set = (i: number, key: keyof FlightLeg) => (v: string) => f.updateItem<FlightLeg>("flights", i, key, v);
  return (
    <Section id="flights" icon={"✈️"} title="Flights">
      <div className="flex flex-col gap-3">
        {flights.map((leg, i) => (
          <ItemCard key={i} title={`Flight ${i + 1}`} onRemove={() => f.removeItem("flights", i)}>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" value={leg.from} onChange={set(i, "from")} placeholder="LAX" />
              <Field label="To" value={leg.to} onChange={set(i, "to")} placeholder="SNA" />
              <Field label="Airline" value={leg.airline} onChange={set(i, "airline")} placeholder="AA" />
              <Field label="Flight #" value={leg.flightNumber} onChange={set(i, "flightNumber")} placeholder="1234" />
              <Field label="Date" type="date" value={leg.date} onChange={set(i, "date")} />
              <Field label="Time" type="time" value={leg.time} onChange={set(i, "time")} />
            </div>
            <Field label="Confirmation #" value={leg.confirmation} onChange={set(i, "confirmation")} placeholder="ABC123" />
            <TextArea label="Notes" value={leg.notes} onChange={set(i, "notes")} placeholder="Seat, gate, layover..." />
          </ItemCard>
        ))}
        <AddButton label="Add Flight" onClick={() => f.addItem<FlightLeg>("flights", {})} />
      </div>
    </Section>
  );
}

// ==================== HOTELS ====================

export function HotelsSection({ f }: { f: TripForm }) {
  const hotels = (f.form.hotels as HotelStay[]) || [];
  const set = (i: number, key: keyof HotelStay) => (v: string) => f.updateItem<HotelStay>("hotels", i, key, v);
  return (
    <Section id="hotels" icon={"\u{1F3E8}"} title="Hotels">
      <div className="flex flex-col gap-3">
        {hotels.map((stay, i) => (
          <ItemCard key={i} title={`Hotel ${i + 1}`} onRemove={() => f.removeItem("hotels", i)}>
            <Field label="Hotel Name" value={stay.name} onChange={set(i, "name")} placeholder="Disney's Grand Californian" />
            <Field label="Confirmation #" value={stay.confirmation} onChange={set(i, "confirmation")} placeholder="GC-789012" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check-In" type="date" value={stay.checkIn} onChange={set(i, "checkIn")} />
              <Field label="Check-Out" type="date" value={stay.checkOut} onChange={set(i, "checkOut")} />
            </div>
            <TextArea label="Notes" value={stay.notes} onChange={set(i, "notes")} placeholder="Room requests, parking info..." />
          </ItemCard>
        ))}
        <AddButton label="Add Hotel" onClick={() => f.addItem<HotelStay>("hotels", {})} />
      </div>
    </Section>
  );
}

// ==================== TRANSPORT ====================

export function TransportSection({ f }: { f: TripForm }) {
  const legs = (f.form.transports as TransportLeg[]) || [];
  const set = (i: number, key: keyof TransportLeg) => (v: string) => f.updateItem<TransportLeg>("transports", i, key, v);
  return (
    <Section id="transport" icon={"\u{1F697}"} title="Transport">
      <div className="flex flex-col gap-3">
        {legs.map((leg, i) => (
          <ItemCard key={i} title={`Transport ${i + 1}`} onRemove={() => f.removeItem("transports", i)}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={labelClass} style={{ color: "var(--color-text-secondary)" }}>Type</span>
                <select value={leg.type ?? ""} onChange={(e) => set(i, "type")(e.target.value)}
                        className={inputClass} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="">Select type...</option>
                  {TRANSPORT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <Field label="Date" type="date" value={leg.date} onChange={set(i, "date")} />
            </div>
            <Field label="Details" value={leg.details} onChange={set(i, "details")} placeholder="Confirmation #, pickup time..." />
            <TextArea label="Notes" value={leg.notes} onChange={set(i, "notes")} placeholder="Parking info, shuttle times..." />
          </ItemCard>
        ))}
        <AddButton label="Add Transportation" onClick={() => f.addItem<TransportLeg>("transports", {})} />
      </div>
    </Section>
  );
}

// ==================== NOTES ====================

export function NotesSection({ f }: { f: TripForm }) {
  return (
    <Section id="notes" icon={"\u{1F4DD}"} title="Notes">
      <TextArea label="Trip Notes" value={f.form.notes} onChange={(v) => f.setField("notes", v)}
                placeholder="General trip notes, reminders, links..." rows={6} />
    </Section>
  );
}
