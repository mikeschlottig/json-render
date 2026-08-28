import { useEffect, useRef, useState, useCallback } from "react";
import { MODELS, findModel } from "../lib/models";
import { CheckIcon, ChevronDownIcon } from "./icons";

/**
 * Model dropdown.
 *
 * Hand-rolled rather than a listbox library because the accessibility contract
 * here is small and explicit: roving focus with the arrow keys, Enter/Space to
 * choose, Escape to dismiss, focus returned to the trigger.
 */

interface ModelPickerProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() =>
    Math.max(
      MODELS.findIndex((model) => model.id === value),
      0,
    ),
  );
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const selected = findModel(value);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);

  // Dismiss on outside pointerdown. pointerdown rather than click so the menu
  // is gone before the click lands on whatever is underneath it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const choose = (index: number) => {
    const model = MODELS[index];
    if (model) onChange(model.id);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "ArrowDown":
        event.preventDefault();
        if (!open) setOpen(true);
        else setActive((i) => (i + 1) % MODELS.length);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) setOpen(true);
        else setActive((i) => (i - 1 + MODELS.length) % MODELS.length);
        break;
      case "Home":
        if (open) {
          event.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          event.preventDefault();
          setActive(MODELS.length - 1);
        }
        break;
      case "Enter":
      case " ":
        if (open) {
          event.preventDefault();
          choose(active);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="picker" ref={root} onKeyDown={onKeyDown}>
      <button
        ref={trigger}
        type="button"
        className="picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          setActive(
            Math.max(
              MODELS.findIndex((m) => m.id === value),
              0,
            ),
          );
          setOpen((o) => !o);
        }}
      >
        <span className="picker-name">{selected.name}</span>
        <ChevronDownIcon
          className={open ? "picker-caret open" : "picker-caret"}
        />
      </button>

      {open && (
        <ul className="picker-menu" role="listbox" aria-label="Model">
          {MODELS.map((model, index) => {
            const isSelected = model.id === value;
            return (
              <li
                key={model.id}
                role="option"
                aria-selected={isSelected}
                className={`picker-option${index === active ? " active" : ""}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span className="picker-check">
                  {isSelected && <CheckIcon />}
                </span>
                <span className="picker-body">
                  <span className="picker-row">
                    <span className="picker-option-name">{model.name}</span>
                    <span className={`picker-tier tier-${model.tier}`}>
                      {model.tier}
                    </span>
                  </span>
                  <span className="picker-blurb">{model.blurb}</span>
                  <span className="picker-meta">
                    {model.vendor} · {model.contextLabel}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
