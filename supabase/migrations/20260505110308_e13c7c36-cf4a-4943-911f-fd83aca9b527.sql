-- Add canonical color column to staff_directory and backfill
ALTER TABLE public.staff_directory
  ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT '#6B7280';

-- Backfill from linked workers table (workers.color_hex via linked_staff_member_id)
UPDATE public.staff_directory sd
SET color = w.color_hex
FROM public.workers w
WHERE w.linked_staff_member_id = sd.id
  AND w.color_hex IS NOT NULL
  AND w.color_hex <> ''
  AND (sd.color IS NULL OR sd.color = '#6B7280');

-- Backfill from color_tag palette where still default
UPDATE public.staff_directory
SET color = CASE color_tag
  WHEN 'red' THEN '#ef4444'
  WHEN 'indigo' THEN '#6366f1'
  WHEN 'teal' THEN '#14b8a6'
  WHEN 'slate' THEN '#64748b'
  WHEN 'amber' THEN '#f59e0b'
  WHEN 'blue' THEN '#3b82f6'
  WHEN 'emerald' THEN '#10b981'
  WHEN 'orange' THEN '#f97316'
  WHEN 'violet' THEN '#8b5cf6'
  WHEN 'cyan' THEN '#06b6d4'
  WHEN 'rose' THEN '#f43f5e'
  WHEN 'lime' THEN '#84cc16'
  WHEN 'yellow' THEN '#eab308'
  ELSE '#6B7280'
END
WHERE color_tag IS NOT NULL AND (color = '#6B7280' OR color IS NULL);