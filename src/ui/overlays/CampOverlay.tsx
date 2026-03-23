/**
 * Frontier — Camp Overlay
 *
 * Renders when dailyCyclePhase === 'camp'.
 * Shows activity cards. Player selects 1 (evening) or 2 (full-day).
 * Confirm button triggers store.resolveCampActivities().
 *
 * Imports: types/ and store/ only (per architecture rules).
 */

import { useState } from 'react';
import { useStore } from '@/store';
import {
  selectDailyCyclePhase,
  selectAllSupplies,
  selectPlayerEquipment,
  selectCompanions,
  selectPendingCampIsFullDay,
  selectPendingEventRecord,
  selectPendingDayResults,
  selectPlayerHealth,
} from '@/store/selectors';
import {
  CampActivity,
  CAMP_ACTIVITY_DEFS,
} from '@/types/camp';
import type { CampActivitySelection } from '@/types/camp';
import type { CompanionId } from '@/types/companions';
import { CHARACTER_BIBLES } from '@/types/companions';
import { colors } from '@/ui/theme';

export default function CampOverlay() {
  const phase = useStore(selectDailyCyclePhase);
  const isFullDay = useStore(selectPendingCampIsFullDay);
  const supplies = useStore(selectAllSupplies);
  const equipment = useStore(selectPlayerEquipment);
  const companions = useStore(selectCompanions);
  const eventRecord = useStore(selectPendingEventRecord);
  const dayResults = useStore(selectPendingDayResults);
  const currentHealth = useStore(selectPlayerHealth);

  const [selected, setSelected] = useState<CampActivitySelection[]>([]);
  const [companionTarget, setCompanionTarget] = useState<CompanionId | null>(null);

  if (phase !== 'camp') return null;

  // Derive context hints from the day's events
  const contextHints: string[] = [];
  if (eventRecord) {
    const hasEncounter = eventRecord.events.some(
      (e) => e.type === 'encounter' || e.severity === 'major' || e.severity === 'critical',
    );
    if (hasEncounter) contextHints.push('A rough encounter weighs on the party.');
    if (eventRecord.devilsBargain) contextHints.push('The bargain struck casts a long shadow.');
    if (eventRecord.waypointArrival) contextHints.push(`Arrived at ${eventRecord.waypointArrival.waypointName}.`);
  }
  const effectiveHealth = dayResults?.player?.health ?? currentHealth;
  if (effectiveHealth < 30) contextHints.push('Your wounds need tending.');
  const worstDurability = equipment.reduce((min, e) => Math.min(min, e.durability), 100);
  if (worstDurability < 20) contextHints.push('Equipment is in dire shape.');

  const maxSlots = isFullDay ? 2 : 1;
  const activeCompanions = companions.filter((c) => c.status === 'active');
  const activeCompanionIds = activeCompanions.map((c) => c.id) as CompanionId[];

  // Availability computed inline (no systems/ import — respects import boundary)
  const isAvailable = (activity: CampActivity): boolean => {
    switch (activity) {
      case CampActivity.Rest:
        return true;
      case CampActivity.Cook:
        return supplies.food >= 2;
      case CampActivity.Repair:
        return supplies.repair >= 1 && equipment.some((e) => e.durability < 100);
      case CampActivity.CompanionChat:
        return activeCompanionIds.length > 0;
    }
  };

  const isSelected = (activity: CampActivity) =>
    selected.some((s) => s.activity === activity);

  const toggleActivity = (activity: CampActivity) => {
    if (isSelected(activity)) {
      setSelected(selected.filter((s) => s.activity !== activity));
    } else if (selected.length < maxSlots) {
      const selection: CampActivitySelection = { activity };
      if (activity === CampActivity.CompanionChat && activeCompanionIds.length > 0) {
        selection.targetCompanionId = companionTarget ?? activeCompanionIds[0];
      }
      setSelected([...selected, selection]);
    }
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    useStore.getState().resolveCampActivities(selected);
    setSelected([]);
  };

  return (
    <div style={styles.overlay} className="frontier-overlay">
      <div style={styles.card} className="frontier-overlay-card">
        <h2 style={styles.title}>
          {isFullDay ? "A Day's Rest" : 'Evening Camp'}
        </h2>
        <p style={styles.subtitle}>
          {isFullDay
            ? 'Choose up to 2 activities for the day.'
            : 'Choose 1 activity for the evening.'}
        </p>

        {contextHints.length > 0 && (
          <div style={styles.contextBanner}>
            {contextHints.map((hint, i) => (
              <span key={i} style={styles.contextHint}>{hint}</span>
            ))}
          </div>
        )}

        <div style={styles.activities}>
          {CAMP_ACTIVITY_DEFS.map((def) => {
            const available = isAvailable(def.activity);
            const active = isSelected(def.activity);
            const disabled = !available || (!active && selected.length >= maxSlots);

            return (
              <button
                key={def.activity}
                style={{
                  ...styles.activityBtn,
                  ...(active ? styles.activityBtnSelected : {}),
                  ...(disabled && !active ? styles.activityBtnDisabled : {}),
                }}
                disabled={disabled && !active}
                onClick={() => toggleActivity(def.activity)}
              >
                <span style={styles.activityName}>{def.name}</span>
                <span style={styles.activityDesc}>{def.description}</span>
                <span style={styles.effectLabel}>
                  {isFullDay ? def.fullDayBonus : def.effectLabel}
                </span>
                {!available && (
                  <span style={styles.locked}>{def.requirementLabel}</span>
                )}
                {def.activity === CampActivity.CompanionChat &&
                  active &&
                  activeCompanionIds.length > 1 && (
                    <select
                      style={styles.companionSelect}
                      value={companionTarget ?? activeCompanionIds[0]}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const id = e.target.value as CompanionId;
                        setCompanionTarget(id);
                        setSelected(
                          selected.map((s) =>
                            s.activity === CampActivity.CompanionChat
                              ? { ...s, targetCompanionId: id }
                              : s,
                          ),
                        );
                      }}
                    >
                      {activeCompanions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {CHARACTER_BIBLES[c.id]?.fullName ?? c.id}
                        </option>
                      ))}
                    </select>
                  )}
              </button>
            );
          })}
        </div>

        <button
          style={{
            ...styles.confirmBtn,
            ...(selected.length === 0 ? styles.confirmBtnDisabled : {}),
          }}
          disabled={selected.length === 0}
          onClick={handleConfirm}
        >
          Settle In
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(10, 10, 30, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  card: {
    background: colors.card,
    border: `2px solid ${colors.primary}`,
    borderRadius: '8px',
    padding: '24px 32px',
    maxWidth: '520px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto' as const,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontFamily: "'Crimson Text', Georgia, serif",
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.primaryDark,
    margin: '0 0 4px 0',
    borderBottom: `1px solid ${colors.secondary}`,
    paddingBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: colors.textSecondary,
    margin: '0 0 16px 0',
  },
  contextBanner: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    padding: '8px 12px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '4px',
    marginBottom: '12px',
  },
  contextHint: {
    fontSize: '13px',
    color: colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: '1.4',
  },
  activities: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginBottom: '16px',
  },
  activityBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    padding: '12px 16px',
    background: colors.button,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '4px',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontFamily: "'Crimson Text', Georgia, serif",
  },
  activityBtnSelected: {
    background: colors.selected,
    borderColor: colors.primary,
    borderWidth: '2px',
  },
  activityBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    background: colors.disabled,
  },
  activityName: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.primaryDark,
  },
  activityDesc: {
    fontSize: '13px',
    color: colors.textSecondary,
    lineHeight: '1.4',
  },
  effectLabel: {
    fontSize: '12px',
    color: colors.secondaryDark,
    fontStyle: 'italic',
    letterSpacing: '0.2px',
  },
  locked: {
    fontSize: '11px',
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: '2px',
  },
  companionSelect: {
    marginTop: '4px',
    fontSize: '12px',
    padding: '2px 6px',
    fontFamily: "'Crimson Text', Georgia, serif",
    background: colors.input,
    border: `1px solid ${colors.secondary}`,
    borderRadius: '3px',
  },
  confirmBtn: {
    width: '100%',
    padding: '10px 16px',
    fontSize: '16px',
    fontFamily: "'Crimson Text', Georgia, serif",
    fontWeight: 600,
    background: colors.primary,
    color: colors.input,
    border: `1px solid ${colors.primaryDark}`,
    borderRadius: '4px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};
