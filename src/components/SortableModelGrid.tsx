import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ModelCard, type ElementView } from "./ModelCard";
import type { WeatherModel } from "@/lib/weatherModels";
import { cn } from "@/lib/utils";

interface SortableModelGridProps {
  models: WeatherModel[];
  cols: string;
  storageKey: string;
  elementOverride?: ElementView;
}

function SortableModelItem({ model, elementOverride }: { model: WeatherModel; elementOverride?: ElementView }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: model.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "z-50 opacity-80"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="absolute -top-2 -right-2 z-10 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <ModelCard model={model} elementOverride={elementOverride} />
    </div>
  );
}

function getStoredOrder(key: string): string[] | null {
  try {
    const stored = localStorage.getItem(`imw-order-${key}`);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function setStoredOrder(key: string, order: string[]) {
  try {
    localStorage.setItem(`imw-order-${key}`, JSON.stringify(order));
  } catch {
    // ignore
  }
}

export function SortableModelGrid({ models, cols, storageKey, elementOverride }: SortableModelGridProps) {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);

  // Sync ordered IDs when models change
  useEffect(() => {
    const storedOrder = getStoredOrder(storageKey);
    const modelIds = models.map((m) => m.id);

    if (storedOrder) {
      // Keep stored order, append any new models, remove stale ones
      const validStored = storedOrder.filter((id) => modelIds.includes(id));
      const newModels = modelIds.filter((id) => !storedOrder.includes(id));
      setOrderedIds([...validStored, ...newModels]);
    } else {
      setOrderedIds(modelIds);
    }
  }, [models.map((m) => m.id).join(","), storageKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrderedIds((prev) => {
        const oldIndex = prev.indexOf(active.id as string);
        const newIndex = prev.indexOf(over.id as string);
        const newOrder = arrayMove(prev, oldIndex, newIndex);
        setStoredOrder(storageKey, newOrder);
        return newOrder;
      });
    }
  };

  const modelMap = new Map(models.map((m) => [m.id, m]));
  const sortedModels = orderedIds
    .map((id) => modelMap.get(id))
    .filter(Boolean) as WeatherModel[];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orderedIds} strategy={rectSortingStrategy}>
        <div className={`grid gap-4 ${cols}`}>
          {sortedModels.map((model) => (
            <SortableModelItem key={model.id} model={model} elementOverride={elementOverride} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
