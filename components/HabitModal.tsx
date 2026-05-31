// =============================================================================
// HabitModal — add / edit / delete a habit. Used by the Routines tab.
//
// Aesthetic (cinematic editorial per CLAUDE.md §1):
//   - Backdrop: bg-deep at 0.85 alpha (warm dark, sits over Today/Routines)
//   - Modal body: bg-surface with hairline border top + bottom — the "framed
//     letter" feel that approximates the leather-bound-journal-in-firelight tone
//   - Labels: mono micro tracked-wide dim (matches PeriodSection / Marginalia)
//   - Input text: literary serif italic body (Georgia italic 16pt cream)
//   - Buttons: SAVE in bordered ember, CANCEL low-contrast, DELETE accent dim
//
// Modes:
//   create (no `existingHabit`)  → empty form, only Save + Cancel
//   edit   (with `existingHabit`)→ pre-filled, Save + Cancel + Delete
// =============================================================================

import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCreateHabit } from "../lib/hooks/use-create-habit";
import { useDeleteHabit } from "../lib/hooks/use-delete-habit";
import { useUpdateHabit } from "../lib/hooks/use-update-habit";
import type { DayKey, HabitDimension } from "../lib/hooks/types";
import type { RoutineHabit } from "../lib/hooks/use-all-habits";

type Props = {
  visible: boolean;
  onClose: () => void;
  existingHabit?: RoutineHabit | null;
};

const DIMENSIONS: { key: HabitDimension; label: string }[] = [
  { key: "habit",            label: "GENERAL" },
  { key: "deep_work",        label: "DEEP WORK" },
  { key: "focus_discipline", label: "FOCUS" },
  { key: "energy",           label: "ENERGY" },
  { key: "mood",             label: "MOOD" },
  { key: "diet",             label: "DIET" },
  { key: "sleep",            label: "SLEEP" },
];

const DAYS: { key: DayKey; short: string }[] = [
  { key: "mon", short: "M" },
  { key: "tue", short: "T" },
  { key: "wed", short: "W" },
  { key: "thu", short: "T" },
  { key: "fri", short: "F" },
  { key: "sat", short: "S" },
  { key: "sun", short: "S" },
];

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function HabitModal({ visible, onClose, existingHabit }: Props) {
  const editing = !!existingHabit;
  const createMut = useCreateHabit();
  const updateMut = useUpdateHabit();
  const deleteMut = useDeleteHabit();

  const [name,           setName]           = useState("");
  const [dimension,      setDimension]      = useState<HabitDimension>("habit");
  const [scheduledTime,  setScheduledTime]  = useState("");
  const [durationStr,    setDurationStr]    = useState("");
  const [days,           setDays]           = useState<DayKey[]>([]);
  const [rationale,      setRationale]      = useState("");
  const [error,          setError]          = useState<string | null>(null);

  // Reset / preload when the modal opens
  useEffect(() => {
    if (!visible) return;
    setError(null);
    if (existingHabit) {
      setName(existingHabit.name);
      setDimension(existingHabit.dimension);
      setScheduledTime(existingHabit.scheduled_time);
      setDurationStr(String(existingHabit.duration_min));
      setDays(existingHabit.days ?? []);
      setRationale(existingHabit.rationale ?? "");
    } else {
      setName("");
      setDimension("habit");
      setScheduledTime("");
      setDurationStr("");
      setDays([]);
      setRationale("");
    }
  }, [visible, existingHabit]);

  const toggleDay = (d: DayKey) => {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  };

  const validate = (): string | null => {
    if (!name.trim()) return "name is required";
    if (!TIME_RE.test(scheduledTime)) return "time must be HH:MM (24h)";
    const dur = parseInt(durationStr, 10);
    if (!Number.isFinite(dur) || dur <= 0) return "duration must be a positive number";
    if (days.length === 0) return "pick at least one day";
    return null;
  };

  const handleSave = async () => {
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }
    const payload = {
      name: name.trim(),
      dimension,
      scheduled_time: scheduledTime,
      duration_min: parseInt(durationStr, 10),
      days,
      rationale: rationale.trim(),
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ habit_id: existingHabit!.habit_id, ...payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "save failed");
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    try {
      await deleteMut.mutateAsync({ habit_id: existingHabit!.habit_id });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "delete failed");
    }
  };

  const submitting = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-4"
        style={{ backgroundColor: "rgba(14, 9, 6, 0.85)" }}
      >
        <View
          className="bg-surface w-full"
          style={{
            maxWidth: 520,
            maxHeight: "92%",
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: "#2A1F18",
          }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-5 pb-3">
            <Text
              className="text-cream font-display font-black italic"
              style={{ fontSize: 28, lineHeight: 32 }}
            >
              {editing ? "edit habit" : "new habit"}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="active:opacity-60"
            >
              <Text className="text-dim font-mono" style={{ fontSize: 18 }}>×</Text>
            </Pressable>
          </View>

          <View className="h-px bg-hairline" />

          <ScrollView contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">
            <Field label="NAME">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder=""
                placeholderTextColor="#8A7A6E"
                className="text-cream font-body italic bg-deep px-4 py-3 border border-hairline"
                style={{ fontSize: 16 }}
              />
            </Field>

            <Field label="DIMENSION">
              <View className="flex-row flex-wrap">
                {DIMENSIONS.map((d) => {
                  const selected = dimension === d.key;
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => setDimension(d.key)}
                      className={`mr-2 mb-2 px-3 py-2 border active:opacity-60 ${selected ? "border-ember bg-hot" : "border-hairline"}`}
                    >
                      <Text
                        className={`font-mono uppercase tracking-widest ${selected ? "text-ember" : "text-dim"}`}
                        style={{ fontSize: 10 }}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <View className="flex-row">
              <View className="flex-1 mr-4">
                <Field label="TIME (HH:MM)">
                  <TextInput
                    value={scheduledTime}
                    onChangeText={setScheduledTime}
                    placeholder="06:30"
                    placeholderTextColor="#8A7A6E"
                    autoCapitalize="none"
                    keyboardType="numbers-and-punctuation"
                    className="text-cream font-mono bg-deep px-4 py-3 border border-hairline"
                    style={{ fontSize: 16 }}
                  />
                </Field>
              </View>
              <View className="flex-1">
                <Field label="DURATION (MIN)">
                  <TextInput
                    value={durationStr}
                    onChangeText={setDurationStr}
                    placeholder="45"
                    placeholderTextColor="#8A7A6E"
                    keyboardType="number-pad"
                    className="text-cream font-mono bg-deep px-4 py-3 border border-hairline"
                    style={{ fontSize: 16 }}
                  />
                </Field>
              </View>
            </View>

            <Field label="DAYS">
              <View className="flex-row">
                {DAYS.map((d) => {
                  const selected = days.includes(d.key);
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => toggleDay(d.key)}
                      className={`mr-2 items-center justify-center border active:opacity-60 ${selected ? "border-ember bg-hot" : "border-hairline"}`}
                      style={{ width: 36, height: 36 }}
                    >
                      <Text
                        className={`font-mono uppercase ${selected ? "text-ember" : "text-dim"}`}
                        style={{ fontSize: 12 }}
                      >
                        {d.short}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Field>

            <Field label="RATIONALE">
              <TextInput
                value={rationale}
                onChangeText={setRationale}
                multiline
                placeholder="why this habit, for this user"
                placeholderTextColor="#8A7A6E"
                className="text-cream font-body italic bg-deep px-4 py-3 border border-hairline"
                style={{ fontSize: 16, minHeight: 90, textAlignVertical: "top" }}
              />
            </Field>

            {error ? (
              <Text className="text-ember font-mono mt-2" style={{ fontSize: 12 }}>
                {error}
              </Text>
            ) : null}
          </ScrollView>

          <View className="h-px bg-hairline" />

          {/* Footer buttons */}
          <View className="flex-row items-center justify-between px-6 py-4">
            {editing ? (
              <Pressable onPress={handleDelete} className="active:opacity-60" disabled={submitting}>
                <Text className="text-dim font-mono uppercase tracking-widest" style={{ fontSize: 11 }}>
                  delete
                </Text>
              </Pressable>
            ) : <View />}

            <View className="flex-row items-center">
              <Pressable onPress={onClose} className="mr-5 active:opacity-60" disabled={submitting}>
                <Text className="text-dim font-mono uppercase tracking-widest" style={{ fontSize: 11 }}>
                  cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSave}
                disabled={submitting}
                className={`border border-ember px-5 py-3 active:opacity-60 ${submitting ? "opacity-50" : ""}`}
              >
                {submitting ? (
                  <ActivityIndicator color="#F4EEE3" />
                ) : (
                  <Text className="text-cream font-mono uppercase tracking-widest" style={{ fontSize: 12 }}>
                    save
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Tiny field wrapper — mono label, then children
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-dim font-mono uppercase tracking-widest mb-2" style={{ fontSize: 10 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}
