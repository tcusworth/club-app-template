import React, { useState, useRef, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Hash, Plus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TagValue {
  id?: number;   // undefined = new (not yet persisted)
  name: string;
}

interface TagInputProps {
  value: TagValue[];
  onChange: (tags: TagValue[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * TagInput — autocomplete tag picker backed by the global_tags table.
 *
 * Usage:
 *   const [tags, setTags] = useState<TagValue[]>([]);
 *   <TagInput value={tags} onChange={setTags} />
 *
 * On form submit, call `resolveTagIds(tags, findOrCreate)` to get a list of
 * persisted tag IDs, then call `tags.addToPostBulk` with the result.
 */
export function TagInput({
  value,
  onChange,
  placeholder = 'Add tags…',
  maxTags = 10,
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allTagsQuery = trpc.tags.list.useQuery(undefined, { staleTime: 60_000 });

  // Filter suggestions: match input, exclude already-selected
  const selectedNames = new Set(value.map(t => t.name.toLowerCase()));
  const suggestions = (allTagsQuery.data ?? []).filter(
    t =>
      t.name.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedNames.has(t.name.toLowerCase()),
  );

  const addTag = useCallback(
    (tag: TagValue) => {
      if (value.length >= maxTags) return;
      if (selectedNames.has(tag.name.toLowerCase())) return;
      onChange([...value, tag]);
      setInputValue('');
      setIsOpen(false);
      inputRef.current?.focus();
    },
    [value, onChange, maxTags, selectedNames],
  );

  const removeTag = useCallback(
    (name: string) => {
      onChange(value.filter(t => t.name !== name));
    },
    [value, onChange],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      // Check if there's an exact match in suggestions
      const exact = (allTagsQuery.data ?? []).find(
        t => t.name.toLowerCase() === inputValue.trim().toLowerCase(),
      );
      if (exact) {
        addTag({ id: exact.id, name: exact.name });
      } else {
        // New tag — no id yet, will be resolved on submit
        addTag({ name: inputValue.trim() });
      }
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1].name);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDropdown = isOpen && inputValue.length > 0 && (suggestions.length > 0 || inputValue.trim().length > 0);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Tag pills + input */}
      <div
        className={cn(
          'flex flex-wrap gap-1.5 min-h-[42px] px-3 py-2 rounded-md border border-input bg-background',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
          disabled && 'opacity-50 pointer-events-none',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(tag => (
          <Badge
            key={tag.name}
            variant="secondary"
            className="flex items-center gap-1 text-xs py-0.5 px-2 bg-cyan-950/60 text-cyan-300 border border-cyan-800/50 hover:bg-cyan-900/60"
          >
            <Hash className="w-2.5 h-2.5" />
            {tag.name}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(tag.name); }}
              className="ml-0.5 hover:text-red-400 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {value.length < maxTags && (
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            disabled={disabled}
          />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {suggestions.slice(0, 8).map(tag => (
              <button
                key={tag.id}
                type="button"
                onMouseDown={e => { e.preventDefault(); addTag({ id: tag.id, name: tag.name }); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{tag.name}</span>
                {tag.usageCount > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">{tag.usageCount}</span>
                )}
              </button>
            ))}
            {/* Create new tag option */}
            {inputValue.trim() &&
              !suggestions.some(s => s.name.toLowerCase() === inputValue.trim().toLowerCase()) && (
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault();
                    addTag({ name: inputValue.trim() });
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors border-t border-border"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Create <strong>"{inputValue.trim()}"</strong></span>
                </button>
              )}
          </div>
          {allTagsQuery.isLoading && (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground mt-1">
        Press <kbd className="px-1 py-0.5 rounded bg-muted text-xs">Enter</kbd> or <kbd className="px-1 py-0.5 rounded bg-muted text-xs">,</kbd> to add a tag. Max {maxTags} tags.
      </p>
    </div>
  );
}

/**
 * Resolve a list of TagValues to persisted tag IDs.
 * New tags (no id) are created via the findOrCreate mutation.
 */
export async function resolveTagIds(
  tags: TagValue[],
  findOrCreate: (vars: { name: string }) => Promise<{ id: number }>,
): Promise<number[]> {
  const ids: number[] = [];
  for (const tag of tags) {
    if (tag.id != null) {
      ids.push(tag.id);
    } else {
      const { id } = await findOrCreate({ name: tag.name });
      ids.push(id);
    }
  }
  return ids;
}
